import path from 'path';
import { EventTypes, NodeIds } from '../../types.js';
import { readJson, writeJson, appendLog, getCurrentTimestamp } from '../../utils.js';
import { JinaSearchAPI } from '../../jina-search.js';

/**
 * InvestorSearchNode finds and validates investors based on generated investor personas
 * Searches for VCs, angels, and strategic investors using Jina Search API
 */
export class InvestorSearchNode {
  constructor() {
    this.id = NodeIds.INVESTOR_SEARCH;
    this.handles = EventTypes.INVESTOR_PERSONAS_READY;
    
    this.jinaSearch = new JinaSearchAPI();
  }

  /**
   * Main execution method
   * @param {Object} message - Incoming message from InvestorPersonaNode
   * @param {Object} ctx - Application context
   * @returns {Promise<Object>} Next message for pipeline
   */
  async run(message, ctx) {
    const { run_id, payload } = message;
    const { company_info, analysis, targeting_strategies } = payload;
    
    console.log(`🔍 InvestorSearchNode: Searching for investors using ${targeting_strategies.length} targeting strategies`);
    
    // Load existing state
    const statePath = path.join(ctx.profilesDir, run_id, 'state.json');
    const state = await readJson(statePath);
    
    let allInvestors = [];
    
    // Search for investors based on each targeting strategy
    for (const strategy of targeting_strategies) {
      console.log(`\n🎯 Executing strategy: ${strategy.strategy_name} (${strategy.investor_type})`);
      
      const searchResults = await this.searchInvestorsForStrategy(strategy, analysis);
      const processedInvestors = await this.processInvestorResults(searchResults, strategy);
      
      console.log(`   📊 Found ${processedInvestors.length} potential investors for ${strategy.strategy_name}`);
      allInvestors = allInvestors.concat(processedInvestors);
    }
    
    // Remove duplicates and validate investors
    const uniqueInvestors = this.removeDuplicateInvestors(allInvestors);
    const validatedInvestors = await this.validateInvestors(uniqueInvestors, analysis);
    
    // Update state
    state.investors = validatedInvestors;
    state.investor_metadata = {
      ...state.investor_metadata,
      search_completed_at: getCurrentTimestamp(),
      total_investors_found: validatedInvestors.length,
      search_method: 'jina_api',
      strategies_executed: targeting_strategies.length
    };
    
    await writeJson(statePath, state);
    await appendLog(ctx.profilesDir + '/' + run_id, `Found ${validatedInvestors.length} validated investors`);
    
    console.log(`\n✅ InvestorSearchNode completed: ${validatedInvestors.length} investors found`);
    console.log(`📊 Breakdown by type: ${this.getInvestorTypeBreakdown(validatedInvestors)}`);
    
    // Create next message for investor enrichment
    return {
      run_id,
      event: EventTypes.INVESTOR_SEARCH_READY,
      from: this.id,
      to: NodeIds.INVESTOR_ENRICH,
      payload: {
        company_info,
        analysis,
        investors: validatedInvestors,
        total_found: validatedInvestors.length
      },
      ts: getCurrentTimestamp()
    };
  }

  /**
   * Search for investors using a specific targeting strategy
   * @param {Object} strategy - Investor targeting strategy
   * @param {Object} analysis - Company analysis
   * @returns {Promise<Array>} Search results
   */
  async searchInvestorsForStrategy(strategy, analysis) {
    const searchQueries = this.generateInvestorSearchQueries(strategy, analysis);
    let allResults = [];

    for (const query of searchQueries) {
      try {
        console.log(`   🔍 Query: "${query}"`);
        const results = await this.jinaSearch.search(query);
        
        if (results && results.length > 0) {
          const processedResults = results.map(result => ({
            ...result,
            search_query: query,
            strategy_id: strategy.id,
            target_investor_type: strategy.investor_type,
            strategy_name: strategy.strategy_name,
            search_priority: strategy.search_priority,
            found_at: getCurrentTimestamp()
          }));
          
          allResults = allResults.concat(processedResults);
          console.log(`   ✅ Found ${results.length} results for "${query}"`);
        }
      } catch (error) {
        console.error(`   ❌ Search failed for "${query}":`, error.message);
      }
    }

    return allResults;
  }

