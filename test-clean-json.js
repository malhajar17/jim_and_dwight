import { EnrichNode } from './lib/nodes/EnrichNode.js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

async function testCleanJSONOutput() {
  console.log('🧪 Testing Clean JSON Output (No Website Content)\n');
  
  const enrichNode = new EnrichNode();
  
  // Sample lead for testing
  const testLead = {
    id: 'clean_json_test_001',
    name: 'Michel GALAIS',
    title: 'CIO',
    company: 'Financial Services Company',
    email: 'michel.galais@financialservic.com.fr',
    linkedin_url: 'https://be.linkedin.com/in/michelgalais',
    location: 'France',
    source: 'clean_json_test',
    confidence_score: 0.95
  };
  
  console.log('👤 Testing clean JSON output with:');
  console.log(`   Name: ${testLead.name}`);
  console.log(`   Title: ${testLead.title}\n`);
  
  try {
    // Run personality analysis
    console.log('🚀 Running personality analysis (clean format)...\n');
    const enrichedLead = await enrichNode.enrichLeadWithPersonalityAnalysis(testLead);
    
    console.log('📊 CLEAN JSON OUTPUT (GPT Analysis Only):');
    console.log('=========================================');
    
    // Show the clean structure
    const cleanOutput = {
      // Core lead data
      id: enrichedLead.id,
      name: enrichedLead.name,
      title: enrichedLead.title,
      company: enrichedLead.company,
      
      // Personality analysis (the main value)
      personality_analysis: enrichedLead.personality_analysis,
      
      // Source tracking (without raw content)
      personality_sources: enrichedLead.personality_sources,
      
      // Metadata for integration
      personality_metadata: enrichedLead.personality_metadata,
      
      // Integration flags
      ready_for_outreach: enrichedLead.ready_for_outreach,
      last_personality_analysis: enrichedLead.last_personality_analysis
    };
    
    console.log(JSON.stringify(cleanOutput, null, 2));
    
    // Save to file
    fs.writeFileSync('clean-personality-output.json', JSON.stringify(cleanOutput, null, 2));
    console.log('\n💾 Clean output saved to: clean-personality-output.json');
    
    // Show what was removed
    console.log('\n🗑️  Removed from Output:');
    console.log('============================');
    console.log('❌ Raw website content (thousands of characters)');
    console.log('❌ Verbose enrichment data');
    console.log('❌ Unnecessary metadata');
    
    // Show what was kept
    console.log('\n✅ Kept in Output:');
    console.log('==================');
    console.log('✅ Structured personality analysis');
    console.log('✅ Source attribution (URLs only)');
    console.log('✅ Processing metadata');
    console.log('✅ Integration-ready flags');
    
    // Show size comparison
    const fullSize = JSON.stringify(enrichedLead).length;
    const cleanSize = JSON.stringify(cleanOutput).length;
    const reduction = Math.round((1 - cleanSize / fullSize) * 100);
    
    console.log('\n📏 Size Comparison:');
    console.log('===================');
    console.log(`Full object: ${fullSize.toLocaleString()} characters`);
    console.log(`Clean object: ${cleanSize.toLocaleString()} characters`);
    console.log(`Size reduction: ${reduction}% smaller`);
    
    // Show integration example
    console.log('\n🔧 Integration Example:');
    console.log('=======================');
    console.log(`
// Easy to use in your application:
if (lead.ready_for_outreach && lead.personality_analysis) {
  const traits = lead.personality_analysis.personality_traits;
  const communication = lead.personality_analysis.communication_style;
  const confidence = lead.personality_analysis.confidence_level;
  
  // Use for personalized outreach
  console.log(\`Approaching \${lead.name} with \${traits.join(', ')} traits\`);
  console.log(\`Communication style: \${communication}\`);
}
    `);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCleanJSONOutput().then(() => {
  console.log('\n🏁 Clean JSON test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 