import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// API proxy to Ollama Cloud
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const body = req.body;

    const response = await fetch('https://ollama.com/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: body.model || 'qwen2.5-coder:14b',
        messages: body.messages,
        stream: false,
        options: { temperature: 0.2, num_predict: 2048 }
      }),
    });

    if (!response.ok) {
      res.status(response.status).json({ error: `Ollama: ${response.status}` });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Serve static files from Vite build
app.use(express.static(join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
