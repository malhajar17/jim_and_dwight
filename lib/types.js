/**
 * Message envelope that flows between nodes
 * @typedef {Object} Message
 * @property {string} run_id - e.g., "p_20250726_1012"
 * @property {string} event - e.g., "USER_CONTEXT_READY"
 * @property {string} from - source node name
 * @property {string} to - destination node name
 * @property {any} payload - node-specific JSON data
 * @property {string} ts - ISO timestamp
 */

/**
 * Node interface
 * @typedef {Object} Node
 * @property {string} id - node identifier (e.g., "IntakeNode")
 * @property {string} handles - event type this node handles
 * @property {function(Message, Context): Promise<Message|null>} run - main processing function
 */

/**
 * Application context
 * @typedef {Object} Context
 * @property {string} timezone - from environment
 * @property {string} profilesDir - path to profiles directory
 */

export const EventTypes = {
  START: 'START',
  USER_CONTEXT_READY: 'USER_CONTEXT_READY',
  INTAKE_READY: 'INTAKE_READY',
  PLAN_READY: 'PLAN_READY',
  PERSONAS_READY: 'PERSONAS_READY',
  SEARCH_READY: 'SEARCH_READY',
  ENRICH_READY: 'ENRICH_READY',
  OUTREACH_READY: 'OUTREACH_READY',
  // Investor pipeline events
  INVESTOR_INTAKE_READY: 'INVESTOR_INTAKE_READY',
  INVESTOR_PERSONAS_READY: 'INVESTOR_PERSONAS_READY',
  INVESTOR_SEARCH_READY: 'INVESTOR_SEARCH_READY',
  INVESTOR_ENRICH_READY: 'INVESTOR_ENRICH_READY',
  INVESTOR_OUTREACH_READY: 'INVESTOR_OUTREACH_READY'
};

export const NodeIds = {
  INTAKE: 'IntakeNode',
  PLAN: 'PlanNode',
  PERSONA: 'PersonaNode',
  SEARCH: 'SearchNode',
  ENRICH: 'EnrichNode',
  OUTREACH: 'OutreachNode',
  // Investor pipeline nodes
  INVESTOR_INTAKE: 'InvestorIntakeNode',
  INVESTOR_PERSONA: 'InvestorPersonaNode',
  INVESTOR_SEARCH: 'InvestorSearchNode',
  INVESTOR_ENRICH: 'InvestorEnrichNode',
  INVESTOR_OUTREACH: 'InvestorOutreachNode'
}; 