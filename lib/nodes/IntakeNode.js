import inquirer from 'inquirer';
import path from 'path';
import { EventTypes, NodeIds } from '../types.js';
import { ensureDir, writeJson, appendLog, validateAnswer, getCurrentTimestamp } from '../utils.js';
import { LLMEnricher } from '../llm-enricher.js';

/**
 * Questions configuration for different modes
 */
const QUESTIONS = {
  sales: [
    { key: 'product', prompt: 'Product (1 sentence):' },
    { key: 'target', prompt: 'Target roles & company types:' },
    { key: 'pain', prompt: 'Pain removed (1 sentence):' },
    { key: 'signals', prompt: 'Two must-have signals (comma-separated):' },
    { key: 'proof', prompt: 'One proof point (metric/logo):' },
    { key: 'cta', prompt: 'CTA (demo/intro/pilot):' },
    { key: 'constraints', prompt: 'Constraints (regions/languages/do-not-contact):' }
  ],
  investor: [
    { key: 'product', prompt: 'Company (1 sentence + category):' },
    { key: 'target', prompt: 'Stage, round size & use of funds:' },
    { key: 'pain', prompt: 'Traction snapshot (users/revenue/growth):' },
    { key: 'signals', prompt: 'Moat/differentiator (1 line):' },
    { key: 'proof', prompt: 'Ideal investor profile (fund/check/geo/thesis):' },
    { key: 'cta', prompt: 'Materials (deck/data room availability):' },
    { key: 'constraints', prompt: 'Constraints (no-go firms/conflicts/regions):' }
  ]
};

export class IntakeNode {
  constructor() {
    this.id = NodeIds.INTAKE;
    this.handles = EventTypes.START;
    this.enricher = new LLMEnricher();
  }

  /**
   * Main processing function for IntakeNode
   * @param {Message} msg 
   * @param {Context} ctx 
   * @returns {Promise<Message|null>}
   */
  async run(msg, ctx) {
    try {
      console.log(`\n🚀 Starting ${this.id} for run: ${msg.run_id}`);
      
      // Check if LLM enrichment is available
      const useEnrichment = this.enricher.isConfigured();
      if (useEnrichment) {
        console.log(`🤖 LLM enrichment enabled (GPT-4o) - context-aware follow-ups`);
      } else {
        console.log(`⚠️  LLM enrichment disabled (no API key) - using basic collection`);
      }
      
      // Collect user input
      const { mode, answers } = await this.collectUserInput(useEnrichment);
      
      // Create profile directory
      const profileDir = path.join(ctx.profilesDir, msg.run_id);
      await ensureDir(profileDir);
      
      // Write state.json
      await this.writeState(profileDir, msg.run_id, mode, answers);
      
      // Write to scratchbook.log
      const logPath = path.join(profileDir, 'scratchbook.log');
      await appendLog(logPath, `INIT run ${msg.run_id} mode=${mode}`);
      await appendLog(logPath, `USER_CONTEXT captured (7 answers)${useEnrichment ? ' with context-aware LLM enrichment' : ''}`);
      
      console.log(`✅ State saved to: ${profileDir}/state.json`);
      console.log(`📝 Log updated: ${profileDir}/scratchbook.log`);
      
      // Create and return next message
      const nextMessage = {
        run_id: msg.run_id,
        event: EventTypes.USER_CONTEXT_READY,
        from: this.id,
        to: NodeIds.PLAN,
        payload: {
          mode,
          answers
        },
        ts: getCurrentTimestamp()
      };
      
      console.log(`📤 Emitting message to ${NodeIds.PLAN}`);
      return nextMessage;
      
    } catch (error) {
      console.error(`❌ Error in ${this.id}:`, error.message);
      return null;
    }
  }

  /**
   * Collect user input through CLI prompts with optional LLM enrichment
   * @param {boolean} useEnrichment - Whether to use LLM enrichment
   * @returns {Promise<{mode: string, answers: Object}>}
   */
  async collectUserInput(useEnrichment = false) {
    // Select mode
    const { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'Select mode:',
        choices: [
          { name: 'Sales', value: 'sales' },
          { name: 'Investor', value: 'investor' }
        ]
      }
    ]);

    console.log(`\n📋 Mode: ${mode.toUpperCase()}`);
    console.log('Please answer the following questions:\n');

    const questions = QUESTIONS[mode];
    const answers = {};
    
    // Collect answers for each question
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      // Get initial answer
      const { answer } = await inquirer.prompt([
        {
          type: 'input',
          name: 'answer',
          message: `Q${i + 1} ${question.prompt}`,
          validate: (input) => {
            try {
              validateAnswer(input);
              return true;
            } catch (error) {
              return error.message;
            }
          }
        }
      ]);
      
      let enrichedData = null;
      
      // Apply LLM enrichment if enabled
      if (useEnrichment) {
        try {
          // Create a prompt function for follow-ups
          const promptFunction = async (followUpQuestion) => {
            const result = await inquirer.prompt([
              {
                type: 'input',
                name: 'answer',
                message: `   ${followUpQuestion}`,
                validate: (input) => {
                  if (!input || !input.trim()) {
                    throw new Error('skipping');
                  }
                  return true;
                }
              }
            ]);
            return result.answer;
          };
          
          // Pass existing answers as context to avoid repetition
          enrichedData = await this.enricher.enrichAnswer(
            question.prompt,
            answer,
            mode,
            promptFunction,
            answers // Pass existing answers for context
          );
        } catch (error) {
          console.log(`⚠️  Enrichment error for Q${i + 1}: ${error.message}`);
          enrichedData = {
            original: answer,
            enriched: [],
            classification: { needsEnrichment: false, reasoning: 'Error during enrichment' }
          };
        }
      }
      
      // Store the answer (with enrichment data if available)
      if (question.key === 'signals') {
        // Handle signals separately (split comma-separated values)
        const signalsArray = answer.split(',').map(s => s.trim()).slice(0, 2);
        answers[question.key] = {
          value: signalsArray,
          enrichment: enrichedData
        };
      } else {
        answers[question.key] = {
          value: answer,
          enrichment: enrichedData
        };
      }
    }

    return { mode, answers };
  }

  /**
   * Write state to state.json file with enriched structure
   * @param {string} profileDir 
   * @param {string} runId 
   * @param {string} mode 
   * @param {Object} answers 
   */
  async writeState(profileDir, runId, mode, answers) {
    // Transform answers to maintain backward compatibility while adding enrichment data
    const basicAnswers = {};
    const enrichmentData = {};
    
    for (const [key, data] of Object.entries(answers)) {
      basicAnswers[key] = data.value;
      if (data.enrichment) {
        enrichmentData[key] = data.enrichment;
      }
    }
    
    const state = {
      run_id: runId,
      mode: mode,
      profile: {
        answers: basicAnswers,
        enrichment: enrichmentData, // New field for enrichment data
        value_prop: "" // empty in Phase 1
      },
      personas: [],
      leads: [],
      outreach: [],
      inbound: [],
      triage: []
    };

    const statePath = path.join(profileDir, 'state.json');
    await writeJson(statePath, state);
  }
} 