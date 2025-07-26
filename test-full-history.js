#!/usr/bin/env node

import dotenv from 'dotenv';
import { LLMEnricher } from './lib/llm-enricher.js';

dotenv.config();

/**
 * Test full conversation history awareness
 */
async function testFullHistoryAwareness() {
  console.log('🧪 Testing Full Conversation History Awareness');
  console.log('=' .repeat(60));
  
  const enricher = new LLMEnricher();
  
  if (!enricher.isConfigured()) {
    console.log('⚠️  No OpenAI API key found.');
    console.log('💡 Set OPENAI_API_KEY in .env to test with real GPT-4o');
    return;
  }
  
  console.log('✅ Testing with real GPT-4o\n');
  
  // Simulate a conversation that has already happened
  const conversationHistory = {
    product: {
      value: 'AI tool',
      enrichment: {
        original: 'AI tool',
        enriched: [
          {
            question: 'What specific problem does this AI tool solve?',
            answer: 'Automatically detects security vulnerabilities in code'
          },
          {
            question: 'What makes it different from existing solutions?',
            answer: 'Uses machine learning to catch zero-day exploits that static analysis misses'
          }
        ],
        classification: { needsEnrichment: true, reasoning: 'Original answer too vague' }
      }
    },
    target: {
      value: 'Engineering teams',
      enrichment: {
        original: 'Engineering teams',
        enriched: [
          {
            question: 'What size companies do you target?',
            answer: 'Series A to C startups with 10-100 developers'
          }
        ],
        classification: { needsEnrichment: true, reasoning: 'Lacked company specifics' }
      }
    },
    pain: {
      value: 'Reduces security issues',
      enrichment: {
        original: 'Reduces security issues',
        enriched: [
          {
            question: 'How much time or money does this save?',
            answer: 'Prevents average of 15 critical vulnerabilities per month, saving $50k+ in breach costs'
          }
        ],
        classification: { needsEnrichment: true, reasoning: 'No quantification provided' }
      }
    }
  };

  console.log('📋 CONVERSATION HISTORY SO FAR:');
  console.log('─'.repeat(40));
  for (const [key, data] of Object.entries(conversationHistory)) {
    console.log(`${key}: ${data.value}`);
    if (data.enrichment && data.enrichment.enriched) {
      data.enrichment.enriched.forEach((item, i) => {
        console.log(`  Follow-up ${i + 1}: ${item.question}`);
        console.log(`  Answer: ${item.answer}`);
      });
    }
  }

  // Now test asking for proof points - should NOT repeat already-asked questions
  console.log('\n📋 NEW QUESTION: One proof point (metric/logo):');
  console.log('USER ANSWER: "Used by several tech companies"');
  console.log('\n🔍 Generating follow-ups (should avoid repeating previous questions)...');

  try {
    const followUps = await enricher.generateFollowUpQuestions(
      'One proof point (metric/logo):',
      'Used by several tech companies',
      'sales',
      conversationHistory
    );

    console.log(`\n📝 Generated ${followUps.length} follow-up question(s):`);
    followUps.forEach((q, i) => {
      console.log(`   ${i + 1}. ${q}`);
    });

    // Check if any questions are repetitive
    const questionsText = followUps.join(' ').toLowerCase();
    const previousQuestions = [];
    for (const data of Object.values(conversationHistory)) {
      if (data.enrichment && data.enrichment.enriched) {
        data.enrichment.enriched.forEach(item => {
          previousQuestions.push(item.question.toLowerCase());
        });
      }
    }

    console.log('\n🔍 ANALYSIS:');
    console.log('Previous questions asked:');
    previousQuestions.forEach((q, i) => {
      console.log(`   ${i + 1}. ${q}`);
    });

    let hasRepetition = false;
    for (const followUp of followUps) {
      for (const prevQ of previousQuestions) {
        if (followUp.toLowerCase().includes('problem') && prevQ.includes('problem')) {
          hasRepetition = true;
          console.log(`⚠️  REPETITION DETECTED: "${followUp}" similar to "${prevQ}"`);
        }
        if (followUp.toLowerCase().includes('different') && prevQ.includes('different')) {
          hasRepetition = true;
          console.log(`⚠️  REPETITION DETECTED: "${followUp}" similar to "${prevQ}"`);
        }
        if (followUp.toLowerCase().includes('save') && prevQ.includes('save')) {
          hasRepetition = true;
          console.log(`⚠️  REPETITION DETECTED: "${followUp}" similar to "${prevQ}"`);
        }
        if (followUp.toLowerCase().includes('size') && prevQ.includes('size')) {
          hasRepetition = true;
          console.log(`⚠️  REPETITION DETECTED: "${followUp}" similar to "${prevQ}"`);
        }
      }
    }

    if (!hasRepetition && followUps.length > 0) {
      console.log('✅ EXCELLENT - New questions avoid all previous topics');
    } else if (followUps.length === 0) {
      console.log('💡 NO QUESTIONS - System determined enough context already exists');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n🎯 EXPECTED BEHAVIOR:');
  console.log('   • Should NOT ask about problems (already asked)');
  console.log('   • Should NOT ask about differentiators (already asked)');
  console.log('   • Should NOT ask about savings (already asked)');
  console.log('   • Should NOT ask about company size (already asked)');
  console.log('   • SHOULD ask for specific company names or metrics for proof');
  
  console.log('\n✨ Full history awareness test completed!');
}

// Test with progressive conversation
async function testProgressiveConversation() {
  console.log('\n🧪 Testing Progressive Conversation (Questions Get More Specific)');
  console.log('=' .repeat(60));
  
  const enricher = new LLMEnricher();
  
  if (!enricher.isConfigured()) {
    console.log('⚠️  No OpenAI API key - skipping progressive test');
    return;
  }

  // Start with empty context
  let context = {};
  
  // Step 1: First question
  console.log('\n📋 STEP 1: First question with no context');
  let followUps = await enricher.generateFollowUpQuestions(
    'Product (1 sentence):',
    'CRM software',
    'sales',
    context
  );
  
  console.log(`Generated ${followUps.length} questions:`, followUps);
  
  // Step 2: Simulate answering and adding to context
  context.product = {
    value: 'CRM software',
    enrichment: {
      enriched: followUps.slice(0, 2).map(q => ({
        question: q,
        answer: 'Mock answer to ' + q
      }))
    }
  };
  
  // Step 3: Ask same type of question again - should be different
  console.log('\n📋 STEP 2: Same question type with existing context');
  followUps = await enricher.generateFollowUpQuestions(
    'Target roles & company types:',
    'Sales managers',
    'sales',
    context
  );
  
  console.log(`Generated ${followUps.length} questions:`, followUps);
  console.log('✅ Questions should be different and build on existing knowledge');
}

// Run all tests
async function runHistoryTests() {
  await testFullHistoryAwareness();
  await testProgressiveConversation();
}

runHistoryTests(); 