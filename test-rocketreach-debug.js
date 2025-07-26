#!/usr/bin/env node

import dotenv from 'dotenv';
import { JinaSearchAPI } from './lib/jina-search.js';

// Load environment variables
dotenv.config();

/**
 * Debug RocketReach search results to understand why detection is failing
 */
async function debugRocketReachSearch() {
  try {
    console.log('🔍 DEBUGGING ROCKETREACH SEARCH RESULTS');
    console.log('=' .repeat(60));
    
    const jinaSearch = new JinaSearchAPI();
    
    // Test with some sample names
    const testNames = [
      'Michel GALAIS',
      'Stefan Dubreuil', 
      'Michael Beraha',
      'Stéphanie Maarek',
      'John Smith' // Generic name that might have RocketReach results
    ];
    
    for (const name of testNames) {
      console.log(`\n🔍 Testing: "${name}"`);
      console.log('─'.repeat(40));
      
      const query = `${name} rocket reach`;
      console.log(`📡 Query: "${query}"`);
      
      try {
        const searchResults = await jinaSearch.search(query, 5);
        
        console.log(`📊 Total results: ${searchResults.length}`);
        
        if (searchResults.length > 0) {
          console.log('\n📋 All search results:');
          searchResults.forEach((result, index) => {
            console.log(`   ${index + 1}. URL: ${result.url}`);
            console.log(`      Title: ${result.title}`);
            console.log(`      Description: ${result.description?.substring(0, 100)}...`);
            
            // Check if this would match our RocketReach filter
            const isRocketReach = result.url && result.url.includes('rocketreach.co');
            console.log(`      🚀 RocketReach: ${isRocketReach ? '✅ YES' : '❌ NO'}`);
            console.log('');
          });
          
          // Apply our current filter logic
          const rocketReachResults = searchResults.filter(result => 
            result.url && result.url.includes('rocketreach.co')
          );
          
          console.log(`🎯 RocketReach filtered results: ${rocketReachResults.length}`);
          if (rocketReachResults.length > 0) {
            rocketReachResults.forEach((result, index) => {
              console.log(`   ✅ ${index + 1}. ${result.url}`);
            });
          }
          
        } else {
          console.log('   ❌ No search results returned');
        }
        
      } catch (searchError) {
        console.error(`   ❌ Search error: ${searchError.message}`);
      }
      
      // Add delay between searches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🔍 TESTING ALTERNATIVE SEARCH PATTERNS');
    console.log('=' .repeat(60));
    
    // Test different search patterns that might work better
    const alternativePatterns = [
      'site:rocketreach.co Michel GALAIS',
      'Michel GALAIS contact information',
      'Michel GALAIS email address',
      'rocketreach Michel GALAIS profile'
    ];
    
    for (const pattern of alternativePatterns) {
      console.log(`\n🔍 Testing pattern: "${pattern}"`);
      console.log('─'.repeat(30));
      
      try {
        const searchResults = await jinaSearch.search(pattern, 3);
        console.log(`📊 Results: ${searchResults.length}`);
        
        const rocketReachResults = searchResults.filter(result => 
          result.url && (
            result.url.includes('rocketreach.co') || 
            result.url.includes('rocketreach') ||
            result.title?.toLowerCase().includes('rocketreach') ||
            result.description?.toLowerCase().includes('rocketreach')
          )
        );
        
        console.log(`🚀 RocketReach-related: ${rocketReachResults.length}`);
        if (rocketReachResults.length > 0) {
          rocketReachResults.forEach(result => {
            console.log(`   ✅ ${result.url}`);
          });
        }
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n💡 RECOMMENDATIONS');
    console.log('=' .repeat(30));
    console.log('1. Check if RocketReach URLs are actually returned in search results');
    console.log('2. Consider broadening the URL detection patterns');
    console.log('3. Look for alternative RocketReach domain patterns');
    console.log('4. Consider using different search query formats');
    
  } catch (error) {
    console.error('💥 Debug error:', error.message);
    console.error(error.stack);
  }
}

// Run debug
debugRocketReachSearch(); 