# Node-Based Outreach System - Phase 1 + LLM Enrichment

A node-based pipeline system for collecting user context and preparing outreach campaigns, **now enhanced with GPT-4o answer enrichment**.

## Phase 1: Intake & Handoff + LLM Enrichment

This implementation covers the first phase of a larger pipeline system that will eventually include:
- User intake with **LLM enrichment** (✅ **IMPLEMENTED**)
- Planning with GPT-4o (Phase 2)
- Persona generation (Phase 3)
- Lead search via Jina (Phase 4)
- Curate leads (Phase 5)
- Draft outreach (Phase 6)
- Send via SendGrid (Phase 7)
- Triage responses (Phase 8)
- Auto-reply & handoff (Phase 9)

## 🤖 **NEW: LLM Answer Enrichment**

After each answer, GPT-4o automatically:
1. **Classifies** if the answer is rich enough or needs more details
2. **Generates** up to 3 targeted follow-up questions if needed
3. **Collects** enriched responses to make answers more actionable

### Enrichment Example

```
Q1 Product (1 sentence): AI tool

🤖 LLM analyzing answer richness...
📊 Analysis: Answer lacks specific details and metrics

🔍 Generating follow-up questions...
💡 Follow-up 1/2: What specific problem does this solve that competitors don't?
💡 Follow-up 2/2: Who is your ideal customer profile?
```

## Architecture

**Node System**:
- **IntakeNode**: Collects user input + **LLM enrichment** via GPT-4o
- **PlanNode**: Stub implementation that logs activity and ends pipeline
- **Router**: In-memory message dispatcher between nodes
- **LLMEnricher**: GPT-4o classifier and follow-up generator
- **Message System**: Structured envelopes with `run_id`, `event`, `from`, `to`, `payload`, `ts`

## Usage

### Environment Setup

```bash
# Install dependencies
npm install

# Configure API key (required for LLM enrichment)
echo "OPENAI_API_KEY=your_api_key_here" >> .env
```

### CLI Interface (Full LLM Enrichment)

```bash
# Run with LLM enrichment (requires OpenAI API key)
npm run intake

# Or directly:
node scripts/intake.js

# Help
node scripts/intake.js --help
```

### Web Interface (Basic Collection)

```bash
# Start web server
npm run web

# Visit http://localhost:3000
```

### Testing & Demo

```bash
# Test with mock LLM (no API key needed)
node test-enrichment.js

# Test basic system (no API key needed)
node test-demo.js
```

## LLM Enrichment Details

### Classification Criteria

**RICH answer** (no follow-ups needed):
- Contains specific details and metrics
- Clear target audience/market information
- Concrete differentiators or proof points
- Actionable information for outreach

**POOR answer** (needs enrichment):
- Too vague or generic
- Missing key specifics
- Lacks concrete details
- Hard to act upon for outreach

### Follow-up Question Types

**Sales Mode Focus**:
- Target market specifics (company size, industry, tech stack)
- Pain point details (current solutions, cost of problem)
- Product specifics (key features, differentiation)
- Proof points (metrics, case studies, logos)

**Investor Mode Focus**:
- Market size and opportunity details
- Competitive landscape and moats
- Traction specifics (growth rates, key metrics)
- Team and execution capabilities

## Enhanced State Schema

Each run now creates enriched `profiles/{run_id}/state.json`:

```json
{
  "run_id": "p_20250726_1012",
  "mode": "sales",
  "profile": {
    "answers": {
      "product": "AI-powered code review tool",
      "target": "Engineering managers at Series A-C startups",
      // ... other basic answers
    },
    "enrichment": {
      "product": {
        "original": "AI tool",
        "enriched": [
          {
            "question": "What specific problem does this solve?",
            "answer": "Catches critical bugs before production"
          }
        ],
        "classification": {
          "needsEnrichment": true,
          "reasoning": "Answer lacks specific details"
        }
      }
      // ... enrichment for other fields
    },
    "value_prop": ""
  },
  "personas": [],
  "leads": [],
  "outreach": [],
  "inbound": [],
  "triage": []
}
```

## File Structure

```
jim_and_dwight/
├── .env                          # TIMEZONE + OPENAI_API_KEY
├── package.json                  # Dependencies & scripts
├── README.md                     # This documentation
├── test-demo.js                  # Basic system test
├── test-enrichment.js           # LLM enrichment test
├── lib/
│   ├── types.js                 # Message & Node interfaces
│   ├── utils.js                 # File ops, validation, timestamps
│   ├── router.js                # Message dispatcher
│   ├── llm-enricher.js         # 🆕 GPT-4o enrichment system
│   └── nodes/
│       ├── IntakeNode.js        # Enhanced with LLM enrichment
│       └── PlanNode.js          # Stub for Phase 2
├── scripts/
│   ├── intake.js                # CLI entry point (with enrichment)
│   └── web-server.js           # 🆕 Web interface (basic)
└── profiles/{run_id}/           # Generated per run
    ├── state.json               # Complete state + enrichment data
    └── scratchbook.log          # Human-readable events
```

## Questions by Mode

### Sales Mode
1. **Product** (1 sentence) → *Follow-ups: specifics, differentiators*
2. **Target** roles & company types → *Follow-ups: size, industry, decision makers*
3. **Pain** removed (1 sentence) → *Follow-ups: quantify savings, current solutions*
4. **Signals** (comma-separated) → *Follow-ups: tech stack, funding, geography*
5. **Proof** point (metric/logo) → *Follow-ups: specific metrics, case studies*
6. **CTA** (demo/intro/pilot) → *Follow-ups: format, duration, requirements*
7. **Constraints** → *Follow-ups: regions, languages, exclusions*

### Investor Mode
1. **Company** (1 sentence + category) → *Follow-ups: market size, business model*
2. **Stage**, round size & use of funds → *Follow-ups: timeline, milestones*
3. **Traction** snapshot → *Follow-ups: growth rates, key metrics*
4. **Moat**/differentiator → *Follow-ups: competitive advantages, barriers*
5. **Investor** profile → *Follow-ups: fund preferences, check sizes*
6. **Materials** availability → *Follow-ups: deck status, data room*
7. **Constraints** → *Follow-ups: conflict firms, geographic limits*

## Environment Variables

```bash
TIMEZONE=Europe/Paris                    # Timestamp formatting
OPENAI_API_KEY=your_openai_api_key_here # Required for LLM enrichment
PORT=3000                               # Web server port (optional)
```

## Fallback Behavior

- **No API key**: System runs without enrichment (basic collection only)
- **API errors**: Graceful fallback with error logging
- **User skips follow-ups**: Enrichment stops, pipeline continues
- **Invalid responses**: Validation with helpful error messages

## Next Phases

- **Phase 2**: Real PlanNode with GPT-4o integration for value prop generation
- **Phase 3+**: Persona generation, search, drafting, sending

## Testing Examples

### With Real API Key
```bash
# Set your API key
export OPENAI_API_KEY="sk-..."

# Run with full enrichment
npm run intake
```

### Without API Key (Mock Testing)
```bash
# Test enrichment logic with mocks
node test-enrichment.js

# Test basic system
node test-demo.js
```

The system intelligently adapts based on answer quality - if you provide rich, detailed answers, you'll get fewer follow-ups. If answers are vague, GPT-4o will help gather the specifics needed for effective outreach. # dwight_and_jim
