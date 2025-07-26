import { EnrichNode } from './lib/nodes/EnrichNode.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testPersonalityAnalysis() {
  console.log('🧪 Testing Personality Analysis Feature\n');
  
  // Create an instance of the EnrichNode
  const enrichNode = new EnrichNode();
  
  // Check API configuration
  const apiConfig = enrichNode.checkApiConfiguration();
  console.log('🔧 API Configuration:');
  console.log(`   Jina API: ${apiConfig.hasJina ? '✅ Available' : '❌ Missing'}`);
  console.log(`   OpenAI API: ${apiConfig.hasOpenAI ? '✅ Available' : '❌ Missing'}`);
  console.log(`   Jina Search API: ${apiConfig.hasJinaSearch ? '✅ Available' : '❌ Missing'}\n`);
  
  if (!apiConfig.hasJina || !apiConfig.hasOpenAI) {
    console.log('❌ Missing required API keys. Please check your .env file.');
    return;
  }
  
  // Sample lead for testing
  const testLead = {
    id: 'test_lead_001',
    name: 'Michel GALAIS',
    title: 'CIO',
    company: 'Financial Services Company',
    email: 'michel.galais@financialservic.com.fr',
    linkedin_url: 'https://be.linkedin.com/in/michelgalais',
    location: 'France',
    source: 'test',
    confidence_score: 0.95
  };
  
  console.log('👤 Testing with sample lead:');
  console.log(`   Name: ${testLead.name}`);
  console.log(`   Title: ${testLead.title}`);
  console.log(`   Company: ${testLead.company}\n`);
  
  try {
    // Test the personality analysis
    console.log('🚀 Starting personality analysis...\n');
    const enrichedLead = await enrichNode.enrichLeadWithPersonalityAnalysis(testLead);
    
    console.log('\n📊 Results:');
    console.log('=====================================');
    
    if (enrichedLead.personality_analysis) {
      const analysis = enrichedLead.personality_analysis;
      
      if (analysis.error) {
        console.log(`❌ Analysis failed: ${analysis.error}`);
      } else {
        console.log('✅ Personality Analysis Complete!\n');
        
        console.log('🎭 Personality Traits:');
        if (analysis.personality_traits && Array.isArray(analysis.personality_traits)) {
          analysis.personality_traits.forEach(trait => console.log(`   • ${trait}`));
        }
        
        console.log('\n💬 Communication Style:');
        console.log(`   ${analysis.communication_style || 'N/A'}`);
        
        console.log('\n👥 Leadership Approach:');
        console.log(`   ${analysis.leadership_approach || 'N/A'}`);
        
        console.log('\n🛠️ Technical Expertise:');
        if (analysis.technical_expertise && Array.isArray(analysis.technical_expertise)) {
          analysis.technical_expertise.forEach(skill => console.log(`   • ${skill}`));
        }
        
        console.log('\n🎯 Values & Motivations:');
        if (analysis.values_and_motivations && Array.isArray(analysis.values_and_motivations)) {
          analysis.values_and_motivations.forEach(value => console.log(`   • ${value}`));
        }
        
        console.log('\n🧠 Decision Making:');
        console.log(`   ${analysis.decision_making || 'N/A'}`);
        
        console.log('\n🤝 Networking Style:');
        console.log(`   ${analysis.networking_style || 'N/A'}`);
        
        console.log('\n📝 Summary:');
        console.log(`   ${analysis.summary || 'N/A'}`);
        
        console.log('\n📊 Analysis Metadata:');
        console.log(`   Confidence Level: ${analysis.confidence_level || 'N/A'}`);
        console.log(`   Content Sources: ${analysis.content_sources || 0}`);
        console.log(`   Generated At: ${analysis.generated_at || 'N/A'}`);
        
        if (enrichedLead.enrichment_sources) {
          console.log('\n🌐 Sources Used:');
          enrichedLead.enrichment_sources.forEach((source, index) => {
            console.log(`   ${index + 1}. ${source.url}`);
            console.log(`      Title: ${source.title || 'N/A'}`);
          });
        }
      }
    } else {
      console.log('❌ No personality analysis data found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testPersonalityAnalysis().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 