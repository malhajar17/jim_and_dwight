import path from 'path';
import { EventTypes, NodeIds } from '../types.js';
import { readJson, appendLog } from '../utils.js';

/**
 * PlanNode stub for Phase 1 - just logs and returns null
 * In Phase 2, this will use GPT-4o to create actual plans
 */
export class PlanNode {
  constructor() {
    this.id = NodeIds.PLAN;
    this.handles = EventTypes.USER_CONTEXT_READY;
  }

  /**
   * Stub implementation for Phase 1
   * @param {Message} msg 
   * @param {Context} ctx 
   * @returns {Promise<Message|null>}
   */
  async run(msg, ctx) {
    try {
      console.log(`\n🤖 ${this.id} received message from ${msg.from}`);
      console.log(`📋 Mode: ${msg.payload.mode}`);
      console.log(`📝 Answers received: ${Object.keys(msg.payload.answers).length} fields`);
      
      // Read current state
      const profileDir = path.join(ctx.profilesDir, msg.run_id);
      const statePath = path.join(profileDir, 'state.json');
      const state = await readJson(statePath);
      
      if (state) {
        console.log(`✅ State loaded for run: ${state.run_id}`);
        
        // Log to scratchbook
        const logPath = path.join(profileDir, 'scratchbook.log');
        await appendLog(logPath, `PLAN stub received USER_CONTEXT_READY`);
        
        // In Phase 2, we would:
        // 1. Use GPT-4o to analyze the user context
        // 2. Generate a value_prop
        // 3. Create pipeline plan with personas→search→draft→send caps & rules
        // 4. Write updated state.json
        // 5. Emit PLAN_READY message to PersonaNode
        
        console.log(`📋 Plan scaffold created (stub - no LLM calls in Phase 1)`);
        console.log(`🔚 End of Phase 1 pipeline - PlanNode returns null`);
      }
      
      // Return null to end the pipeline for Phase 1
      return null;
      
    } catch (error) {
      console.error(`❌ Error in ${this.id}:`, error.message);
      return null;
    }
  }
} 