#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import fs from 'fs/promises';
import { Router } from '../lib/router.js';
import { EventTypes, NodeIds } from '../lib/types.js';
import { generateRunId, getCurrentTimestamp, ensureDir, readJson } from '../lib/utils.js';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

/**
 * QuickStart Pipeline - One-click complete lead generation system
 */
class QuickStartPipeline {
  constructor() {
    this.ctx = {
      timezone: process.env.TIMEZONE || 'Europe/Paris',
      profilesDir: path.join(projectRoot, 'profiles')
    };
    this.router = new Router();
    this.currentStep = 0;
    this.totalSteps = 5;
    this.runId = null;
  }

  /**
   * Check if all required API keys are configured
   */
  checkConfiguration() {
    console.log('🔧 CHECKING CONFIGURATION');
    console.log('=' .repeat(50));
    
    const requiredKeys = [
      { key: 'OPENAI_API_KEY', service: 'OpenAI GPT-4o' },
      { key: 'JINA_API_KEY', service: 'Jina Search API' }
    ];
    
    const missing = [];
    
    for (const { key, service } of requiredKeys) {
      if (!process.env[key] || process.env[key] === `your_${key.toLowerCase()}_here`) {
        missing.push({ key, service });
        console.log(`❌ ${key}: Missing or not configured`);
      } else {
        console.log(`✅ ${key}: Configured`);
      }
    }
    
    if (missing.length > 0) {
      console.log('\n🚨 CONFIGURATION ERROR:');
      console.log('Missing required API keys. Please set up your environment:');
      console.log('\n1. Copy the example file: cp .env.example .env');  
      console.log('2. Edit .env with your actual API keys:');
      missing.forEach(({ key, service }) => {
        console.log(`   ${key}=your_actual_${key.toLowerCase()}`);
      });
      console.log('\n🔗 Get API keys:');
      console.log('   OpenAI: https://platform.openai.com/api-keys');
      console.log('   Jina: https://jina.ai/');
      process.exit(1);
    }
    
    console.log('\n✅ All required API keys configured!\n');
  }

  /**
   * Show progress indicator
   */
  showProgress(stepName) {
    this.currentStep++;
    const progress = Math.round((this.currentStep / this.totalSteps) * 100);
    const progressBar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
    
    console.log(`\n[${progressBar}] ${progress}% - STEP ${this.currentStep}/${this.totalSteps}: ${stepName}`);
    console.log('─'.repeat(70));
  }

  /**
   * Run the complete pipeline from start to finish
   */
  async runComplete() {
    try {
      console.log('🚀 JIM & DWIGHT - QUICKSTART PIPELINE');
      console.log('💫 Complete AI-Powered Lead Generation System');
      console.log('=' .repeat(70));
      
      // Check configuration first
      this.checkConfiguration();
      
      // Ensure profiles directory exists
      await ensureDir(this.ctx.profilesDir);
      
      // Generate run ID
      this.runId = generateRunId();
      console.log(`🆔 Pipeline Run ID: ${this.runId}`);
      console.log(`📁 Output will be saved to: profiles/${this.runId}/\n`);
      
      // Step 1: Intake
      this.showProgress('INTAKE - Collecting Campaign Context');
      await this.runIntake();
      
      // Step 2: Personas
      this.showProgress('PERSONAS - Generating Target Profiles'); 
      await this.runPersonas();
      
      // Step 3: Search & Enrichment
      this.showProgress('SEARCH - Finding & Enriching Leads');
      await this.runSearch();
      
      // Step 4: Intelligence Analysis
      this.showProgress('INTELLIGENCE - Competitive Analysis');
      await this.runEnrichment();
      
      // Step 5: Outreach Generation
      this.showProgress('OUTREACH - Generating Personalized Messages');
      await this.runOutreach();
      
      // Show final results
      await this.showFinalResults();
      
    } catch (error) {
      console.error('\n💥 PIPELINE FAILED:', error.message);
      console.error('📋 Error details:', error.stack);
      
      // Show troubleshooting tips
      console.log('\n🔧 TROUBLESHOOTING TIPS:');
      console.log('1. Check your API keys in .env file');
      console.log('2. Ensure you have internet connection');
      console.log('3. Verify API quotas and limits');
      console.log('4. Check the error message above for specific issues');
      
      process.exit(1);
    }
  }

  /**
   * Run intake step
   */
  async runIntake() {
    const message = {
      run_id: this.runId,
      event: EventTypes.START,
      from: 'QuickStartPipeline',
      to: NodeIds.INTAKE,
      payload: { pipeline_mode: 'quickstart' },
      ts: getCurrentTimestamp()
    };
    
    await this.router.dispatch(message, this.ctx);
    console.log('✅ Campaign context collected and enriched with AI');
  }

