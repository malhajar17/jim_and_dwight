import path from 'path';
import fs from 'fs';
import { EventTypes, NodeIds } from '../types.js';
import { readJson, writeJson, appendLog, getCurrentTimestamp } from '../utils.js';
import OpenAI from 'openai';

/**
 * OutreachNode generates personalized outreach messages based on competitive intelligence
 * Exports leads to CSV with LinkedIn connection requests, follow-ups, and emails
 */
export class OutreachNode {
  constructor() {
    this.id = NodeIds.OUTREACH;
    this.handles = EventTypes.ENRICH_READY;
    
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Generate LinkedIn connection request message under 250 characters
   * @param {Object} lead - Lead information
   * @param {Object} competitiveIntel - Competitive intelligence data
   * @param {Object} productInfo - Product information from state
   * @param {Object} userInfo - User information from state
   * @returns {Promise<string>} Generated message
   */
  async generateLinkedInConnectionMessage(lead, competitiveIntel, productInfo, userInfo) {
    // Extract the most relevant competitive intelligence for connection request
    const currentProjects = competitiveIntel.current_projects || [];
    const recentDevelopments = competitiveIntel.recent_developments || [];
    const strategicPriorities = competitiveIntel.strategic_priorities || [];
    const outreachAngles = competitiveIntel.outreach_angles || [];
    
    // Pick the most specific and recent intelligence
    const keyInsight = currentProjects[0] || recentDevelopments[0] || strategicPriorities[0] || competitiveIntel.summary || '';
    
    const prompt = `You are Mohamad from legml.ai reaching out on LinkedIn. Generate a personalized connection request under 250 characters.

LEAD INFO:
- Name: ${lead.name}
- Title: ${lead.title}
- Company: ${lead.company}

MOST RELEVANT COMPETITIVE INTELLIGENCE:
${keyInsight}

ADDITIONAL CONTEXT:
- Recent developments: ${recentDevelopments.slice(0, 2).join('; ') || 'None found'}
- Strategic priorities: ${strategicPriorities.slice(0, 2).join('; ') || 'None found'}
- Outreach angles: ${outreachAngles.slice(0, 2).join('; ') || 'None found'}

PRODUCT CONTEXT:
- Product: ${productInfo.product} - ${productInfo.pain}
- Target: ${productInfo.target}
- Proof: ${productInfo.proof}
- Constraint: ${productInfo.constraints}

Generate a LinkedIn connection request that:
1. Is under 250 characters including spaces
2. References the SPECIFIC competitive intelligence above
3. Mentions your relevant on-premise LLM solution naturally
4. Sounds conversational and professional
5. Creates genuine curiosity based on their actual situation

Be specific about their current work/projects, not generic. Use the intelligence to show you've done your research.

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
        console.log(`⚠️ Message too long (${message.length} chars), truncating for ${lead.name}`);
        return message.substring(0, 247) + '...';
      }
      
      return message;
    } catch (error) {
      console.error(`Error generating LinkedIn connection message for ${lead.name}:`, error);
      return `Hi ${lead.name}, I noticed your work at ${lead.company} on ${keyInsight.substring(0, 100)}. We help ${lead.title}s with on-premise AI that achieves 75% accuracy on French business law. Connect to discuss?`;
    }
  }

  /**
   * Generate LinkedIn follow-up message
   * @param {Object} lead - Lead information  
   * @param {Object} competitiveIntel - Competitive intelligence data
   * @param {Object} productInfo - Product information from state
   * @param {Object} userInfo - User information from state
   * @returns {Promise<string>} Generated message
   */
  async generateLinkedInFollowUpMessage(lead, competitiveIntel, productInfo, userInfo) {
    const prompt = `You are Mohamad from legml.ai following up after connecting on LinkedIn. Generate a personalized follow-up message.

LEAD INFO:
- Name: ${lead.name}
- Title: ${lead.title}  
- Company: ${lead.company}

DETAILED COMPETITIVE INTELLIGENCE:
- Current Projects: ${competitiveIntel.current_projects?.join('; ') || 'None found'}
- Recent Developments: ${competitiveIntel.recent_developments?.join('; ') || 'None found'}
- Strategic Priorities: ${competitiveIntel.strategic_priorities?.join('; ') || 'None found'}
- Company Context: ${competitiveIntel.company_context?.join('; ') || 'None found'}
- Competitive Intelligence: ${competitiveIntel.competitive_intelligence?.join('; ') || 'None found'}
- Outreach Angles: ${competitiveIntel.outreach_angles?.join('; ') || 'None found'}
- Recent Quotes: ${competitiveIntel.recent_quotes_or_statements?.join('; ') || 'None found'}
- Summary: ${competitiveIntel.summary || 'None found'}

PRODUCT CONTEXT:
- Product: ${productInfo.product} - ${productInfo.pain}
- Target: ${productInfo.target}
- Proof: ${productInfo.proof}
- Value Proposition: ${productInfo.pain}
- Constraints: ${productInfo.constraints}

Generate a LinkedIn follow-up message that:
1. Thanks them for connecting
2. References 2-3 SPECIFIC details from their competitive intelligence above
3. Clearly explains how your on-premise LLM solution addresses their specific challenges
4. Includes the 75% French business law performance metric naturally
5. Suggests a concrete next step with this Calendly link: https://calendly.com/mohamed-legml/30min
6. Sounds conversational, not salesy
7. Shows deep understanding of their current situation and challenges

Be very specific about their work - mention actual projects, recent developments, or strategic priorities. Don't be generic.

Include the Calendly link naturally in the call-to-action, making it easy for them to book a meeting.

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
      console.error(`Error generating LinkedIn follow-up message for ${lead.name}:`, error);
      return `Thanks for connecting, ${lead.name}! I noticed your work on ${competitiveIntel.current_projects?.[0] || 'regulatory initiatives'} at ${lead.company}. At legml.ai, we help ${lead.title}s deploy secure, on-premise LLMs that achieve 75% accuracy on French business law. Would you be open to a brief call? You can book a time that works for you here: https://calendly.com/mohamed-legml/30min`;
    }
  }

