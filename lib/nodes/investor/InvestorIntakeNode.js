import path from 'path';
import { EventTypes, NodeIds } from '../../types.js';
import { readJson, writeJson, appendLog, getCurrentTimestamp, generateRunId, ensureDir } from '../../utils.js';

/**
 * InvestorIntakeNode collects information about the company for investor outreach
 * Focuses on company technology, market position, funding needs, and growth metrics
 */
export class InvestorIntakeNode {
  constructor() {
    this.id = NodeIds.INVESTOR_INTAKE;
    this.handles = EventTypes.START;
  }

  /**
   * Define investor-focused questions
   * @returns {Array} Array of question objects
   */
  getInvestorQuestions() {
    return [
      {
        key: 'company_name',
        question: 'What is your company name?',
        required: true,
        validation: answer => answer.trim().length > 0
      },
      {
        key: 'technology',
        question: 'What is your core technology/product? (Describe your solution in 1-2 sentences)',
        required: true,
        validation: answer => answer.trim().length > 10
      },
      {
        key: 'market_size',
        question: 'What is your total addressable market (TAM)? Include market size and growth rate if known.',
        required: true,
        validation: answer => answer.trim().length > 5
      },
      {
        key: 'competitive_edge',
        question: 'What is your unique competitive advantage? What makes you different from competitors?',
        required: true,
        validation: answer => answer.trim().length > 10
      },
      {
        key: 'traction',
        question: 'What traction do you have? (Revenue, users, partnerships, key metrics, etc.)',
        required: true,
        validation: answer => answer.trim().length > 5
      },
      {
        key: 'funding_stage',
        question: 'What funding stage are you at? (pre-seed, seed, Series A, etc.) and how much are you raising?',
        required: true,
        validation: answer => answer.trim().length > 3
      },
      {
        key: 'use_of_funds',
        question: 'How will you use the funding? (team, product development, marketing, etc.)',
        required: true,
        validation: answer => answer.trim().length > 10
      },
      {
        key: 'geographic_focus',
        question: 'What geographic markets are you focusing on? (US, Europe, Global, etc.)',
        required: false,
        validation: answer => true
      }
    ];
  }

  /**
   * Main execution method
   * @param {Object} message - Incoming message
   * @param {Object} ctx - Application context
   * @returns {Promise<Object>} Next message for pipeline
   */
  async run(message, ctx) {
    const { run_id } = message;
    
    console.log(`🏢 InvestorIntakeNode: Starting company intake for ${run_id}`);
    
    // Initialize profile directory
    const profileDir = path.join(ctx.profilesDir, run_id);
    await ensureDir(profileDir);
    
    // Collect answers from user input or message payload
    const answers = message.payload?.answers || await this.collectAnswers();
    
    // Create initial state
    const state = {
      run_id,
      mode: 'investor',
      profile: {
        answers,
        company_info: {
          name: answers.company_name,
          technology: answers.technology,
          market_size: answers.market_size,
          competitive_edge: answers.competitive_edge,
          traction: answers.traction,
          funding_stage: answers.funding_stage,
          use_of_funds: answers.use_of_funds,
          geographic_focus: answers.geographic_focus || 'Global'
        },
        created_at: getCurrentTimestamp()
      },
      investors: [],
      outreach: [],
      investor_metadata: {
        intake_completed_at: getCurrentTimestamp(),
        questions_answered: Object.keys(answers).length
      }
    };
    
    // Save state
    const statePath = path.join(profileDir, 'state.json');
    await writeJson(statePath, state);
    
    // Log completion
    await appendLog(profileDir, `Investor intake completed: ${Object.keys(answers).length} questions answered`);
    
    console.log(`✅ Company profile created for ${answers.company_name}`);
    console.log(`📊 Funding stage: ${answers.funding_stage}`);
    console.log(`🎯 Market focus: ${answers.geographic_focus || 'Global'}`);
    
    // Create next message for investor persona generation
    return {
      run_id,
      event: EventTypes.INVESTOR_INTAKE_READY,
      from: this.id,
      to: NodeIds.INVESTOR_PERSONA,
      payload: {
        company_info: state.profile.company_info,
        answers: answers
      },
      ts: getCurrentTimestamp()
    };
  }

  /**
   * Collect answers interactively (for CLI mode)
   * @returns {Promise<Object>} Collected answers
   */
  async collectAnswers() {
    // This would be implemented for interactive CLI mode
    // For now, return empty object as answers should come from message payload
    console.log('📝 Interactive mode not implemented - answers should be provided in message payload');
    return {};
  }

  /**
   * Validate company information completeness
   * @param {Object} answers - User answers
   * @returns {Object} Validation result
   */
  validateCompanyInfo(answers) {
    const required = ['company_name', 'technology', 'market_size', 'competitive_edge', 'traction', 'funding_stage', 'use_of_funds'];
    const missing = required.filter(key => !answers[key] || answers[key].trim().length === 0);
    
    return {
      isValid: missing.length === 0,
      missing: missing,
      completeness: (required.length - missing.length) / required.length
    };
  }

  /**
   * Determine funding stage category
   * @param {string} fundingStage - Raw funding stage input
   * @returns {Object} Structured funding stage info
   */
  categorizeFundingStage(fundingStage) {
    const stage = fundingStage.toLowerCase();
    
    if (stage.includes('pre-seed') || stage.includes('preseed')) {
      return { stage: 'pre-seed', typical_check: '25K-250K', investor_types: ['angels', 'micro-VCs', 'accelerators'] };
    } else if (stage.includes('seed')) {
      return { stage: 'seed', typical_check: '500K-2M', investor_types: ['seed VCs', 'angels', 'accelerators'] };
    } else if (stage.includes('series a') || stage.includes('a round')) {
      return { stage: 'series-a', typical_check: '2M-15M', investor_types: ['VCs', 'growth funds'] };
    } else if (stage.includes('series b') || stage.includes('b round')) {
      return { stage: 'series-b', typical_check: '10M-50M', investor_types: ['VCs', 'growth funds', 'PE'] };
    } else {
      return { stage: 'unknown', typical_check: 'TBD', investor_types: ['various'] };
    }
  }
} 