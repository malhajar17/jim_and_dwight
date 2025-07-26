import { IntakeNode } from './nodes/IntakeNode.js';
import { PlanNode } from './nodes/PlanNode.js';
import { PersonaNode } from './nodes/PersonaNode.js';
import { SearchNode } from './nodes/SearchNode.js';
import { EnrichNode } from './nodes/EnrichNode.js';
import { OutreachNode } from './nodes/OutreachNode.js';
// Investor pipeline nodes
import { InvestorIntakeNode } from './nodes/investor/InvestorIntakeNode.js';
import { InvestorPersonaNode } from './nodes/investor/InvestorPersonaNode.js';
import { InvestorSearchNode } from './nodes/investor/InvestorSearchNode.js';
import { InvestorEnrichNode } from './nodes/investor/InvestorEnrichNode.js';
import { InvestorOutreachNode } from './nodes/investor/InvestorOutreachNode.js';
import { NodeIds } from './types.js';

/**
 * Simple in-memory router for Phase 1
 * In later phases, this could be enhanced with queuing, persistence, etc.
 */
export class Router {
  constructor() {
    // Node registry
    this.registry = {
      // Sales pipeline nodes
      [NodeIds.INTAKE]: new IntakeNode(),
      [NodeIds.PLAN]: new PlanNode(),
      [NodeIds.PERSONA]: new PersonaNode(),
      [NodeIds.SEARCH]: new SearchNode(),
      [NodeIds.ENRICH]: new EnrichNode(),
      [NodeIds.OUTREACH]: new OutreachNode(),
      // Investor pipeline nodes
      [NodeIds.INVESTOR_INTAKE]: new InvestorIntakeNode(),
      [NodeIds.INVESTOR_PERSONA]: new InvestorPersonaNode(),
      [NodeIds.INVESTOR_SEARCH]: new InvestorSearchNode(),
      [NodeIds.INVESTOR_ENRICH]: new InvestorEnrichNode(),
      [NodeIds.INVESTOR_OUTREACH]: new InvestorOutreachNode()
    };
    
    console.log(`🔗 Router initialized with ${Object.keys(this.registry).length} nodes`);
    console.log(`   📊 Sales pipeline: ${Object.values(this.registry).filter(n => !n.id?.includes('Investor')).length} nodes`);
    console.log(`   💰 Investor pipeline: ${Object.values(this.registry).filter(n => n.id?.includes('Investor')).length} nodes`);
  }

  /**
   * Dispatch a message to the appropriate node
   * @param {Message} msg 
   * @param {Context} ctx 
   * @returns {Promise<Message|null>}
   */
  async dispatch(msg, ctx) {
    const targetNode = this.registry[msg.to];
    
    if (!targetNode) {
      console.log(`⚠️  No handler for ${msg.to}, message queued for later`);
      return null;
    }
    
    console.log(`🔀 Routing ${msg.event} from ${msg.from} to ${msg.to}`);
    
    try {
      const result = await targetNode.run(msg, ctx);
      
      // If there's a result message, dispatch it recursively
      if (result) {
        return await this.dispatch(result, ctx);
      }
      
      return null;
      
    } catch (error) {
      console.error(`❌ Router error dispatching to ${msg.to}:`, error.message);
      return null;
    }
  }

  /**
   * Get available nodes
   * @returns {string[]}
   */
  getAvailableNodes() {
    return Object.keys(this.registry);
  }
} 