  /**
   * Run personas generation step
   */
  async runPersonas() {
    const message = {
      run_id: this.runId,
      event: EventTypes.INTAKE_READY,
      from: 'QuickStartPipeline',
      to: NodeIds.PERSONA,
      payload: { pipeline_mode: 'quickstart' },
      ts: getCurrentTimestamp()
    };
    
    await this.router.dispatch(message, this.ctx);
    console.log('✅ Target personas generated with search strategies');
  }

  /**
   * Run search and lead enrichment step
   */
  async runSearch() {
    const message = {
      run_id: this.runId,
      event: EventTypes.PERSONAS_READY,
      from: 'QuickStartPipeline',
      to: NodeIds.SEARCH,
      payload: { pipeline_mode: 'quickstart' },
      ts: getCurrentTimestamp()
    };
    
    await this.router.dispatch(message, this.ctx);
    console.log('✅ Leads found and enriched with RocketReach data');
  }

  /**
   * Run competitive intelligence analysis step
   */
  async runEnrichment() {
    const message = {
      run_id: this.runId,
      event: EventTypes.SEARCH_READY,
      from: 'QuickStartPipeline',
      to: NodeIds.ENRICH,
      payload: { pipeline_mode: 'quickstart' },
      ts: getCurrentTimestamp()
    };
    
    await this.router.dispatch(message, this.ctx);
    console.log('✅ Competitive intelligence extracted for personalization');
  }

  /**
   * Run outreach message generation step
   */
  async runOutreach() {
    const message = {
      run_id: this.runId,
      event: EventTypes.ENRICH_READY,
      from: 'QuickStartPipeline',
      to: NodeIds.OUTREACH,
      payload: { pipeline_mode: 'quickstart' },
      ts: getCurrentTimestamp()
    };
    
    await this.router.dispatch(message, this.ctx);
    console.log('✅ Personalized outreach messages generated and exported');
  }

  /**
   * Show comprehensive final results
   */
  async showFinalResults() {
    console.log('\n🎉 PIPELINE COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(70));
    
    try {
      const statePath = path.join(this.ctx.profilesDir, this.runId, 'state.json');
      const state = await readJson(statePath);
      
      if (!state) {
        console.log('⚠️  Could not load results for summary');
        return;
      }
      
      // Campaign Overview
      console.log('📊 CAMPAIGN OVERVIEW');
      console.log('─'.repeat(30));
      console.log(`🎯 Campaign Type: ${state.mode || 'Standard'}`);
      console.log(`🆔 Run ID: ${this.runId}`);
      console.log(`📅 Completed: ${new Date().toLocaleString()}`);
      
      // Results Summary
      const personaCount = state.personas ? state.personas.length : 0;
      const leadCount = state.leads ? state.leads.length : 0;
      const enrichedCount = state.leads ? state.leads.filter(lead => lead.personality_analysis).length : 0;
      const readyCount = state.leads ? state.leads.filter(lead => lead.ready_for_outreach).length : 0;
      
      console.log('\n🎯 RESULTS SUMMARY');
      console.log('─'.repeat(30));
      console.log(`👥 Target Personas: ${personaCount}`);
      console.log(`🔍 Leads Found: ${leadCount}`);
      console.log(`🧠 Intelligence Extracted: ${enrichedCount}`);
      console.log(`📧 Ready for Outreach: ${readyCount}`);
      
      // Quality Metrics
      if (leadCount > 0) {
        const validCount = state.leads.filter(lead => lead.is_valid_person).length;
        const rocketReachCount = state.leads.filter(lead => lead.rocketreach_enriched || lead.rocketreach_updated).length;
        
        console.log('\n📈 QUALITY METRICS');
        console.log('─'.repeat(30));
        console.log(`✅ Valid Leads: ${validCount}/${leadCount} (${Math.round((validCount/leadCount)*100)}%)`);
        console.log(`🚀 Contact Data: ${rocketReachCount}/${leadCount} (${Math.round((rocketReachCount/leadCount)*100)}%)`);
        console.log(`🧠 Intelligence: ${enrichedCount}/${leadCount} (${Math.round((enrichedCount/leadCount)*100)}%)`);
      }
      
      // Generated Files
      console.log('\n📁 GENERATED FILES');
      console.log('─'.repeat(30));
      console.log(`📊 Campaign Data: profiles/${this.runId}/state.json`);
      console.log(`📋 Outreach CSV: profiles/${this.runId}/leads-outreach.csv`);
      console.log(`📝 Pipeline Log: profiles/${this.runId}/scratchbook.log`);
      
      // Next Steps
      console.log('\n🚀 NEXT STEPS');
      console.log('─'.repeat(30));
      console.log('1. 📋 Review your leads in the CSV file');
      console.log('2. 📧 Start your outreach campaign');
      console.log('3. 📱 Send LinkedIn connection requests');
      console.log('4. ✉️  Send personalized emails');
      console.log('5. 📞 Schedule follow-up calls');
      
      // Interactive prompt for next actions
      await this.promptNextActions();
      
    } catch (error) {
      console.error('Error showing results:', error.message);
    }
  }

  /**
   * Prompt user for next actions
   */
  async promptNextActions() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\n💫 CAMPAIGN READY TO LAUNCH!');
    console.log('Your personalized lead generation campaign is complete.');
    
    const csvPath = `profiles/${this.runId}/leads-outreach.csv`;
    
    try {
      await fs.access(path.join(this.ctx.profilesDir, this.runId, 'leads-outreach.csv'));
      console.log(`\n📋 Your outreach data is ready in: ${csvPath}`);
      
      const question = '\n🚀 Would you like to view your results now? (y/n): ';
      const answer = await new Promise(resolve => rl.question(question, resolve));
      
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log('\n📊 Opening your results...');
        console.log(`🔗 You can find your complete campaign data at: ${csvPath}`);
        console.log('\n💡 TIP: Import the CSV into your CRM or email marketing tool to start outreach!');
      } else {
        console.log('\n👍 No problem! Your results are saved and ready when you need them.');
      }
    } catch (error) {
      console.log('\n⚠️  CSV file not found. Check the state.json for your lead data.');
    }
    
