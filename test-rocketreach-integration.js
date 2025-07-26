import { SearchNode } from './lib/nodes/SearchNode.js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

async function testRocketReachIntegration() {
  console.log('🧪 Testing RocketReach Integration in SearchNode\n');
  
  const searchNode = new SearchNode();
  
  // Check API configuration
  const hasJina = searchNode.jinaSearch.isConfigured();
  console.log('🔧 API Configuration:');
  console.log(`   Jina API: ${hasJina ? '✅ Available' : '❌ Missing'}\n`);
  
  if (!hasJina) {
    console.log('❌ Missing Jina API key. Please check your .env file.');
    return;
  }
  
  // Create sample leads to test RocketReach enrichment
  const testLeads = [
    {
      id: 'test_lead_001',
      name: 'Giorgio Migliarina',
      title: 'CTO',
      company: 'Maybank',
      email: null,
      linkedin_url: null,
      location: null,
      is_valid_person: true,
      validation_reason: 'Real person for testing'
    },
    {
      id: 'test_lead_002',
      name: 'Stephane Dubreuil',
      title: 'Director',
      company: 'Unknown Company',
      email: null,
      linkedin_url: null,
      location: null,
      is_valid_person: true,
      validation_reason: 'Real person for testing'
    }
  ];
  
  console.log('👥 Testing RocketReach enrichment with sample leads:');
  testLeads.forEach((lead, index) => {
    console.log(`   ${index + 1}. ${lead.name} - ${lead.title} at ${lead.company}`);
  });
  console.log('');
  
  try {
    // Test RocketReach enrichment
    console.log('🚀 Running RocketReach enrichment test...\n');
    await searchNode.enrichLeadsWithRocketReach(testLeads);
    
    console.log('\n🎯 ROCKETREACH ENRICHMENT RESULTS:');
    console.log('===========================================');
    
    let enrichedCount = 0;
    let emailsFound = 0;
    let linkedinFound = 0;
    let companiesUpdated = 0;
    let titlesUpdated = 0;
    let locationsAdded = 0;
    
    testLeads.forEach((lead, index) => {
      console.log(`\n👤 Lead ${index + 1}: ${lead.name}`);
      console.log('─'.repeat(40));
      
      if (lead.rocketreach_enriched) {
        enrichedCount++;
        console.log('✅ RocketReach Enrichment: SUCCESS');
        console.log(`🔗 RocketReach URL: ${lead.rocketreach_url}`);
      } else {
        console.log('❌ RocketReach Enrichment: FAILED');
      }
      
      // Show what information was found/updated
      if (lead.email) {
        emailsFound++;
        console.log(`📧 Email: ${lead.email}`);
      } else {
        console.log('📧 Email: Not found');
      }
      
      if (lead.linkedin_url) {
        linkedinFound++;
        console.log(`🔗 LinkedIn: ${lead.linkedin_url}`);
      } else {
        console.log('🔗 LinkedIn: Not found');
      }
      
      if (lead.company && lead.company !== 'Unknown Company') {
        if (lead.company !== testLeads.find(l => l.id === lead.id)?.company) {
          companiesUpdated++;
        }
        console.log(`🏢 Company: ${lead.company}`);
      } else {
        console.log('🏢 Company: Not updated');
      }
      
      if (lead.title && lead.title !== 'Professional') {
        if (lead.title !== testLeads.find(l => l.id === lead.id)?.title) {
          titlesUpdated++;
        }
        console.log(`💼 Title: ${lead.title}`);
      } else {
        console.log('💼 Title: Not updated');
      }
      
      if (lead.location) {
        locationsAdded++;
        console.log(`📍 Location: ${lead.location}`);
      } else {
        console.log('📍 Location: Not found');
      }
    });
    
    // Summary statistics
    console.log('\n📊 ENRICHMENT STATISTICS:');
    console.log('=========================');
    console.log(`🎯 Total Leads Processed: ${testLeads.length}`);
    console.log(`✅ Successfully Enriched: ${enrichedCount}`);
    console.log(`📧 Emails Found: ${emailsFound}`);
    console.log(`🔗 LinkedIn URLs Found: ${linkedinFound}`);
    console.log(`🏢 Companies Updated: ${companiesUpdated}`);
    console.log(`💼 Titles Updated: ${titlesUpdated}`);
    console.log(`📍 Locations Added: ${locationsAdded}`);
    console.log(`📈 Success Rate: ${Math.round((enrichedCount / testLeads.length) * 100)}%`);
    
    // Show the quality of enrichment
    console.log('\n🔍 ENRICHMENT QUALITY ANALYSIS:');
    console.log('================================');
    
    if (enrichedCount === 0) {
      console.log('❌ No leads were enriched with RocketReach data');
      console.log('💡 This could be due to:');
      console.log('   - RocketReach profiles not found for test subjects');
      console.log('   - Content extraction patterns need adjustment');
      console.log('   - API rate limiting or access issues');
    } else if (enrichedCount === testLeads.length) {
      console.log('🎉 Perfect! All leads were successfully enriched');
      console.log('✅ RocketReach integration is working excellently');
    } else {
      console.log(`⚠️  Partial success: ${enrichedCount}/${testLeads.length} leads enriched`);
      console.log('💡 This is normal - not all people have RocketReach profiles');
    }
    
    // Test individual extraction methods
    console.log('\n🧪 TESTING INDIVIDUAL EXTRACTION METHODS:');
    console.log('===========================================');
    
    const sampleContent = `
      Giorgio Migliarina
      Company: Maybank Group
      Title: Chief Technology Officer  
      Email: giorgio.migliarina@maybank.com
      LinkedIn: https://www.linkedin.com/in/giorgiomigliarina
      Location: Kuala Lumpur, Malaysia
      Position: CTO at Maybank Group
    `;
    
    console.log('📝 Testing with sample RocketReach content...');
    
    const extractedEmail = searchNode.extractEmailFromContent(sampleContent);
    const extractedLinkedIn = searchNode.extractLinkedInFromContent(sampleContent);
    const extractedCompany = searchNode.extractCompanyFromContent(sampleContent, 'Giorgio Migliarina');
    const extractedTitle = searchNode.extractTitleFromContent(sampleContent, 'Giorgio Migliarina');
    const extractedLocation = searchNode.extractLocationFromContent(sampleContent);
    
    console.log(`📧 Email Extraction: ${extractedEmail || 'Failed'}`);
    console.log(`🔗 LinkedIn Extraction: ${extractedLinkedIn || 'Failed'}`);
    console.log(`🏢 Company Extraction: ${extractedCompany || 'Failed'}`);
    console.log(`💼 Title Extraction: ${extractedTitle || 'Failed'}`);
    console.log(`📍 Location Extraction: ${extractedLocation || 'Failed'}`);
    
    // Save detailed results
    const testResults = {
      test_type: 'rocketreach_integration',
      test_timestamp: new Date().toISOString(),
      test_leads: testLeads,
      enrichment_stats: {
        total_processed: testLeads.length,
        successfully_enriched: enrichedCount,
        emails_found: emailsFound,
        linkedin_urls_found: linkedinFound,
        companies_updated: companiesUpdated,
        titles_updated: titlesUpdated,
        locations_added: locationsAdded,
        success_rate: Math.round((enrichedCount / testLeads.length) * 100)
      },
      extraction_tests: {
        email: extractedEmail,
        linkedin: extractedLinkedIn,
        company: extractedCompany,
        title: extractedTitle,
        location: extractedLocation
      }
    };
    
    fs.writeFileSync('rocketreach-integration-test.json', JSON.stringify(testResults, null, 2));
    console.log('\n💾 Detailed test results saved to: rocketreach-integration-test.json');
    
    // Integration recommendations
    console.log('\n💡 INTEGRATION RECOMMENDATIONS:');
    console.log('================================');
    
    if (enrichedCount > 0) {
      console.log('✅ RocketReach integration is functional');
      console.log('🎯 Recommended: Deploy to production SearchNode');
      console.log('📈 Expected: 30-70% success rate for real leads');
      console.log('⚡ Performance: 2-second delay between searches is appropriate');
    }
    
    if (emailsFound === 0) {
      console.log('⚠️  Email extraction may need pattern improvements');
    }
    
    if (linkedinFound === 0) {
      console.log('⚠️  LinkedIn extraction may need pattern improvements');
    }
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Run SearchNode with RocketReach integration');
    console.log('   2. Monitor enrichment success rates');
    console.log('   3. Adjust extraction patterns based on results');
    console.log('   4. Consider RocketReach API direct integration for higher accuracy');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testRocketReachIntegration().then(() => {
  console.log('\n🏁 RocketReach integration test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 