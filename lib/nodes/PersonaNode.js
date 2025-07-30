import path from 'path';
import { EventTypes, NodeIds } from '../types.js';
import { readJson, writeJson, appendLog, getCurrentTimestamp } from '../utils.js';
import { LLMEnricher } from '../llm-enricher.js';

/**
 * PersonaNode generates 5 target personas based on user profile
 * Uses GPT-4o to create detailed, actionable personas for outreach
 */
export class PersonaNode {
  constructor() {
    this.id = NodeIds.PERSONA;
    this.handles = EventTypes.USER_CONTEXT_READY;
    this.enricher = new LLMEnricher(); // Reuse for GPT-4o access
  }

  /**
   * Generate 5 personas based on user profile
   * @param {Message} msg 
   * @param {Context} ctx 
   * @returns {Promise<Message|null>}
   */
  async run(msg, ctx) {
    try {
      console.log(`\n🎭 Starting ${this.id} for run: ${msg.run_id}`);
      
      // Load current state
      const profileDir = path.join(ctx.profilesDir, msg.run_id);
      const statePath = path.join(profileDir, 'state.json');
      const state = await readJson(statePath);
      
      if (!state) {
        throw new Error(`Could not load state for run ${msg.run_id}`);
      }
      
      console.log(`📋 Loaded profile: ${state.mode} mode`);
      console.log(`📝 Available context: ${Object.keys(state.profile.answers).length} answers`);
      
      // Check if LLM is available
      if (!this.enricher.isConfigured()) {
        console.log('⚠️  No OpenAI API key - using fallback personas');
        const fallbackPersonas = this.generateFallbackPersonas(state);
        await this.savePersonas(state, fallbackPersonas, profileDir);
        
        console.log(`📁 Personas saved to state.json`);
        
        // HALT HERE - Do not continue to search automatically  
        return null;
      }
      
      // Generate personas using GPT-4o
      console.log('🤖 Generating personas with GPT-4o...');
      const personas = await this.generatePersonasWithLLM(state);
      
      if (personas.length === 0) {
        throw new Error('Failed to generate personas');
      }
      
      console.log(`✅ Generated ${personas.length} personas`);
      
      // Save personas to state
      await this.savePersonas(state, personas, profileDir);
      
      // Log activity
      const logPath = path.join(profileDir, 'scratchbook.log');
      await appendLog(logPath, `PERSONAS generated: ${personas.length} target personas created`);
      
      console.log(`📁 Personas saved to state.json`);
      
      // HALT HERE - Do not continue to search automatically
      // Next step (SearchNode) will be called by the pipeline controller
      return null;
      
    } catch (error) {
      console.error(`❌ Error in ${this.id}:`, error.message);
      return null;
    }
  }

