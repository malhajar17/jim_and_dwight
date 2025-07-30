#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router } from '../lib/router.js';
import { EventTypes, NodeIds } from '../lib/types.js';
import { readJson } from '../lib/utils.js';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

/**
 * Resume Enrichment - Start directly from step 4 (competitive intelligence analysis)
 */
class ResumeEnrichment {
  constructor() {
    this.ctx = {
      timezone: process.env.TIMEZONE || 'Europe/Paris',
      profilesDir: path.join(projectRoot, 'profiles')
    };
    this.router = new Router();
  }

  /**
   * Resume from existing state file
   */
  async resumeFromState(statePath) {
    try {
      console.log('🔄 RESUMING FROM STEP 4: COMPETITIVE INTELLIGENCE ANALYSIS');
      console.log('=' .repeat(60));
      
      // Load existing state
      console.log(`📁 Loading state from: ${statePath}`);
      const state = await readJson(statePath);
      
      if (!state) {
        throw new Error(`Could not load state from ${statePath}`);
      }
      
      if (!state.leads || state.leads.length === 0) {
        throw new Error(`No leads found in state file. Run the search step first.`);
      }
      
      console.log(`✅ Loaded campaign: ${state.run_id}`);
      console.log(`📊 Found ${state.leads.length} leads`);
      
      // Count existing analyses
      const withAnalysis = state.leads.filter(lead => 
        lead.personality_analysis && !lead.personality_analysis.error
      ).length;
      const withErrors = state.leads.filter(lead => 
        lead.personality_analysis && lead.personality_analysis.error
      ).length;
      const needsAnalysis = state.leads.filter(lead => 
        !lead.personality_analysis || (lead.personality_analysis && lead.personality_analysis.error)
      ).length;
      
      console.log(`📊 Analysis Status:`);
      console.log(`   ✅ Successful: ${withAnalysis} leads`);
      console.log(`   ❌ Errors: ${withErrors} leads`);
      console.log(`   ⏳ Pending: ${needsAnalysis} leads`);
      
      if (needsAnalysis === 0) {
        console.log('\n✅ All leads already have successful competitive intelligence!');
        console.log('🚀 Ready to proceed to outreach generation (step 5)');
        
        // Continue to outreach
        await this.runOutreach(state.run_id);
        return;
      }
      
      console.log(`\n🧠 STEP 4: COMPETITIVE INTELLIGENCE ANALYSIS`);
      console.log(`Processing ${needsAnalysis} leads that need analysis...`);
      console.log('─'.repeat(50));
      
      const enrichMessage = {
        run_id: state.run_id,
        event: EventTypes.SEARCH_READY,
        from: 'ResumeEnrichment',
        to: NodeIds.ENRICH,
        payload: { pipeline_mode: 'resume' },
        ts: new Date().toISOString()
      };
      
      await this.router.dispatch(enrichMessage, this.ctx);
      
      console.log('\n📧 STEP 5: OUTREACH MESSAGE GENERATION');
      console.log('─'.repeat(50));
      
      await this.runOutreach(state.run_id);
      
      console.log('\n🎉 PIPELINE RESUMED AND COMPLETED SUCCESSFULLY!');
      
    } catch (error) {
      console.error('💥 Resume failed:', error.message);
      console.error('📋 Error details:', error.stack);
      process.exit(1);
    }
  }

  /**
   * Run outreach generation step
   */
  async runOutreach(runId) {
    const outreachMessage = {
      run_id: runId,
      event: EventTypes.ENRICH_READY,
      from: 'ResumeEnrichment',
      to: NodeIds.OUTREACH,
      payload: { pipeline_mode: 'resume' },
      ts: new Date().toISOString()
    };
    
    await this.router.dispatch(outreachMessage, this.ctx);
    console.log('✅ Personalized outreach messages generated');
  }
}

/**
 * CLI handler
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    console.log(`
🔄 Resume Enrichment - Start from Step 4 (Competitive Intelligence)

Usage:
  node scripts/resume-enrich.js <state.json>

Examples:
  # Resume from specific campaign
  node scripts/resume-enrich.js profiles/p_20250726_1621/state.json
  
  # Using relative path
  node scripts/resume-enrich.js /home/azureuser/jim_and_dwight/profiles/p_20250726_1621/state.json

What this does:
  1. 🔍 Loads existing campaign state
  2. 📊 Shows analysis status for all leads  
  3. 🧠 Runs competitive intelligence analysis on leads that need it
  4. 📧 Generates personalized outreach messages
  5. 📋 Exports final CSV for outreach

Perfect for:
  - Resuming campaigns that failed during competitive analysis
  - Re-running analysis with improved prompts
  - Processing leads that had errors in previous runs
`);
    process.exit(0);
  }

  const statePath = args[0];
  
  // Resolve path
  const fullPath = path.isAbsolute(statePath) 
    ? statePath 
    : path.join(process.cwd(), statePath);
  
  // Verify file exists
  try {
    await readJson(fullPath);
  } catch (error) {
    console.error(`❌ Cannot read state file: ${fullPath}`);
    console.error(`💡 Make sure the file exists and is a valid JSON file`);
    process.exit(1);
  }
  
  const resumer = new ResumeEnrichment();
  await resumer.resumeFromState(fullPath);
}

// Run CLI
main(); 