# Jim & Dwight - AI-Powered Lead Generation & Outreach System

A comprehensive, AI-driven pipeline for intelligent lead generation, enrichment, and personalized outreach campaigns.

## 🚀 Features

### 🎯 **Complete Pipeline System**
- **Intake & Enrichment**: GPT-4o powered answer enrichment with intelligent follow-up questions
- **Lead Discovery**: Advanced search via Jina API with persona-based targeting  
- **Lead Enrichment**: RocketReach integration for contact details and professional data
- **Competitive Intelligence**: AI-powered personality analysis and competitive insights
- **Outreach Generation**: Context-aware, personalized messaging across multiple channels
- **Multi-Modal Support**: Both sales and investor outreach campaigns

### 🤖 **AI-Powered Intelligence**
- **GPT-4o Integration**: Answer classification and enrichment
- **Personality Analysis**: Deep competitive intelligence extraction
- **Smart Targeting**: Persona-based lead matching and scoring
- **LinkedIn Strategy**: Advanced exclusion and targeting strategies
- **Message Personalization**: AI-generated outreach tailored to individual prospects

### 🔧 **Technical Capabilities**
- **API Integrations**: Jina Search, RocketReach, OpenAI GPT-4o
- **State Management**: Persistent JSON-based profile system
- **Web Interface**: Browser-based campaign management
- **CLI Tools**: Command-line interface for power users
- **Comprehensive Testing**: Full test suite for all components

## 📁 Project Structure

```
jim_and_dwight/
├── scripts/
│   ├── full-pipeline.js         # Complete end-to-end pipeline
│   ├── investor-pipeline.js     # Investor-focused campaigns
│   ├── dev-mode.js             # Development and testing
│   ├── intake.js               # User intake with AI enrichment
│   └── web-server.js           # Web interface server
├── lib/
│   ├── nodes/                  # Pipeline node implementations
│   ├── llm/                    # AI/LLM integration modules
│   ├── router.js               # Message routing system
│   └── utils.js                # Utility functions
├── profiles/                   # Generated campaign profiles
│   └── {run_id}/
│       ├── state.json          # Complete campaign state
│       ├── leads-outreach.csv  # Generated outreach data
│       └── scratchbook.log     # Human-readable events
├── tests/                      # Comprehensive test suite
└── .env                        # API keys and configuration
```

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+ 
- API Keys for:
  - OpenAI (GPT-4o)
  - Jina Search API
  - RocketReach API

### Installation

```bash
# Clone the repository
git clone https://github.com/malhajar17/dwight_and_jim.git
cd dwight_and_jim

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys
```

### Environment Configuration

```bash
# Required API Keys
OPENAI_API_KEY=your_openai_api_key_here
JINA_API_KEY=your_jina_api_key_here
ROCKETREACH_API_KEY=your_rocketreach_api_key_here

# Optional Configuration
TIMEZONE=Europe/Paris
PORT=3000
```

## 🎮 Usage

### Full Pipeline (Recommended)

```bash
# Run complete lead generation pipeline
npm run pipeline

# Investor-focused pipeline
npm run investor-pipeline

# Development mode with testing
npm run dev
```

### Web Interface

```bash
# Start web server
node scripts/web-server.js

# Open browser to http://localhost:3000
```

### Individual Components

```bash
# User intake with AI enrichment
node scripts/intake.js

# Test specific components
node test-competitive-intelligence.js
node test-personality-analysis.js
node test-rocketreach-integration.js
```

## 🔄 Pipeline Workflow

### 1. **Intake & Enrichment**
- Collects user input for campaign parameters
- AI-powered answer enrichment with follow-up questions
- Intelligent classification of answer quality
- Generates comprehensive campaign profile

### 2. **Persona Generation**
- Creates detailed buyer personas based on campaign goals
- Maps personas to search strategies
- Defines targeting criteria and messaging angles

### 3. **Lead Discovery**
- Advanced search via Jina API
- Persona-based query generation
- Real-time lead scoring and filtering
- Duplicate detection and management

