const express = require('express');
const { exec } = require('child_process');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
app.use(express.json());

// Configuration
const CONFIG = {
  defaultModel: 'qwen2.5-coder:3b',
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

// Check if model supports chat/generation
async function checkModelCapabilities(modelName) {
  try {
    const response = await fetch(`${CONFIG.ollamaApi}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName })
    });
    
    if (!response.ok) {
      console.warn(`[Models] Failed to check capabilities for ${modelName}`);
      return false;
    }
    
    const data = await response.json();
    // Считаем модель подходящей, если она не является эмбеддинг-моделью
    return !modelName.includes('embed');
  } catch (error) {
    console.warn(`[Models] Error checking capabilities for ${modelName}:`, error.message);
    return false;
  }
}

// Get list of available models
async function getAvailableModels() {
  try {
    const response = await fetch(`${CONFIG.ollamaApi}/api/tags`);
    if (!response.ok) {
      throw new Error('Failed to connect to Ollama API');
    }
    const data = await response.json();
    const models = data.models || [];
    
    // Filter models that support generation
    const supportedModels = await Promise.all(
      models.map(async (model) => {
        const supportsGeneration = await checkModelCapabilities(model.name);
        return supportsGeneration ? model : null;
      })
    );
    
    return supportedModels.filter(model => model !== null);
  } catch (error) {
    console.error('[Models] Failed to get models:', error.message);
    throw error;
  }
}

// Check if Ollama is running and get model list
async function checkOllama() {
  try {
    const models = await getAvailableModels();
    if (models.length === 0) {
      throw new Error('No models available for chat/generation');
    }

    const modelExists = models.some(m => m.name === CONFIG.defaultModel);
    if (modelExists) {
      console.log('[Startup] Ollama is available and model', CONFIG.defaultModel, 'is present');
      return true;
    } else {
      // Use the first available model instead
      const firstModel = models[0].name;
      console.log(`[Startup] Model ${CONFIG.defaultModel} not found. Using ${firstModel} instead`);
      CONFIG.defaultModel = firstModel;
      return true;
    }
  } catch (error) {
    console.error('[Startup] Ollama not responding:', error.message);
    throw new Error('Ollama server not running. Please run "ollama serve" first');
  }
}

// Generate response using Ollama API
async function generateResponse(message, model = CONFIG.defaultModel, res = null) {
  console.log(`[Ollama] Starting request with model ${model}...`);
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
        model: model,
        prompt: message,
        stream: true,
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

    // Для потокового режима
    if (res) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      let fullResponse = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.trim() === '') continue;
            try {
              const data = JSON.parse(line);
              fullResponse += data.response;
              res.write(`data: ${JSON.stringify({ response: data.response })}\n\n`);
            } catch (e) {
              console.warn('[Stream] Failed to parse line:', line);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      res.write('data: [DONE]\n\n');
      res.end();

      const elapsed = (Date.now() - startTime) / 1000;
      console.log(`[Ollama] Streaming request finished after ${elapsed.toFixed(1)}s`);
      return fullResponse;
    }
    
    // Для обычного режима (обратная совместимость)
    const data = await response.json();
    const elapsed = (Date.now() - startTime) / 1000;
    console.log(`[Ollama] Request finished after ${elapsed.toFixed(1)}s`);
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
    res.json({ status: 'ok', model: CONFIG.defaultModel });
  } catch (error) {
    res.status(503).json({ status: 'error', error: error.message });
  }
});

// Models endpoint
app.get('/api/models', async (req, res) => {
  try {
    const models = await getAvailableModels();
    res.json({ models });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { message, model } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Устанавливаем заголовки для SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const response = await fetch(`${CONFIG.ollamaApi}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || CONFIG.defaultModel,
        prompt: message,
        stream: true,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate response');
    }

    // Создаем поток для чтения ответа
    for await (const chunk of response.body) {
      const lines = chunk.toString().split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const data = JSON.parse(line);
          if (data.response) {
            res.write(`data: ${JSON.stringify({ response: data.response })}\n\n`);
          }
        } catch (e) {
          console.warn('[Stream] Failed to parse line:', e);
        }
      }
    }

    // Отправляем завершающее событие
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('[Server] Error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
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
      console.log('  - Model:', CONFIG.defaultModel);
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