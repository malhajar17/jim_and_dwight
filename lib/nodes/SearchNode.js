import path from 'path';
import { EventTypes, NodeIds } from '../types.js';
import { readJson, writeJson, appendLog, getCurrentTimestamp } from '../utils.js';
import { LLMEnricher } from '../llm-enricher.js';
import { JinaSearchAPI } from '../jina-search.js';

/**
 * SearchNode finds leads based on generated personas
 * Uses LLM to create search queries and Jina API to find REAL LinkedIn profiles + emails
 */
export class SearchNode {
  constructor() {
    this.id = NodeIds.SEARCH;
    this.handles = EventTypes.PERSONAS_READY;
    this.enricher = new LLMEnricher(); // For GPT-4o query generation
    this.jinaSearch = new JinaSearchAPI(); // For real search results
  }

  /**
   * Search for leads based on personas
   * @param {Message} msg 
   * @param {Context} ctx 
   * @returns {Promise<Message|null>}
   */
  async run(msg, ctx) {
    try {
      console.log(`\n🔍 Starting ${this.id} for run: ${msg.run_id}`);
      
      // Load current state
      const profileDir = path.join(ctx.profilesDir, msg.run_id);
      const statePath = path.join(profileDir, 'state.json');
      const state = await readJson(statePath);
      
      if (!state || !state.personas || state.personas.length === 0) {
        throw new Error(`No personas found for run ${msg.run_id}`);
      }
      
      console.log(`🎭 Found ${state.personas.length} personas to search for`);
      
      // Check API configurations
      const hasLLM = this.enricher.isConfigured();
      const hasJina = this.jinaSearch.isConfigured();
      
      console.log(`🤖 LLM (query generation): ${hasLLM ? '✅ Available' : '⚠️  Disabled'}`);
      console.log(`🔍 Jina API (real search): ${hasJina ? '✅ Available' : '⚠️  Disabled'}`);
      
      if (!hasJina) {
        console.log('❌ Cannot search without Jina API key. Please set JINA_API_KEY in .env');
        throw new Error('Jina API key required for real search results');
      }
      
      const allLeads = [];
      
      // Process each persona
      for (let i = 0; i < state.personas.length; i++) {
        const persona = state.personas[i];
        console.log(`\n👤 Processing persona ${i + 1}/${state.personas.length}: ${persona.name}`);
        
        // Generate search queries for this persona
        const queries = await this.generateSearchQueries(persona, state.mode, hasLLM);
        console.log(`📝 Generated ${queries.length} search queries`);
        
        // Search for REAL leads using Jina API
        const personaLeads = await this.searchForRealLeads(persona, queries);
        console.log(`✅ Found ${personaLeads.length} REAL leads for ${persona.name}`);
        
        allLeads.push(...personaLeads);
        
        // Add delay between personas to be respectful to APIs
        if (i < state.personas.length - 1) {
          console.log('⏳ Waiting 3 seconds before next persona...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      console.log(`\n📊 Total REAL leads collected: ${allLeads.length}`);
      
      // Validate leads with LLM to filter out companies and generic names  
      if (hasLLM && allLeads.length > 0) {
        console.log('\n🔍 Validating leads to filter out companies and generic names...');
        await this.validateLeadsWithLLM(allLeads);
        
        // Filter out invalid leads
        const validLeads = allLeads.filter(lead => lead.is_valid_person !== false);
        const filteredCount = allLeads.length - validLeads.length;
        
        if (filteredCount > 0) {
          console.log(`🚫 Filtered out ${filteredCount} invalid leads (companies, generic names, etc.)`);
          console.log(`✅ ${validLeads.length} valid leads remaining`);
        }
        
        // Update allLeads to only include valid ones
        allLeads.length = 0;
        allLeads.push(...validLeads);
      }
      
      // Note: RocketReach enrichment will be handled in the next pipeline step
      
      // Enhance leads with LLM if available (only new leads, not existing ones)
      if (hasLLM && allLeads.length > 0) {
        console.log('🤖 Enhancing lead data with LLM...');
        await this.enhanceLeadsWithLLM(allLeads, state.mode);
      }
      
      // Merge new leads with updated existing leads
      const finalLeads = [...(state.leads || []), ...allLeads];
      
      // Save leads to state
      await this.saveLeads(state, finalLeads, profileDir);
      
      // Log activity
      const logPath = path.join(profileDir, 'scratchbook.log');
      
      await appendLog(logPath, `SEARCH completed: ${allLeads.length} REAL leads found via Jina API across ${state.personas.length} personas.`);
      
      console.log('📁 REAL leads saved to state.json');
      console.log(`🎉 Search phase completed successfully with ${allLeads.length} validated leads!`);
      console.log('💡 Next: RocketReach enrichment and competitive intelligence analysis');
      
      // End pipeline successfully - no next message
      return null;
      
    } catch (error) {
      console.error(`❌ Error in ${this.id}:`, error.message);
      return null;
    }
  }

  /**
   * Generate search queries for a persona using LLM
   * @param {Object} persona 
   * @param {string} mode 
   * @param {boolean} hasLLM 
   * @returns {Promise<Array>} Array of search queries
   */
  async generateSearchQueries(persona, mode, hasLLM) {
    if (!hasLLM) {
      // Much simpler fallback queries that are more likely to work
      return [
        `${persona.title} LinkedIn France`,
        `${persona.title} France banking`,
        `${persona.title} France insurance`,
        `CIO France LinkedIn`,
        `IT Director France LinkedIn`
      ];
    }

    const prompt = `Generate 5 simple, lightweight search queries to find LinkedIn profiles for French banking/insurance executives.

PERSONA DETAILS:
Title: ${persona.title}  
Company Type: ${persona.company}

Create SIMPLE queries that are likely to return results:
- Keep queries short and focused
- Avoid complex operators like site: or multiple quotes
- Focus on job title + location + industry
- Make queries broad enough to find results
- Use natural language, not search operators

Good examples:
- "CIO France LinkedIn"
- "IT Director France banking" 
- "Chief Technology Officer France"
- "Director IT France insurance"
- "${persona.title} France LinkedIn"

Respond with ONLY a JSON object:
{
  "queries": [
    "CIO France LinkedIn",
    "IT Director France banking",
    "Chief Technology Officer France", 
    "Director IT France insurance",
    "${persona.title} France LinkedIn"
  ]
}`;

    try {
      const response = await this.enricher.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 600
      });

      const result = this.enricher.cleanAndParseJSON(response.choices[0].message.content);
      
      if (!result.queries || !Array.isArray(result.queries)) {
        throw new Error('Invalid queries response');
      }
      
      return result.queries;
      
    } catch (error) {
      console.error('❌ LLM Query generation error:', error.message);
      // Simple fallback queries that are more likely to work
      return [
        `${persona.title} LinkedIn France`,
        `${persona.title} France banking`,
        `${persona.title} France insurance`,
        `CIO France LinkedIn`,
        `IT Director France LinkedIn`
      ];
    }
  }

  /**
   * Search for REAL leads using Jina API
   * @param {Object} persona 
   * @param {Array} queries 
   * @returns {Promise<Array>} Array of real leads
   */
  async searchForRealLeads(persona, queries) {
    const allLeads = [];
    const targetLeadsPerPersona = 10;
    
    console.log(`🔍 Searching for REAL leads using Jina API...`);
    
    // Execute each query via Jina API
    for (let i = 0; i < queries.length && allLeads.length < targetLeadsPerPersona; i++) {
      const query = queries[i];
      
      try {
        console.log(`  Query ${i + 1}/${queries.length}: "${query}"`);
        
        // Search via Jina API
        const searchResults = await this.jinaSearch.search(query, 5); // Get 5 results per query
        
        // Process and format results for this persona
        const processedLeads = searchResults.map(result => ({
          ...result,
          persona_id: persona.name,
          persona_match_reasons: [
            `Found via targeted search for ${persona.title}`,
            `Query match: "${query}"`,
            `Company type aligns with ${persona.company}`,
            `Geographic match: France`
          ]
        }));
        
        allLeads.push(...processedLeads);
        
        console.log(`    ✅ Found ${searchResults.length} real leads`);
        
        // Brief delay between queries
        if (i < queries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`    ❌ Query failed: ${error.message}`);
        continue; // Try next query
      }
    }
    
    // Limit to target number per persona and remove duplicates
    const uniqueLeads = this.removeDuplicateLeads(allLeads);
    return uniqueLeads.slice(0, targetLeadsPerPersona);
  }

  /**
   * Remove duplicate leads based on email and LinkedIn URL
   * @param {Array} leads 
   * @returns {Array}
   */
  removeDuplicateLeads(leads) {
    const seen = new Set();
    return leads.filter(lead => {
      const key = `${lead.email}_${lead.linkedin_url}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Enhance lead data using LLM to improve titles and company info
   * @param {Array} leads 
   * @param {string} mode 
   */
  async enhanceLeadsWithLLM(leads, mode) {
    console.log(`🤖 Enhancing ${leads.length} leads with LLM...`);
    
    // Process leads in batches to avoid API limits
    const batchSize = 5;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      
      try {
        await this.enhanceBatchWithLLM(batch, mode);
        console.log(`  Enhanced batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(leads.length/batchSize)}`);
        
        // Brief delay between batches
        if (i + batchSize < leads.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`  ❌ Failed to enhance batch: ${error.message}`);
      }
    }
  }

  /**
   * Enhance a batch of leads with LLM
   * @param {Array} batch 
   * @param {string} mode 
   */
  async enhanceBatchWithLLM(batch, mode) {
    const prompt = `Enhance these lead profiles found via search. Fill in missing information and improve titles/companies based on context.

LEADS TO ENHANCE:
${batch.map((lead, i) => `
${i + 1}. Name: ${lead.name}
   Title: ${lead.title}
   Company: ${lead.company}
   Email: ${lead.email}
   Raw Context: ${lead.raw_data || 'N/A'}
`).join('')}

For each lead, provide enhanced information for French ${mode === 'sales' ? 'banking/insurance' : 'investment'} outreach:
- Improve title if generic (make it more specific and French if appropriate)
- Enhance company name if generic
- Add relevant location details for France
- Ensure information matches French business context

Respond with ONLY a JSON object:
{
  "enhanced_leads": [
    {
      "index": 0,
      "enhanced_title": "specific enhanced title",
      "enhanced_company": "specific company name",
      "enhanced_location": "City, France",
      "relevance_score": 0.85
    }
  ]
}`;

    try {
      const response = await this.enricher.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 800
      });

      const result = this.enricher.cleanAndParseJSON(response.choices[0].message.content);
      
      if (result.enhanced_leads && Array.isArray(result.enhanced_leads)) {
        // Apply enhancements to the batch
        result.enhanced_leads.forEach(enhancement => {
          const leadIndex = enhancement.index;
          if (leadIndex >= 0 && leadIndex < batch.length) {
            const lead = batch[leadIndex];
            if (enhancement.enhanced_title) lead.title = enhancement.enhanced_title;
            if (enhancement.enhanced_company) lead.company = enhancement.enhanced_company;
            if (enhancement.enhanced_location) lead.location = enhancement.enhanced_location;
            if (enhancement.relevance_score) lead.confidence_score = Math.max(lead.confidence_score, enhancement.relevance_score);
            
            lead.llm_enhanced = true;
          }
        });
      }
      
    } catch (error) {
      console.error('LLM enhancement error:', error.message);
      // Continue without enhancement
      }
}

  /**
   * Save leads to state file
   * @param {Object} state 
   * @param {Array} leads 
   * @param {string} profileDir 
   */
  async saveLeads(state, leads, profileDir) {
    // Update state with leads
    state.leads = leads;
    
    // Add search metadata
    state.search_metadata = {
      total_leads: leads.length,
      leads_per_persona: {},
      search_completed_at: getCurrentTimestamp(),
      search_method: 'jina_api',
      real_data: true,
      llm_enhanced: leads.some(lead => lead.llm_enhanced)
    };
    
    // Count leads per persona
    for (const lead of leads) {
      const personaId = lead.persona_id;
      if (!state.search_metadata.leads_per_persona[personaId]) {
        state.search_metadata.leads_per_persona[personaId] = 0;
      }
      state.search_metadata.leads_per_persona[personaId]++;
    }
    
    // Save updated state
    const statePath = path.join(profileDir, 'state.json');
    await writeJson(statePath, state);
  }



  // RocketReach enrichment is done ONCE per lead - no re-processing of existing leads

  // RocketReach enrichment moved to EnrichNode for better separation of concerns



  /**
   * Validate leads with LLM to filter out companies and generic names
   * @param {Array} leads 
   */
  async validateLeadsWithLLM(leads) {
    console.log(`🔍 Validating ${leads.length} leads to ensure they are real people...`);
    
    // Process leads in batches to avoid token limits
    const batchSize = 10;
    let validatedCount = 0;
    let filteredCount = 0;
    
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      
      const prompt = `Validate these lead profiles to determine if they represent REAL PEOPLE or should be filtered out.

FILTER OUT if:
- Name is a company name (e.g., "BNP Paribas", "Societe Generale") 
- Name is generic (e.g., "Professional", "Manager", "Director")
- Name contains company identifiers (e.g., "BNP Paribas'", "France", organization names)
- Name is clearly not a person's first/last name

KEEP if:
- Name appears to be a real person's first and last name
- Has realistic personal details that match a real individual

LEADS TO VALIDATE:
${batch.map((lead, idx) => `
${idx + 1}. Name: "${lead.name}"
   Title: ${lead.title}
   Company: ${lead.company}
`).join('')}

Respond with ONLY a JSON object:
{
  "validations": [
    {"index": 0, "is_valid_person": true, "reason": "Real person name"},
    {"index": 1, "is_valid_person": false, "reason": "Company name, not a person"}
  ]
}`;

      try {
        const response = await this.enricher.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 600
        });

        const result = this.enricher.cleanAndParseJSON(response.choices[0].message.content);
        
        if (result.validations && Array.isArray(result.validations)) {
          result.validations.forEach(validation => {
            const batchIndex = validation.index;
            const globalIndex = i + batchIndex;
            
            if (batchIndex >= 0 && batchIndex < batch.length && globalIndex < leads.length) {
              const lead = leads[globalIndex];
              lead.is_valid_person = validation.is_valid_person;
              lead.validation_reason = validation.reason;
              
              if (validation.is_valid_person) {
                validatedCount++;
                console.log(`   ✅ ${lead.name} - ${validation.reason}`);
              } else {
                filteredCount++;
                console.log(`   ❌ ${lead.name} - ${validation.reason}`);
              }
            }
          });
        }
        
      } catch (error) {
        console.error(`❌ LLM validation error for batch ${Math.floor(i/batchSize) + 1}:`, error.message);
        // Mark all leads in this batch as valid to be safe
        batch.forEach(lead => {
          lead.is_valid_person = true;
          lead.validation_reason = 'Validation failed, kept by default';
          validatedCount++;
        });
      }
      
      // Brief delay between batches
      if (i + batchSize < leads.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`🎯 Validation completed: ${validatedCount} valid, ${filteredCount} filtered`);
  }
} 