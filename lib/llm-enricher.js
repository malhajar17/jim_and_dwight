import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * LLM-powered answer enricher using GPT-4o
 * Classifies answer richness and generates follow-up questions
 */
export class LLMEnricher {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Clean and parse JSON response from GPT-4o
   * @param {string} response - Raw response from GPT-4o
   * @returns {Object} Parsed JSON object
   */
  cleanAndParseJSON(response) {
    try {
      // Remove markdown code blocks if present
      let cleaned = response.trim();
      
      // Remove ```json and ``` if present
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to parse the JSON
      return JSON.parse(cleaned.trim());
    } catch (error) {
      console.error('JSON parsing error:', error.message);
      console.error('Raw response:', response);
      throw new Error(`Failed to parse JSON: ${error.message}`);
    }
  }

  /**
   * Classify if an answer is rich enough or needs enrichment
   * @param {string} question - The original question
   * @param {string} answer - User's answer
   * @param {string} mode - 'sales' or 'investor'
   * @returns {Promise<{needsEnrichment: boolean, reasoning: string}>}
   */
  async classifyAnswerRichness(question, answer, mode) {
    const prompt = `You are evaluating if a user's answer for ${mode} outreach is RICH ENOUGH or needs enrichment.

QUESTION: ${question}
ANSWER: ${answer}

An answer is RICH ENOUGH if it contains MOST of these elements:
- Specific details (not just generic terms)
- Clear target audience or market segment
- Concrete metrics, numbers, or proof points
- Actionable information for outreach
- Sufficient context to understand the value proposition

Examples of RICH ENOUGH answers:
- "AI-powered code review tool that reduces review time by 80% for Series A startups"
- "Engineering managers at 50-200 person SaaS companies using GitHub"
- "Saves teams 10+ hours/week, deployed at Stripe, Airbnb, and 20+ startups"
- "Freemium model with $99/month pro plans, targeting DevOps teams"

Examples that NEED ENRICHMENT:
- "AI tool" (too vague)
- "Managers" (no specificity)
- "Saves time" (no quantification)
- "B2B software" (too generic)

Be LENIENT - if the answer provides reasonable specificity and context, mark it as rich enough.

Respond with ONLY a JSON object:
{
  "needsEnrichment": false,
  "reasoning": "Specific explanation of your decision"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 400
      });

      const result = this.cleanAndParseJSON(response.choices[0].message.content);
      
      // Validate the response structure
      if (typeof result.needsEnrichment !== 'boolean' || typeof result.reasoning !== 'string') {
        throw new Error('Invalid response structure');
      }
      
      return result;
    } catch (error) {
      console.error('❌ LLM Classification error:', error.message);
      // Fallback: assume no enrichment needed if API fails (less aggressive)
      return {
        needsEnrichment: false,
        reasoning: "API error - assuming answer is sufficient"
      };
    }
  }

  /**
   * Generate contextual follow-up questions that avoid repetition
   * @param {string} question - Original question
   * @param {string} answer - User's answer
   * @param {string} mode - 'sales' or 'investor'
   * @param {Object} existingContext - Previously collected information
   * @returns {Promise<string[]>} Array of follow-up questions (max 3)
   */
  async generateFollowUpQuestions(question, answer, mode, existingContext = {}) {
    // Build comprehensive context of what we already know
    let contextInfo = '';
    
    for (const [key, data] of Object.entries(existingContext)) {
      if (data && data.value) {
        contextInfo += `\n${key}: ${Array.isArray(data.value) ? data.value.join(', ') : data.value}`;
        
        // Include all enrichment history (follow-up Q&As)
        if (data.enrichment && data.enrichment.enriched && data.enrichment.enriched.length > 0) {
          contextInfo += `\n  Follow-ups already asked for ${key}:`;
          for (const enrichment of data.enrichment.enriched) {
            contextInfo += `\n    Q: ${enrichment.question}`;
            contextInfo += `\n    A: ${enrichment.answer}`;
          }
        }
      }
    }

    const prompt = `You are generating follow-up questions to enrich a ${mode} outreach answer. Be EXTREMELY SELECTIVE - only ask for truly missing critical information.

ORIGINAL QUESTION: ${question}
USER'S CURRENT ANSWER: ${answer}

COMPLETE CONVERSATION HISTORY:${contextInfo || '\nNone yet'}

Generate 1-3 follow-up questions ONLY if they would add CRITICAL missing information that has NOT been covered yet.

STRICT RULES:
- DO NOT repeat any question that has already been asked (check the follow-up history above)
- DO NOT ask about information already provided in any previous answers
- DO NOT ask variations of questions already answered
- ONLY ask for essential missing information that would significantly improve outreach effectiveness

Focus on the most important missing pieces:

For SALES mode prioritize:
- Specific target company characteristics (size, industry, tech stack) - if not already known
- Quantified pain points (time/money saved, current cost) - if not already quantified
- Concrete differentiation from competitors - if not already specified
- Specific proof points (metrics, customer names, results) - if not already provided

For INVESTOR mode prioritize:
- Market size and growth metrics - if not already provided
- Specific traction numbers (revenue, users, growth rate) - if not already given
- Clear competitive advantages - if not already explained
- Team/execution specifics - if not already covered

If all critical information is already available from the conversation history, return an empty questions array.

Respond with ONLY a JSON object:
{
  "questions": ["Only truly new critical question?"]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 600
      });

