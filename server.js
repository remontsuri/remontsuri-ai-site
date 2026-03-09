import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Ollama configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder';

app.use(express.json());

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) {
      res.status(503).json({ status: 'error', message: 'Ollama не доступна' });
      return;
    }
    const models = await response.json();
    res.json({ status: 'ok', models: models.models || [] });
  } catch (error) {
    res.status(503).json({ status: 'error', message: 'Ollama не доступна' });
  }
});

// Get available models
app.get('/api/models', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) {
      res.status(503).json({ error: 'Ollama недоступна' });
      return;
    }
    const data = await response.json();
    res.json(data.models || []);
  } catch (error) {
    res.status(503).json({ error: 'Ollama недоступна' });
  }
});

app.post('/api/chat', async (req, res) => {
  console.log('[INFO] Received /api/chat request');
  try {
    const { messages } = req.body;
    
    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }
    
    const userMessage = messages?.[messages.length - 1]?.content || '';
    
    // Validate message length
    if (userMessage.length > 50000) {
      return res.status(400).json({ error: 'Message too long. Maximum 50000 characters allowed.' });
    }
    
    // Sanitize input (basic sanitization)
    const sanitizedMessage = userMessage.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    
    console.log('[INFO] User message:', sanitizedMessage.substring(0, 100) + '...');

    console.log('[INFO] Calling Ollama at:', OLLAMA_URL, 'with model:', MODEL);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: sanitizedMessage }],
        stream: false,
        options: { temperature: 0.2, num_predict: 2048 }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('[INFO] Ollama response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ERROR] Ollama error:', response.status, errorText);
      return res.status(response.status).json({ error: `Ollama: ${response.status} - ${errorText}` });
    }

    const data = await response.json();
    const content = data.message?.content || '';
    console.log('[INFO] Ollama response length:', content.length);

    // Basic validation of AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const json = jsonMatch ? jsonMatch[0] : content;

    // Additional validation to ensure we're not sending malicious content back
    if (typeof json === 'string' && json.length > 100000) {
      return res.status(500).json({ error: 'Response too large from AI model' });
    }

    res.json({
      message: { role: 'assistant', content: json }
    });
  } catch (error) {
    console.error('[ERROR] Exception in /api/chat:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      return res.status(408).json({ error: 'Request timeout' });
    }
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.use(express.static(join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Using Ollama: ${OLLAMA_URL}, Model: ${MODEL}`);
});
