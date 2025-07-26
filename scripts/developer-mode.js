#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router } from '../lib/router.js';
import { EventTypes, NodeIds } from '../lib/types.js';
import { getCurrentTimestamp, readJson } from '../lib/utils.js';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

/**
 * Developer mode - skip phases and jump to specific nodes
 */
class DeveloperMode {
  constructor() {
    this.ctx = {
      timezone: process.env.TIMEZONE || 'Europe/Paris',
      profilesDir: path.join(projectRoot, 'profiles')
    };
    this.router = new Router();
  }

  /**
   * Load existing profile and jump to specified phase
   * @param {string} profilePath - Path to existing state.json
   * @param {string} startPhase - Phase to start from (persona, search, etc.)
   */
  async jumpToPhase(profilePath, startPhase = 'persona') {
    try {
      console.log('🔧 DEVELOPER MODE - Phase Jump');
      console.log('=' .repeat(50));
      
      // Load existing profile
      console.log(`📁 Loading profile: ${profilePath}`);
      const state = await readJson(profilePath);
      
      if (!state) {
        throw new Error(`Could not load profile from ${profilePath}`);
      }
      
      console.log(`✅ Profile loaded: ${state.run_id} (${state.mode} mode)`);
      console.log(`📋 Context: ${Object.keys(state.profile.answers).length} answers`);
      
      // Show enrichment data if available
      if (state.profile.enrichment && Object.keys(state.profile.enrichment).length > 0) {
        let enrichmentCount = 0;
        for (const enrichment of Object.values(state.profile.enrichment)) {
          if (enrichment && enrichment.enriched) {
            enrichmentCount += enrichment.enriched.length;
          }
        }
        console.log(`🤖 Enrichment: ${enrichmentCount} follow-up answers collected`);
      }

      // Determine message to send based on phase
      const message = this.createPhaseMessage(state.run_id, startPhase);
      
      console.log(`\n🚀 Jumping to ${startPhase.toUpperCase()} phase`);
      console.log(`   Event: ${message.event}`);
      console.log(`   From: ${message.from} → To: ${message.to}`);
      
      // Dispatch message
      await this.router.dispatch(message, this.ctx);
      
      console.log('\n✨ Developer mode completed!');
      console.log(`📁 Check ${profilePath} for updates`);
      
    } catch (error) {
      console.error(`💥 Developer mode error: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Create appropriate message for phase
   * @param {string} runId 
   * @param {string} phase
   * @returns {Object}
   */
  createPhaseMessage(runId, phase) {
    const phaseMap = {
      'persona': {
        event: EventTypes.INTAKE_READY,
        from: 'DeveloperMode',
        to: NodeIds.PERSONA
      },
      'search': {
        event: EventTypes.PERSONAS_READY,
        from: 'DeveloperMode', 
        to: NodeIds.SEARCH
      },
      'enrich': {
        event: EventTypes.SEARCH_READY,
        from: 'DeveloperMode',
        to: NodeIds.ENRICH
      },
      'outreach': {
        event: EventTypes.ENRICH_READY,
        from: 'DeveloperMode',
        to: NodeIds.OUTREACH
      }
    };

    const config = phaseMap[phase];
    if (!config) {
      throw new Error(`Unknown phase: ${phase}. Available: ${Object.keys(phaseMap).join(', ')}`);
    }

    return {
      run_id: runId,
      event: config.event, 
      from: config.from,
      to: config.to,
      payload: {
        developer_mode: true,
        phase_jump: phase
      },
      ts: getCurrentTimestamp()
    };
  }

  /**
   * Show available profiles
   */
  async listProfiles() {
    try {
      const fs = await import('fs/promises');
      const profiles = await fs.readdir(this.ctx.profilesDir);
      
      console.log('📁 Available Profiles:');
      console.log('=' .repeat(30));
      
      for (const profile of profiles) {
        const profilePath = path.join(this.ctx.profilesDir, profile, 'state.json');
        try {
          const state = await readJson(profilePath);
          if (state) {
            console.log(`${profile}: ${state.mode} mode - ${Object.keys(state.profile.answers).length} answers`);
          }
        } catch {
          console.log(`${profile}: Invalid or missing state.json`);
        }
      }
    } catch (error) {
      console.error('Error listing profiles:', error.message);
    }
  }
}

/**
 * CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  const devMode = new DeveloperMode();

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔧 Developer Mode - Skip Phases and Jump to Specific Nodes

Usage:
  npm run dev-mode <profile_path> [phase]
  node scripts/developer-mode.js <profile_path> [phase]

Examples:
  # Jump to persona generation
  npm run dev-mode profiles/p_20250726_0957/state.json persona
  
  # Jump to search phase  
  npm run dev-mode profiles/p_20250726_0957/state.json search
  
  # Jump to enrichment phase (enrich existing leads)
  npm run dev-mode profiles/p_20250726_0957/state.json enrich
  
  # Jump to outreach phase (generate messages and CSV)
  npm run dev-mode profiles/p_20250726_0957/state.json outreach
  
  # List available profiles
  npm run dev-mode --list

Available Phases:
  persona  - Generate 5 target personas (default)
  search   - Search for leads with RocketReach enrichment
  enrich   - Extract competitive intelligence from leads
  outreach - Generate personalized outreach messages and CSV

Profile Path Examples:
  profiles/p_20250726_0957/state.json
  /absolute/path/to/state.json
  
This allows you to skip the intake process and work with existing profiles.
`);
    process.exit(0);
  }

  // Handle flags first
  if (args.length === 1 && (args[0] === '--list' || args[0] === '-l')) {
    await devMode.listProfiles();
    process.exit(0);
  }

  const profilePath = args[0];
  const phase = args[1] || 'persona';

  if (!profilePath || profilePath.startsWith('--')) {
    console.error('❌ Profile path required');
    console.log('💡 Use --help for usage information');
    console.log('💡 Use --list to see available profiles');
    process.exit(1);
  }

  // Handle relative paths
  const fullPath = path.isAbsolute(profilePath) 
    ? profilePath 
    : path.join(process.cwd(), profilePath);

  await devMode.jumpToPhase(fullPath, phase);
}

// Run CLI
main(); 