      const result = this.cleanAndParseJSON(response.choices[0].message.content);
      
      // Validate the response structure
      if (!Array.isArray(result.questions)) {
        throw new Error('Invalid response structure - questions should be an array');
      }
      
      return result.questions.slice(0, 3); // Ensure max 3 questions
    } catch (error) {
      console.error('❌ LLM Follow-up generation error:', error.message);
      // Fallback: return no questions instead of generic ones
      return [];
    }
  }

  /**
   * Complete enrichment process for a single answer with context awareness
   * @param {string} question - Original question
   * @param {string} answer - User's initial answer
   * @param {string} mode - 'sales' or 'investor'
   * @param {function} promptFunction - Function to prompt user for input
   * @param {Object} existingAnswers - All answers collected so far
   * @returns {Promise<{original: string, enriched: string[], classification: object}>}
   */
  async enrichAnswer(question, answer, mode, promptFunction, existingAnswers = {}) {
    console.log(`\n🤖 LLM analyzing answer richness...`);
    
    // Step 1: Classify answer richness
    const classification = await this.classifyAnswerRichness(question, answer, mode);
    
    console.log(`📊 Analysis: ${classification.reasoning}`);
    
    if (!classification.needsEnrichment) {
      console.log(`✅ Answer is rich enough - no follow-ups needed`);
      return {
        original: answer,
        enriched: [],
        classification
      };
    }

    // Step 2: Generate context-aware follow-up questions
    console.log(`🔍 Generating context-aware follow-up questions...`);
    const followUps = await this.generateFollowUpQuestions(question, answer, mode, existingAnswers);
    
    if (followUps.length === 0) {
      console.log(`💡 No additional information needed based on existing context`);
      return {
        original: answer,
        enriched: [],
        classification: { ...classification, needsEnrichment: false, reasoning: 'Sufficient context already available' }
      };
    }

    console.log(`📝 Got ${followUps.length} context-aware follow-up question(s)`);
    
    // Step 3: Ask follow-up questions
    const enrichedAnswers = [];
    for (let i = 0; i < followUps.length; i++) {
      const followUpQuestion = followUps[i];
      console.log(`\n💡 Follow-up ${i + 1}/${followUps.length}:`);
      
      try {
        const followUpAnswer = await promptFunction(followUpQuestion);
        if (followUpAnswer && followUpAnswer.trim()) {
          enrichedAnswers.push({
            question: followUpQuestion,
            answer: followUpAnswer.trim()
          });
        }
      } catch (error) {
        console.log(`⏭️  Skipping remaining follow-ups: ${error.message}`);
        break; // Stop asking more questions if user wants to skip
      }
    }

    console.log(`✅ Collected ${enrichedAnswers.length} enriched answer(s)`);
    
    return {
      original: answer,
      enriched: enrichedAnswers,
      classification
    };
  }

  /**
   * Check if API key is configured
   * @returns {boolean}
   */
  isConfigured() {
    return !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here');
  }
} 