import path from 'path';
import fs from 'fs';
import { EventTypes, NodeIds } from '../../types.js';
import { readJson, writeJson, appendLog, getCurrentTimestamp } from '../../utils.js';
import OpenAI from 'openai';

/**
 * InvestorOutreachNode generates personalized investor outreach messages
 * Creates LinkedIn messages and emails for fundraising with pitch deck references
 */
export class InvestorOutreachNode {
  constructor() {
    this.id = NodeIds.INVESTOR_OUTREACH;
    this.handles = EventTypes.INVESTOR_ENRICH_READY;
    
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Generate LinkedIn connection request message for investors
   * @param {Object} investor - Investor information
   * @param {Object} dueDiligence - Due diligence data
   * @param {Object} companyInfo - Company information
   * @returns {Promise<string>} Generated message
   */
  async generateLinkedInConnectionMessage(investor, dueDiligence, companyInfo) {
    // Extract most relevant intelligence for connection request
    const portfolioCompany = dueDiligence.portfolio_companies?.[0] || '';
    const focusArea = dueDiligence.investment_focus?.[0] || companyInfo.technology;
    
    const prompt = `You are Mohamad from ${companyInfo.name} reaching out to an investor on LinkedIn. Generate a personalized connection request under 250 characters.

INVESTOR INFO:
- Name: ${investor.person_name || investor.name}
- Firm: ${investor.firm_name || 'N/A'}
- Type: ${investor.type}
- Investment Focus: ${dueDiligence.investment_focus?.join(', ') || 'General'}

COMPANY INFO:
- Name: ${companyInfo.name}
- Technology: ${companyInfo.technology}
- Stage: ${companyInfo.funding_stage}
- Market: ${companyInfo.market_size}

KEY INTELLIGENCE:
- Portfolio company: ${portfolioCompany}
- Investment thesis: ${dueDiligence.investment_thesis || 'N/A'}
- Recent investments: ${dueDiligence.recent_investments?.join(', ') || 'None found'}

Generate a LinkedIn connection request that:
1. Is under 250 characters including spaces
2. References their specific investment focus or portfolio company
3. Mentions your company and stage naturally
4. Creates curiosity about the opportunity
5. Sounds professional but not overly formal

Be specific about their investment background, not generic.

Return only the message text, no quotes or extra formatting.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 100
      });

      const message = response.choices[0].message.content.trim();
      
      // Ensure it's under 250 characters
      if (message.length > 250) {
        console.log(`⚠️ Message too long (${message.length} chars), truncating for ${investor.name}`);
        return message.substring(0, 247) + '...';
      }
      
      return message;
    } catch (error) {
      console.error(`Error generating LinkedIn connection message for ${investor.name}:`, error);
      return `Hi ${investor.person_name || investor.name}, I noticed your investments in ${focusArea}. We're building ${companyInfo.name} at ${companyInfo.funding_stage} stage and would love to connect to discuss the opportunity.`;
    }
  }