### 4. **Lead Enrichment**
- RocketReach integration for contact details
- Professional background and company data
- Social media profile discovery
- Contact verification and validation

### 5. **Competitive Intelligence**
- AI-powered personality analysis
- Industry involvement and recent activities
- Strategic priorities and pain points
- Competitive landscape insights

### 6. **Outreach Generation**
- Personalized messaging across channels:
  - LinkedIn connection requests
  - LinkedIn follow-up messages  
  - Email outreach
- Context-aware personalization
- A/B testing message variants

### 7. **Export & Integration**
- CSV export for CRM integration
- Structured JSON for API consumption
- Campaign analytics and reporting

## 🎯 Campaign Modes

### Sales Mode
**Questions & Enrichment Focus:**
- **Product**: Core offering and differentiators
- **Target**: Ideal customer profiles and decision makers  
- **Pain Points**: Problems solved and quantifiable value
- **Signals**: Buying intent and qualification criteria
- **Proof**: Case studies, metrics, and social proof
- **CTA**: Desired next steps and conversion goals

### Investor Mode  
**Questions & Enrichment Focus:**
- **Company**: Business model and market opportunity
- **Stage**: Funding round, timeline, and use of funds
- **Traction**: Growth metrics and key performance indicators
- **Differentiators**: Competitive moats and advantages
- **Investor Profile**: Target investor characteristics
- **Materials**: Pitch deck and data room availability

## 🧪 Testing

### Comprehensive Test Suite

```bash
# API Integration Tests
node test-jina-raw-response.js
node test-rocketreach-integration.js
node test-rocketreach-extraction.js

# AI/LLM Tests  
node test-personality-analysis.js
node test-competitive-intelligence.js
node test-clean-json.js

# Pipeline Tests
node test-full-history.js
node test-existing-leads-update.js
node test-context-awareness.js

# Data Processing Tests
node test-non-linkedin-scraping.js
node test-leads-export.csv
```

### Mock Testing (No API Keys Required)

```bash
# Test core logic without API calls
node test-enrichment-fixed.js
node test-json-integration.js
```

## 📊 Output & Analytics

### Generated Profiles
Each campaign creates a comprehensive profile in `profiles/{run_id}/`:

```json
{
  "run_id": "p_20250726_1445",
  "mode": "investor",
  "profile": {
    "answers": { /* User responses */ },
    "enrichment": { /* AI-enhanced details */ },
    "value_prop": "Generated value proposition"
  },
  "personas": [ /* Target buyer personas */ ],
  "leads": [ /* Discovered and enriched leads */ ],
  "outreach": [ /* Generated outreach messages */ ],
  "search_metadata": { /* Campaign analytics */ }
}
```

### Export Formats
- **CSV**: CRM-ready lead data with outreach messages
- **JSON**: Complete campaign data for API integration
- **Logs**: Human-readable campaign timeline

## 🔧 Advanced Configuration

### LinkedIn Exclusion Strategy
The system implements intelligent LinkedIn exclusion to focus on non-LinkedIn sources:
- Competitive intelligence from company websites
- Industry publications and news sources  
- Professional directory listings
- Conference and event participation

### Personality Analysis Pipeline
- **Content Scraping**: Non-LinkedIn professional content
- **AI Analysis**: GPT-4o powered insights extraction
- **Intelligence Scoring**: Quality assessment and confidence metrics
- **Integration Ready**: Structured data for outreach personalization

## 🚦 API Rate Limiting & Management

- **Jina API**: Intelligent query batching and caching
- **RocketReach**: Contact enrichment with verification
- **OpenAI**: Optimized prompt engineering for cost efficiency
- **Error Handling**: Graceful fallbacks and retry logic

## 🔒 Security & Privacy

- **API Key Management**: Environment-based configuration
- **Data Encryption**: Sensitive data protection
- **GDPR Compliance**: Privacy-focused data handling
- **Rate Limiting**: API abuse prevention

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

For questions, issues, or feature requests:
- 📧 Open an issue on GitHub
- 📚 Check the test files for usage examples
- 🔧 Review the comprehensive configuration options

---

**Built with ❤️ for modern sales and fundraising teams**