  /**
   * Generate search queries for finding investors based on targeting strategy
   * @param {Object} strategy - Investor targeting strategy
   * @param {Object} analysis - Company analysis
   * @returns {Array} Search queries
   */
  generateInvestorSearchQueries(strategy, analysis) {
    const queries = [];
    
    // Use strategy's search keywords as primary queries
    if (strategy.search_keywords && strategy.search_keywords.length > 0) {
      for (const keyword of strategy.search_keywords.slice(0, 3)) {
        queries.push(`${keyword} investor LinkedIn`);
      }
    }
    
    // Add sector + investor type combinations
    if (strategy.focus_sectors && strategy.focus_sectors.length > 0) {
      const sector = strategy.focus_sectors[0];
      const type = strategy.investor_type.toLowerCase();
      queries.push(`${sector} ${type} investor LinkedIn`);
    }
    
    // Add geographic targeting if specified
    if (strategy.geographic_preference && strategy.geographic_preference.length > 0) {
      const geo = strategy.geographic_preference[0];
      queries.push(`${strategy.investor_type} investor ${geo} ${strategy.focus_sectors?.[0] || ''}`);
    }
    
    // Add stage-specific queries if available
    if (strategy.stage_alignment && strategy.stage_alignment.length > 0) {
      const stage = strategy.stage_alignment[0];
      queries.push(`${stage} stage ${strategy.investor_type} ${strategy.focus_sectors?.[0] || ''}`);
    }

    return queries.slice(0, 4); // Limit to prevent rate limiting
  }

  /**
   * Process and structure investor search results
   * @param {Array} searchResults - Raw search results
   * @param {Object} strategy - Investor targeting strategy
   * @returns {Promise<Array>} Processed investors
   */
  async processInvestorResults(searchResults, strategy) {
    const investors = [];

    for (const result of searchResults) {
      try {
        // Extract investor information from search result
        const investorInfo = await this.extractInvestorInfo(result, strategy);
        
        if (investorInfo && this.isValidInvestor(investorInfo)) {
          investors.push({
            id: this.generateInvestorId(investorInfo),
            ...investorInfo,
            strategy_match: strategy.id,
            strategy_name: strategy.strategy_name,
            search_priority: strategy.search_priority,
            raw_search_data: result,
            confidence_score: this.calculateInvestorConfidence(investorInfo, strategy)
          });
        }
      } catch (error) {
        console.error('Error processing investor result:', error);
      }
    }

    return investors;
  }

  /**
   * Extract basic investor information from search result (minimal processing)
   * @param {Object} result - Search result
   * @param {Object} strategy - Investor targeting strategy
   * @returns {Promise<Object>} Basic investor info
   */
  async extractInvestorInfo(result, strategy) {
    // Do minimal extraction - just basic identification
    // Leave detailed analysis for InvestorEnrichNode
    
    const title = result.title || '';
    const description = result.description || '';
    const url = result.url || '';
    
    // Simple keyword-based detection for investors
    const investorKeywords = ['vc', 'venture capital', 'angel', 'investor', 'partner', 'fund', 'capital'];
    const hasInvestorKeywords = investorKeywords.some(keyword => 
      title.toLowerCase().includes(keyword) || 
      description.toLowerCase().includes(keyword)
    );
    
    if (!hasInvestorKeywords) {
      return null; // Not clearly an investor
    }
    
    // Extract basic info from title/description without LLM
    const basicInfo = {
      name: this.extractNameFromTitle(title),
      source_url: url,
      source_title: title,
      source_description: description,
      type: strategy.investor_type, // Use strategy type as default
      confidence: hasInvestorKeywords ? 'medium' : 'low',
      source: 'jina_search',
      extraction_method: 'basic_parsing',
      extracted_at: getCurrentTimestamp(),
      needs_enrichment: true // Flag for EnrichNode to do detailed analysis
    };
    
    return basicInfo.name ? basicInfo : null;
  }
  