    rl.close();
    
    console.log('\n✨ Thank you for using Jim & Dwight!');
    console.log('🎯 Happy hunting! 🎯\n');
  }

  /**
   * Resume from existing profile
   */
  async runFromExisting(profilePath) {
    try {
      console.log('🔄 RESUMING EXISTING CAMPAIGN');
      console.log('=' .repeat(50));
      
      const state = await readJson(profilePath);
      if (!state) {
        throw new Error(`Could not load profile from ${profilePath}`);
      }
      
      this.runId = state.run_id;
      console.log(`✅ Loaded campaign: ${this.runId}`);
      
      // Continue from where we left off
      const hasPersonas = state.personas && state.personas.length > 0;
      const hasLeads = state.leads && state.leads.length > 0;
      const hasEnrichment = hasLeads && state.leads.some(lead => lead.personality_analysis);
      const hasOutreach = state.outreach_metadata && state.outreach_metadata.outreach_messages_generated;
      
      if (!hasPersonas) {
        this.showProgress('PERSONAS - Generating Target Profiles');
        await this.runPersonas();
      }
      
      if (!hasLeads) {
        this.showProgress('SEARCH - Finding & Enriching Leads');
        await this.runSearch();
      }
      
      if (!hasEnrichment) {
        this.showProgress('INTELLIGENCE - Competitive Analysis');
        await this.runEnrichment();
      }
      
      if (!hasOutreach) {
        this.showProgress('OUTREACH - Generating Personalized Messages');
        await this.runOutreach();
      }
      
      await this.showFinalResults();
      
    } catch (error) {
      console.error('💥 Resume failed:', error.message);
      process.exit(1);
    }
  }
}

/**
 * CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  const pipeline = new QuickStartPipeline();

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🚀 Jim & Dwight - QuickStart Pipeline
💫 Complete AI-Powered Lead Generation System

Usage:
  npm run quickstart                    # Start new campaign from scratch
  npm run quickstart <profile_path>    # Resume existing campaign
  npm run quickstart --help           # Show this help

Examples:
  # Start new campaign
  npm run quickstart
  
  # Resume existing campaign
  npm run quickstart profiles/p_20250726_1445/state.json

Features:
  ✅ One-click complete pipeline execution
  ✅ Enhanced error handling and progress tracking
  ✅ Configuration validation
  ✅ Resume capability from any point
  ✅ Comprehensive results summary
  ✅ Interactive next steps guidance

Pipeline Steps:
  1. 🔧 Configuration Check
  2. 🎯 Intake & AI Enrichment  
  3. 👥 Persona Generation
  4. 🔍 Lead Discovery & Contact Enrichment
  5. 🧠 Competitive Intelligence Analysis
  6. 📧 Outreach Message Generation

This script provides the easiest way to run the complete Jim & Dwight pipeline!
`);
    process.exit(0);
  }

  // Check if profile path provided for resume
  const profilePath = args[0];
  
  if (profilePath && !profilePath.startsWith('--')) {
    const fullPath = path.isAbsolute(profilePath) 
      ? profilePath 
      : path.join(process.cwd(), profilePath);
    
    await pipeline.runFromExisting(fullPath);
  } else {
    // Start new campaign
    await pipeline.runComplete();
  }
}

// Run the pipeline
main(); 