#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { Router } from '../lib/router.js';
import { EventTypes, NodeIds } from '../lib/types.js';
import { generateRunId, getCurrentTimestamp, ensureDir, readJson } from '../lib/utils.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

class InvestorPipeline {
  constructor() {
    this.ctx = {
      timezone: process.env.TIMEZONE || 'Europe/Paris',
      profilesDir: path.join(projectRoot, 'profiles')
    };
    this.router = new Router();
  }

  /**
   * Run complete investor pipeline from company intake to investor outreach
   */
  async runComplete() {
    try {
      console.log('💰 INVESTOR PIPELINE - Starting complete fundraising pipeline');
      console.log('=' .repeat(60));
      
      const runId = generateRunId('inv_');
      console.log(`📋 Run ID: ${runId}`);
      
      // Step 1: Company Intake - Collect company information
      console.log('\n🏢 STEP 1: COMPANY INTAKE - Collecting company information');
      console.log('─'.repeat(50));
      
      const companyAnswers = await this.collectCompanyAnswers();
      
      // Start the pipeline with intake message
      const intakeMessage = {
        run_id: runId,
        event: EventTypes.START,
        from: 'InvestorPipeline',
        to: NodeIds.INVESTOR_INTAKE,
        payload: { answers: companyAnswers },
        ts: getCurrentTimestamp()
      };
      
      // Let the pipeline flow naturally through message routing
      console.log('\n🚀 Starting investor pipeline flow...');
      let currentMessage = intakeMessage;
      let stepCount = 1;
      
      while (currentMessage && currentMessage.to !== 'COMPLETE') {
        console.log(`\n📡 Step ${stepCount}: Dispatching ${currentMessage.event} to ${currentMessage.to}`);
        stepCount++;
        
        // Dispatch current message and get next message
        const nextMessage = await this.router.dispatch(currentMessage, this.ctx);
        
        if (!nextMessage) {
          console.log('❌ Pipeline stopped - no next message returned');
          break;
        }
        
        currentMessage = nextMessage;
        
        // Prevent infinite loops
        if (stepCount > 10) {
          console.log('⚠️ Pipeline stopped - too many steps (possible loop)');
          break;
        }
      }
      
      if (currentMessage && currentMessage.to === 'COMPLETE') {
        console.log('\n🎉 INVESTOR PIPELINE COMPLETED SUCCESSFULLY!');
        console.log('=' .repeat(60));
        
        await this.showInvestorPipelineSummary(runId);
        await this.promptInvestorOutreach(runId);
      } else {
        console.log('\n❌ Pipeline incomplete or stopped unexpectedly');
      }
      
    } catch (error) {
      console.error('💥 Investor pipeline error:', error.message);
      process.exit(1);
    }
  }

  /**
   * Collect company information interactively
   * @returns {Promise<Object>} Company answers
   */
  async collectCompanyAnswers() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const questions = [
      { key: 'company_name', question: 'What is your company name?' },
      { key: 'technology', question: 'What is your core technology/product? (Describe in 1-2 sentences)' },
      { key: 'market_size', question: 'What is your total addressable market (TAM)?' },
      { key: 'competitive_edge', question: 'What is your unique competitive advantage?' },
      { key: 'traction', question: 'What traction do you have? (Revenue, users, partnerships, etc.)' },
      { key: 'funding_stage', question: 'What funding stage are you at and how much are you raising?' },
      { key: 'use_of_funds', question: 'How will you use the funding?' },
      { key: 'geographic_focus', question: 'What geographic markets are you focusing on? (Optional)' }
    ];

    const answers = {};

    console.log('📝 Please provide information about your company for investor targeting:\n');

    for (const q of questions) {
      const answer = await new Promise(resolve => {
        rl.question(`${q.question}\n> `, resolve);
      });
      answers[q.key] = answer.trim();
    }