  /**
   * Generate personas using GPT-4o
   * @param {Object} state - Current state with profile data
   * @returns {Promise<Array>} Array of 5 personas
   */
  async generatePersonasWithLLM(state) {
    const profile = state.profile;
    const mode = state.mode;
    
    // Build comprehensive context from profile + enrichment
    let contextInfo = `MODE: ${mode}\n\nORIGINAL ANSWERS:\n`;
    for (const [key, value] of Object.entries(profile.answers)) {
      contextInfo += `${key}: ${Array.isArray(value) ? value.join(', ') : value}\n`;
    }
    
    // Add enrichment data if available
    if (profile.enrichment && Object.keys(profile.enrichment).length > 0) {
      contextInfo += `\nENRICHMENT DATA:\n`;
      for (const [key, enrichment] of Object.entries(profile.enrichment)) {
        if (enrichment && enrichment.enriched && enrichment.enriched.length > 0) {
          contextInfo += `${key} follow-ups:\n`;
          enrichment.enriched.forEach(item => {
            contextInfo += `  Q: ${item.question}\n  A: ${item.answer}\n`;
          });
        }
      }
    }

    const prompt = `You are creating 5 distinct target personas for ${mode} outreach based on the user's profile.

USER PROFILE:
${contextInfo}

Generate exactly 5 personas that represent different segments of the target market. Each persona should be:

For SALES mode:
- Different company types/sizes within the target market
- Different roles/seniority levels
- Different pain points or use cases
- Different decision-making processes
- Varied urgency levels or buying triggers

For INVESTOR mode:
- Different investor types (VC, angel, strategic, etc.)
- Different fund stages/sizes
- Different thesis areas or preferences
- Different geographic focuses
- Different check sizes or involvement levels

Each persona must include:
1. **name**: Creative but realistic name
2. **title**: Specific job title
3. **company**: Type/size of company (or fund for investors)
4. **profile**: 2-3 sentence description of their background and situation
5. **pain_points**: Array of 2-3 specific challenges they face
6. **motivations**: Array of 2-3 key drivers for their decisions
7. **search_query**: Specific search terms to find this persona (for lead generation)
8. **outreach_angle**: How to approach them based on their unique situation

Make personas realistic, specific, and actionable for outreach.

Respond with ONLY a JSON object:
{
  "personas": [
    {
      "name": "Sarah Chen",
      "title": "VP Engineering", 
      "company": "Series B SaaS startup (50-100 employees)",
      "profile": "Technical leader at a growing company. Responsible for team productivity and code quality. Reports to CTO and CEO on engineering metrics.",
      "pain_points": ["Code review bottlenecks", "Security vulnerabilities", "Team scaling challenges"],
      "motivations": ["Improve team efficiency", "Reduce technical debt", "Scale engineering processes"],
      "search_query": "VP Engineering Series B SaaS startup code review security",
      "outreach_angle": "Focus on team productivity metrics and scaling challenges"
    }
    // ... 4 more personas
  ]
}`;

    try {
      const response = await this.enricher.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      });

      const result = this.enricher.cleanAndParseJSON(response.choices[0].message.content);
      
      if (!result.personas || !Array.isArray(result.personas) || result.personas.length !== 5) {
        throw new Error('Invalid personas response - expected array of 5 personas');
      }
      
      // Validate persona structure
      for (const persona of result.personas) {
        const required = ['name', 'title', 'company', 'profile', 'pain_points', 'motivations', 'search_query', 'outreach_angle'];
        for (const field of required) {
          if (!persona[field]) {
            throw new Error(`Missing required field: ${field}`);
          }
        }
      }
      
