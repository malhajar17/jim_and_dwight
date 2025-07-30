# 🎯 Jim & Dwight

**Stop guessing who to sell to. Start knowing.**

Turn any business idea into a CSV full of qualified leads with personalized outreach messages in under 10 minutes. No spreadsheets, no manual research, no generic templates.

## The Twist 🔄

Most lead gen tools give you contacts. Jim & Dwight gives you **conversations**.

- Input: "I'm building AI for legal teams"
- Output: 47 lawyers with emails + LinkedIn messages that mention their recent wins and pain points

## What You Actually Get

```csv
Name,Email,LinkedIn,Personalized_Message,Intelligence_Summary
Sarah Chen,sarah@biglaw.com,linkedin.com/in/sarahchen,"Hi Sarah, saw your Legal 500 recognition for M&A work...","Recently recognized for Corporate Law excellence..."
```

**Real results from real campaigns:**
- 🎯 25-50 qualified leads per run
- 📧 Direct contact info (email + LinkedIn)
- 🧠 Competitive intelligence on each prospect
- 📝 Personalized messages that actually work
- ⚡ 5-10 minutes instead of 5-10 hours

## Quick Start

**Requirements:** Node.js, 2 free API keys, 5 minutes

```bash
git clone https://github.com/malhajar17/jim_and_dwight.git
cd jim_and_dwight
npm install

# Get free API keys (takes 2 minutes)
# OpenAI: https://platform.openai.com/api-keys
# Jina Search: https://jina.ai/

# Add to .env file
echo "OPENAI_API_KEY=sk-your-key-here" >> .env
echo "JINA_API_KEY=your-jina-key-here" >> .env

# Run it
npm run quickstart
```

The system interviews you about your target market, finds prospects, researches them, and generates personalized outreach. That's it.

## Sample Campaigns

Want to see before you run? Check these real examples:

- **[B2B SaaS Campaign](profiles/p_20250726_1425_sales/)** - Generated 28 enterprise leads
- **[Series A Fundraising](profiles/p_20250726_1445_investment/)** - Found 31 relevant VCs

Each folder shows the complete pipeline: target personas → lead discovery → competitive research → personalized messages.

## Perfect For

- **SaaS founders** who need enterprise leads
- **Sales teams** entering new markets  
- **Fundraising** (finding the right VCs)
- **Anyone** tired of cold outreach that doesn't work

## How It Works

1. **Smart Interview**: AI asks follow-up questions to understand your ideal customer
2. **Persona Creation**: Builds 5 detailed buyer profiles
3. **Lead Discovery**: Finds actual people matching those profiles
4. **Deep Research**: Pulls recent news, company context, competitive landscape
5. **Message Generation**: Creates personalized LinkedIn/email outreach for each lead

## Cost

- **OpenAI**: ~$2-5 per campaign (50 leads)
- **Jina Search**: Free tier covers most use cases
- **Your time**: 5 minutes setup + 5 minutes review

## Advanced Usage

```bash
# Resume a campaign
npm run quickstart profiles/your_campaign/state.json

# Web interface
node scripts/web-server.js  # localhost:3000

# Different campaign types
npm run investor-pipeline   # Fundraising focus
```

## What's Different

Most tools scrape LinkedIn and call it a day. Jim & Dwight:

- **Researches each prospect individually** (recent wins, company challenges, competitive threats)
- **Generates unique messages** based on that research
- **Provides conversation starters** that show you actually did your homework
- **Works for any market** (not just SaaS sales)

## Ready?

```bash
npm run quickstart
```

Your first campaign takes 5 minutes. Your first reply takes 5 days.

---

*Questions? Check [QUICKSTART.md](QUICKSTART.md) for detailed examples and troubleshooting.*
# jim_and_dwight