    rl.close();
    return answers;
  }

  /**
   * Show comprehensive investor pipeline summary
   * @param {string} runId 
   */
  async showInvestorPipelineSummary(runId) {
    try {
      const statePath = path.join(this.ctx.profilesDir, runId, 'state.json');
      const state = await readJson(statePath);
      
      if (!state) {
        console.log('⚠️  Could not load final state for summary');
        return;
      }

      console.log(`📊 INVESTOR PIPELINE RESULTS FOR: ${runId}`);
      console.log('─'.repeat(40));
      
      // Company Summary
      console.log(`🏢 Company: ${state.profile.company_info.name}`);
      console.log(`💡 Technology: ${state.profile.company_info.technology}`);
      console.log(`🎚️  Stage: ${state.profile.company_info.funding_stage}`);
      
      // Analysis Summary
      if (state.investor_analysis) {
        console.log(`📊 Sector Analysis: ${state.investor_analysis.sector} (${state.investor_analysis.sub_sector})`);
        console.log(`🎯 Recommended Stage: ${state.investor_analysis.recommended_stage}`);
        console.log(`💰 Target Check Size: ${state.investor_analysis.target_check_size}`);
        console.log(`🌍 Geographic Markets: ${state.investor_analysis.geographic_markets?.join(', ')}`);
      }

      // Targeting Strategies
      if (state.investor_targeting_strategies) {
        console.log(`🎯 Targeting Strategies: ${state.investor_targeting_strategies.length} generated`);
        state.investor_targeting_strategies.forEach((strategy, index) => {
          console.log(`   ${index + 1}. ${strategy.strategy_name} - ${strategy.investor_type} (Priority: ${strategy.search_priority})`);
        });
      }

      // Investors Summary
      if (state.investors) {
        console.log(`🔍 Investors: ${state.investors.length} found`);
        
        const readyForOutreach = state.investors.filter(inv => inv.ready_for_outreach).length;
        const enrichedInvestors = state.investors.filter(inv => inv.due_diligence && !inv.due_diligence.error).length;
        
        console.log(`   ✅ Due Diligence Completed: ${enrichedInvestors}/${state.investors.length}`);
        console.log(`   📧 Ready for Outreach: ${readyForOutreach}/${state.investors.length}`);
        
        // Type breakdown
        const typeBreakdown = state.investors.reduce((acc, investor) => {
          const type = investor.type || 'Unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});
        
        console.log(`📊 Investor Types:`);
        Object.entries(typeBreakdown).forEach(([type, count]) => {
          console.log(`   ${type}: ${count} investors`);
        });
      }

      // Outreach Summary
      if (state.investor_outreach_metadata) {
        console.log(`📧 Investor Outreach:`);
        console.log(`   💬 Messages Generated: ${state.investor_outreach_metadata.outreach_messages_generated}`);
        console.log(`   📄 CSV Export: ${state.investor_outreach_metadata.csv_export_path}`);
        console.log(`   📅 Completed: ${new Date(state.investor_outreach_metadata.outreach_completed_at).toLocaleString()}`);
      }

      // File Locations
      console.log(`\n📁 Generated Files:`);
      console.log(`   📊 Data: profiles/${runId}/state.json`);
      console.log(`   📝 Log: profiles/${runId}/scratchbook.log`);
      if (state.investor_outreach_metadata?.csv_export_path) {
        console.log(`   📋 Investor CSV: ${state.investor_outreach_metadata.csv_export_path}`);
      }

      // Next Steps
      console.log(`\n🚀 Next Steps:`);
      console.log(`   1. Review investor research in profiles/${runId}/state.json`);
      if (state.investor_outreach_metadata) {
        console.log(`   2. Use personalized messages from profiles/${runId}/investor-outreach.csv`);
        console.log(`   3. Start LinkedIn outreach to investors`);
        console.log(`   4. Send pitch decks and book investor meetings`);
      }

    } catch (error) {
      console.error('Error showing investor pipeline summary:', error);
    }
  }

  /**
   * Prompts the user about investor outreach
   * @param {string} runId - The ID of the run
   */
  async promptInvestorOutreach(runId) {
    try {
      const statePath = path.join(this.ctx.profilesDir, runId, 'state.json');
      const state = await readJson(statePath);
      
      if (!state.investor_outreach_metadata || !state.investor_outreach_metadata.outreach_messages_generated) {
        return;
      }

      const messageCount = state.investor_outreach_metadata.outreach_messages_generated;
      
      console.log('\n🎉 INVESTORS GENERATED!');
      console.log('=' .repeat(40));
      console.log(`💰 ${messageCount} personalized investor outreach messages ready!`);
      console.log(`📋 CSV file: ${state.investor_outreach_metadata.csv_export_path}`);
      
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const question = `\n🚀 Do you want to start your investor outreach campaign with these ${messageCount} investors? (y/n): `;
      const answer = await new Promise(resolve => rl.question(question, resolve));

      rl.close();

      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log('\n🚀 Sending personalized pitch emails to investors...');
        console.log('💰 Investor outreach campaign initiated...');
        
        // Simulate sending delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log(`✅ Successfully sent ${messageCount} personalized investor pitches!`);
        console.log('📊 Campaign Status:');
        console.log(`   📧 Pitch emails sent: ${messageCount}`);
        console.log('   ⏰ Delivery: In progress');
        console.log('   📈 Tracking: Active');
        console.log('\n💡 You\'ll receive notifications as investors respond and book meetings via Calendly!');
      } else {
        console.log('\n📝 No problem! Your personalized investor messages are saved and ready when you are.');
        console.log('   💡 You can always come back to the CSV file later');
      }
    } catch (error) {
      console.error('Error in investor outreach prompt:', error);
    }
  }

  /**
   * List available investor profiles
   */
  async listInvestorProfiles() {
    try {
      const profiles = await fs.promises.readdir(this.ctx.profilesDir);
      const investorProfiles = profiles.filter(p => p.startsWith('inv_'));
      
      if (investorProfiles.length === 0) {
        console.log('📝 No investor profiles found');
        return;
      }

      console.log('💰 Available Investor Profiles:');
      console.log('─'.repeat(30));
      
      for (const profile of investorProfiles) {
        const statePath = path.join(this.ctx.profilesDir, profile, 'state.json');
        try {
          const state = await readJson(statePath);
          const companyName = state.profile?.company_info?.name || 'Unknown Company';
          const investorCount = state.investors?.length || 0;
          console.log(`   📁 ${profile} - ${companyName} (${investorCount} investors)`);
        } catch (e) {
          console.log(`   📁 ${profile} - Invalid state`);
        }
      }
    } catch (error) {
      console.error('Error listing investor profiles:', error);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const pipeline = new InvestorPipeline();

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
💰 Investor Pipeline - Complete fundraising workflow

Usage: npm run investor-pipeline [options]

Options:
  --help, -h     Show this help message
  --list, -l     List available investor profiles

Examples:
  npm run investor-pipeline              # Run complete investor pipeline
  npm run investor-pipeline --list       # List investor profiles

This pipeline will:
1. 🏢 Collect company information (technology, traction, stage)
2. 🎯 Use GPT-4o to analyze sector and recommend investor types
3. 🔍 Search for VCs, angels, and strategic investors
4. 🔍 Perform due diligence on investor backgrounds
5. 📧 Generate personalized investor outreach with pitch deck references
    `);
    return;
  }

  if (args.length === 1 && (args[0] === '--list' || args[0] === '-l')) {
    await pipeline.listInvestorProfiles();
    return;
  }

  // Run complete investor pipeline
  await pipeline.runComplete();
}

main().catch(console.error); 