  /**
   * Generate personalized email message
   * @param {Object} lead - Lead information
   * @param {Object} competitiveIntel - Competitive intelligence data  
   * @param {Object} productInfo - Product information from state
   * @param {Object} userInfo - User information from state
   * @returns {Promise<string>} Generated message with subject
   */
  async generateEmailMessage(lead, competitiveIntel, productInfo, userInfo) {
    const prompt = `You are Mohamad from legml.ai writing a casual, light cold email. Use the provided example style - conversational, direct, and friendly.

LEAD INFO:
- Name: ${lead.name}
- Title: ${lead.title}
- Company: ${lead.company}

KEY COMPETITIVE INTELLIGENCE (use 1-2 most relevant points):
- Current Projects: ${competitiveIntel.current_projects?.join('; ') || 'None found'}
- Recent Developments: ${competitiveIntel.recent_developments?.join('; ') || 'None found'}
- Strategic Priorities: ${competitiveIntel.strategic_priorities?.join('; ') || 'None found'}
- Summary: ${competitiveIntel.summary || 'None found'}

PRODUCT INFO:
- Product: ${productInfo.product} (on-premise LLM for ${productInfo.target})
- Key benefit: ${productInfo.pain} - 75% accuracy on French business law
- Target: ${productInfo.target}

Write a light, casual email that:
1. Starts with "Hey [Name]," 
2. Mentions ONE specific thing about their work/company (from competitive intelligence)
3. Makes a casual assumption or observation about their challenges
4. Presents your solution in 1-2 simple sentences
5. Mentions the 75% French business law accuracy briefly
6. Ends with a simple call-to-action using the Calendly link
7. Keeps it SHORT - max 6-7 lines of body text
8. Uses casual language like "I'm guessing", "This might help", etc.
9. No formal business jargon

Example style reference:
"Hey [Name],
Great to see [something specific about their work].
With [their situation], I'm guessing [challenge assumption].
We've built [solution] - [key benefit].
[Brief proof point].
Want to chat? Book a quick call: https://calendly.com/mohamed-legml/30min

Regards,
Mohamad
legml.ai"

Keep the subject line casual and specific. Return the complete email.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 300
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error(`Error generating email message for ${lead.name}:`, error);
      return `Subject: Quick thought on ${lead.company}'s compliance challenges

Hey ${lead.name},

Great to see your work at ${lead.company}.

With ${lead.title} responsibilities, I'm guessing regulatory compliance keeps you busy.

We've built an on-premise LLM that hits 75% accuracy on French business law - no data privacy concerns.

Want to chat? Book a quick call: https://calendly.com/mohamed-legml/30min

Regards,
Mohamad
legml.ai`;
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
   * Generate CSV content with all outreach messages
   * @param {Array} enrichedLeads - Leads with competitive intelligence
   * @param {Object} productInfo - Product information
   * @param {Object} userInfo - User information
   * @returns {Promise<string>} CSV content
   */
  async generateCSVContent(enrichedLeads, productInfo, userInfo) {
    console.log('🤖 Generating personalized outreach messages...');
    
    const headers = [
      'Name',
      'Title',
      'Company', 
      'Email',
      'LinkedIn_URL',
      'Location',
      'LinkedIn_Connection_Request',
      'LinkedIn_Follow_Up_Message',
      'Email_Message',
      'Current_Projects',
      'Recent_Developments',
      'Strategic_Priorities',
      'Outreach_Angles',
      'Company_Context',
      'Competitive_Intelligence',
      'Intelligence_Quality',
      'Analysis_Summary'
    ];

    const csvRows = [headers.join(',')];

    for (let i = 0; i < enrichedLeads.length; i++) {
      const lead = enrichedLeads[i];
      const competitiveIntel = lead.personality_analysis || {};
      
      console.log(`📝 Processing ${lead.name} (${i + 1}/${enrichedLeads.length})`);
      
      // Generate all three types of messages in parallel
      const [linkedinConnection, linkedinFollowUp, emailMessage] = await Promise.all([
        this.generateLinkedInConnectionMessage(lead, competitiveIntel, productInfo, userInfo),
        this.generateLinkedInFollowUpMessage(lead, competitiveIntel, productInfo, userInfo),
        this.generateEmailMessage(lead, competitiveIntel, productInfo, userInfo)
      ]);

      const row = [
        this.escapeCSV(lead.name),
        this.escapeCSV(lead.title),
        this.escapeCSV(lead.company),
        this.escapeCSV(lead.email),
        this.escapeCSV(lead.linkedin_url),
        this.escapeCSV(lead.location),
        this.escapeCSV(linkedinConnection),
        this.escapeCSV(linkedinFollowUp),
        this.escapeCSV(emailMessage),
        this.escapeCSV(competitiveIntel.current_projects?.join('; ') || ''),
        this.escapeCSV(competitiveIntel.recent_developments?.join('; ') || ''),
        this.escapeCSV(competitiveIntel.strategic_priorities?.join('; ') || ''),
        this.escapeCSV(competitiveIntel.outreach_angles?.join('; ') || ''),
        this.escapeCSV(competitiveIntel.company_context?.join('; ') || ''),
        this.escapeCSV(competitiveIntel.competitive_intelligence?.join('; ') || ''),
        this.escapeCSV(competitiveIntel.intelligence_quality || ''),
        this.escapeCSV(competitiveIntel.summary || '')
      ];

      csvRows.push(row.join(','));
      
      // Store messages in lead object for state.json
      lead.outreach_messages = {
        linkedin_connection: linkedinConnection,
        linkedin_followup: linkedinFollowUp,
        email: emailMessage,
        generated_at: getCurrentTimestamp(),
        generated_by: 'OutreachNode'
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
  saveCSVFile(runId, csvContent, profilesDir) {
    const profileDir = path.join(profilesDir, runId);
    const csvPath = path.join(profileDir, 'leads-outreach.csv');
    
    fs.writeFileSync(csvPath, csvContent, 'utf8');
    console.log(`📄 CSV exported to: ${csvPath}`);
    
    return csvPath;
  }

  /**
   * Update state.json with outreach data
   * @param {string} runId - Run identifier
   * @param {Array} enrichedLeads - Leads with outreach messages
   * @param {string} csvPath - Path to CSV file
   * @param {string} profilesDir - Profiles directory path
   */
  async updateState(runId, enrichedLeads, csvPath, profilesDir) {
    const statePath = path.join(profilesDir, runId, 'state.json');
    const state = await readJson(statePath);

    // Update leads with outreach messages
    state.leads = enrichedLeads;

    // Add outreach metadata
    state.outreach_metadata = {
      total_leads_processed: enrichedLeads.length,
      outreach_messages_generated: enrichedLeads.filter(l => l.outreach_messages).length,
      csv_export_path: csvPath,
      outreach_completed_at: getCurrentTimestamp(),
      outreach_method: 'competitive_intelligence_based',
      message_types: ['linkedin_connection', 'linkedin_followup', 'email']
    };

    await writeJson(statePath, state);
    console.log(`💾 State updated with outreach messages`);
  }

  /**
   * Main execution method
   * @param {Object} message - Incoming message from EnrichNode
   * @param {Object} ctx - Application context
   * @returns {Promise<Object>} Next message for pipeline
   */
  async run(message, ctx) {
    const { run_id, payload } = message;
    const leads = payload.leads || [];
    
    console.log(`🎯 OutreachNode: Processing ${leads.length} leads for outreach generation`);
    
    // Filter leads that have competitive intelligence
    const enrichedLeads = leads.filter(lead => 
      lead.personality_analysis && 
      lead.personality_analysis.summary && 
      lead.personality_analysis.summary !== "No specific information was found" &&
      lead.personality_analysis.summary !== "No specific, recent, or actionable information about"
    );
    
    console.log(`✨ Found ${enrichedLeads.length} leads with competitive intelligence`);
    
    if (enrichedLeads.length === 0) {
      console.log('❌ No leads with competitive intelligence found for outreach generation');
      return null;
    }

    // Load state to get product and user information
    const statePath = path.join(ctx.profilesDir, run_id, 'state.json');
    const state = await readJson(statePath);
    
    const productInfo = state.profile?.answers || {};
    const userInfo = {
      name: 'Mohamad',
      company: 'legml.ai',
      email: 'mohamad@legml.ai'
    };

    // Generate CSV content with personalized messages
    const csvContent = await this.generateCSVContent(enrichedLeads, productInfo, userInfo);
    
    // Save CSV file
    const csvPath = this.saveCSVFile(run_id, csvContent, ctx.profilesDir);
    
    // Update state.json with outreach messages and metadata
    await this.updateState(run_id, enrichedLeads, csvPath, ctx.profilesDir);
    
    console.log(`✅ OutreachNode completed:`);
    console.log(`   • Generated personalized messages for ${enrichedLeads.length} leads`);
    console.log(`   • CSV exported to: ${csvPath}`);
    console.log(`   • State updated with outreach data`);
    
    // Create final completion message
    return {
      run_id,
      event: EventTypes.OUTREACH_READY,
      from: this.id,
      to: 'COMPLETE',
      payload: {
        leads_count: enrichedLeads.length,
        csv_path: csvPath,
        outreach_complete: true,
        leads: enrichedLeads
      },
      ts: getCurrentTimestamp()
    };
  }
} 