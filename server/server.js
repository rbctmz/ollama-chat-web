const express = require('express');
const { exec } = require('child_process');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
app.use(express.json());

// Configuration
const CONFIG = {
  model: 'qwen2.5-coder:3b',
  timeout: 180000,  // 3 minutes
  maxOutputLength: 2000,
  ollamaApi: 'http://127.0.0.1:11434'
};

// Function to detect and format code blocks in the response
function formatResponse(text) {
  // Check if the response looks like code
  const codeIndicators = [
    'function', 'const', 'let', 'var', 'class', 
    'if', 'for', 'while', 'return', 'import',
    '{', '};', ');', 'public', 'private', 
    '```', '<!DOCTYPE', '<html>', '<?php'
  ];
  
  const lines = text.split('\n');
  const trimmedFirstLine = lines[0].trim();
  
  // Check if response starts with code indicators
  const isLikelyCode = codeIndicators.some(indicator => 
    trimmedFirstLine.startsWith(indicator) || 
    trimmedFirstLine.includes(indicator)
  );

  // If it looks like code and isn't already wrapped in markdown code blocks
  if (isLikelyCode && !text.startsWith('```')) {
    // Try to detect the language
    let language = 'plaintext';
    if (text.includes('function') || text.includes('const') || text.includes('let')) {
      language = 'javascript';
    } else if (text.includes('<?php')) {
      language = 'php';
    } else if (text.includes('<html>') || text.includes('<!DOCTYPE')) {
      language = 'html';
    } else if (text.includes('public class') || text.includes('private class')) {
      language = 'java';
    }
    
    return '```' + language + '\n' + text + '\n```';
  }
  
  return text;
}

// Check if Ollama is running and get model list
async function checkOllama() {
  try {
    const response = await fetch(`${CONFIG.ollamaApi}/api/tags`);
    if (!response.ok) {
      throw new Error('Failed to connect to Ollama API');
    }
    
    const data = await response.json();
    const models = data.models || [];
    const modelExists = models.some(m => m.name === CONFIG.model);
    
    if (modelExists) {
      console.log('[Startup] Ollama is available and model', CONFIG.model, 'is present');
      return true;
    } else {
      console.error('[Startup] Model', CONFIG.model, 'not found. Available models:', models.map(m => m.name).join(', '));
      throw new Error(`Model ${CONFIG.model} not found. Please install it first with: ollama pull ${CONFIG.model}`);
    }
  } catch (error) {
    console.error('[Startup] Ollama not responding:', error.message);
    throw new Error('Ollama server not running. Please run "ollama serve" first');
  }
}

// Generate response using Ollama API
async function generateResponse(message) {
  console.log('[Ollama] Starting request...');
  const startTime = Date.now();
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, CONFIG.timeout);
  
  try {
    const response = await fetch(`${CONFIG.ollamaApi}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: CONFIG.model,
        prompt: message,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate response');
    }

    const data = await response.json();
    const elapsed = (Date.now() - startTime) / 1000;
    console.log(`[Ollama] Request finished after ${elapsed.toFixed(1)}s`);
    
    // Format the response if it contains code
    return formatResponse(data.response);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Timeout after ${CONFIG.timeout/1000} seconds`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Immediately respond to preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await checkOllama();
    res.json({ status: 'ok', model: CONFIG.model });
  } catch (error) {
    res.status(503).json({ status: 'error', error: error.message });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const message = req.body.message;
  console.log('\n[API] Received message:', message);

  if (!message || typeof message !== 'string') {
    console.log('[API] Error: Invalid message format');
    return res.status(400).json({ error: 'Invalid message' });
  }

  try {
    // Проверяем доступность Ollama перед каждым запросом
    await checkOllama();
    
    console.log('[API] Processing message with model:', CONFIG.model);
    const response = await generateResponse(message);
    
    if (!response || response.length === 0) {
      throw new Error('Empty response from model');
    }
    
    console.log('[API] Success! Response length:', response.length);
    res.json({ response });
  } catch (error) {
    console.error('[API] Error:', error.message);
    let status = 500;
    let errorMessage = error.message;
    
    if (error.message.includes('Timeout')) {
      status = 504;
      errorMessage = 'Request timed out. Please try again.';
    } else if (error.message.includes('Ollama server not running')) {
      status = 503;
      errorMessage = 'Ollama service is unavailable. Please make sure Ollama is running.';
    } else if (error.message.includes('Model not found')) {
      status = 503;
      errorMessage = `Required model is not installed. Please run: ollama pull ${CONFIG.model}`;
    }
    
    res.status(status).json({ error: errorMessage });
  }
});

const PORT = process.env.PORT || 3000;

// Check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Server] Port ${port} is already in use`);
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port);
  });
}

// Start server
async function startServer() {
  try {
    // Check if port is available
    const portAvailable = await isPortAvailable(PORT);
    if (!portAvailable) {
      console.error('[Server] Please make sure no other instance is running');
      process.exit(1);
    }
    
    await checkOllama();
    app.listen(PORT, () => {
      console.log(`\n[Server] API server is running on http://localhost:${PORT}`);
      console.log('[Server] Configuration:');
      console.log('  - Model:', CONFIG.model);
      console.log('  - Timeout:', CONFIG.timeout/1000, 'seconds');
      console.log('  - Max output length:', CONFIG.maxOutputLength, 'characters');
      console.log('  - Ollama API:', CONFIG.ollamaApi);
    });
  } catch (error) {
    console.error('[Server] Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();