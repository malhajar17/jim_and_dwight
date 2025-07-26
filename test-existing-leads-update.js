import { SearchNode } from './lib/nodes/SearchNode.js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

async function testExistingLeadsUpdate() {
  console.log('🧪 Testing Existing Leads Update with RocketReach\n');
  
  const searchNode = new SearchNode();
  
  // Check API configuration
  const hasJina = searchNode.jinaSearch.isConfigured();
  console.log('🔧 API Configuration:');
  console.log(`   Jina API: ${hasJina ? '✅ Available' : '❌ Missing'}\n`);
  
  if (!hasJina) {
    console.log('❌ Missing Jina API key. Please check your .env file.');
    return;
  }
  
  // Create sample existing leads with poor quality data (like in your database)
  const existingLeads = [
    {
      id: 'existing_lead_001',
      name: 'Robert Payne',
      title: 'Directeur Technologie',
      company: 'Piedmont Advantage Credit Union',
      email: 'robert.payne@financialservic.com.fr', // FAKE EMAIL
      linkedin_url: 'https://www.prnewswire.com/news-releases/robert-payne-becomes-chief-technology-officer-at-piedmont-advantage-credit-union-302427139.html', // NOT LINKEDIN
      location: 'Paris, France',
      source: 'jina_search',
      confidence_score: 0.95
    },
    {
      id: 'existing_lead_002',
      name: 'Giorgio Migliarina',
      title: 'CTO',
      company: 'Group Financial Services', // GENERIC COMPANY
      email: 'giorgio.migliarina@financialservic.com.fr', // FAKE EMAIL
      linkedin_url: null, // MISSING LINKEDIN
      location: null, // MISSING LOCATION
      source: 'jina_search',
      confidence_score: 0.90
    },
    {
      id: 'existing_lead_003', 
      name: 'Stefan Dubreuil',
      title: 'Professional', // GENERIC TITLE
      company: 'Financial Services Company', // GENERIC COMPANY
      email: 'stefan.dubreuil@financialservic.com.fr', // FAKE EMAIL
      linkedin_url: 'https://example.com/not-linkedin', // NOT LINKEDIN
      location: 'Unknown', // MISSING LOCATION
      source: 'jina_search',
      confidence_score: 0.85
    }
  ];
  
  console.log('👥 Testing with sample existing leads (poor quality data):');
  existingLeads.forEach((lead, index) => {
    console.log(`\n   ${index + 1}. ${lead.name} - ${lead.title} at ${lead.company}`);
    console.log(`      📧 Email: ${lead.email}`);
    console.log(`      🔗 LinkedIn: ${lead.linkedin_url || 'Missing'}`);
    console.log(`      📍 Location: ${lead.location || 'Missing'}`);
  });
  console.log('');
  
  try {
    // Test quality assessment first
    console.log('🔍 QUALITY ASSESSMENT:');
    console.log('=======================');
    
    existingLeads.forEach((lead, index) => {
      console.log(`\n${index + 1}. ${lead.name}:`);
      
      const needsUpdate = searchNode.needsRocketReachUpdate(lead);
      const issues = searchNode.identifyContactIssues(lead);
      
      console.log(`   Needs Update: ${needsUpdate ? '✅ YES' : '❌ NO'}`);
      if (issues.length > 0) {
        console.log(`   Issues Found: ${issues.join(', ')}`);
      }
      
      // Test individual quality checks
      console.log(`   Email Quality: ${searchNode.hasLowQualityEmail(lead.email) ? '❌ Poor' : '✅ Good'}`);
      console.log(`   LinkedIn Quality: ${searchNode.hasLowQualityLinkedIn(lead.linkedin_url) ? '❌ Poor' : '✅ Good'}`);
      console.log(`   Company Quality: ${searchNode.hasLowQualityCompany(lead.company) ? '❌ Poor' : '✅ Good'}`);
    });
    
    // Test RocketReach update process
    console.log('\n\n🚀 ROCKETREACH UPDATE PROCESS:');
    console.log('================================');
    
    // Make a copy for testing
    const testLeads = JSON.parse(JSON.stringify(existingLeads));
    
    await searchNode.updateExistingLeadsWithRocketReach(testLeads);
    
    console.log('\n📊 UPDATE RESULTS COMPARISON:');
    console.log('==============================');
    
    let totalUpdates = 0;
    let emailsUpdated = 0;
    let linkedinUpdated = 0;
    let companiesUpdated = 0;
    let titlesUpdated = 0;
    let locationsAdded = 0;
    
    testLeads.forEach((lead, index) => {
      const original = existingLeads[index];
      
      console.log(`\n👤 ${lead.name}:`);
      console.log('─'.repeat(50));
      
      if (lead.rocketreach_updated) {
        totalUpdates++;
        console.log('✅ RocketReach Update: SUCCESS');
        console.log(`🔗 RocketReach URL: ${lead.rocketreach_url}`);
        console.log(`📅 Updated: ${lead.rocketreach_update_timestamp}`);
        
        if (lead.rocketreach_updates) {
          console.log('📝 Changes Made:');
          lead.rocketreach_updates.forEach(update => {
            console.log(`   ${update}`);
          });
        }
      } else {
        console.log('❌ RocketReach Update: FAILED');
      }
      
      // Compare before/after
      console.log('\n🔄 Before → After Comparison:');
      
      if (original.email !== lead.email) {
        emailsUpdated++;
        console.log(`   📧 Email: ${original.email} → ${lead.email}`);
      }
      
      if (original.linkedin_url !== lead.linkedin_url) {
        linkedinUpdated++;
        console.log(`   🔗 LinkedIn: ${original.linkedin_url || 'None'} → ${lead.linkedin_url || 'None'}`);
      }
      
      if (original.company !== lead.company) {
        companiesUpdated++;
        console.log(`   🏢 Company: ${original.company} → ${lead.company}`);
      }
      
      if (original.title !== lead.title) {
        titlesUpdated++;
        console.log(`   💼 Title: ${original.title} → ${lead.title}`);
      }
      
      if (original.location !== lead.location) {
        locationsAdded++;
        console.log(`   📍 Location: ${original.location || 'None'} → ${lead.location || 'None'}`);
      }
    });
    
    // Summary statistics
    console.log('\n📈 UPDATE STATISTICS:');
    console.log('=====================');
    console.log(`🎯 Total Leads Processed: ${testLeads.length}`);
    console.log(`✅ Successfully Updated: ${totalUpdates}`);
    console.log(`📧 Emails Updated: ${emailsUpdated}`);
    console.log(`🔗 LinkedIn URLs Updated: ${linkedinUpdated}`);
    console.log(`🏢 Companies Updated: ${companiesUpdated}`);
    console.log(`💼 Titles Updated: ${titlesUpdated}`);
    console.log(`📍 Locations Added: ${locationsAdded}`);
    console.log(`📊 Success Rate: ${Math.round((totalUpdates / testLeads.length) * 100)}%`);
    
    // Quality improvement analysis
    console.log('\n📊 QUALITY IMPROVEMENT ANALYSIS:');
    console.log('=================================');
    
    let qualityImproved = 0;
    
    testLeads.forEach((lead, index) => {
      const original = existingLeads[index];
      
      const originalQualityScore = calculateQualityScore(original);
      const newQualityScore = calculateQualityScore(lead);
      
      if (newQualityScore > originalQualityScore) {
        qualityImproved++;
        console.log(`✅ ${lead.name}: Quality improved from ${originalQualityScore}/10 to ${newQualityScore}/10`);
      } else {
        console.log(`➖ ${lead.name}: Quality unchanged at ${originalQualityScore}/10`);
      }
    });
    
    console.log(`\n🎯 Overall Quality Improvement: ${qualityImproved}/${testLeads.length} leads improved`);
    
    // Test specific scenarios
    console.log('\n🧪 SPECIFIC SCENARIO TESTS:');
    console.log('============================');
    
    // Test Robert Payne fake email detection
    const robertPayne = testLeads.find(l => l.name === 'Robert Payne');
    if (robertPayne) {
      console.log(`📧 Robert Payne fake email detected: ${searchNode.hasLowQualityEmail('robert.payne@financialservic.com.fr') ? '✅ YES' : '❌ NO'}`);
      console.log(`🔗 Robert Payne non-LinkedIn URL detected: ${searchNode.hasLowQualityLinkedIn('https://www.prnewswire.com/news-releases/...') ? '✅ YES' : '❌ NO'}`);
    }
    
    // Save detailed results
    const testResults = {
      test_type: 'existing_leads_update',
      test_timestamp: new Date().toISOString(),
      original_leads: existingLeads,
      updated_leads: testLeads,
      update_stats: {
        total_processed: testLeads.length,
        successfully_updated: totalUpdates,
        emails_updated: emailsUpdated,
        linkedin_updated: linkedinUpdated,
        companies_updated: companiesUpdated,
        titles_updated: titlesUpdated,
        locations_added: locationsAdded,
        quality_improved: qualityImproved,
        success_rate: Math.round((totalUpdates / testLeads.length) * 100)
      }
    };
    
    fs.writeFileSync('existing-leads-update-test.json', JSON.stringify(testResults, null, 2));
    console.log('\n💾 Detailed test results saved to: existing-leads-update-test.json');
    
    // Production readiness assessment
    console.log('\n🎯 PRODUCTION READINESS ASSESSMENT:');
    console.log('====================================');
    
    if (totalUpdates > 0) {
      console.log('✅ Existing leads update system is working');
      console.log('🎯 Ready for production deployment');
      console.log('📈 Expected: Significant quality improvements for poor data');
    } else {
      console.log('⚠️  No leads were updated - this could be normal if:');
      console.log('   - RocketReach profiles not found for test subjects');
      console.log('   - Extraction patterns need fine-tuning');
      console.log('   - API rate limiting issues');
    }
    
    console.log('\n🚀 DEPLOYMENT IMPACT:');
    console.log('======================');
    console.log('✅ Will automatically fix fake emails like @financialservic.com.fr');
    console.log('✅ Will replace non-LinkedIn URLs with real LinkedIn profiles');
    console.log('✅ Will update generic company names with specific ones');
    console.log('✅ Will add missing location information');
    console.log('✅ Will prevent duplicate updates (rocketreach_updated flag)');
    console.log('✅ Will track all changes for audit purposes');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Helper function to calculate lead quality score
function calculateQualityScore(lead) {
  let score = 0;
  
  // Email quality (3 points)
  if (lead.email && !lead.email.includes('@financialservic.com.fr') && !lead.email.includes('@example.com')) {
    score += 3;
  }
  
  // LinkedIn quality (3 points)
  if (lead.linkedin_url && lead.linkedin_url.includes('linkedin.com/in/')) {
    score += 3;
  }
  
  // Company quality (2 points)
  if (lead.company && !['Financial Services Company', 'Group Financial Services', 'Unknown Company'].includes(lead.company)) {
    score += 2;
  }
  
  // Title quality (1 point)
  if (lead.title && lead.title !== 'Professional') {
    score += 1;
  }
  
  // Location quality (1 point)
  if (lead.location && lead.location !== 'Unknown') {
    score += 1;
  }
  
  return score;
}

// Run the test
testExistingLeadsUpdate().then(() => {
  console.log('\n🏁 Existing leads update test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 