  /**
   * Generate LinkedIn follow-up message for investors
   * @param {Object} investor - Investor information
   * @param {Object} dueDiligence - Due diligence data
   * @param {Object} companyInfo - Company information
   * @returns {Promise<string>} Generated message
   */
  async generateLinkedInFollowUpMessage(investor, dueDiligence, companyInfo) {
    const prompt = `You are Mohamad from ${companyInfo.name} following up after connecting with an investor on LinkedIn. Generate a personalized follow-up message for fundraising.

INVESTOR INFO:
- Name: ${investor.person_name || investor.name}
- Firm: ${investor.firm_name || 'N/A'}
- Type: ${investor.type}
- Check Size: ${dueDiligence.check_size || 'N/A'}

COMPANY INFO:
- Name: ${companyInfo.name}
- Technology: ${companyInfo.technology}
- Market: ${companyInfo.market_size}
- Traction: ${companyInfo.traction}
- Stage: ${companyInfo.funding_stage}
- Use of Funds: ${companyInfo.use_of_funds}

DUE DILIGENCE INTELLIGENCE:
- Investment Focus: ${dueDiligence.investment_focus?.join(', ') || 'General'}
- Portfolio Companies: ${dueDiligence.portfolio_companies?.slice(0, 3).join(', ') || 'None found'}
- Investment Thesis: ${dueDiligence.investment_thesis || 'N/A'}
- Decision Criteria: ${dueDiligence.decision_criteria?.join(', ') || 'N/A'}
- Outreach Strategy: ${dueDiligence.outreach_strategy || 'N/A'}

Generate a LinkedIn follow-up message that:
1. Thanks them for connecting
2. References 2-3 SPECIFIC details from their investment background
3. Clearly presents your company's opportunity and traction
4. Mentions you'd like to send them a pitch deck
5. Includes this Calendly link for scheduling: https://calendly.com/mohamed-legml/30min
6. Sounds professional and investor-appropriate
7. Shows you've done your research on their portfolio/thesis

Be specific about their investments and thesis, not generic.

Return only the message text, no quotes or formatting.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 400
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error(`Error generating LinkedIn follow-up message for ${investor.name}:`, error);
      return `Thanks for connecting, ${investor.person_name || investor.name}! I noticed your investments in ${dueDiligence.investment_focus?.[0] || 'technology'} at ${investor.firm_name}. We're building ${companyInfo.name} - ${companyInfo.technology} - and would love to share our pitch deck and discuss the opportunity. Would you be open to a brief call? You can book a time here: https://calendly.com/mohamed-legml/30min`;
    }
  }

  /**
   * Generate personalized investor email message
   * @param {Object} investor - Investor information
   * @param {Object} dueDiligence - Due diligence data
   * @param {Object} companyInfo - Company information
   * @returns {Promise<string>} Generated message with subject
   */
  async generateInvestorEmail(investor, dueDiligence, companyInfo) {
    const prompt = `You are Mohamad from ${companyInfo.name} writing a fundraising email to an investor. Generate a personalized investor email.

INVESTOR INFO:
- Name: ${investor.person_name || investor.name}
- Firm: ${investor.firm_name || 'N/A'}
- Type: ${investor.type}
- Title: ${investor.title || 'N/A'}

COMPANY INFO:
- Name: ${companyInfo.name}
- Technology: ${companyInfo.technology}
- Market Size: ${companyInfo.market_size}
- Competitive Edge: ${companyInfo.competitive_edge}
- Traction: ${companyInfo.traction}
- Funding Stage: ${companyInfo.funding_stage}
- Use of Funds: ${companyInfo.use_of_funds}

COMPREHENSIVE DUE DILIGENCE:
- Investment Focus: ${dueDiligence.investment_focus?.join('; ') || 'General'}
- Portfolio Companies: ${dueDiligence.portfolio_companies?.join('; ') || 'None found'}
- Check Size: ${dueDiligence.check_size || 'N/A'}
- Investment Thesis: ${dueDiligence.investment_thesis || 'N/A'}
- Recent Investments: ${dueDiligence.recent_investments?.join('; ') || 'None found'}
- Decision Criteria: ${dueDiligence.decision_criteria?.join('; ') || 'N/A'}
- Partnership Value: ${dueDiligence.partnership_value || 'N/A'}
- Fit Assessment: ${dueDiligence.fit_assessment || 'medium'}

Generate an investor email that:
1. Has a compelling, specific subject line referencing their investment focus
2. Opens by referencing 2-3 SPECIFIC details from their portfolio/thesis
3. Clearly presents the investment opportunity with key metrics
4. Explains why this fits their investment criteria
5. Mentions you're attaching/sending a pitch deck
6. Ends with meeting request using Calendly: https://calendly.com/mohamed-legml/30min
7. Maintains professional investor-appropriate tone
8. Shows deep research into their investment background

Be extremely specific - mention actual portfolio companies, investment thesis details, etc. This should feel highly researched.

Format as:
Subject: [specific subject line]

[email body]

Sign as:
Best regards,
Mohamad
Founder & CEO
${companyInfo.name}

Return the complete email with subject line.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 600
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error(`Error generating investor email for ${investor.name}:`, error);
      return `Subject: ${companyInfo.name} - ${companyInfo.funding_stage} opportunity in ${dueDiligence.investment_focus?.[0] || companyInfo.technology}

Hi ${investor.person_name || investor.name},

I hope this email finds you well. I'm reaching out because I noticed your investment focus in ${dueDiligence.investment_focus?.[0] || 'technology'} at ${investor.firm_name}.

We're building ${companyInfo.name} - ${companyInfo.technology}. Our traction includes ${companyInfo.traction}, and we're raising ${companyInfo.funding_stage} funding.

I'd love to send you our pitch deck and discuss how this opportunity aligns with your investment thesis.

Would you be open to a brief call? You can book a time here: https://calendly.com/mohamed-legml/30min

Best regards,
Mohamad
Founder & CEO
${companyInfo.name}`;
    }
  }

  /**
   * Escape text for CSV format
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeCSV(text) {
    if (!text) return '';
    const escaped = text.toString().replace(/"/g, '""');
    if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
      return `"${escaped}"`;
    }
    return escaped;
  }

  /**
   * Generate CSV content with all investor outreach messages
   * @param {Array} enrichedInvestors - Investors with due diligence
   * @param {Object} companyInfo - Company information
   * @returns {Promise<string>} CSV content
   */
  async generateInvestorCSVContent(enrichedInvestors, companyInfo) {
    console.log('🤖 Generating personalized investor outreach messages...');
    
    const headers = [
      'Investor_Name',
      'Firm_Name',
      'Type',
      'Title',
      'LinkedIn_URL',
      'Check_Size',
      'Investment_Focus',
      'LinkedIn_Connection_Request',
      'LinkedIn_Follow_Up_Message',
      'Investor_Email',
      'Portfolio_Companies',
      'Investment_Thesis',
      'Decision_Criteria',
      'Fit_Assessment',
      'Due_Diligence_Confidence'
    ];

    const csvRows = [headers.join(',')];

    for (let i = 0; i < enrichedInvestors.length; i++) {
      const investor = enrichedInvestors[i];
      const dueDiligence = investor.due_diligence || {};
      
      console.log(`📝 Processing ${investor.name} (${i + 1}/${enrichedInvestors.length})`);
      
      // Generate all three types of messages in parallel
      const [linkedinConnection, linkedinFollowUp, investorEmail] = await Promise.all([
        this.generateLinkedInConnectionMessage(investor, dueDiligence, companyInfo),
        this.generateLinkedInFollowUpMessage(investor, dueDiligence, companyInfo),
        this.generateInvestorEmail(investor, dueDiligence, companyInfo)
      ]);

      const row = [
        this.escapeCSV(investor.person_name || investor.name),
        this.escapeCSV(investor.firm_name || ''),
        this.escapeCSV(investor.type),
        this.escapeCSV(investor.title || ''),
        this.escapeCSV(investor.linkedin_url || ''),
        this.escapeCSV(dueDiligence.check_size || ''),
        this.escapeCSV(dueDiligence.investment_focus?.join('; ') || ''),
        this.escapeCSV(linkedinConnection),
        this.escapeCSV(linkedinFollowUp),
        this.escapeCSV(investorEmail),
        this.escapeCSV(dueDiligence.portfolio_companies?.join('; ') || ''),
        this.escapeCSV(dueDiligence.investment_thesis || ''),
        this.escapeCSV(dueDiligence.decision_criteria?.join('; ') || ''),
        this.escapeCSV(dueDiligence.fit_assessment || ''),
        this.escapeCSV(dueDiligence.analysis_confidence || '')
      ];

      csvRows.push(row.join(','));
      
      // Store messages in investor object for state.json
      investor.outreach_messages = {
        linkedin_connection: linkedinConnection,
        linkedin_followup: linkedinFollowUp,
        email: investorEmail,
        generated_at: getCurrentTimestamp(),
        generated_by: 'InvestorOutreachNode'
      };

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return csvRows.join('\n');
  }

  /**
   * Save CSV file to profile directory
   * @param {string} runId - Run identifier
   * @param {string} csvContent - CSV content to save
   * @param {string} profilesDir - Profiles directory path
   * @returns {string} Path to saved CSV file
   */
  saveInvestorCSVFile(runId, csvContent, profilesDir) {
    const profileDir = path.join(profilesDir, runId);
    const csvPath = path.join(profileDir, 'investor-outreach.csv');
    
    fs.writeFileSync(csvPath, csvContent, 'utf8');
    console.log(`📄 Investor CSV exported to: ${csvPath}`);
    
    return csvPath;
  }

  /**
   * Update state.json with investor outreach data
   * @param {string} runId - Run identifier
   * @param {Array} enrichedInvestors - Investors with outreach messages
   * @param {string} csvPath - Path to CSV file
   * @param {string} profilesDir - Profiles directory path
   */
  async updateInvestorState(runId, enrichedInvestors, csvPath, profilesDir) {
    const statePath = path.join(profilesDir, runId, 'state.json');
    const state = await readJson(statePath);

    // Update investors with outreach messages
    state.investors = enrichedInvestors;

    // Add investor outreach metadata
    state.investor_outreach_metadata = {
      total_investors_processed: enrichedInvestors.length,
      outreach_messages_generated: enrichedInvestors.filter(inv => inv.outreach_messages).length,
      csv_export_path: csvPath,
      outreach_completed_at: getCurrentTimestamp(),
      outreach_method: 'due_diligence_based',
      message_types: ['linkedin_connection', 'linkedin_followup', 'investor_email']
    };

    await writeJson(statePath, state);
    console.log(`💾 Investor state updated with outreach messages`);
  }

  /**
   * Main execution method
   * @param {Object} message - Incoming message from InvestorEnrichNode
   * @param {Object} ctx - Application context
   * @returns {Promise<Object>} Next message for pipeline
   */
  async run(message, ctx) {
    const { run_id, payload } = message;
    const { company_info, investors } = payload;
    
    console.log(`🎯 InvestorOutreachNode: Processing ${investors.length} investors for outreach generation`);
    
    // Filter investors that are ready for outreach
    const readyInvestors = investors.filter(investor => 
      investor.ready_for_outreach && 
      investor.due_diligence && 
      !investor.due_diligence.error
    );
    
    console.log(`✨ Found ${readyInvestors.length} investors ready for outreach`);
    
    if (readyInvestors.length === 0) {
      console.log('❌ No investors ready for outreach generation');
      return null;
    }

    // Generate CSV content with personalized investor messages
    const csvContent = await this.generateInvestorCSVContent(readyInvestors, company_info);
    
    // Save CSV file
    const csvPath = this.saveInvestorCSVFile(run_id, csvContent, ctx.profilesDir);
    
    // Update state.json with outreach messages and metadata
    await this.updateInvestorState(run_id, readyInvestors, csvPath, ctx.profilesDir);
    
    console.log(`✅ InvestorOutreachNode completed:`);
    console.log(`   • Generated personalized messages for ${readyInvestors.length} investors`);
    console.log(`   • CSV exported to: ${csvPath}`);
    console.log(`   • State updated with investor outreach data`);
    
    // Create final completion message
    return {
      run_id,
      event: EventTypes.INVESTOR_OUTREACH_READY,
      from: this.id,
      to: 'COMPLETE',
      payload: {
        investors_count: readyInvestors.length,
        csv_path: csvPath,
        investor_outreach_complete: true,
        investors: readyInvestors
      },
      ts: getCurrentTimestamp()
    };
  }
} 