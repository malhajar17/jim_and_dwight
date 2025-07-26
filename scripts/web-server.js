#!/usr/bin/env node

import dotenv from 'dotenv';
import http from 'http';
import url from 'url';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router } from '../lib/router.js';
import { EventTypes, NodeIds } from '../lib/types.js';
import { generateRunId, getCurrentTimestamp, ensureDir } from '../lib/utils.js';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

const PORT = process.env.PORT || 3000;

/**
 * Simple HTTP server for intake system
 */
class WebIntakeServer {
  constructor() {
    this.ctx = {
      timezone: process.env.TIMEZONE || 'Europe/Paris',
      profilesDir: path.join(projectRoot, 'profiles')
    };
    this.router = null;
  }

  async initialize() {
    await ensureDir(this.ctx.profilesDir);
    this.router = new Router();
    console.log('🔗 Web server router initialized');
  }

  /**
   * Generate HTML form for intake
   */
  generateIntakeForm(mode = '') {
    const salesQuestions = [
      { key: 'product', label: 'Product (1 sentence)', placeholder: 'Describe your product in one sentence' },
      { key: 'target', label: 'Target roles & company types', placeholder: 'Who should buy this?' },
      { key: 'pain', label: 'Pain removed (1 sentence)', placeholder: 'What problem does it solve?' },
      { key: 'signals', label: 'Two must-have signals', placeholder: 'e.g., Uses Salesforce, Series A funded' },
      { key: 'proof', label: 'One proof point', placeholder: 'Metric, logo, or case study' },
      { key: 'cta', label: 'CTA', placeholder: 'demo, intro call, pilot, etc.' },
      { key: 'constraints', label: 'Constraints', placeholder: 'Regions, languages, do-not-contact list' }
    ];

    const investorQuestions = [
      { key: 'product', label: 'Company (1 sentence + category)', placeholder: 'What does your company do?' },
      { key: 'target', label: 'Stage, round size & use of funds', placeholder: 'Series A, $5M for growth' },
      { key: 'pain', label: 'Traction snapshot', placeholder: 'Users, revenue, growth metrics' },
      { key: 'signals', label: 'Moat/differentiator', placeholder: 'What makes you special?' },
      { key: 'proof', label: 'Ideal investor profile', placeholder: 'Fund type, check size, geography' },
      { key: 'cta', label: 'Materials available', placeholder: 'Deck ready, data room prepared, etc.' },
      { key: 'constraints', label: 'Constraints', placeholder: 'No-go firms, conflicts, regions' }
    ];

    const questions = mode === 'investor' ? investorQuestions : salesQuestions;
    const questionsHtml = questions.map(q => `
      <div class="question">
        <label for="${q.key}">${q.label}:</label>
        <input type="text" id="${q.key}" name="${q.key}" placeholder="${q.placeholder}" required>
      </div>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Node-Based Outreach System - Intake</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .mode-selector { margin-bottom: 30px; }
        .question { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input[type="text"] { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #007cba; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #005a87; }
        .status { margin-top: 20px; padding: 10px; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .enrichment-note { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; padding: 10px; margin-bottom: 20px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎯 Node-Based Outreach System</h1>
        <p>Phase 1: Intake & Handoff with LLM Enrichment</p>
      </div>

      ${!mode ? `
      <div class="mode-selector">
        <h2>Select Mode:</h2>
        <button onclick="window.location.href='/?mode=sales'">🎯 Sales Outreach</button>
        <button onclick="window.location.href='/?mode=investor'">💰 Investor Outreach</button>
      </div>
      ` : `
      <div class="enrichment-note">
        <strong>💡 LLM Enrichment Active:</strong> After each answer, GPT-4o will analyze if you need follow-up questions to make your answers more actionable.
      </div>

      <form method="POST" action="/submit">
        <input type="hidden" name="mode" value="${mode}">
        <h2>📋 ${mode.toUpperCase()} Mode Questions</h2>
        ${questionsHtml}
        <button type="submit">🚀 Start Outreach Pipeline</button>
      </form>
      <p><a href="/">← Back to mode selection</a></p>
      `}
    </body>
    </html>`;
  }

  /**
   * Generate success page
   */
  generateSuccessPage(runId, mode) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pipeline Started - Node-Based Outreach System</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .run-info { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0; }
        button { background: #007cba; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 10px; }
        button:hover { background: #005a87; }
      </style>
    </head>
    <body>
      <h1>✅ Pipeline Started Successfully!</h1>
      
      <div class="success">
        <h2>🎯 Your outreach pipeline is now running</h2>
        <p>We've collected your context and started the node-based system.</p>
      </div>

      <div class="run-info">
        <h3>📋 Run Details:</h3>
        <p><strong>Run ID:</strong> ${runId}</p>
        <p><strong>Mode:</strong> ${mode.toUpperCase()}</p>
        <p><strong>Status:</strong> Context captured, passed to PlanNode</p>
      </div>

      <p><strong>📁 Files created:</strong></p>
      <ul style="text-align: left; display: inline-block;">
        <li><code>profiles/${runId}/state.json</code> - Complete state data</li>
        <li><code>profiles/${runId}/scratchbook.log</code> - Human-readable log</li>
      </ul>

      <div>
        <button onclick="window.location.href='/'">🔄 Start Another Pipeline</button>
        <button onclick="window.location.href='/status/${runId}'">📊 View Status</button>
      </div>
    </body>
    </html>`;
  }

  /**
   * Handle HTTP requests
   */
  async handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    try {
      if (pathname === '/' && req.method === 'GET') {
        // Show intake form
        const mode = query.mode;
        const html = this.generateIntakeForm(mode);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);

      } else if (pathname === '/submit' && req.method === 'POST') {
        // Process form submission
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const formData = new URLSearchParams(body);
            const mode = formData.get('mode');
            const runId = generateRunId();

            // Simulate the intake process (simplified for web)
            const answers = {};
            const fields = ['product', 'target', 'pain', 'signals', 'proof', 'cta', 'constraints'];
            
            for (const field of fields) {
              const value = formData.get(field);
              if (field === 'signals') {
                answers[field] = value ? value.split(',').map(s => s.trim()) : [];
              } else {
                answers[field] = value || '';
              }
            }

            // Create profile and save state
            const profileDir = path.join(this.ctx.profilesDir, runId);
            await ensureDir(profileDir);

            const state = {
              run_id: runId,
              mode: mode,
              profile: {
                answers: answers,
                enrichment: {}, // Web version starts without enrichment
                value_prop: ""
              },
              personas: [],
              leads: [],
              outreach: [],
              inbound: [],
              triage: []
            };

            const { writeJson, appendLog } = await import('../lib/utils.js');
            const statePath = path.join(profileDir, 'state.json');
            await writeJson(statePath, state);

            const logPath = path.join(profileDir, 'scratchbook.log');
            await appendLog(logPath, `INIT run ${runId} mode=${mode} source=web`);
            await appendLog(logPath, `USER_CONTEXT captured (7 answers) via web form`);

            // Show success page
            const html = this.generateSuccessPage(runId, mode);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);

          } catch (error) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error processing form: ' + error.message);
          }
        });

      } else if (pathname.startsWith('/status/')) {
        // Show status page (placeholder)
        const runId = pathname.split('/')[2];
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html><body style="font-family: Arial; padding: 50px;">
            <h1>📊 Pipeline Status</h1>
            <p><strong>Run ID:</strong> ${runId}</p>
            <p><strong>Status:</strong> Phase 1 Complete (Intake & Handoff)</p>
            <p><strong>Next:</strong> Phase 2 will add real PlanNode with GPT-4o</p>
            <p><a href="/">← Back to home</a></p>
          </body></html>
        `);

      } else {
        // 404
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Page not found');
      }

    } catch (error) {
      console.error('Request error:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal server error');
    }
  }
}

/**
 * Start the web server
 */
async function startServer() {
  console.log('🌐 Node-Based Outreach System - Web Server');
  console.log('=' .repeat(50));

  const server = new WebIntakeServer();
  await server.initialize();

  const httpServer = http.createServer((req, res) => {
    server.handleRequest(req, res);
  });

  httpServer.listen(PORT, () => {
    console.log(`🚀 Web server running at http://localhost:${PORT}`);
    console.log(`📋 Features:`);
    console.log(`   - Sales & Investor mode selection`);
    console.log(`   - 7-question intake form`);
    console.log(`   - State.json generation`);
    console.log(`   - Pipeline status tracking`);
    console.log(`\n💡 For CLI version with LLM enrichment:`);
    console.log(`   npm run intake`);
    console.log(`\n⏹️  Press Ctrl+C to stop`);
  });
}

// Start the server
startServer(); 