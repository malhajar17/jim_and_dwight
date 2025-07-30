import path from 'path';
import { EventTypes, NodeIds } from '../types.js';
import { readJson, writeJson, appendLog, getCurrentTimestamp } from '../utils.js';
import { JinaSearchAPI } from '../jina-search.js';
import OpenAI from 'openai';
import axios from 'axios';

/**
 * EnrichNode specifically enriches existing leads with detailed personal information
 * Focuses on gathering comprehensive data about each individual lead
 */
export class EnrichNode {
  constructor() {
    this.id = NodeIds.ENRICH;
    this.handles = EventTypes.SEARCH_READY;
    this.jinaSearch = new JinaSearchAPI();
    
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Jina API configuration from environment
    this.jinaApiKey = process.env.JINA_API_KEY;
    this.jinaSearchUrl = 'https://s.jina.ai/';
    this.jinaReaderUrl = 'https://r.jina.ai/';
  }

  /**
   * Check if required APIs are configured
   * @returns {Object}
   */
  checkApiConfiguration() {
    return {
      hasJina: !!(this.jinaApiKey),
      hasOpenAI: !!(process.env.OPENAI_API_KEY),
      hasJinaSearch: this.jinaSearch.isConfigured()
    };
  }

  /**
   * Search for a person using Jina API (using existing JinaSearchAPI with error handling)
   * @param {string} name - Person's name
   * @param {string} company - Person's company
   * @returns {Promise<Array>} Search results
   */
  async searchPersonWithJina(name, company) {
    try {
      const query = `${name} ${company}`;
      console.log(`🔍 Searching for: "${query}"`);
      
      // Try multiple search approaches to maximize success
      const searchApproaches = [
        `${name} ${company}`,
        `${name} LinkedIn`,
        `"${name}" ${company}`,
        name
      ];
      
      for (const searchQuery of searchApproaches) {
        try {
          console.log(`   🔍 Trying search: "${searchQuery}"`);
          const searchResults = await this.jinaSearch.search(searchQuery, 8);
          
          if (searchResults && searchResults.length > 0) {
            console.log(`   ✅ Found ${searchResults.length} results with "${searchQuery}"`);
            
            // Convert to expected format for personality analysis
            const formattedResults = searchResults.map((result, index) => ({
              url: result.linkedin_url || `https://search-result-${index}-${Date.now()}`,
              title: `${result.name || name} - ${result.title || 'Professional'}`,
              description: result.raw_data || result.notes || result.company || 'Professional profile'
            }));
            
            // Filter out results with invalid URLs
            const validResults = formattedResults.filter(result => 
              result.url && result.url.startsWith('http') && !result.url.includes('search-result-')
            );
            
            if (validResults.length > 0) {
              console.log(`   ✅ ${validResults.length} valid URLs found for scraping`);
              return validResults;
            }
          }
        } catch (searchError) {
          console.log(`   ⚠️ Search approach "${searchQuery}" failed:`, searchError.message);
          continue; // Try next approach
        }
        
        // Add small delay between search attempts
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`⚠️ No valid results found for ${name} after trying all approaches`);
      return [];
      
    } catch (error) {
      console.error(`❌ Error searching for ${name}:`, error.message);
      return [];
    }
  }

  /**
   * Get content from a website using Jina Reader API
   * @param {string} url - Website URL
   * @returns {Promise<string>} Website content
   */
  async getWebsiteContent(url) {
    try {
      console.log(`📖 Reading content from: ${url}`);
      
      // Use the existing JinaSearchAPI readWebsite method if available
      if (this.jinaSearch && typeof this.jinaSearch.readWebsite === 'function') {
        const content = await this.jinaSearch.readWebsite(url);
        if (content && content.length > 0) {
          return content;
        }
      }
      
      // Fallback to direct API call if the existing method doesn't work
      const response = await axios.get(`${this.jinaReaderUrl}${encodeURIComponent(url)}`, {
        headers: {
          'Authorization': `Bearer ${this.jinaApiKey}`
        },
        timeout: 45000
      });

      let content = response.data;
      
      // Handle different response types
      if (typeof content !== 'string') {
        if (Buffer.isBuffer(content)) {
          content = content.toString('utf8');
        } else if (content && typeof content === 'object') {
          content = JSON.stringify(content);
        } else {
          content = String(content);
        }
      }
      
      console.log(`✅ Retrieved ${content.length} characters from ${url}`);
      return content;
    } catch (error) {
      console.error(`❌ Error reading ${url}:`, error.message);
      return '';
    }
  }

