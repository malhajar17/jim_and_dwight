#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Debug raw Jina API response to understand the data structure
 */
async function debugJinaRawResponse() {
  try {
    console.log('🔍 DEBUGGING RAW JINA API RESPONSE');
    console.log('=' .repeat(60));
    
    const apiKey = process.env.JINA_API_KEY;
    const baseUrl = 'https://s.jina.ai/';
    
    if (!apiKey || apiKey === 'your_jina_api_key_here') {
      console.error('❌ Jina API key not configured!');
      return;
    }
    
    console.log('✅ API Key configured');
    
    // Test with a simple query
    const query = 'Michel GALAIS rocket reach';
    const formattedQuery = query.replace(/\s+/g, '+');
    
    console.log(`📡 Query: "${query}"`);
    console.log(`📡 Formatted: "${formattedQuery}"`);
    
    try {
      const response = await axios.get(`${baseUrl}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'X-Respond-With': 'no-content'
        },
        timeout: 30000,
        params: {
          'q': formattedQuery
        }
      });
      
      console.log('\n📊 RAW RESPONSE DETAILS');
      console.log('─'.repeat(40));
      console.log(`Status: ${response.status}`);
      console.log(`Headers:`, response.headers);
      console.log(`Data type: ${typeof response.data}`);
      console.log(`Data is Buffer: ${Buffer.isBuffer(response.data)}`);
      
      // Process response data
      let responseText;
      if (typeof response.data === 'string') {
        responseText = response.data;
      } else if (Buffer.isBuffer(response.data)) {
        responseText = response.data.toString('utf8');
      } else {
        responseText = JSON.stringify(response.data);
      }
      
      console.log(`\n📄 RAW TEXT RESPONSE (first 500 chars):`);
      console.log('─'.repeat(40));
      console.log(responseText.substring(0, 500));
      console.log('...');
      
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(responseText);
        console.log(`\n🔍 PARSED JSON STRUCTURE:`);
        console.log('─'.repeat(40));
        console.log(`Type: ${typeof parsed}`);
        console.log(`Keys: ${Object.keys(parsed)}`);
        
        if (parsed.data) {
          console.log(`Data array length: ${parsed.data ? parsed.data.length : 'N/A'}`);
          
          if (parsed.data && parsed.data.length > 0) {
            console.log(`\n📋 FIRST RESULT STRUCTURE:`);
            console.log('─'.repeat(30));
            const firstResult = parsed.data[0];
            console.log(`Keys: ${Object.keys(firstResult)}`);
            console.log(`Title: ${firstResult.title}`);
            console.log(`URL: ${firstResult.url}`);
            console.log(`Link: ${firstResult.link}`);
            console.log(`Description: ${firstResult.description?.substring(0, 100)}...`);
            
            console.log(`\n📋 ALL RESULTS SUMMARY:`);
            console.log('─'.repeat(30));
            parsed.data.forEach((item, index) => {
              console.log(`Result ${index + 1}:`);
              console.log(`  Title: ${item.title}`);
              console.log(`  URL: ${item.url}`);
              console.log(`  Link: ${item.link}`);  
              console.log(`  Has Description: ${!!item.description}`);
              console.log('');
            });
          }
        }
        
      } catch (parseError) {
        console.error(`❌ Failed to parse as JSON: ${parseError.message}`);
        console.log(`\n📄 RAW RESPONSE (likely HTML):`);
        console.log(responseText.substring(0, 1000));
      }
      
    } catch (error) {
      console.error(`❌ Request failed: ${error.message}`);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Response data:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    
  } catch (error) {
    console.error('💥 Debug error:', error.message);
    console.error(error.stack);
  }
}

// Run debug
debugJinaRawResponse(); 