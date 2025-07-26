import { EnrichNode } from './lib/nodes/EnrichNode.js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

async function testNonLinkedInScraping() {
  console.log('🧪 Testing Non-LinkedIn Scraping Strategy\n');
  
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
    id: 'non_linkedin_test_001',
    name: 'Giorgio Migliarina',
    title: 'Chief Technology Officer',
    company: 'Maybank',
    email: 'giorgio.migliarina@maybank.com',
    location: 'Malaysia',
    source: 'non_linkedin_test',
    confidence_score: 0.95
  };
  
  console.log('👤 Testing non-LinkedIn scraping with:');
  console.log(`   Name: ${testLead.name}`);
  console.log(`   Title: ${testLead.title}`);
  console.log(`   Company: ${testLead.company}\n`);
  
  try {
    // Run personality analysis
    console.log('🚀 Running personality analysis (LinkedIn excluded from scraping)...\n');
    const enrichedLead = await enrichNode.enrichLeadWithPersonalityAnalysis(testLead);
    
    console.log('\n📊 SCRAPING STRATEGY RESULTS:');
    console.log('=====================================');
    
    // Analyze the sources
    const sources = enrichedLead.personality_sources || [];
    const linkedinSources = sources.filter(s => s.type === 'linkedin_reference');
    const scrapedSources = sources.filter(s => s.type === 'scraped_content');
    
    console.log(`🔗 LinkedIn URLs (Reference Only): ${linkedinSources.length}`);
    linkedinSources.forEach((source, index) => {
      console.log(`   ${index + 1}. ${source.url}`);
      console.log(`      Scraped: ${source.scraped_successfully ? '✅' : '❌'} (Expected: ❌)`);
    });
    
    console.log(`\n📖 Non-LinkedIn Sites (Actually Scraped): ${scrapedSources.length}`);
    scrapedSources.forEach((source, index) => {
      console.log(`   ${index + 1}. ${source.url}`);
      console.log(`      Scraped: ${source.scraped_successfully ? '✅' : '❌'} (Expected: ✅)`);
    });
    
    // Show metadata
    const metadata = enrichedLead.personality_metadata;
    console.log('\n📊 Scraping Metadata:');
    console.log('======================');
    console.log(`LinkedIn URLs Found: ${metadata?.linkedin_urls_found || 0}`);
    console.log(`LinkedIn URLs Kept for Reference: ${metadata?.linkedin_urls_kept_for_reference || 0}`);
    console.log(`Non-LinkedIn Sites Attempted: ${metadata?.non_linkedin_sites_attempted || 0}`);
    console.log(`Content Sources Used for Analysis: ${metadata?.content_sources_used || 0}`);
    console.log(`Scraping Strategy: ${metadata?.scraping_strategy || 'N/A'}`);
    
    // Show personality analysis success
    const analysis = enrichedLead.personality_analysis;
    if (analysis && !analysis.error) {
      console.log('\n✅ Personality Analysis Results:');
      console.log('=================================');
      console.log(`Traits: ${analysis.personality_traits?.join(', ') || 'N/A'}`);
      console.log(`Communication: ${analysis.communication_style?.substring(0, 100) || 'N/A'}...`);
      console.log(`Confidence Level: ${analysis.confidence_level || 'N/A'}`);
      console.log(`Ready for Outreach: ${enrichedLead.ready_for_outreach ? '✅' : '❌'}`);
    } else {
      console.log('\n❌ Personality Analysis Failed:');
      console.log(`Error: ${analysis?.error || 'Unknown error'}`);
    }
    
    // Show strategy benefits
    console.log('\n🎯 Strategy Benefits:');
    console.log('====================');
    console.log('✅ LinkedIn URLs preserved for lead attribution');
    console.log('✅ No failed LinkedIn scraping attempts');
    console.log('✅ Focus on websites that actually provide content');
    console.log('✅ Better success rate for personality analysis');
    console.log('✅ Cleaner error handling when content is unavailable');
    
    // Save detailed results
    const detailedResults = {
      test_strategy: 'exclude_linkedin_from_scraping',
      test_timestamp: new Date().toISOString(),
      lead_tested: testLead,
      sources_analysis: {
        total_sources: sources.length,
        linkedin_references: linkedinSources.length,
        scraped_sites: scrapedSources.length,
        linkedin_urls: linkedinSources.map(s => s.url),
        scraped_urls: scrapedSources.map(s => s.url)
      },
      personality_analysis_success: !!(analysis && !analysis.error),
      metadata: metadata,
      full_result: enrichedLead
    };
    
    fs.writeFileSync('non-linkedin-scraping-test.json', JSON.stringify(detailedResults, null, 2));
    console.log('\n💾 Detailed test results saved to: non-linkedin-scraping-test.json');
    
    // Test comparison
    console.log('\n📈 Expected vs Actual:');
    console.log('======================');
    console.log(`Expected LinkedIn in sources: ✅ (Got: ${linkedinSources.length > 0 ? '✅' : '❌'})`);
    console.log(`Expected LinkedIn NOT scraped: ✅ (Got: ${linkedinSources.every(s => !s.scraped_successfully) ? '✅' : '❌'})`);
    console.log(`Expected non-LinkedIn scraped: ✅ (Got: ${scrapedSources.some(s => s.scraped_successfully) ? '✅' : '❌'})`);
    console.log(`Expected personality analysis: ✅ (Got: ${analysis && !analysis.error ? '✅' : '❌'})`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testNonLinkedInScraping().then(() => {
  console.log('\n🏁 Non-LinkedIn scraping test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 