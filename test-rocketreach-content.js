#!/usr/bin/env node

import dotenv from 'dotenv';
import { JinaSearchAPI } from './lib/jina-search.js';

// Load environment variables
dotenv.config();

/**
 * Examine actual RocketReach content to understand format
 */
async function examineRocketReachContent() {
  try {
    console.log('🔍 EXAMINING ROCKETREACH CONTENT FORMAT');
    console.log('=' .repeat(60));
    
    const jinaSearch = new JinaSearchAPI();
    
    // Test with a known RocketReach URL
    const testUrl = 'https://rocketreach.co/michel-galais-email_18825455';
    
    console.log(`🌐 Scraping: ${testUrl}`);
    
    const content = await jinaSearch.readWebsite(testUrl);
    
    if (content) {
      console.log(`📄 Content length: ${content.length} characters`);
      console.log('\n📋 FULL CONTENT:');
      console.log('─'.repeat(50));
      console.log(content);
      console.log('─'.repeat(50));
      
      // Look for patterns
      console.log('\n🔍 PATTERN ANALYSIS:');
      console.log('─'.repeat(30));
      
      // Look for email patterns
      const emailPatterns = [
        /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        /email[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
        /Email:\s*([^\s]+@[^\s]+)/gi,
        /mailto:([^"'\s>]+)/gi
      ];
      
      console.log('📧 Email pattern matches:');
      emailPatterns.forEach((pattern, index) => {
        const matches = content.match(pattern);
        console.log(`   Pattern ${index + 1}: ${matches ? matches.slice(0, 3).join(', ') : 'No matches'}`);
      });
      
      // Look for LinkedIn patterns
      const linkedinPatterns = [
        /linkedin\.com\/in\/[a-zA-Z0-9-]+/gi,
        /LinkedIn:\s*(https?:\/\/[^\s]+)/gi,
        /linkedin[:\s]*(https?:\/\/[^\s]+)/gi
      ];
      
      console.log('\n🔗 LinkedIn pattern matches:');
      linkedinPatterns.forEach((pattern, index) => {
        const matches = content.match(pattern);
        console.log(`   Pattern ${index + 1}: ${matches ? matches.slice(0, 3).join(', ') : 'No matches'}`);
      });
      
      // Look for company patterns
      const companyPatterns = [
        /Company:\s*([^\n\r]+)/gi,
        /Organization:\s*([^\n\r]+)/gi,
        /at\s+([A-Z][a-zA-Z\s&.]+?)(?:\s|,|\.|$)/g,
        /working at\s+([^\n\r]+)/gi
      ];
      
      console.log('\n🏢 Company pattern matches:');
      companyPatterns.forEach((pattern, index) => {
        const matches = content.match(pattern);
        console.log(`   Pattern ${index + 1}: ${matches ? matches.slice(0, 3).join(', ') : 'No matches'}`);
      });
      
      // Look for title patterns
      const titlePatterns = [
        /Title:\s*([^\n\r]+)/gi,
        /Position:\s*([^\n\r]+)/gi,
        /Job Title:\s*([^\n\r]+)/gi,
        /\|\s*([A-Z][a-zA-Z\s]+?)(?:\s|$)/g
      ];
      
      console.log('\n👔 Title pattern matches:');
      titlePatterns.forEach((pattern, index) => {
        const matches = content.match(pattern);
        console.log(`   Pattern ${index + 1}: ${matches ? matches.slice(0, 3).join(', ') : 'No matches'}`);
      });
      
      // Look for location patterns
      const locationPatterns = [
        /Location:\s*([^\n\r]+)/gi,
        /Based in:\s*([^\n\r]+)/gi,
        /,\s*(FR|France|Paris)/gi,
        /based in\s+([^\n\r,]+)/gi
      ];
      
      console.log('\n📍 Location pattern matches:');
      locationPatterns.forEach((pattern, index) => {
        const matches = content.match(pattern);
        console.log(`   Pattern ${index + 1}: ${matches ? matches.slice(0, 3).join(', ') : 'No matches'}`);
      });
      
    } else {
      console.log('❌ Failed to scrape content');
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
    console.error(error.stack);
  }
}

// Run examination
examineRocketReachContent(); 