import { EnrichNode } from './lib/nodes/EnrichNode.js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

async function testJSONIntegration() {
  console.log('🧪 Testing JSON Integration Format\n');
  
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
    id: 'json_test_001',
    name: 'Michel GALAIS',
    title: 'CIO',
    company: 'Financial Services Company',
    email: 'michel.galais@financialservic.com.fr',
    linkedin_url: 'https://be.linkedin.com/in/michelgalais',
    location: 'France',
    source: 'json_test',
    confidence_score: 0.95
  };
  
  console.log('👤 Testing JSON integration with lead:');
  console.log(`   Name: ${testLead.name}`);
  console.log(`   Title: ${testLead.title}\n`);
  
  try {
    // Run personality analysis
    console.log('🚀 Running personality analysis...\n');
    const enrichedLead = await enrichNode.enrichLeadWithPersonalityAnalysis(testLead);
    
    // Extract integration-ready JSON
    const integrationData = enrichNode.getPersonalityDataForIntegration(enrichedLead);
    
    console.log('\n📊 INTEGRATION-READY JSON OUTPUT:');
    console.log('==========================================');
    console.log(JSON.stringify(integrationData, null, 2));
    
    // Save to file for easy access
    const outputPath = 'personality-analysis-output.json';
    fs.writeFileSync(outputPath, JSON.stringify({
      original_lead: testLead,
      enriched_lead: enrichedLead,
      integration_data: integrationData
    }, null, 2));
    
    console.log(`\n💾 Complete output saved to: ${outputPath}`);
    
    // Test different scenarios
    console.log('\n🔍 Testing Integration Scenarios:');
    console.log('==========================================');
    
    // Scenario 1: Successful analysis
    if (integrationData.status === 'analysis_complete') {
      console.log('✅ Scenario 1: Successful Analysis');
      console.log(`   - Status: ${integrationData.status}`);
      console.log(`   - Traits: ${integrationData.personality.traits.length} traits identified`);
      console.log(`   - Confidence: ${integrationData.personality.confidence}`);
      console.log(`   - Ready for Outreach: ${integrationData.metadata.ready_for_outreach}`);
      console.log(`   - Sources Used: ${integrationData.metadata.sources_used}`);
      
      // Show sample usage for outreach personalization
      console.log('\n📝 Sample Outreach Personalization:');
      console.log(`   Personality Summary: "${integrationData.personality.summary}"`);
      console.log(`   Communication Approach: "${integrationData.personality.communication}"`);
      console.log(`   Key Values: ${integrationData.personality.values.join(', ')}`);
    }
    
    // Scenario 2: Test with incomplete data
    const incompleteData = enrichNode.getPersonalityDataForIntegration({});
    console.log('\n⚠️  Scenario 2: No Analysis Available');
    console.log(`   - Status: ${incompleteData.status}`);
    console.log(`   - Message: ${incompleteData.message}`);
    
    // Scenario 3: Test with error data
    const errorLead = {
      personality_analysis: {
        error: "API limit exceeded",
        analyzed_at: new Date().toISOString()
      }
    };
    const errorData = enrichNode.getPersonalityDataForIntegration(errorLead);
    console.log('\n❌ Scenario 3: Analysis Failed');
    console.log(`   - Status: ${errorData.status}`);
    console.log(`   - Error: ${errorData.error}`);
    
    console.log('\n✅ JSON Integration Test Complete!');
    console.log('\n📋 Usage in Enrichment Flow:');
    console.log('==========================================');
    console.log(`
// Example integration code:
const enrichNode = new EnrichNode();
const enrichedLead = await enrichNode.enrichLeadWithPersonalityAnalysis(lead);
const personalityData = enrichNode.getPersonalityDataForIntegration(enrichedLead);

if (personalityData.status === 'analysis_complete') {
  // Use personality data for personalized outreach
  const traits = personalityData.personality.traits;
  const communication = personalityData.personality.communication;
  const readyForOutreach = personalityData.metadata.ready_for_outreach;
  
  // Integrate with your outreach system
  console.log('Ready for personalized outreach:', readyForOutreach);
}
    `);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testJSONIntegration().then(() => {
  console.log('\n🏁 JSON Integration Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 