  /**
   * Extract name from search result title using simple parsing
   * @param {string} title - Search result title
   * @returns {string} Extracted name
   */
  extractNameFromTitle(title) {
    // Simple name extraction without LLM
    // Look for patterns like "Name - Title" or "Name | Company"
    const separators = [' - ', ' | ', ' at ', ' of '];
    
    for (const sep of separators) {
      if (title.includes(sep)) {
        const parts = title.split(sep);
        const potentialName = parts[0].trim();
        if (this.looksLikeName(potentialName)) {
          return potentialName;
        }
      }
    }
    
    // Fallback: use first part if it looks like a name
    const firstPart = title.split(/[\-\|\(\[\<]/)[0].trim();
    return this.looksLikeName(firstPart) ? firstPart : title.substring(0, 50);
  }
  
  /**
   * Simple check if text looks like a person's name
   * @param {string} text - Text to check
   * @returns {boolean} Whether it looks like a name
   */
  looksLikeName(text) {
    // Basic heuristics for names
    const words = text.trim().split(/\s+/);
    if (words.length < 1 || words.length > 4) return false;
    
    const firstWord = words[0];
    // Check if starts with capital letter and isn't a common non-name word
    const nonNameWords = ['the', 'about', 'contact', 'professional', 'investment'];
    return /^[A-Z]/.test(firstWord) && !nonNameWords.includes(firstWord.toLowerCase());
  }

  /**
   * Validate if extracted info represents a real investor (simplified check)
   * @param {Object} investorInfo - Basic investor information
   * @returns {boolean} Whether this is a valid investor
   */
  isValidInvestor(investorInfo) {
    if (!investorInfo || !investorInfo.name) return false;
    
    // Basic validation - detailed validation happens in EnrichNode
    const name = investorInfo.name.toLowerCase();
    const title = investorInfo.source_title?.toLowerCase() || '';
    const description = investorInfo.source_description?.toLowerCase() || '';
    
    // Filter out obvious non-investors
    const excludeTerms = ['student', 'intern', 'consultant', 'author', 'blogger', 'journalist', 'news', 'reporter'];
    const hasExcludedTerms = excludeTerms.some(term =>
      name.includes(term) || title.includes(term) || description.includes(term)
    );
    
    return !hasExcludedTerms;
  }

  /**
   * Remove duplicate investors based on name and firm
   * @param {Array} investors - Array of investors
   * @returns {Array} Deduplicated investors
   */
  removeDuplicateInvestors(investors) {
    const seen = new Set();
    return investors.filter(investor => {
      const key = `${investor.name}:${investor.firm_name || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Validate investors against company requirements
   * @param {Array} investors - Array of investors
   * @param {Object} analysis - Company analysis
   * @returns {Promise<Array>} Validated investors
   */
  async validateInvestors(investors, analysis) {
    const validated = [];
    
    for (const investor of investors) {
      const validation = this.validateInvestorFit(investor, analysis);
      
      if (validation.is_good_fit) {
        validated.push({
          ...investor,
          validation: validation,
          fit_score: validation.fit_score,
          match_reasons: validation.match_reasons
        });
      }
    }
    
    // Sort by fit score
    return validated.sort((a, b) => (b.fit_score || 0) - (a.fit_score || 0));
  }

  /**
   * Basic validation of investor fit for the company
   * @param {Object} investor - Basic investor information
   * @param {Object} analysis - Company analysis
   * @returns {Object} Validation result
   */
  validateInvestorFit(investor, analysis) {
    let score = 0;
    const reasons = [];
    
    // Type alignment
    if (investor.type?.toLowerCase().includes(analysis.investor_types?.[0]?.toLowerCase())) {
      score += 40;
      reasons.push('Investor type alignment');
    }
    
    // Keyword alignment with sector
    const text = `${investor.source_title} ${investor.source_description}`.toLowerCase();
    if (text.includes(analysis.sector.toLowerCase())) {
      score += 30;
      reasons.push('Sector keyword match');
    }
    
    // Has valid source information
    if (investor.source_url) {
      score += 20;
      reasons.push('Valid source URL');
    }
    
    // Basic name quality
    if (investor.name && investor.name.length > 3) {
      score += 10;
      reasons.push('Valid name');
    }
    
    return {
      is_good_fit: score >= 30, // Lower threshold since we have less data
      fit_score: score,
      match_reasons: reasons,
      validation_method: 'basic_scoring'
    };
  }

  /**
   * Generate unique investor ID
   * @param {Object} investorInfo - Investor information
   * @returns {string} Unique ID
   */
  generateInvestorId(investorInfo) {
    const name = investorInfo.name?.replace(/\s+/g, '_').toLowerCase() || 'unknown';
    const timestamp = Date.now();
    return `investor_${name}_${timestamp}`;
  }

  /**
   * Calculate basic confidence score for investor match
   * @param {Object} investorInfo - Basic investor information
   * @param {Object} strategy - Investor targeting strategy
   * @returns {number} Confidence score (0-1)
   */
  calculateInvestorConfidence(investorInfo, strategy) {
    let score = 0.3; // Lower base score since we have less info
    
    // Type alignment based on strategy
    if (investorInfo.type && investorInfo.type.toLowerCase().includes(strategy.investor_type.toLowerCase())) {
      score += 0.3;
    }
    
    // Keyword alignment in title/description
    const text = `${investorInfo.source_title} ${investorInfo.source_description}`.toLowerCase();
    if (strategy.focus_sectors?.some(sector => text.includes(sector.toLowerCase()))) {
      score += 0.2;
    }
    
    // Has valid URL
    if (investorInfo.source_url) score += 0.2;
    
    return Math.min(score, 1.0);
  }

  /**
   * Get breakdown of investors by type
   * @param {Array} investors - Array of basic investor info
   * @returns {string} Formatted breakdown
   */
  getInvestorTypeBreakdown(investors) {
    const breakdown = investors.reduce((acc, investor) => {
      const type = investor.type || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(breakdown)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');
  }
} 