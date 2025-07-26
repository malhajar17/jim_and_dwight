import path from 'path';
import { EventTypes, NodeIds } from '../../types.js';
import { readJson, writeJson, appendLog, getCurrentTimestamp } from '../../utils.js';
import { JinaSearchAPI } from '../../jina-search.js';
import OpenAI from 'openai';

/**
 * InvestorEnrichNode performs due diligence on investors
 * Analyzes investment thesis, portfolio companies, check sizes, and decision criteria
 */
export class InvestorEnrichNode {
  constructor() {
    this.id = NodeIds.INVESTOR_ENRICH;
    this.handles = EventTypes.INVESTOR_SEARCH_READY;
    
    this.jinaSearch = new JinaSearchAPI();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Main execution method
   * @param {Object} message - Incoming message from InvestorSearchNode
   * @param {Object} ctx - Application context
   * @returns {Promise<Object>} Next message for pipeline
   */
  async run(message, ctx) {
    const { run_id, payload } = message;
    const { company_info, analysis, investors } = payload;
    
    console.log(`🔍 InvestorEnrichNode: Performing due diligence on ${investors.length} investors`);
    
    // Load existing state
    const statePath = path.join(ctx.profilesDir, run_id, 'state.json');
    const state = await readJson(statePath);
    
    // Select top investors for due diligence (limit to prevent API overuse)
    const investorsToEnrich = investors.slice(0, 10);
    console.log(`📊 Enriching top ${investorsToEnrich.length} investors`);
    
    let enrichedInvestors = [];
    
    // Perform due diligence on each investor
    for (let i = 0; i < investorsToEnrich.length; i++) {
      const investor = investorsToEnrich[i];
      console.log(`\n🔍 [${i + 1}/${investorsToEnrich.length}] Due diligence: ${investor.name}`);
      
      try {
        const dueDiligence = await this.performInvestorDueDiligence(investor, company_info);
        
        if (dueDiligence) {
          enrichedInvestors.push({
            ...investor,
            due_diligence: dueDiligence,
            enriched_at: getCurrentTimestamp(),
            ready_for_outreach: true
          });
          
          console.log(`   ✅ Due diligence completed`);
          console.log(`   💰 Typical check: ${dueDiligence.check_size || 'Unknown'}`);
          console.log(`   🎯 Investment focus: ${dueDiligence.investment_focus?.slice(0, 2).join(', ') || 'General'}`);
          
          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`   ❌ Due diligence failed for ${investor.name}:`, error.message);
        
        // Add investor without enrichment
        enrichedInvestors.push({
          ...investor,
          due_diligence: { error: error.message, enrichment_failed: true },
          enriched_at: getCurrentTimestamp(),
          ready_for_outreach: false
        });
      }
    }
    
    // Update state with enriched investors
    state.investors = enrichedInvestors;
    state.investor_metadata = {
      ...state.investor_metadata,
      due_diligence_completed_at: getCurrentTimestamp(),
      investors_enriched: enrichedInvestors.filter(inv => inv.due_diligence && !inv.due_diligence.error).length,
      ready_for_outreach: enrichedInvestors.filter(inv => inv.ready_for_outreach).length
    };
    
    await writeJson(statePath, state);
    await appendLog(ctx.profilesDir + '/' + run_id, `Completed due diligence on ${enrichedInvestors.length} investors`);
    
    const successfulEnrichments = enrichedInvestors.filter(inv => inv.ready_for_outreach).length;
    console.log(`\n✅ InvestorEnrichNode completed: ${successfulEnrichments}/${enrichedInvestors.length} investors enriched`);
    
    // Create next message for investor outreach
    return {
      run_id,
      event: EventTypes.INVESTOR_ENRICH_READY,
      from: this.id,
      to: NodeIds.INVESTOR_OUTREACH,
      payload: {
        company_info,
        analysis,
        investors: enrichedInvestors,
        enriched_count: successfulEnrichments
      },
      ts: getCurrentTimestamp()
    };
  }

  /**
   * Perform comprehensive due diligence on an investor
   * @param {Object} investor - Investor information
   * @param {Object} companyInfo - Company information for context
   * @returns {Promise<Object>} Due diligence results
   */
  async performInvestorDueDiligence(investor, companyInfo) {
    // Search for additional information about the investor
    const additionalInfo = await this.searchInvestorBackground(investor);
    
    // Scrape content from relevant sources
    const scrapedContent = await this.scrapeInvestorContent(additionalInfo);
    
    // Analyze with LLM for due diligence
    const analysis = await this.analyzeInvestorForDueDiligence(investor, scrapedContent, companyInfo);
    
    return {
      ...analysis,
      sources_used: additionalInfo.length,
      content_scraped: scrapedContent.filter(c => c.success).length,
      analysis_method: 'llm_due_diligence',
      enrichment_timestamp: getCurrentTimestamp()
    };
  }

  /**
   * Search for additional background information on investor
   * @param {Object} investor - Investor information
   * @returns {Promise<Array>} Additional search results
   */
  async searchInvestorBackground(investor) {
    const queries = [
      `"${investor.name}" ${investor.firm_name || ''} portfolio companies`,
      `"${investor.name}" ${investor.firm_name || ''} investment thesis`,
      `"${investor.name}" venture capital investments`,
      `${investor.firm_name || investor.name} recent investments news`
    ].filter(q => q.trim());

    let allResults = [];

    for (const query of queries.slice(0, 3)) { // Limit queries
      try {
        console.log(`   🔍 Background search: "${query}"`);
        const results = await this.jinaSearch.search(query);
        
        if (results && results.length > 0) {
          allResults = allResults.concat(results.slice(0, 3)); // Limit results per query
          console.log(`   ✅ Found ${results.length} background sources`);
        }
      } catch (error) {
        console.error(`   ❌ Background search failed for "${query}"`);
      }
    }

    return allResults;
  }

  /**
   * Scrape content from investor-related sources
   * @param {Array} searchResults - Search results to scrape
   * @returns {Promise<Array>} Scraped content
   */
  async scrapeInvestorContent(searchResults) {
    const scrapedContent = [];
    const urlsToScrape = searchResults
      .filter(result => result.url && !result.url.includes('linkedin.com/in'))
      .slice(0, 4); // Limit scraping to prevent overuse

    for (const result of urlsToScrape) {
      try {
        console.log(`   📖 Scraping: ${result.url}`);
        const content = await this.jinaSearch.readWebsite(result.url);
        
        if (content && content.length > 100) {
          scrapedContent.push({
            url: result.url,
            title: result.title,
            content: content.substring(0, 5000), // Limit content length
            success: true,
            scraped_at: getCurrentTimestamp()
          });
          console.log(`   ✅ Scraped ${content.length} characters`);
        }
      } catch (error) {
        console.error(`   ❌ Scraping failed for ${result.url}`);
        scrapedContent.push({
          url: result.url,
          title: result.title,
          success: false,
          error: error.message
        });
      }
    }

    return scrapedContent;
  }

  /**
   * Analyze investor information for due diligence using LLM
   * @param {Object} investor - Basic investor info
   * @param {Array} scrapedContent - Scraped content about investor
   * @param {Object} companyInfo - Company seeking investment
   * @returns {Promise<Object>} Due diligence analysis
   */
  async analyzeInvestorForDueDiligence(investor, scrapedContent, companyInfo) {
    const contentText = scrapedContent
      .filter(c => c.success)
      .map(c => `Source: ${c.title}\n${c.content}`)
      .join('\n\n');

    const prompt = `Perform due diligence analysis on this investor for a potential pitch. Extract actionable intelligence for fundraising.

INVESTOR INFO:
- Name: ${investor.name}
- Firm: ${investor.firm_name || 'N/A'}
- Type: ${investor.type}
- Title: ${investor.title || 'N/A'}

COMPANY SEEKING INVESTMENT:
- Name: ${companyInfo.name}
- Technology: ${companyInfo.technology}
- Stage: ${companyInfo.funding_stage}

SCRAPED CONTENT ABOUT INVESTOR:
${contentText || 'Limited content available'}

Analyze and return JSON with:
- investment_focus: Array of specific sectors/areas they invest in
- portfolio_companies: Array of notable portfolio companies (with brief descriptions)
- check_size: Typical investment amount range
- stage_preferences: Preferred funding stages
- investment_thesis: Their investment philosophy and criteria
- recent_investments: Recent deals they've done (last 2 years)
- decision_criteria: What they look for in investments
- geographic_preferences: Where they typically invest
- sector_expertise: Specific domain knowledge
- competitive_companies: Portfolio companies that might compete with our company
- partnership_value: What value-add they provide beyond capital
- outreach_strategy: Best approach for reaching this investor
- risk_factors: Potential concerns they might have about our company
- fit_assessment: How good a fit this investor is (high/medium/low)
- key_contacts: Other people at the firm to know about
- timing_considerations: Best time to approach them

Focus on actionable insights for fundraising strategy.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        response_format: { type: "json_object" },
        max_tokens: 1000
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      
      return {
        ...analysis,
        analysis_confidence: this.assessAnalysisConfidence(analysis, scrapedContent),
        content_sources_used: scrapedContent.filter(c => c.success).length
      };
    } catch (error) {
      console.error('Error analyzing investor for due diligence:', error);
      
      // Fallback analysis
      return {
        investment_focus: [investor.focus_areas?.[0] || 'Technology'],
        portfolio_companies: [],
        check_size: investor.check_size || 'Unknown',
        stage_preferences: investor.stage_preferences || ['seed'],
        investment_thesis: 'Investment thesis not available',
        recent_investments: [],
        decision_criteria: ['Market size', 'Team quality', 'Traction'],
        fit_assessment: 'medium',
        outreach_strategy: 'Standard VC approach',
        analysis_confidence: 'low',
        error: error.message
      };
    }
  }

  /**
   * Assess confidence in due diligence analysis
   * @param {Object} analysis - LLM analysis results
   * @param {Array} scrapedContent - Source content used
   * @returns {string} Confidence level
   */
  assessAnalysisConfidence(analysis, scrapedContent) {
    const successfulScrapes = scrapedContent.filter(c => c.success).length;
    const totalContent = scrapedContent.reduce((sum, c) => sum + (c.content?.length || 0), 0);
    
    if (successfulScrapes >= 3 && totalContent > 2000) {
      return 'high';
    } else if (successfulScrapes >= 2 && totalContent > 1000) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate investor quality score
   * @param {Object} investor - Enriched investor
   * @param {Object} companyAnalysis - Company analysis
   * @returns {number} Quality score (0-100)
   */
  calculateInvestorQuality(investor, companyAnalysis) {
    let score = 0;
    
    // Sector alignment
    if (investor.due_diligence?.investment_focus?.some(focus =>
        companyAnalysis.sector.toLowerCase().includes(focus.toLowerCase())
    )) {
      score += 25;
    }
    
    // Stage alignment
    if (investor.due_diligence?.stage_preferences?.includes(companyAnalysis.recommended_stage)) {
      score += 20;
    }
    
    // Portfolio relevance
    if (investor.due_diligence?.portfolio_companies?.length > 0) {
      score += 15;
    }
    
    // Check size available
    if (investor.due_diligence?.check_size && investor.due_diligence.check_size !== 'Unknown') {
      score += 15;
    }
    
    // Analysis confidence
    if (investor.due_diligence?.analysis_confidence === 'high') {
      score += 15;
    } else if (investor.due_diligence?.analysis_confidence === 'medium') {
      score += 10;
    }
    
    // Fit assessment
    if (investor.due_diligence?.fit_assessment === 'high') {
      score += 10;
    } else if (investor.due_diligence?.fit_assessment === 'medium') {
      score += 5;
    }
    
    return score;
  }
} 