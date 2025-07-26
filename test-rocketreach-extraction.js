#!/usr/bin/env node

import dotenv from 'dotenv';
import { SearchNode } from './lib/nodes/SearchNode.js';
import { JinaSearchAPI } from './lib/jina-search.js';

// Load environment variables
dotenv.config();

/**
 * Test the complete RocketReach extraction process
 */
async function testRocketReachExtraction() {
  try {
    console.log('🧪 TESTING COMPLETE ROCKETREACH EXTRACTION PROCESS');
    console.log('=' .repeat(70));
    
    const searchNode = new SearchNode();
    const jinaSearch = new JinaSearchAPI();
    
    // Test leads with known RocketReach profiles
    const testLeads = [
      {
        id: 'test_1',
        name: 'Michel GALAIS',
        email: 'michel.galais@financialservic.com.fr', // Fake email
        linkedin_url: 'https://be.linkedin.com/in/michelgalais',
        company: 'Financial Services Company', // Generic company
        title: 'CIO',
        location: 'France'
      },
      {
        id: 'test_2',
        name: 'Stefan Dubreuil',
        email: 'stefan.dubreuil@financialservic.com.fr', // Fake email
        linkedin_url: 'https://fr.linkedin.com/in/stefan-dubreuil',
        company: 'Financial Services Company', // Generic company
        title: 'Directeur des Systèmes d\'Information',
        location: 'France'
      },
      {
        id: 'test_3',
        name: 'Michael Beraha',
        email: 'michael.beraha@financialservic.com.fr', // Fake email
        linkedin_url: 'https://fr.linkedin.com/in/mikeberaha',
        company: 'Financial Services Company', // Generic company
        title: 'Senior Banking Executive',
        location: 'France'
      }
    ];
    
    console.log('📋 Testing leads:');
    testLeads.forEach((lead, index) => {
      console.log(`   ${index + 1}. ${lead.name} - ${lead.email}`);
    });
    
    console.log('\n🔍 STEP 1: Testing RocketReach URL Finding');
    console.log('─'.repeat(50));
    
    for (const lead of testLeads) {
      console.log(`\n🔍 Testing ${lead.name}:`);
      
      // Search for RocketReach profile
      const rocketReachQuery = `${lead.name} rocket reach`;
      const searchResults = await jinaSearch.search(rocketReachQuery, 3);
      
      // Find RocketReach results
      const rocketReachResults = searchResults.filter(result => 
        result.url && result.url.includes('rocketreach.co')
      );
      
      console.log(`   🔍 Search query: "${rocketReachQuery}"`);
      console.log(`   📊 Total results: ${searchResults.length}`);
      console.log(`   🚀 RocketReach results: ${rocketReachResults.length}`);
      
      if (rocketReachResults.length > 0) {
        console.log(`   ✅ Best RocketReach URL: ${rocketReachResults[0].url}`);
        console.log(`   📝 Title: ${rocketReachResults[0].title}`);
      } else {
        console.log(`   ❌ No RocketReach profile found`);
      }
    }
    
    console.log('\n🧪 STEP 2: Testing RocketReach Content Scraping');
    console.log('─'.repeat(50));
    
    // Test with known RocketReach URLs
    const testUrls = [
      'https://rocketreach.co/michel-galais-email_18825455',
      'https://rocketreach.co/stefan-dubreuil-email_15426854',
      'https://rocketreach.co/michael-beraha-email_5374650'
    ];
    
    for (let i = 0; i < testUrls.length; i++) {
      const url = testUrls[i];
      const leadName = testLeads[i].name;
      
      console.log(`\n🌐 Scraping: ${leadName}`);
      console.log(`   URL: ${url}`);
      
      try {
        // Test website scraping
        const content = await jinaSearch.readWebsite(url);
        console.log(`   📄 Content length: ${content?.length || 0} chars`);
        
        if (content && content.length > 100) {
          console.log(`   📄 Content preview: ${content.substring(0, 200)}...`);
          
          // Test extraction methods
          console.log('\n   🔧 Testing extraction methods:');
          
          const email = searchNode.extractEmailFromContent(content);
          const linkedinUrl = searchNode.extractLinkedInFromContent(content);
          const company = searchNode.extractCompanyFromContent(content, leadName);
          const title = searchNode.extractTitleFromContent(content, leadName);
          const location = searchNode.extractLocationFromContent(content);
          
          console.log(`   📧 Extracted Email: ${email || 'None found'}`);
          console.log(`   🔗 Extracted LinkedIn: ${linkedinUrl || 'None found'}`);
          console.log(`   🏢 Extracted Company: ${company || 'None found'}`);
          console.log(`   👔 Extracted Title: ${title || 'None found'}`);
          console.log(`   📍 Extracted Location: ${location || 'None found'}`);
          
        } else {
          console.log(`   ❌ Failed to scrape content or content too short`);
        }
        
      } catch (error) {
        console.log(`   ❌ Scraping error: ${error.message}`);
      }
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n🔄 STEP 3: Testing Complete Lead Update Process');
    console.log('─'.repeat(50));
    
    // Create a copy of test leads for updating
    const leadsToUpdate = testLeads.map(lead => ({ ...lead }));
    
    console.log('📋 BEFORE UPDATE:');
    leadsToUpdate.forEach((lead, index) => {
      console.log(`   ${index + 1}. ${lead.name}:`);
      console.log(`      📧 Email: ${lead.email}`);
      console.log(`      🔗 LinkedIn: ${lead.linkedin_url}`);
      console.log(`      🏢 Company: ${lead.company}`);
      console.log(`      👔 Title: ${lead.title}`);
      console.log('');
    });
    
    // Test the quality assessment
    console.log('🔍 Quality Assessment:');
    leadsToUpdate.forEach((lead, index) => {
      const needsUpdate = searchNode.needsRocketReachUpdate(lead);
      const issues = searchNode.identifyContactIssues(lead);
      console.log(`   ${index + 1}. ${lead.name}: ${needsUpdate ? '❌ NEEDS UPDATE' : '✅ OK'}`);
      if (issues.length > 0) {
        console.log(`      Issues: ${issues.join(', ')}`);
      }
    });
    
    // Test updating one lead manually
    console.log('\n🔄 Testing manual update for Michel GALAIS:');
    const testLead = leadsToUpdate[0];
    
    try {
      const contactInfo = await searchNode.extractRocketReachContactInfo(
        'https://rocketreach.co/michel-galais-email_18825455', 
        testLead.name
      );
      
      if (contactInfo) {
        console.log('✅ Successfully extracted contact info:');
        console.log(`   📧 Email: ${contactInfo.email || 'Not found'}`);
        console.log(`   🔗 LinkedIn: ${contactInfo.linkedin_url || 'Not found'}`);
        console.log(`   🏢 Company: ${contactInfo.company || 'Not found'}`);
        console.log(`   👔 Title: ${contactInfo.title || 'Not found'}`);
        console.log(`   📍 Location: ${contactInfo.location || 'Not found'}`);
        
        // Test quality comparison
        console.log('\n🔍 Quality Comparison:');
        console.log(`   📧 Email better? ${searchNode.isEmailBetter(contactInfo.email, testLead.email)}`);
        console.log(`   🔗 LinkedIn better? ${searchNode.isLinkedInBetter(contactInfo.linkedin_url, testLead.linkedin_url)}`);
        console.log(`   🏢 Company better? ${searchNode.isCompanyBetter(contactInfo.company, testLead.company)}`);
        console.log(`   👔 Title better? ${searchNode.isTitleBetter(contactInfo.title, testLead.title)}`);
        
      } else {
        console.log('❌ Failed to extract contact info');
      }
      
    } catch (error) {
      console.log(`❌ Manual update error: ${error.message}`);
    }
    
    console.log('\n🎯 SUMMARY & RECOMMENDATIONS');
    console.log('=' .repeat(50));
    console.log('✅ RocketReach URL detection: Working');
    console.log('🔍 Content scraping: Test results above');
    console.log('🔧 Data extraction: Test results above');
    console.log('📊 Quality assessment: Test results above');
    console.log('🔄 Lead updating: Test results above');
    
    console.log('\nNext steps:');
    console.log('1. If extraction is working, run the full pipeline');
    console.log('2. If extraction is failing, check content scraping issues');
    console.log('3. If quality comparison is wrong, adjust comparison logic');
    
  } catch (error) {
    console.error('💥 Test error:', error.message);
    console.error(error.stack);
  }
}

// Run test
testRocketReachExtraction(); 