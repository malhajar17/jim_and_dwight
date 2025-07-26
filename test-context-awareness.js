#!/usr/bin/env node

import dotenv from 'dotenv';
import { LLMEnricher } from './lib/llm-enricher.js';

dotenv.config();

/**
 * Test the improved context-aware enrichment system
 */
async function testContextAwareness() {
  console.log('🧪 Testing Context-Aware LLM Enrichment');
  console.log('=' .repeat(60));
  
  const enricher = new LLMEnricher();
  
  if (!enricher.isConfigured()) {
    console.log('⚠️  No OpenAI API key found. Testing with expected behavior...');
    return;
  }
  
  console.log('✅ Testing with real GPT-4o\n');
  
  // Test Case 1: Rich answer should not trigger follow-ups
  console.log('📋 TEST 1: Rich Answer (should NOT need enrichment)');
  console.log('─'.repeat(50));
  
  const richAnswer = 'AI-powered code review platform that automatically detects security vulnerabilities and reduces review time by 80% for engineering teams at Series A-C startups with 10-50 developers';
  
  try {
    const classification1 = await enricher.classifyAnswerRichness(
      'Product (1 sentence):',
      richAnswer,
      'sales'
    );
    
    console.log(`📊 Classification:`);
    console.log(`   Needs Enrichment: ${classification1.needsEnrichment}`);
    console.log(`   Reasoning: ${classification1.reasoning}`);
    
    if (classification1.needsEnrichment) {
      console.log('❌ FAILED - Rich answer incorrectly flagged for enrichment');
    } else {
      console.log('✅ PASSED - Rich answer correctly identified');
    }
    
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
  }
  
  // Wait between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test Case 2: Context awareness - avoid repetitive questions
  console.log('\n📋 TEST 2: Context Awareness (avoid repetitive questions)');
  console.log('─'.repeat(50));
  
  // Simulate existing context
  const existingContext = {
    product: { value: 'AI-powered code review tool that catches bugs automatically' },
    target: { value: 'Engineering managers at Series A-C startups' },
    pain: { value: 'Reduces code review time by 80% and catches critical bugs before production' }
  };
  
  try {
    const followUps = await enricher.generateFollowUpQuestions(
      'One proof point (metric/logo):',
      'Used by several companies',
      'sales',
      existingContext
    );
    
    console.log(`📝 Generated ${followUps.length} follow-up question(s):`);
    followUps.forEach((q, i) => {
      console.log(`   ${i + 1}. ${q}`);
    });
    
    // Check if questions avoid repetition
    const questionsText = followUps.join(' ').toLowerCase();
    const hasRepetition = questionsText.includes('engineering') && 
                         questionsText.includes('startups') && 
                         questionsText.includes('code review');
    
    if (hasRepetition) {
      console.log('⚠️  WARNING - Questions may contain repetitive information');
    } else {
      console.log('✅ GOOD - Questions appear context-aware and non-repetitive');
    }
    
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
  }
  
  // Wait between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test Case 3: Poor answer should still get enrichment
  console.log('\n📋 TEST 3: Poor Answer (should need enrichment)');
  console.log('─'.repeat(50));
  
  try {
    const classification3 = await enricher.classifyAnswerRichness(
      'Product (1 sentence):',
      'Software tool',
      'sales'
    );
    
    console.log(`📊 Classification:`);
    console.log(`   Needs Enrichment: ${classification3.needsEnrichment}`);
    console.log(`   Reasoning: ${classification3.reasoning}`);
    
    if (!classification3.needsEnrichment) {
      console.log('❌ FAILED - Vague answer incorrectly marked as sufficient');
    } else {
      console.log('✅ PASSED - Vague answer correctly flagged for enrichment');
    }
    
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
  }
  
  console.log('\n🎯 SUMMARY:');
  console.log('   • Rich answers should be recognized as sufficient');
  console.log('   • Follow-ups should avoid asking for already-known information'); 
  console.log('   • Context awareness prevents repetitive questions');
  console.log('   • Only truly vague answers should trigger enrichment');
  
  console.log('\n✨ Context-aware enrichment testing completed!');
}

// Test specific classification examples
async function testClassificationExamples() {
  console.log('\n🧪 Testing Classification with Specific Examples');
  console.log('=' .repeat(50));
  
  const enricher = new LLMEnricher();
  
  if (!enricher.isConfigured()) {
    console.log('⚠️  No OpenAI API key - skipping classification tests');
    return;
  }
  
  const testCases = [
    {
      question: 'Product (1 sentence):',
      answer: 'CRM software',
      expected: 'NEEDS enrichment (too vague)'
    },
    {
      question: 'Product (1 sentence):',
      answer: 'CRM software for real estate agents that automates lead follow-up and increases conversions by 40%',
      expected: 'RICH enough (specific, quantified, targeted)'
    },
    {
      question: 'Target roles & company types:',
      answer: 'Sales teams at B2B companies',
      expected: 'NEEDS enrichment (lacks specificity)'
    },
    {
      question: 'Target roles & company types:',  
      answer: 'VP Sales and Sales Directors at 50-500 person SaaS companies using Salesforce',
      expected: 'RICH enough (specific roles, company size, tech stack)'
    }
  ];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📝 Example ${i + 1}: ${testCase.expected}`);
    console.log(`Q: ${testCase.question}`);
    console.log(`A: "${testCase.answer}"`);
    
    try {
      const result = await enricher.classifyAnswerRichness(
        testCase.question,
        testCase.answer,
        'sales'
      );
      
      const status = result.needsEnrichment ? 'NEEDS enrichment' : 'RICH enough';
      const correct = testCase.expected.includes(status) ? '✅' : '❌';
      
      console.log(`${correct} Result: ${status}`);
      console.log(`   Reasoning: ${result.reasoning}`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    // Delay between API calls
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
}

// Run all tests
async function runAllTests() {
  await testContextAwareness();
  await testClassificationExamples();
}

runAllTests(); 