import { EnrichNode } from './lib/nodes/EnrichNode.js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

async function testCompetitiveIntelligence() {
  console.log('🧪 Testing Competitive Intelligence Extraction\n');
  
  const enrichNode = new EnrichNode();
  
  // Check API configuration
  const apiConfig = enrichNode.checkApiConfiguration();
  console.log('🔧 API Configuration:');
  console.log(`   Jina API: ${apiConfig.hasJina ? '✅ Available' : '❌ Missing'}`);
  console.log(`   OpenAI API: ${apiConfig.hasOpenAI ? '✅ Available' : '❌ Missing'}\n`);
  
  if (!apiConfig.hasJina || !apiConfig.hasOpenAI) {
    console.log('❌ Missing required API keys. Please check your .env file.');
    return;
  }
  
  // Sample lead for testing
  const testLead = {
    id: 'competitive_intel_test_001',
    name: 'Giorgio Migliarina',
    title: 'Chief Technology Officer',
    company: 'Maybank',
    email: 'giorgio.migliarina@maybank.com',
    location: 'Malaysia',
    source: 'competitive_intel_test',
    confidence_score: 0.95
  };
  
  console.log('👤 Testing competitive intelligence extraction with:');
  console.log(`   Name: ${testLead.name}`);
  console.log(`   Title: ${testLead.title}`);
  console.log(`   Company: ${testLead.company}\n`);
  
  try {
    // Run competitive intelligence extraction
    console.log('🚀 Running competitive intelligence extraction...\n');
    const enrichedLead = await enrichNode.enrichLeadWithPersonalityAnalysis(testLead);
    
    // Extract integration-ready intelligence
    const intelligenceData = enrichNode.getPersonalityDataForIntegration(enrichedLead);
    
    console.log('\n🎯 COMPETITIVE INTELLIGENCE RESULTS:');
    console.log('=====================================');
    
    const intel = intelligenceData.competitive_intelligence;
    
    if (intelligenceData.status === 'analysis_complete') {
      console.log('✅ Intelligence Extraction Successful!\n');
      
      // Show current projects (actionable intelligence)
      console.log('🚀 CURRENT PROJECTS:');
      intel.current_projects.forEach((project, index) => {
        if (!project.includes('No specific') && !project.includes('Analysis parsing error')) {
          console.log(`   ${index + 1}. ${project}`);
        }
      });
      if (intel.current_projects.every(p => p.includes('No specific') || p.includes('Analysis parsing error'))) {
        console.log('   ❌ No specific current projects identified');
      }
      
      // Show recent developments (news, changes, appointments)
      console.log('\n📰 RECENT DEVELOPMENTS:');
      intel.recent_developments.forEach((dev, index) => {
        if (!dev.includes('No recent') && !dev.includes('Analysis parsing error')) {
          console.log(`   ${index + 1}. ${dev}`);
        }
      });
      if (intel.recent_developments.every(d => d.includes('No recent') || d.includes('Analysis parsing error'))) {
        console.log('   ❌ No recent developments found');
      }
      
      // Show strategic priorities (what they care about)
      console.log('\n🎯 STRATEGIC PRIORITIES:');
      intel.strategic_priorities.forEach((priority, index) => {
        if (!priority.includes('No specific') && !priority.includes('Analysis parsing error')) {
          console.log(`   ${index + 1}. ${priority}`);
        }
      });
      if (intel.strategic_priorities.every(p => p.includes('No specific') || p.includes('Analysis parsing error'))) {
        console.log('   ❌ No specific strategic priorities identified');
      }
      
      // Show outreach angles (conversation starters)
      console.log('\n💬 OUTREACH ANGLES:');
      intel.outreach_angles.forEach((angle, index) => {
        if (!angle.includes('Standard') && !angle.includes('Analysis parsing error')) {
          console.log(`   ${index + 1}. ${angle}`);
        }
      });
      if (intel.outreach_angles.every(a => a.includes('Standard') || a.includes('Analysis parsing error'))) {
        console.log('   ❌ Only standard outreach topics available');
      }
      
      // Show recent quotes (their actual words)
      console.log('\n💭 RECENT QUOTES/STATEMENTS:');
      intel.recent_quotes.forEach((quote, index) => {
        if (!quote.includes('No recent') && !quote.includes('Analysis parsing error')) {
          console.log(`   ${index + 1}. "${quote}"`);
        }
      });
      if (intel.recent_quotes.every(q => q.includes('No recent') || q.includes('Analysis parsing error'))) {
        console.log('   ❌ No recent quotes or statements found');
      }
      
      // Show company context
      console.log('\n🏢 COMPANY CONTEXT:');
      intel.company_context.forEach((context, index) => {
        if (!context.includes('No specific') && !context.includes('Analysis parsing error')) {
          console.log(`   ${index + 1}. ${context}`);
        }
      });
      if (intel.company_context.every(c => c.includes('No specific') || c.includes('Analysis parsing error'))) {
        console.log('   ❌ No specific company context available');
      }
      
      // Show competitive insights
      console.log('\n🔍 COMPETITIVE INSIGHTS:');
      intel.competitive_insights.forEach((insight, index) => {
        if (!insight.includes('Limited') && !insight.includes('Analysis parsing error')) {
          console.log(`   ${index + 1}. ${insight}`);
        }
      });
      if (intel.competitive_insights.every(i => i.includes('Limited') || i.includes('Analysis parsing error'))) {
        console.log('   ❌ Limited competitive intelligence available');
      }
      
      console.log('\n📊 ANALYSIS QUALITY:');
      console.log(`   Intelligence Quality: ${intel.intelligence_quality}`);
      console.log(`   Ready for Outreach: ${intelligenceData.metadata.ready_for_outreach ? '✅' : '❌'}`);
      console.log(`   Sources Used: ${intelligenceData.metadata.sources_used}`);
      
      console.log('\n📝 EXECUTIVE SUMMARY:');
      console.log(`   ${intel.summary}`);
      
    } else {
      console.log('❌ Intelligence extraction failed:');
      console.log(`   Status: ${intelligenceData.status}`);
      console.log(`   Error: ${intelligenceData.error || 'Unknown error'}`);
    }
    
    // Show the difference from generic personality analysis
    console.log('\n🆚 OLD vs NEW APPROACH:');
    console.log('=======================');
    console.log('❌ OLD (Generic): "Strategic, innovative, analytical" - useless');
    console.log('✅ NEW (Actionable): Specific projects, recent news, actual quotes');
    console.log('❌ OLD: "Good communication style" - meaningless');  
    console.log('✅ NEW: "Recently appointed CTO, focusing on digital transformation"');
    console.log('❌ OLD: "Values teamwork" - generic BS');
    console.log('✅ NEW: "Leading cybersecurity initiative, quoted on data privacy"');
    
    // Save detailed results
    const detailedResults = {
      test_type: 'competitive_intelligence_extraction',
      test_timestamp: new Date().toISOString(),
      lead_tested: testLead,
      intelligence_extracted: intelligenceData,
      raw_analysis: enrichedLead.personality_analysis,
      sources_used: enrichedLead.personality_sources
    };
    
    fs.writeFileSync('competitive-intelligence-test.json', JSON.stringify(detailedResults, null, 2));
    console.log('\n💾 Detailed results saved to: competitive-intelligence-test.json');
    
    // Show usage examples for outreach
    console.log('\n🎯 OUTREACH USAGE EXAMPLES:');
    console.log('============================');
    
    if (intel.recent_developments.some(d => !d.includes('No recent'))) {
      console.log('📧 Email opener: "I saw your recent appointment as CTO..."');
    }
    
    if (intel.current_projects.some(p => !p.includes('No specific'))) {
      console.log('💬 LinkedIn message: "Your work on digital transformation initiatives..."');
    }
    
    if (intel.recent_quotes.some(q => !q.includes('No recent'))) {
      console.log('📞 Call opener: "I read your comments about cybersecurity..."');
    }
    
    if (intel.outreach_angles.some(a => !a.includes('Standard'))) {
      console.log('🤝 Meeting request: Reference specific industry involvement...');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testCompetitiveIntelligence().then(() => {
  console.log('\n🏁 Competitive intelligence test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 