      return result.personas;
      
    } catch (error) {
      console.error('❌ LLM Persona generation error:', error.message);
      // Fallback to basic personas
      return this.generateFallbackPersonas(state);
    }
  }

  /**
   * Generate fallback personas when LLM is not available
   * @param {Object} state 
   * @returns {Array} Fallback personas
   */
  generateFallbackPersonas(state) {
    const mode = state.mode;
    const target = state.profile.answers.target || 'target audience';
    const product = state.profile.answers.product || 'our solution';
    
    if (mode === 'sales') {
      return [
        {
          name: "Alex Johnson",
          title: "VP Sales",
          company: "Mid-size company",
          profile: `Sales leader looking for ways to improve team performance with ${product}.`,
          pain_points: ["Team efficiency", "Process optimization", "Results tracking"],
          motivations: ["Increase revenue", "Improve team performance", "Streamline operations"],
          search_query: `VP Sales ${target}`,
          outreach_angle: "Focus on sales performance and team efficiency"
        },
        {
          name: "Maria Rodriguez", 
          title: "Director of Operations",
          company: "Growing startup",
          profile: `Operations leader focused on scaling processes and implementing ${product}.`,
          pain_points: ["Scaling challenges", "Process bottlenecks", "Resource allocation"],
          motivations: ["Operational efficiency", "Cost reduction", "Growth support"],
          search_query: `Director Operations ${target}`,
          outreach_angle: "Emphasize operational efficiency and scaling"
        },
        {
          name: "David Kim",
          title: "CEO",
          company: "Small business",
          profile: `Founder looking for solutions like ${product} to drive business growth.`,
          pain_points: ["Limited resources", "Growth challenges", "Competitive pressure"],
          motivations: ["Business growth", "Competitive advantage", "Resource optimization"],
          search_query: `CEO founder ${target}`,
          outreach_angle: "Focus on business impact and ROI"
        },
        {
          name: "Jennifer Thompson",
          title: "Head of Product",
          company: "Tech company",
          profile: `Product leader interested in ${product} to enhance product development.`,
          pain_points: ["Product development speed", "Market fit", "User experience"],
          motivations: ["Product excellence", "User satisfaction", "Market success"],
          search_query: `Head Product ${target}`,
          outreach_angle: "Highlight product development benefits"
        },
        {
          name: "Robert Wilson",
          title: "CTO",
          company: "Enterprise",
          profile: `Technical executive evaluating ${product} for enterprise implementation.`,
          pain_points: ["Technical scalability", "Security concerns", "Integration challenges"],
          motivations: ["Technical excellence", "Security", "Scalable solutions"],
          search_query: `CTO ${target}`,
          outreach_angle: "Focus on technical benefits and security"
        }
      ];
    } else {
      // Investor mode fallback
      return [
        {
          name: "Sarah Venture",
          title: "Partner",
          company: "Series A VC Fund",
          profile: `Early-stage investor focused on B2B SaaS and tech companies.`,
          pain_points: ["Deal flow quality", "Due diligence efficiency", "Portfolio support"],
          motivations: ["High returns", "Market disruption", "Portfolio growth"],
          search_query: "Series A VC Partner B2B SaaS",
          outreach_angle: "Focus on market opportunity and traction"
        },
        {
          name: "Michael Angel",
          title: "Angel Investor",
          company: "Individual investor",
          profile: `Former founder now investing in early-stage startups.`,
          pain_points: ["Investment selection", "Founder quality", "Market timing"],
          motivations: ["Supporting founders", "Financial returns", "Industry impact"],
          search_query: "Angel investor former founder",
          outreach_angle: "Emphasize founder experience and vision"
        },
        {
          name: "Lisa Growth",
          title: "Principal",
          company: "Growth stage fund",
          profile: `Growth investor looking for proven business models ready to scale.`,
          pain_points: ["Scalability assessment", "Market expansion", "Unit economics"],
          motivations: ["Proven growth", "Market expansion", "Strong metrics"],
          search_query: "Growth stage VC Principal",
          outreach_angle: "Highlight proven traction and scalability"
        },
        {
          name: "James Strategic",
          title: "Director Corporate Ventures",
          company: "Fortune 500 company",
          profile: `Corporate investor looking for strategic partnerships and acquisitions.`,
          pain_points: ["Strategic fit", "Integration complexity", "ROI measurement"],
          motivations: ["Strategic advantage", "Innovation", "Market positioning"],
          search_query: "Corporate venture director",
          outreach_angle: "Focus on strategic partnership opportunities"
        },
        {
          name: "Emma Seed",
          title: "Managing Director",
          company: "Seed fund",
          profile: `Pre-seed and seed investor focused on technical innovation.`,
          pain_points: ["Early-stage risk", "Technical assessment", "Founder coachability"],
          motivations: ["Innovation potential", "Technical excellence", "Founder development"],
          search_query: "Seed fund managing director",
          outreach_angle: "Emphasize innovation and technical differentiation"
        }
      ];
    }
  }

  /**
   * Save personas to state file
   * @param {Object} state 
   * @param {Array} personas 
   * @param {string} profileDir 
   */
  async savePersonas(state, personas, profileDir) {
    // Update state with personas
    state.personas = personas;
    
    // Save updated state
    const statePath = path.join(profileDir, 'state.json');
    await writeJson(statePath, state);
  }

  // PersonaNode now HALTS after generating personas
  // The pipeline controller handles routing to the next step (SearchNode)
} 