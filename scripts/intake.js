#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router } from '../lib/router.js';
import { EventTypes, NodeIds } from '../lib/types.js';
import { generateRunId, getCurrentTimestamp, ensureDir } from '../lib/utils.js';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

/**
 * Main application function
 */
async function main() {
  try {
    console.log('🎯 Node-Based Outreach System - Phase 1: Intake & Handoff');
    console.log('=' .repeat(60));
    
    // Setup context
    const ctx = {
      timezone: process.env.TIMEZONE || 'Europe/Paris',
      profilesDir: path.join(projectRoot, 'profiles')
    };
    
    // Ensure profiles directory exists
    await ensureDir(ctx.profilesDir);
    
    // Generate run ID
    const runId = generateRunId();
    console.log(`🆔 Generated run ID: ${runId}`);
    
    // Initialize router
    const router = new Router();
    console.log(`📡 Available nodes: ${router.getAvailableNodes().join(', ')}`);
    
    // Create initial START message
    const startMessage = {
      run_id: runId,
      event: EventTypes.START,
      from: 'CLI',
      to: NodeIds.INTAKE,
      payload: {},
      ts: getCurrentTimestamp()
    };
    
    console.log(`\n🚀 Starting pipeline with message:`);
    console.log(`   Event: ${startMessage.event}`);
    console.log(`   From: ${startMessage.from} → To: ${startMessage.to}`);
    console.log(`   Timestamp: ${startMessage.ts}`);
    
    // Dispatch the message through the router
    await router.dispatch(startMessage, ctx);
    
    console.log('\n✨ Pipeline completed successfully!');
    console.log(`📁 Check profiles/${runId}/ for generated files`);
    
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
}

// Handle CLI arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🎯 Node-Based Outreach System - Phase 1

Usage:
  npm run intake                 Start the intake process
  node scripts/intake.js         Alternative way to start
  
This will:
  1. Collect user context (Sales or Investor mode)
  2. Ask 7 mode-specific questions  
  3. Save to profiles/{run_id}/state.json
  4. Log to profiles/{run_id}/scratchbook.log
  5. Emit message to PlanNode (stub)

Environment:
  TIMEZONE=${process.env.TIMEZONE || 'Europe/Paris'}
  
Phase 1 Scope:
  ✅ IntakeNode - User input collection
  ✅ Router - Message dispatching  
  ✅ PlanNode - Stub (no LLM calls)
  ❌ GPT-4o, Jina, SendGrid (Phase 2+)
`);
  process.exit(0);
}

// Run the application
main(); 