import path from 'path';
import { EventTypes, NodeIds } from '../../types.js';
import { readJson, writeJson, appendLog, getCurrentTimestamp } from '../../utils.js';
import OpenAI from 'openai';

/**
 * InvestorPersonaNode analyzes company information and generates targeted investor personas
 * Uses GPT-4o to evaluate sector, funding stage, and recommend investor types
 */
export class InvestorPersonaNode {
  constructor() {
    this.id = NodeIds.INVESTOR_PERSONA;
    this.handles = EventTypes.INVESTOR_INTAKE_READY;
    
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Main execution method
   * @param {Object} message - Incoming message from InvestorIntakeNode
   * @param {Object} ctx - Application context
   * @returns {Promise<Object>} Next message for pipeline
   */
  async run(message, ctx) {
    const { run_id, payload } = message;
    const companyInfo = payload.company_info;
    
    console.log(`🎯 InvestorPersonaNode: Analyzing ${companyInfo.name} for investor targeting`);
    
    // Load existing state
    const statePath = path.join(ctx.profilesDir, run_id, 'state.json');
    const state = await readJson(statePath);
    
    // Analyze company with GPT-4o
    const analysis = await this.analyzeCompanyForInvestors(companyInfo);
    
    // Generate investor targeting strategies based on analysis
    const targetingStrategies = await this.generateInvestorPersonas(companyInfo, analysis);
    
    // Update state with analysis and targeting strategies
    state.investor_analysis = analysis;
    state.investor_targeting_strategies = targetingStrategies;
    state.investor_metadata = {
      ...state.investor_metadata,
      analysis_completed_at: getCurrentTimestamp(),
      strategies_generated: targetingStrategies.length,
      recommended_stage: analysis.recommended_stage,
      target_sectors: analysis.target_sectors
    };
    
    // Save updated state
    await writeJson(statePath, state);
    
    // Log completion
    await appendLog(ctx.profilesDir + '/' + run_id, `Generated ${targetingStrategies.length} investor targeting strategies for ${analysis.sector} sector`);
    
    console.log(`✅ Generated ${targetingStrategies.length} investor targeting strategies`);
    console.log(`📊 Sector: ${analysis.sector}`);
    console.log(`🎚️  Recommended stage: ${analysis.recommended_stage}`);
    console.log(`💰 Target check size: ${analysis.target_check_size}`);
    
    // Show strategies summary
    targetingStrategies.forEach((strategy, index) => {
      console.log(`   ${index + 1}. ${strategy.strategy_name} (${strategy.investor_type}) - Priority: ${strategy.search_priority}`);
    });
    
    // Create next message for investor search
    return {
      run_id,
      event: EventTypes.INVESTOR_PERSONAS_READY,
      from: this.id,
      to: NodeIds.INVESTOR_SEARCH,
      payload: {
        company_info: companyInfo,
        analysis: analysis,
        targeting_strategies: targetingStrategies
      },
      ts: getCurrentTimestamp()
    };
  }

  /**
   * Analyze company information to determine optimal investor targeting
   * @param {Object} companyInfo - Company information from intake
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeCompanyForInvestors(companyInfo) {
    const prompt = `You are an expert venture capital analyst. Analyze this company and provide strategic recommendations for investor targeting.

COMPANY INFORMATION:
- Name: ${companyInfo.name}
- Technology/Product: ${companyInfo.technology}
- Market Size: ${companyInfo.market_size}
- Competitive Edge: ${companyInfo.competitive_edge}
- Traction: ${companyInfo.traction}
- Current Funding Stage: ${companyInfo.funding_stage}
- Use of Funds: ${companyInfo.use_of_funds}
- Geographic Focus: ${companyInfo.geographic_focus}

Provide a comprehensive analysis in JSON format with these fields:
- sector: Primary industry sector (e.g., "fintech", "healthtech", "ai", "saas", "hardware", etc.)
- sub_sector: More specific category
- recommended_stage: Best funding stage to pursue (pre-seed, seed, series-a, etc.)
- target_check_size: Recommended funding amount range
- investor_types: Array of investor types to target (e.g., ["VCs", "angels", "strategic investors"])
- geographic_markets: Best geographic markets for this company
- investment_thesis: Key investment thesis points that would appeal to investors
- risk_factors: Main risk factors investors would consider
- competitive_landscape: Brief competitive analysis
- growth_potential: Assessment of scalability and growth potential
- matching_criteria: What investors should look for to be a good fit

Focus on actionable insights that will help target the right investors.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      
      return {
        ...analysis,
        generated_at: getCurrentTimestamp(),
        analysis_method: 'gpt4o_evaluation'
      };
    } catch (error) {
      console.error('Error analyzing company for investors:', error);
      
      // Fallback analysis
      return {
        sector: 'technology',
        sub_sector: 'software',
        recommended_stage: this.extractStageFromString(companyInfo.funding_stage),
        target_check_size: 'TBD',
        investor_types: ['VCs', 'angels'],
        geographic_markets: [companyInfo.geographic_focus || 'Global'],
        investment_thesis: ['Innovative technology solution'],
        risk_factors: ['Market competition', 'Execution risk'],
        competitive_landscape: 'Competitive market',
        growth_potential: 'High',
        matching_criteria: ['Sector expertise', 'Check size alignment'],
        generated_at: getCurrentTimestamp(),
        analysis_method: 'fallback',
        error: error.message
      };
    }
  }

  /**
   * Generate specific investor personas based on company analysis
   * @param {Object} companyInfo - Company information
   * @param {Object} analysis - Company analysis results
   * @returns {Promise<Array>} Array of investor personas
   */
  async generateInvestorPersonas(companyInfo, analysis) {
    const prompt = `Generate 3-4 investor targeting strategies for this company based on the analysis. Focus on SEARCH CRITERIA, not fake investor details.

COMPANY: ${companyInfo.name}
SECTOR: ${analysis.sector}
STAGE: ${analysis.recommended_stage}
CHECK SIZE: ${analysis.target_check_size}
INVESTOR TYPES: ${analysis.investor_types.join(', ')}
GEOGRAPHIC FOCUS: ${analysis.geographic_markets.join(', ')}

For each targeting strategy, provide:
- strategy_name: Name of this targeting approach (e.g., "Fintech Seed VCs", "AI-focused Angels")
- investor_type: Type to target (VC, angel, strategic, accelerator, etc.)
- target_criteria: Specific criteria for this search
- search_keywords: Keywords for finding these investors
- focus_sectors: Sectors these investors should focus on
- stage_alignment: What stages they should invest in
- geographic_preference: Where they should be located/invest
- check_size_range: Expected investment range
- search_priority: Priority level (high/medium/low)

Focus on FINDABLE criteria, not made-up details. These will guide the search for REAL investors.

Return as a JSON object with "strategies" array.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      const strategies = result.strategies || result.investor_strategies || [];

      // Add metadata to each strategy
      return strategies.map((strategy, index) => ({
        ...strategy,
        id: `investor_strategy_${index + 1}`,
        created_at: getCurrentTimestamp(),
        for_company: companyInfo.name,
        target_sector: analysis.sector,
        analysis_based: true
      }));
    } catch (error) {
      console.error('Error generating investor targeting strategies:', error);
      
      // Fallback strategies
      return this.generateFallbackStrategies(companyInfo, analysis);
    }
  }

  /**
   * Generate fallback strategies if GPT-4o fails
   * @param {Object} companyInfo - Company information
   * @param {Object} analysis - Company analysis
   * @returns {Array} Fallback investor strategies
   */
  generateFallbackStrategies(companyInfo, analysis) {
    const stage = analysis.recommended_stage;
    const sector = analysis.sector;
    
    const baseStrategies = [
      {
        strategy_name: `${sector.charAt(0).toUpperCase() + sector.slice(1)} ${stage} VCs`,
        investor_type: 'VC',
        target_criteria: [`${sector} focused`, `${stage} stage`, 'active portfolio'],
        search_keywords: [sector, 'VC', stage, 'venture capital'],
        focus_sectors: [sector],
        stage_alignment: [stage],
        geographic_preference: [companyInfo.geographic_focus || 'US'],
        check_size_range: analysis.target_check_size || '$500K-2M',
        search_priority: 'high'
      },
      {
        strategy_name: `${sector} Angel Investors`,
        investor_type: 'Angel',
        target_criteria: [`${sector} experience`, 'angel investor', 'early stage'],
        search_keywords: [sector, 'angel investor', 'startup investor'],
        focus_sectors: [sector, 'technology'],
        stage_alignment: ['pre-seed', 'seed'],
        geographic_preference: [companyInfo.geographic_focus || 'Global'],
        check_size_range: '$25K-100K',
        search_priority: 'medium'
      }
    ];

    return baseStrategies.map((strategy, index) => ({
      ...strategy,
      id: `fallback_strategy_${index + 1}`,
      created_at: getCurrentTimestamp(),
      for_company: companyInfo.name,
      target_sector: sector,
      analysis_based: false
    }));
  }

  /**
   * Extract funding stage from user input string
   * @param {string} stageString - Raw funding stage input
   * @returns {string} Normalized stage
   */
  extractStageFromString(stageString) {
    const stage = stageString.toLowerCase();
    
    if (stage.includes('pre-seed') || stage.includes('preseed')) return 'pre-seed';
    if (stage.includes('seed')) return 'seed';
    if (stage.includes('series a') || stage.includes('a round')) return 'series-a';
    if (stage.includes('series b') || stage.includes('b round')) return 'series-b';
    
    return 'seed'; // Default fallback
  }
} 