  /**
   * Generate competitive intelligence summary using ChatGPT
   * @param {string} name - Person's name
   * @param {Array} websiteContents - Array of website content strings
   * @returns {Promise<Object>} Competitive intelligence analysis
   */
  async generatePersonalitySummary(name, websiteContents) {
    try {
      console.log(`🧠 Extracting competitive intelligence for ${name}...`);
      
      // Truncate content to prevent context length issues (approx 100k tokens max)
      let combinedContent = websiteContents.join('\n\n---\n\n');
      const maxLength = 90000; // Leave room for prompt and response
      
      if (combinedContent.length > maxLength) {
        combinedContent = combinedContent.substring(0, maxLength) + '\n\n...[Content truncated to fit context limits]';
        console.log(`   📏 Content truncated from ${websiteContents.join('\n\n---\n\n').length} to ${combinedContent.length} characters`);
      }
      
      const prompt = `Extract competitive intelligence and actionable insights about ${name} from the web content below. Focus on SPECIFIC, RECENT, and ACTIONABLE information that would give someone an edge in business outreach. Return ONLY a JSON object:

{
  "current_projects": ["specific current initiatives they're leading or involved in"],
  "recent_developments": ["recent appointments, achievements, company changes, or news about them"],
  "strategic_priorities": ["current business priorities or challenges they've mentioned publicly"],
  "industry_involvement": ["recent speaking engagements, publications, interviews, or public statements"],
  "company_context": ["recent company performance, changes, or initiatives they're driving"],
  "competitive_intelligence": ["specific insights about their role, responsibilities, or current focus areas"],
  "outreach_angles": ["specific conversation starters or topics that would resonate based on recent activities"],
  "recent_quotes_or_statements": ["any specific quotes, opinions, or positions they've taken recently"],
  "summary": "2-3 sentences focusing on their current role, recent activities, and what they're focused on right now",
  "intelligence_quality": "high/medium/low based on how specific and recent the information is"
}

Extract ONLY specific, factual information from the content. Avoid generic traits like "strategic" or "innovative". Focus on what they're actually doing, saying, or working on right now.

Web content about ${name}:
${combinedContent}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a competitive intelligence analyst who extracts specific, actionable business insights from web content. Focus on recent, concrete, and factual information. You must respond with ONLY valid JSON - no markdown, no explanations, no code blocks. Avoid generic traits and focus on what the person is actually doing, saying, or working on right now."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1, // Lower temperature for more consistent output
        max_tokens: 1500,
        response_format: { type: "json_object" } // Force JSON response
      });

      const rawContent = response.choices[0].message.content;
      console.log(`✅ Extracted competitive intelligence for ${name}`);
      
      try {
        // Since we're using response_format: json_object, the response should be valid JSON
        const analysis = JSON.parse(rawContent);
        
        // Ensure all required fields are present with defaults if missing
        const structuredAnalysis = {
          current_projects: analysis.current_projects || ["No specific current projects identified"],
          recent_developments: analysis.recent_developments || ["No recent developments found"],
          strategic_priorities: analysis.strategic_priorities || ["No specific strategic priorities identified"],
          industry_involvement: analysis.industry_involvement || ["No recent industry involvement found"],
          company_context: analysis.company_context || ["No specific company context available"],
          competitive_intelligence: analysis.competitive_intelligence || ["Limited competitive intelligence available"],
          outreach_angles: analysis.outreach_angles || ["Standard industry discussion topics"],
          recent_quotes_or_statements: analysis.recent_quotes_or_statements || ["No recent quotes or statements found"],
          summary: analysis.summary || "Professional with limited recent public information available",
          intelligence_quality: analysis.intelligence_quality || analysis.confidence_level || "low",
          generated_at: new Date().toISOString(),
          content_sources: websiteContents.length,
          analysis_method: "competitive_intelligence_extraction"
        };
        
        return structuredAnalysis;
        
      } catch (parseError) {
        console.log(`⚠️ JSON parsing failed despite forced format, creating fallback analysis`);
        console.log(`Raw response: ${rawContent.substring(0, 200)}...`);
        
        return {
          current_projects: ["Analysis parsing error - unable to extract information"],
          recent_developments: ["Analysis parsing error - unable to extract information"], 
          strategic_priorities: ["Analysis parsing error - unable to extract information"],
          industry_involvement: ["Analysis parsing error - unable to extract information"],
          company_context: ["Analysis parsing error - unable to extract information"],
          competitive_intelligence: ["Analysis parsing error - unable to extract information"],
          outreach_angles: ["Standard professional outreach recommended"],
          recent_quotes_or_statements: ["Analysis parsing error - unable to extract information"],
          summary: "Competitive intelligence analysis could not be completed due to technical error",
          intelligence_quality: "low",
          generated_at: new Date().toISOString(),
          content_sources: websiteContents.length,
          analysis_method: "fallback_error",
          error: "JSON parsing failed",
          raw_response: rawContent.substring(0, 500)
        };
      }

    } catch (error) {
      console.error(`❌ Error extracting competitive intelligence for ${name}:`, error.message);
      return {
        error: error.message,
        summary: "Unable to extract competitive intelligence due to processing error",
        intelligence_quality: "low",
        generated_at: new Date().toISOString()
      };
    }
  }

  /**
   * Enrich a single lead with personality analysis
   * @param {Object} lead - Lead object
   * @returns {Promise<Object>} Enriched lead
   */
  async enrichLeadWithPersonalityAnalysis(lead) {
    try {
      // Skip if already enriched
      if (lead.personality_analysis && !lead.personality_analysis.error) {
        console.log(`\n👤 ${lead.name} already has personality analysis - skipping`);
        return lead;
      }
      
      console.log(`\n👤 Enriching ${lead.name} with personality analysis...`);
      
      // Check if lead already has scraped content from previous steps
      let searchResults = [];
      let websiteContents = [];
      let linkedinUrls = [];
      let nonLinkedInWebsites = [];
      let websitesToScrape = [];
      
      if (lead.scraped_content || lead.search_results || lead.enrichment_sources) {
        console.log(`   ♻️  Reusing existing scraped content from previous steps`);
        
        // Use existing scraped content if available
        if (lead.scraped_content && Array.isArray(lead.scraped_content)) {
          websiteContents = lead.scraped_content;
          console.log(`   📚 Found ${websiteContents.length} pre-scraped content sources`);
        }
        
        // Use existing search results if available
        if (lead.search_results && Array.isArray(lead.search_results)) {
          searchResults = lead.search_results;
          console.log(`   🔍 Found ${searchResults.length} existing search results`);
        }
        
        // If we have existing content, skip the search and scraping
        if (websiteContents.length > 0) {
          console.log(`   ⏩ Skipping search and scraping - using existing data`);
        }
      }
      
      // Only do new search if we don't have existing data
      if (websiteContents.length === 0) {
        console.log(`   🔍 No existing content found - performing new search and scraping`);
        
        // 1. Search for the person
        searchResults = await this.searchPersonWithJina(lead.name, lead.company);
        
        if (searchResults.length === 0) {
          console.log(`⚠️ No search results found for ${lead.name}`);
          return {
            ...lead,
            personality_analysis: {
              error: "No search results found",
              analyzed_at: new Date().toISOString()
            }
          };
        }

        // 2. Separate LinkedIn URLs (keep for reference) and other websites (for scraping)
        linkedinUrls = searchResults.filter(result => 
          result.url && result.url.includes('linkedin.com')
        );
        
        nonLinkedInWebsites = searchResults.filter(result => 
          result.url && 
          !result.url.includes('linkedin.com') &&
          !result.url.includes('/login') && 
          !result.url.includes('/signup') &&
          !result.url.includes('auth') &&
          !result.url.includes('sign-in')
        );

        // Get top 3 non-LinkedIn websites for actual content scraping
        websitesToScrape = nonLinkedInWebsites.slice(0, 3);
        
        // Combine for complete source attribution (LinkedIn + scraped sites)
        const allSources = [...linkedinUrls.slice(0, 1), ...websitesToScrape]; // Keep 1 LinkedIn for reference
        
        console.log(`📊 Found ${linkedinUrls.length} LinkedIn URLs (kept for reference)`);
        console.log(`📊 Selected ${websitesToScrape.length} non-LinkedIn websites for content scraping`);

        // 3. Scrape content from non-LinkedIn websites only
        for (const website of websitesToScrape) {
          try {
            console.log(`📖 Scraping non-LinkedIn site: ${website.url}`);
            const content = await this.getWebsiteContent(website.url);
            if (content && content.length > 100) { // Only include substantial content
              // Truncate content to prevent context length issues
              const truncatedContent = content.length > 50000 ? content.substring(0, 50000) + '...[truncated]' : content;
              websiteContents.push(`Source: ${website.url}\nTitle: ${website.title || 'N/A'}\nContent: ${truncatedContent}`);
              console.log(`   ✅ Successfully scraped ${content.length} characters`);
            } else {
              console.log(`   ⚠️ Insufficient content (${content?.length || 0} characters)`);
            }
          } catch (error) {
            console.log(`   ❌ Failed to scrape ${website.url}: ${error.message}`);
          }
          
          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // If no LinkedIn content was problematic, try one more non-LinkedIn site if available
      if (websiteContents.length < 2 && nonLinkedInWebsites.length > 3) {
        console.log(`📖 Trying additional non-LinkedIn sites for more content...`);
        const additionalSites = nonLinkedInWebsites.slice(3, 5);
        for (const website of additionalSites) {
          try {
            const content = await this.getWebsiteContent(website.url);
            if (content && content.length > 100) {
              const truncatedContent = content.length > 50000 ? content.substring(0, 50000) + '...[truncated]' : content;
              websiteContents.push(`Source: ${website.url}\nTitle: ${website.title || 'N/A'}\nContent: ${truncatedContent}`);
              console.log(`   ✅ Additional content: ${content.length} characters`);
              break; // Stop after getting one good additional source
            }
          } catch (error) {
            console.log(`   ❌ Additional site failed: ${error.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (websiteContents.length === 0) {
        console.log(`⚠️ No substantial content found for ${lead.name} from any non-LinkedIn sources`);
        return {
          ...lead,
          personality_analysis: {
            error: "No substantial content found for analysis (LinkedIn excluded)",
            analyzed_at: new Date().toISOString(),
            analysis_method: 'failed'
          },
          personality_metadata: {
            analysis_completed: false,
            ai_analysis_success: false,
            processing_timestamp: new Date().toISOString(),
            error: "No scrapeable non-LinkedIn content found",
            linkedin_urls_found: linkedinUrls.length,
            non_linkedin_sites_attempted: websitesToScrape.length
          },
          ready_for_outreach: false
        };
      }

      // 4. Generate personality summary with ChatGPT
      const personalityAnalysis = await this.generatePersonalitySummary(lead.name, websiteContents);

      // 5. Return enriched lead with clean JSON format (no raw website content)
      const enrichedLead = {
        ...lead,
        personality_analysis: personalityAnalysis,
        personality_sources: [
          // LinkedIn URLs (for reference only - not scraped)
          ...linkedinUrls.slice(0, 1).map(w => ({
            url: w.url,
            title: w.title,
            scraped_successfully: false,
            type: 'linkedin_reference',
            timestamp: new Date().toISOString()
          })),
          // Non-LinkedIn websites (actually scraped)
          ...websitesToScrape.map(w => ({
            url: w.url,
            title: w.title,
            scraped_successfully: true,
            type: 'scraped_content',
            timestamp: new Date().toISOString()
          }))
        ],
        last_personality_analysis: new Date().toISOString(),
        personality_metadata: {
          analysis_completed: true,
          linkedin_urls_found: linkedinUrls.length,
          linkedin_urls_kept_for_reference: Math.min(linkedinUrls.length, 1),
          non_linkedin_sites_attempted: websitesToScrape.length,
          content_sources_used: websiteContents.length,
          ai_analysis_success: !personalityAnalysis.error,
          processing_timestamp: new Date().toISOString(),
          analysis_method: personalityAnalysis.analysis_method || 'web_scraping_chatgpt',
          scraping_strategy: 'exclude_linkedin'
        }
      };
      
      // Add integration-ready flag for easy filtering
      enrichedLead.ready_for_outreach = !personalityAnalysis.error && personalityAnalysis.confidence_level !== 'low';
      
      return enrichedLead;

    } catch (error) {
      console.error(`❌ Error enriching ${lead.name}:`, error.message);
      return {
        ...lead,
        personality_analysis: {
          error: error.message,
          analyzed_at: new Date().toISOString(),
          analysis_method: 'failed'
        },
        personality_metadata: {
          analysis_completed: false,
          ai_analysis_success: false,
          processing_timestamp: new Date().toISOString(),
          error: error.message
        },
        ready_for_outreach: false
      };
    }
  }

  /**
   * Enrich existing leads with detailed personal information and personality analysis
   * @param {Message} msg 
   * @param {Context} ctx 
   * @returns {Promise<Message|null>}
   */
  async run(msg, ctx) {
    try {
      console.log(`\n🌟 Starting ${this.id} for run: ${msg.run_id}`);
      
      // Load current state
      const profileDir = path.join(ctx.profilesDir, msg.run_id);
      const statePath = path.join(profileDir, 'state.json');
      const state = await readJson(statePath);
      
      if (!state || !state.leads || state.leads.length === 0) {
        throw new Error(`No leads found for run ${msg.run_id}`);
      }
      
      console.log(`📊 Found ${state.leads.length} leads to enrich`);
      
      // Check API configuration
      const apiConfig = this.checkApiConfiguration();
      
      console.log(`🔍 Jina API (search): ${apiConfig.hasJina ? '✅ Available' : '⚠️  Disabled'}`);
      console.log(`🧠 OpenAI API (personality): ${apiConfig.hasOpenAI ? '✅ Available' : '⚠️  Disabled'}`);
      
      if (!apiConfig.hasJina) {
        console.log('❌ Cannot enrich without Jina API configuration');
        throw new Error('Jina API configuration required for lead enrichment');
      }
      
      if (!apiConfig.hasOpenAI) {
        console.log('❌ Cannot generate personality analysis without OpenAI API key. Please set OPENAI_API_KEY in .env');
        throw new Error('OpenAI API key required for personality analysis');
      }
      
      // Select leads to enrich (focus on top confidence leads without personality analysis)
      const leadsToEnrich = state.leads
        .filter(lead => !lead.personality_analysis || (lead.personality_analysis && lead.personality_analysis.error)) // Only enrich leads that haven't had successful personality analysis
        .sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0)) // Sort by confidence
        .slice(0, 10); // Limit to top 10 leads for personality analysis
      
      if (leadsToEnrich.length === 0) {
        console.log('✅ All leads already have successful personality analysis!');
        
        // Count successful analyses
        const successfulAnalyses = state.leads.filter(lead => 
          lead.personality_analysis && !lead.personality_analysis.error
        ).length;
        
        console.log(`📊 Found ${successfulAnalyses} leads with competitive intelligence ready for outreach`);
        return this.createNextMessage(msg.run_id, state.leads);
      }
      
      console.log(`🎯 Selected ${leadsToEnrich.length} leads for personality analysis`);
      
      // Enrich leads with personality analysis
      await this.enrichLeadsWithPersonalityData(leadsToEnrich, state.mode);
      
      // Save enriched leads to state
      await this.saveEnrichedLeads(state, profileDir);
      
      // Log activity
      const logPath = path.join(profileDir, 'scratchbook.log');
      const analyzedCount = state.leads.filter(lead => lead.personality_analysis).length;
      await appendLog(logPath, `PERSONALITY ANALYSIS completed: ${analyzedCount} leads analyzed`);
      
      console.log('💾 Personality analysis saved to state.json');
      
      // Create next message (would go to OutreachNode or similar)
      return this.createNextMessage(msg.run_id, state.leads);
      
    } catch (error) {
      console.error(`❌ Error in ${this.id}:`, error.message);
      return null;
    }
  }

  /**
   * Enrich leads with personality analysis using web scraping and ChatGPT
   * @param {Array} leads 
   * @param {string} mode 
   */
  async enrichLeadsWithPersonalityData(leads, mode) {
    console.log(`\n🧠 Starting personality analysis for ${leads.length} leads...`);
    
    let analyzedCount = 0;
    let errorCount = 0;
    
    // Process leads individually to manage API rate limits and ensure quality
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      
      try {
        console.log(`\n👤 [${i + 1}/${leads.length}] Analyzing personality: ${lead.name}`);
          console.log(`   📋 Company: ${lead.company}`);
          console.log(`   💼 Title: ${lead.title}`);
          
        // Enrich lead with personality analysis
        const enrichedLead = await this.enrichLeadWithPersonalityAnalysis(lead);
          
        // Update the lead with personality data
          Object.assign(lead, enrichedLead);
        
                // Check if analysis was successful
        if (enrichedLead.personality_analysis && !enrichedLead.personality_analysis.error) {
          analyzedCount++;
          
          // Log competitive intelligence summary
          const analysis = enrichedLead.personality_analysis;
          console.log(`   ✅ Competitive Intelligence Extracted:`);
          console.log(`   🚀 Current Projects: ${analysis.current_projects && analysis.current_projects.length > 0 ? analysis.current_projects[0].substring(0, 80) + '...' : 'None identified'}`);
          console.log(`   📰 Recent Developments: ${analysis.recent_developments && analysis.recent_developments.length > 0 ? analysis.recent_developments[0].substring(0, 80) + '...' : 'None found'}`);
          console.log(`   🎯 Outreach Angles: ${analysis.outreach_angles && analysis.outreach_angles.length > 0 ? analysis.outreach_angles.length + ' angle(s) identified' : 'Standard topics'}`);
          console.log(`   💬 Recent Quotes: ${analysis.recent_quotes_or_statements && analysis.recent_quotes_or_statements.length > 0 && !analysis.recent_quotes_or_statements[0].includes('No recent') ? 'Available' : 'None found'}`);
          console.log(`   📊 Intelligence Quality: ${analysis.intelligence_quality || analysis.confidence_level || 'N/A'}`);
          console.log(`   📚 Non-LinkedIn Sources Used: ${enrichedLead.personality_metadata?.content_sources_used || 0}`);
          console.log(`   🔗 LinkedIn URLs Found: ${enrichedLead.personality_metadata?.linkedin_urls_found || 0} (kept for reference only)`);
        } else {
          console.log(`   ⚠️ Intelligence extraction incomplete: ${enrichedLead.personality_analysis?.error || 'Unknown error'}`);
          errorCount++;
        }
        
        // Add delay between leads to respect API rate limits
        if (i < leads.length - 1) {
          console.log('   ⏳ Waiting 10 seconds before next analysis...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
      } catch (error) {
        console.error(`   ❌ Failed to analyze ${lead.name}: ${error.message}`);
        errorCount++;
        
        // Add error info to lead
        lead.personality_analysis = {
          error: error.message,
          analyzed_at: new Date().toISOString()
        };
      }
    }
    
    console.log(`\n🎉 Personality analysis completed:`);
    console.log(`   ✅ Successfully analyzed: ${analyzedCount} leads`);
    console.log(`   ❌ Errors: ${errorCount} leads`);
    console.log(`   📊 Success rate: ${Math.round((analyzedCount / leads.length) * 100)}%`);
  }

  /**
   * Save enriched leads with personality analysis to state file
   * @param {Object} state 
   * @param {string} profileDir 
   */
  async saveEnrichedLeads(state, profileDir) {
    // Update personality analysis metadata
    const analyzedLeads = state.leads.filter(lead => lead.personality_analysis);
    const successfulAnalyses = state.leads.filter(lead => 
      lead.personality_analysis && !lead.personality_analysis.error
    );
    
    if (!state.search_metadata) {
      state.search_metadata = {};
    }
    
    // Add personality analysis metadata
    state.search_metadata.personality_analyzed_leads = analyzedLeads.length;
    state.search_metadata.successful_personality_analyses = successfulAnalyses.length;
    state.search_metadata.personality_analysis_completed = getCurrentTimestamp();
    state.search_metadata.personality_analysis_method = 'web_scraping_chatgpt_analysis';
    state.search_metadata.personality_analysis_sources = this.getPersonalitySourcesSummary(state.leads);
    
    // Keep existing enrichment metadata if it exists
    const enrichedLeads = state.leads.filter(lead => lead.enrichment);
    if (enrichedLeads.length > 0) {
    state.search_metadata.enriched_leads = enrichedLeads.length;
    state.search_metadata.enrichment_sources = this.getEnrichmentSourcesSummary(state.leads);
    }
    
    // Save updated state
    const statePath = path.join(profileDir, 'state.json');
    await writeJson(statePath, state);
  }

  /**
   * Get summary of enrichment sources used
   * @param {Array} leads 
   * @returns {Object}
   */
  getEnrichmentSourcesSummary(leads) {
    const enrichedLeads = leads.filter(lead => lead.enrichment);
    
    if (enrichedLeads.length === 0) {
      return { total_enriched: 0, sources: {} };
    }
    
    const sourceSummary = { total_enriched: enrichedLeads.length, sources: {} };
    
    enrichedLeads.forEach(lead => {
      if (lead.enrichment && lead.enrichment.website_content) {
        Object.keys(lead.enrichment.website_content).forEach(source => {
          if (!sourceSummary.sources[source]) {
            sourceSummary.sources[source] = 0;
          }
          sourceSummary.sources[source]++;
        });
      }
    });
    
    return sourceSummary;
  }

  /**
   * Get summary of personality analysis sources used
   * @param {Array} leads 
   * @returns {Object}
   */
  getPersonalitySourcesSummary(leads) {
    const analyzedLeads = leads.filter(lead => 
      lead.personality_analysis && !lead.personality_analysis.error
    );
    
    if (analyzedLeads.length === 0) {
      return { total_analyzed: 0, sources: {} };
    }
    
    const sourceSummary = { 
      total_analyzed: analyzedLeads.length, 
      sources: {},
      confidence_distribution: { high: 0, medium: 0, low: 0 }
    };
    
    analyzedLeads.forEach(lead => {
      // Count confidence levels
      const confidence = lead.personality_analysis.confidence_level;
      if (confidence && sourceSummary.confidence_distribution[confidence] !== undefined) {
        sourceSummary.confidence_distribution[confidence]++;
      }
      
      // Count sources used for each lead
      if (lead.enrichment_sources && Array.isArray(lead.enrichment_sources)) {
        lead.enrichment_sources.forEach(source => {
          const domain = source.url ? new URL(source.url).hostname : 'unknown';
          if (!sourceSummary.sources[domain]) {
            sourceSummary.sources[domain] = 0;
          }
          sourceSummary.sources[domain]++;
        });
      }
    });
    
    return sourceSummary;
  }

  /**
   * Extract clean JSON personality data for integration
   * @param {Object} lead - Lead with personality analysis
   * @returns {Object} Clean JSON structure for integration
   */
  getPersonalityDataForIntegration(lead) {
    if (!lead.personality_analysis) {
      return {
        status: 'no_analysis',
        message: 'Personality analysis not available'
      };
    }

    const analysis = lead.personality_analysis;
    
    if (analysis.error) {
      return {
        status: 'analysis_failed',
        error: analysis.error,
        timestamp: analysis.analyzed_at || new Date().toISOString()
      };
    }

    return {
      status: 'analysis_complete',
      competitive_intelligence: {
        current_projects: analysis.current_projects || [],
        recent_developments: analysis.recent_developments || [],
        strategic_priorities: analysis.strategic_priorities || [],
        industry_involvement: analysis.industry_involvement || [],
        company_context: analysis.company_context || [],
        competitive_insights: analysis.competitive_intelligence || [],
        outreach_angles: analysis.outreach_angles || [],
        recent_quotes: analysis.recent_quotes_or_statements || [],
        summary: analysis.summary || '',
        intelligence_quality: analysis.intelligence_quality || analysis.confidence_level || 'medium'
      },
      // Keep legacy personality fields for backward compatibility
      personality: {
        traits: analysis.personality_traits || analysis.current_projects || [],
        communication: analysis.communication_style || analysis.summary || '',
        leadership: analysis.leadership_approach || '',
        expertise: analysis.technical_expertise || [],
        values: analysis.values_and_motivations || [],
        decision_making: analysis.decision_making || '',
        networking: analysis.networking_style || '',
        summary: analysis.summary || '',
        confidence: analysis.confidence_level || analysis.intelligence_quality || 'medium'
      },
      metadata: {
        sources_used: analysis.content_sources || 0,
        analysis_method: analysis.analysis_method || 'competitive_intelligence_extraction',
        generated_at: analysis.generated_at || new Date().toISOString(),
        ready_for_outreach: lead.ready_for_outreach || false
      },
      personality_sources: lead.personality_sources || []
    };
  }

  /**
   * Create next message for pipeline
   * @param {string} runId 
   * @param {Array} leads 
   * @returns {Message}
   */
  createNextMessage(runId, leads) {
    const enrichedCount = leads.filter(lead => lead.enrichment).length;
    const analyzedCount = leads.filter(lead => lead.personality_analysis).length;
    const successfulAnalyses = leads.filter(lead => 
      lead.personality_analysis && !lead.personality_analysis.error
    ).length;
    
    return {
      run_id: runId,
      event: EventTypes.ENRICH_READY,
      from: this.id,
      to: NodeIds.OUTREACH,
      payload: {
        leads_count: leads.length,
        enriched_count: enrichedCount,
        personality_analyzed_count: analyzedCount,
        successful_personality_analyses: successfulAnalyses,
        leads: leads,
        enrichment_complete: true,
        personality_analysis_complete: true
      },
      ts: getCurrentTimestamp()
    };
  }
} 