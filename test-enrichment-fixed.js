#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateRunId, getCurrentTimestamp, ensureDir } from './lib/utils.js';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname;

/**
 * Test the actual LLM enricher with better error handling
 */
async function testLLMEnricher() {
  try {
    console.log('🧪 Testing LLM Enricher with Error Handling');
    console.log('=' .repeat(60));
    
    const { LLMEnricher } = await import('./lib/llm-enricher.js');
    const enricher = new LLMEnricher();
    
    if (!enricher.isConfigured()) {
      console.log('⚠️  No OpenAI API key found. Please set OPENAI_API_KEY in .env');
      console.log('💡 Example: echo "OPENAI_API_KEY=sk-your-key-here" >> .env');
      return;
    }
    
    console.log('✅ OpenAI API key configured');
    console.log('🤖 Testing with real GPT-4o calls...\n');
    
    // Test cases with different levels of richness
    const testCases = [
      {
        question: 'Product (1 sentence):',
        answer: 'AI tool',
        mode: 'sales',
        expected: 'needs enrichment'
      },
      {
        question: 'Product (1 sentence):',
        answer: 'AI-powered code review platform that automatically detects security vulnerabilities and reduces review time by 80% for engineering teams at Series A startups',
        mode: 'sales',
        expected: 'rich enough'
      },
      {
        question: 'Target roles & company types:',
        answer: 'Managers',
        mode: 'sales',
        expected: 'needs enrichment'
      }
    ];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n📋 Test Case ${i + 1}/${testCases.length}`);
      console.log(`Question: ${testCase.question}`);
      console.log(`Answer: "${testCase.answer}"`);
      console.log(`Expected: ${testCase.expected}`);
      console.log('─'.repeat(50));
      
      try {
        // Test classification
        const classification = await enricher.classifyAnswerRichness(
          testCase.question,
          testCase.answer,
          testCase.mode
        );
        
        console.log(`📊 Classification Result:`);
        console.log(`   Needs Enrichment: ${classification.needsEnrichment}`);
        console.log(`   Reasoning: ${classification.reasoning}`);
        
        // If needs enrichment, test follow-up generation
        if (classification.needsEnrichment) {
          console.log(`\n🔍 Generating follow-up questions...`);
          
          const followUps = await enricher.generateFollowUpQuestions(
            testCase.question,
            testCase.answer,
            testCase.mode
          );
          
          console.log(`📝 Generated ${followUps.length} follow-up question(s):`);
          followUps.forEach((q, idx) => {
            console.log(`   ${idx + 1}. ${q}`);
          });
        }
        
        console.log(`✅ Test case ${i + 1} completed successfully`);
        
      } catch (error) {
        console.error(`❌ Test case ${i + 1} failed:`, error.message);
      }
      
      // Add delay between API calls to be respectful
      if (i < testCases.length - 1) {
        console.log('\n⏳ Waiting 2 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n✨ LLM Enricher testing completed!');
    
  } catch (error) {
    console.error('💥 Test error:', error.message);
    process.exit(1);
  }
}

/**
 * Test JSON parsing with mock responses that might cause issues
 */
async function testJSONParsing() {
  console.log('\n🧪 Testing JSON Parsing Edge Cases');
  console.log('=' .repeat(40));
  
  const { LLMEnricher } = await import('./lib/llm-enricher.js');
  const enricher = new LLMEnricher();
  
  const testResponses = [
    '```json\n{"needsEnrichment": true, "reasoning": "Test"}\n```',
    '```\n{"needsEnrichment": false, "reasoning": "Test"}\n```',
    '{"needsEnrichment": true, "reasoning": "Test"}',
    '  {"needsEnrichment": false, "reasoning": "Test"}  ',
    '```json{"needsEnrichment": true, "reasoning": "Test"}```'
  ];
  
  testResponses.forEach((response, i) => {
    try {
      console.log(`\nTest ${i + 1}: "${response.replace(/\n/g, '\\n')}"`);
      const result = enricher.cleanAndParseJSON(response);
      console.log(`✅ Parsed successfully:`, result);
    } catch (error) {
      console.log(`❌ Failed to parse:`, error.message);
    }
  });
}

// Run tests
async function runTests() {
  await testLLMEnricher();
  await testJSONParsing();
}

runTests(); 