# 🚀 Jim & Dwight - QuickStart Guide

**Get up and running with AI-powered lead generation in 5 minutes!**

## 📋 What You'll Get

✅ **Personalized Lead Database** - AI-generated leads matching your target personas  
✅ **Contact Information** - Emails, LinkedIn profiles, and company details via RocketReach  
✅ **Competitive Intelligence** - Deep insights for personalized outreach  
✅ **Ready-to-Send Messages** - LinkedIn, email, and follow-up messages  
✅ **CSV Export** - Import-ready data for your CRM or email tools  

---

## ⚡ Quick Setup (5 minutes)

### 1. **Clone & Install**
```bash
git clone https://github.com/malhajar17/dwight_and_jim.git
cd dwight_and_jim
npm install
```

### 2. **Get Your API Keys**

#### 🤖 OpenAI API Key (Required)
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create account or login
3. Click "Create new secret key"
4. Copy your `sk-...` key

#### 🔍 Jina Search API Key (Required)
1. Go to [Jina AI](https://jina.ai/)
2. Sign up for free account
3. Get your API key from dashboard
4. Copy your key

### 3. **Configure Environment**
```bash
# Copy the example configuration
cp .env.example .env

# Edit with your actual API keys
nano .env
```

**Update these values in `.env`:**
```bash
OPENAI_API_KEY=sk-your-actual-openai-key-here
JINA_API_KEY=your-actual-jina-key-here
```

### 4. **Run the Pipeline**
```bash
npm run quickstart
```

**That's it!** The system will guide you through the rest. 🎉

---

## 🎯 What Happens Next

### **Interactive Setup**
The pipeline will ask you a series of questions about your campaign:

- **Product/Service**: What you're selling
- **Target Audience**: Who you want to reach  
- **Pain Points**: What problems you solve
- **Funding Goals**: Investment targets (if applicable)
- **Geographic Focus**: Market regions
- **Call-to-Action**: What you want prospects to do

### **AI-Powered Enrichment**
The system automatically:
- Enriches your answers with follow-up questions
- Generates 5 detailed target personas
- Creates search strategies for each persona
- Maps messaging angles and pain points

### **Lead Generation Process**
1. **🔍 Search**: Finds leads matching your personas via Jina API
2. **🚀 Enrich**: Gets contact details through RocketReach integration  
3. **🧠 Analyze**: Extracts competitive intelligence for personalization
4. **📧 Generate**: Creates personalized outreach messages

### **Results Delivered**
You'll get a complete campaign package:
- **CSV File**: All leads with contact info and personalized messages
- **JSON Data**: Complete campaign state for analysis
- **Log File**: Human-readable pipeline execution log

---

## 📊 Sample Output

After completion, you'll see results like this:

```
🎉 PIPELINE COMPLETED SUCCESSFULLY!
======================================================================

📊 CAMPAIGN OVERVIEW
──────────────────────────────
🎯 Campaign Type: investor
🆔 Run ID: p_20250726_1445
📅 Completed: 1/26/2025, 4:57:31 PM

🎯 RESULTS SUMMARY
──────────────────────────────
👥 Target Personas: 5
🔍 Leads Found: 28
🧠 Intelligence Extracted: 8
📧 Ready for Outreach: 10

📈 QUALITY METRICS
──────────────────────────────
✅ Valid Leads: 28/28 (100%)
🚀 Contact Data: 18/28 (64%)
🧠 Intelligence: 8/28 (29%)

📁 GENERATED FILES
──────────────────────────────
📊 Campaign Data: profiles/p_20250726_1445/state.json
📋 Outreach CSV: profiles/p_20250726_1445/leads-outreach.csv
📝 Pipeline Log: profiles/p_20250726_1445/scratchbook.log
```

---

## 🔧 Advanced Usage

### **Resume Existing Campaign**
```bash
# Resume from where you left off
npm run quickstart profiles/p_20250726_1445/state.json
```

### **Multiple Campaign Types**
```bash
# Investor-focused pipeline
npm run investor-pipeline

# Development mode with testing
npm run dev

# Original full pipeline
npm run pipeline
```

### **Web Interface**
```bash
# Start web dashboard
node scripts/web-server.js
# Visit: http://localhost:3000
```

---

## 🎯 Sample Campaign Flow

### **Example: SaaS Fundraising Campaign**

**Your Input:**
- Product: "AI-powered legal document analysis tool"
- Target: "Series A investors focusing on legal tech"
- Pain: "Law firms spending 40% of time on document review"

**AI Generates:**
- 5 detailed investor personas (VCs, angels, strategic investors)
- Targeted search queries for each persona type
- Lead discovery across LinkedIn, investment databases
- Contact enrichment with emails and LinkedIn profiles
- Competitive intelligence on recent legal tech investments
- Personalized outreach messages mentioning relevant portfolio companies

**You Get:**
- 25-50 qualified investor leads
- Direct contact information
- Personalized pitch angles for each investor
- Ready-to-send LinkedIn and email messages

### **Example: B2B Sales Campaign**

**Your Input:**
- Product: "Customer success automation platform"
- Target: "VP of Customer Success at SaaS companies"
- Pain: "Manual customer health scoring and intervention"

**AI Generates:**
- 5 detailed buyer personas (CS leaders, ops directors, etc.)
- Industry-specific search strategies
- Lead enrichment with company tech stack info
- Competitive intelligence on current CS tools
- Personalized outreach highlighting specific pain points

---

## 🛠️ Troubleshooting

### **Common Issues**

**❌ "OPENAI_API_KEY not configured"**
- Check your `.env` file exists and has the correct key
- Ensure no spaces around the `=` sign
- Make sure key starts with `sk-`

**❌ "JINA_API_KEY not configured"**  
- Verify you copied the key from Jina AI dashboard
- Check for any extra characters or spaces

**❌ "No leads found"**
- Try broader search terms in your campaign setup
- Check different geographic regions
- Ensure your target audience is specific enough

**❌ "RocketReach enrichment failed"**
- This is normal - not all leads have RocketReach profiles
- The system will still provide valuable lead information
- Look for alternative contact methods in the intelligence analysis

### **Getting Help**

1. **Check the logs**: `profiles/{run_id}/scratchbook.log`
2. **Review the state**: `profiles/{run_id}/state.json`
3. **Run with verbose output**: `DEBUG=* npm run quickstart`

---

## ⚡ Quick Commands Reference

```bash
# 🚀 START HERE - Complete pipeline
npm run quickstart

# 📋 Show help and options  
npm run quickstart --help

# 🔄 Resume existing campaign
npm run quickstart profiles/p_20250726_1445/state.json

# 🎯 Investor-focused pipeline
npm run investor-pipeline

# 🧪 Development/testing mode
npm run dev

# 🌐 Launch web interface
node scripts/web-server.js
```

---

## 🎯 Success Tips

### **Writing Effective Campaign Input**
- **Be Specific**: "VP of Engineering at Series B SaaS companies" vs "tech executives"
- **Include Numbers**: "Save 15% on infrastructure costs" vs "reduce costs"  
- **Mention Pain Points**: Specific problems your solution solves
- **Geographic Focus**: Target specific regions for better results

### **Maximizing Lead Quality**
- Use multiple personas to cover different buyer types
- Include industry-specific terminology in your descriptions
- Mention competitor names or technologies for better targeting
- Specify company size ranges for more precise matching

### **Optimizing Outreach**
- Personalize the AI-generated messages further
- A/B test different subject lines and approaches
- Follow up with value-driven content
- Track response rates and iterate on messaging

---

## 📈 Next Steps After Generation

1. **📋 Review Your Leads**: Check the CSV for lead quality and relevance
2. **📧 Import to CRM**: Upload the CSV to HubSpot, Salesforce, or your email tool
3. **📱 LinkedIn Outreach**: Send connection requests with personalized messages
4. **✉️ Email Campaigns**: Set up automated email sequences
5. **📞 Direct Outreach**: Call high-priority leads directly
6. **📊 Track & Iterate**: Monitor response rates and improve your approach

---

## 🔒 Privacy & Security

- **Local Processing**: All data stays on your machine
- **API Calls**: Only sends search queries and content analysis to APIs
- **No Data Storage**: APIs don't store your campaign information
- **Secure Keys**: Keep your `.env` file secure and never commit it to git

---

**Ready to generate your first campaign?** 

```bash
npm run quickstart
```

**🎯 Happy hunting! 🎯** 