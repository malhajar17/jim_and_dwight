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
      
      // Also update existing leads with RocketReach data if they have poor contact info
      const existingLeads = state.leads || [];
      if (existingLeads.length > 0) {
        console.log(`\n🔄 Found ${existingLeads.length} existing leads in database`);
        await this.updateExistingLeadsWithRocketReach(existingLeads);
        console.log(`📊 Updated existing leads with RocketReach data`);
      }
      
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
      
      // Enrich leads with RocketReach contact information
      if (allLeads.length > 0) {
        console.log('\n🚀 Enriching leads with RocketReach contact information...');
        await this.enrichLeadsWithRocketReach(allLeads);
      }
      
      // Enhance leads with LLM if available
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
      const rocketReachCount = allLeads.filter(lead => lead.rocketreach_enriched).length;
      const existingUpdatedCount = (state.leads || []).filter(lead => lead.rocketreach_updated).length;
      
      await appendLog(logPath, `SEARCH completed: ${allLeads.length} REAL leads found via Jina API across ${state.personas.length} personas. ${rocketReachCount} new leads enriched with RocketReach. ${existingUpdatedCount} existing leads updated with better RocketReach data.`);
      
      console.log('📁 REAL leads saved to state.json');
      console.log(`🎉 Search phase completed successfully with ${allLeads.length} validated leads!`);
      console.log(`🚀 RocketReach enrichment: ${rocketReachCount}/${allLeads.length} new leads enriched with contact data`);
      console.log(`🔄 Existing leads updated: ${existingUpdatedCount} leads improved with better RocketReach data`);
      console.log('💡 To enrich leads with competitive intelligence, run:');
      console.log(`   npm run dev-mode profiles/${msg.run_id}/state.json enrich`);
      
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
    const existingLeadsUpdated = (state.leads || []).filter(lead => lead.rocketreach_updated).length;
    
    state.search_metadata = {
      total_leads: leads.length,
      leads_per_persona: {},
      search_completed_at: getCurrentTimestamp(),
      search_method: 'jina_api',
      real_data: true,
      llm_enhanced: leads.some(lead => lead.llm_enhanced),
      rocketreach_enriched: leads.filter(lead => lead.rocketreach_enriched).length,
      rocketreach_success_rate: leads.length > 0 ? 
        Math.round((leads.filter(lead => lead.rocketreach_enriched).length / leads.length) * 100) + '%' : '0%',
      existing_leads_updated: existingLeadsUpdated,
      existing_leads_total: (state.leads || []).length
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



  /**
   * Update existing leads with RocketReach contact information if they have poor quality data
   * @param {Array} existingLeads 
   */
  async updateExistingLeadsWithRocketReach(existingLeads) {
    console.log(`🔄 Updating existing leads with RocketReach contact data...`);
    
    // Identify leads that need RocketReach updates
    const leadsToUpdate = existingLeads.filter(lead => this.needsRocketReachUpdate(lead));
    
    if (leadsToUpdate.length === 0) {
      console.log('✅ All existing leads already have good contact information');
      return;
    }
    
    console.log(`📋 Found ${leadsToUpdate.length} leads that need RocketReach updates:`);
    leadsToUpdate.forEach((lead, index) => {
      const issues = this.identifyContactIssues(lead);
      console.log(`   ${index + 1}. ${lead.name} - Issues: ${issues.join(', ')}`);
    });
    
    let updatedCount = 0;
    let failedCount = 0;
    
    // Process leads one by one to avoid overwhelming the API
    for (let i = 0; i < leadsToUpdate.length; i++) {
      const lead = leadsToUpdate[i];
      
      try {
        console.log(`\n  ${i + 1}/${leadsToUpdate.length}: Updating ${lead.name} with RocketReach...`);
        
        // Search for RocketReach profile
        const rocketReachQuery = `${lead.name} rocket reach`;
        const searchResults = await this.jinaSearch.search(rocketReachQuery, 3);
        
        // Find RocketReach results
        const rocketReachResults = searchResults.filter(result => 
          result.url && result.url.includes('rocketreach.co')
        );
        
        if (rocketReachResults.length > 0) {
          console.log(`    ✅ Found RocketReach profile`);
          
          // Get the best RocketReach result
          const bestResult = rocketReachResults[0];
          
          // Try to scrape RocketReach page for detailed contact info
          const contactInfo = await this.extractRocketReachContactInfo(bestResult.url, lead.name);
          
          if (contactInfo) {
            // Track what was updated
            const updates = [];
            
            // Update email if RocketReach has better data
            if (contactInfo.email && this.isEmailBetter(contactInfo.email, lead.email)) {
              const oldEmail = lead.email;
              lead.email = contactInfo.email;
              updates.push(`📧 Email: ${oldEmail} → ${contactInfo.email}`);
            }
            
            // Update LinkedIn if RocketReach has better data
            if (contactInfo.linkedin_url && this.isLinkedInBetter(contactInfo.linkedin_url, lead.linkedin_url)) {
              const oldLinkedIn = lead.linkedin_url;
              lead.linkedin_url = contactInfo.linkedin_url;
              updates.push(`🔗 LinkedIn: ${oldLinkedIn ? 'Updated' : 'Added'} → ${contactInfo.linkedin_url}`);
            }
            
            // Update company if RocketReach has better data
            if (contactInfo.company && this.isCompanyBetter(contactInfo.company, lead.company)) {
              const oldCompany = lead.company;
              lead.company = contactInfo.company;
              updates.push(`🏢 Company: ${oldCompany} → ${contactInfo.company}`);
            }
            
            // Update title if RocketReach has better data
            if (contactInfo.title && this.isTitleBetter(contactInfo.title, lead.title)) {
              const oldTitle = lead.title;
              lead.title = contactInfo.title;
              updates.push(`💼 Title: ${oldTitle} → ${contactInfo.title}`);
            }
            
            // Update location if missing or better
            if (contactInfo.location && (!lead.location || lead.location === 'Unknown')) {
              const oldLocation = lead.location || 'None';
              lead.location = contactInfo.location;
              updates.push(`📍 Location: ${oldLocation} → ${contactInfo.location}`);
            }
            
            if (updates.length > 0) {
              // Mark as RocketReach updated
              lead.rocketreach_updated = true;
              lead.rocketreach_url = bestResult.url;
              lead.rocketreach_update_timestamp = new Date().toISOString();
              lead.rocketreach_updates = updates;
              
              console.log(`    ✅ Updated ${updates.length} fields:`);
              updates.forEach(update => console.log(`      ${update}`));
              
              updatedCount++;
            } else {
              console.log(`    ⚠️  RocketReach found but no better data available`);
            }
          } else {
            console.log(`    ⚠️  Found RocketReach profile but couldn't extract contact info`);
            failedCount++;
          }
        } else {
          console.log(`    ❌ No RocketReach profile found`);
          failedCount++;
        }
        
      } catch (error) {
        console.error(`    ❌ RocketReach update failed for ${lead.name}: ${error.message}`);
        failedCount++;
      }
      
      // Add delay between searches to be respectful
      if (i < leadsToUpdate.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n🎯 Existing leads update completed: ${updatedCount} updated, ${failedCount} failed`);
  }

  /**
   * Check if a lead needs RocketReach update based on contact quality
   * @param {Object} lead 
   * @returns {boolean}
   */
  needsRocketReachUpdate(lead) {
    if (lead.rocketreach_updated) return false; // Already updated
    
    const hasLowQualityEmail = this.hasLowQualityEmail(lead.email);
    const hasLowQualityLinkedIn = this.hasLowQualityLinkedIn(lead.linkedin_url);
    const hasLowQualityCompany = this.hasLowQualityCompany(lead.company);
    const missingLocation = !lead.location || lead.location === 'Unknown';
    
    return hasLowQualityEmail || hasLowQualityLinkedIn || hasLowQualityCompany || missingLocation;
  }

  /**
   * Identify specific contact issues for a lead
   * @param {Object} lead 
   * @returns {Array} Array of issue descriptions
   */
  identifyContactIssues(lead) {
    const issues = [];
    
    if (this.hasLowQualityEmail(lead.email)) {
      issues.push('Fake/Generic Email');
    }
    
    if (this.hasLowQualityLinkedIn(lead.linkedin_url)) {
      issues.push('Not LinkedIn URL');
    }
    
    if (this.hasLowQualityCompany(lead.company)) {
      issues.push('Generic Company');
    }
    
    if (!lead.location || lead.location === 'Unknown') {
      issues.push('Missing Location');
    }
    
    return issues;
  }

  /**
   * Check if email is low quality (fake/generic)
   * @param {string} email 
   * @returns {boolean}
   */
  hasLowQualityEmail(email) {
    if (!email) return true;
    
    // Check for generic/fake patterns
    const lowQualityPatterns = [
      '@financialservic.com.fr',
      '@example.com',
      '@test.com',
      '@placeholder.com',
      'noreply@',
      'support@',
      'info@'
    ];
    
    return lowQualityPatterns.some(pattern => email.includes(pattern));
  }

  /**
   * Check if LinkedIn URL is low quality (not actually LinkedIn)
   * @param {string} linkedinUrl 
   * @returns {boolean}
   */
  hasLowQualityLinkedIn(linkedinUrl) {
    if (!linkedinUrl) return true;
    
    // Must be actual LinkedIn profile URL
    const linkedinPattern = /^https?:\/\/(www\.)?linkedin\.com\/in\//;
    return !linkedinPattern.test(linkedinUrl);
  }

  /**
   * Check if company name is low quality/generic
   * @param {string} company 
   * @returns {boolean}
   */
  hasLowQualityCompany(company) {
    if (!company) return true;
    
    const genericCompanies = [
      'Financial Services Company',
      'Services Financiers Européens',
      'Group Financial Services',
      'Unknown Company',
      'Company',
      'Corporation'
    ];
    
    return genericCompanies.includes(company);
  }

  /**
   * Check if new email is better than current email
   * @param {string} newEmail 
   * @param {string} currentEmail 
   * @returns {boolean}
   */
  isEmailBetter(newEmail, currentEmail) {
    if (!currentEmail) return true; // Any email is better than none
    if (this.hasLowQualityEmail(currentEmail) && !this.hasLowQualityEmail(newEmail)) {
      return true; // Replace low quality with high quality
    }
    return false;
  }

  /**
   * Check if new LinkedIn URL is better than current one
   * @param {string} newLinkedIn 
   * @param {string} currentLinkedIn 
   * @returns {boolean}
   */
  isLinkedInBetter(newLinkedIn, currentLinkedIn) {
    if (!currentLinkedIn) return true; // Any LinkedIn is better than none
    if (this.hasLowQualityLinkedIn(currentLinkedIn) && !this.hasLowQualityLinkedIn(newLinkedIn)) {
      return true; // Replace non-LinkedIn URL with real LinkedIn
    }
    return false;
  }

  /**
   * Check if new company is better than current company
   * @param {string} newCompany 
   * @param {string} currentCompany 
   * @returns {boolean}
   */
  isCompanyBetter(newCompany, currentCompany) {
    if (!currentCompany) return true; // Any company is better than none
    if (this.hasLowQualityCompany(currentCompany) && !this.hasLowQualityCompany(newCompany)) {
      return true; // Replace generic with specific
    }
    return false;
  }

  /**
   * Check if new title is better than current title
   * @param {string} newTitle 
   * @param {string} currentTitle 
   * @returns {boolean}
   */
  isTitleBetter(newTitle, currentTitle) {
    if (!currentTitle || currentTitle === 'Professional') return true;
    if (newTitle.length > currentTitle.length && !newTitle.includes(currentTitle)) {
      return true; // More specific title
    }
    return false;
  }

  /**
   * Enrich leads with RocketReach contact information
   * @param {Array} leads 
   */
  async enrichLeadsWithRocketReach(leads) {
    // Filter out leads that already have RocketReach data to prevent duplication
    const leadsNeedingEnrichment = leads.filter(lead => !lead.rocketreach_enriched && !lead.rocketreach_attempted);
    
    if (leadsNeedingEnrichment.length === 0) {
      console.log(`✅ All ${leads.length} leads already have RocketReach data - skipping enrichment`);
      return;
    }
    
    console.log(`🚀 Enriching ${leadsNeedingEnrichment.length}/${leads.length} leads with RocketReach contact data...`);
    if (leads.length > leadsNeedingEnrichment.length) {
      console.log(`   ⏩ Skipping ${leads.length - leadsNeedingEnrichment.length} leads that already have RocketReach data`);
    }
    
    let enrichedCount = 0;
    let failedCount = 0;
    
    // Process leads one by one to avoid overwhelming the API
    for (let i = 0; i < leadsNeedingEnrichment.length; i++) {
      const lead = leadsNeedingEnrichment[i];
      
      try {
        console.log(`  ${i + 1}/${leadsNeedingEnrichment.length}: Searching RocketReach for ${lead.name}...`);
        
        // Search for RocketReach profile
        const rocketReachQuery = `${lead.name} rocket reach`;
        const searchResults = await this.jinaSearch.search(rocketReachQuery, 3);
        
        // Find RocketReach results
        const rocketReachResults = searchResults.filter(result => 
          result.url && result.url.includes('rocketreach.co') && 
          result.url.includes(lead.name.toLowerCase().replace(/\s+/g, '-'))
        );
        
        if (rocketReachResults.length > 0) {
          console.log(`    ✅ Found RocketReach profile`);
          
          // Get the best RocketReach result
          const bestResult = rocketReachResults[0];
          
          // Try to scrape RocketReach page for detailed contact info
          const contactInfo = await this.extractRocketReachContactInfo(bestResult.url, lead.name);
          
          if (contactInfo) {
            // Update lead with RocketReach data
            if (contactInfo.email && !lead.email) {
              lead.email = contactInfo.email;
              console.log(`    📧 Added email: ${contactInfo.email}`);
            }
            
            if (contactInfo.linkedin_url && !lead.linkedin_url) {
              lead.linkedin_url = contactInfo.linkedin_url;
              console.log(`    🔗 Added LinkedIn: ${contactInfo.linkedin_url}`);
            }
            
            if (contactInfo.company && (!lead.company || lead.company === 'Unknown Company')) {
              lead.company = contactInfo.company;
              console.log(`    🏢 Updated company: ${contactInfo.company}`);
            }
            
            if (contactInfo.title && (!lead.title || lead.title === 'Professional')) {
              lead.title = contactInfo.title;
              console.log(`    💼 Updated title: ${contactInfo.title}`);
            }
            
            if (contactInfo.location && !lead.location) {
              lead.location = contactInfo.location;
              console.log(`    📍 Added location: ${contactInfo.location}`);
            }
            
            // Mark as RocketReach enriched
            lead.rocketreach_enriched = true;
            lead.rocketreach_url = bestResult.url;
            enrichedCount++;
          } else {
            console.log(`    ⚠️  Found RocketReach profile but couldn't extract contact info`);
            lead.rocketreach_attempted = true;
            failedCount++;
          }
        } else {
          console.log(`    ❌ No RocketReach profile found`);
          lead.rocketreach_attempted = true;
          failedCount++;
        }
        
      } catch (error) {
        console.error(`    ❌ RocketReach search failed for ${lead.name}: ${error.message}`);
        lead.rocketreach_attempted = true;
        failedCount++;
      }
      
      // Add delay between searches to be respectful
      if (i < leadsNeedingEnrichment.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`🎯 RocketReach enrichment completed: ${enrichedCount} enriched, ${failedCount} failed`);
  }

  /**
   * Extract contact information from RocketReach page using LLM
   * @param {string} rocketReachUrl 
   * @param {string} personName 
   * @returns {Promise<Object|null>}
   */
  async extractRocketReachContactInfo(rocketReachUrl, personName) {
    try {
      console.log(`    🔍 Extracting contact info from RocketReach using LLM...`);
      
      // Use Jina Reader to get page content
      const content = await this.jinaSearch.readWebsite(rocketReachUrl);
      
      if (!content || content.length < 100) {
        console.log(`    ⚠️  RocketReach page content too short or empty`);
        return null;
      }
      
      // Use LLM to extract structured contact information
      const prompt = `Extract contact information for "${personName}" from this RocketReach profile page content.

CONTENT:
${content}

Extract the following information and respond with ONLY a JSON object:
{
  "email": "actual email address if found, or null if not shown/requires subscription",
  "linkedin_url": "full LinkedIn profile URL if found, or null",
  "company": "current company name (clean, without extra text)",
  "title": "current job title/position",
  "location": "current location/city"
}

IMPORTANT:
- If email shows "has emails on RocketReach" but no actual email, return null for email
- Extract the CURRENT company and title, not previous positions
- Clean company names (e.g., "Heidelberg Materials France" not "at Heidelberg Materials France")
- Return null for any field not clearly found
- Be precise and extract only factual information from the content`;

      try {
        const response = await this.enricher.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 400,
          response_format: { type: "json_object" }
        });

        const contactInfo = this.enricher.cleanAndParseJSON(response.choices[0].message.content);
        
        // Validate we got at least some useful information
        const hasUsefulInfo = contactInfo.email || contactInfo.linkedin_url || 
                             (contactInfo.company && contactInfo.company !== 'Unknown' && contactInfo.company !== null) ||
                             (contactInfo.title && contactInfo.title !== 'Professional' && contactInfo.title !== null);
        
        if (hasUsefulInfo) {
          console.log(`    ✅ LLM extracted contact info successfully`);
          console.log(`    📧 Email: ${contactInfo.email || 'Not found'}`);
          console.log(`    🔗 LinkedIn: ${contactInfo.linkedin_url || 'Not found'}`);  
          console.log(`    🏢 Company: ${contactInfo.company || 'Not found'}`);
          console.log(`    👔 Title: ${contactInfo.title || 'Not found'}`);
          console.log(`    📍 Location: ${contactInfo.location || 'Not found'}`);
          return contactInfo;
        } else {
          console.log(`    ⚠️  LLM found no useful contact info in RocketReach page`);
          return null;
        }
        
      } catch (llmError) {
        console.error(`    ❌ LLM extraction error: ${llmError.message}`);
        return null;
      }
      
    } catch (error) {
      console.error(`    ❌ Failed to extract RocketReach contact info: ${error.message}`);
      return null;
    }
  }



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