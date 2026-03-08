import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model } = req.body;
    const userMessage = messages?.[messages.length - 1]?.content || '';

    // Use HuggingFace Inference API (free, no auth for this model)
    const response = await fetch(
      'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-14B-Instruct',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: `<|im_start|>system
Ты психолог. Верни JSON с полями: summary, language, riskLevel (Low/Medium/High), defenseMechanisms, attachmentProfile, emotionalTriggers, themes.
Отвечай ТОЛЬКО JSON.<|im_end|>
<|im_start|>user
${userMessage}<|im_end|>
<|im_start|>`,
          parameters: {
            max_new_tokens: 1024,
            temperature: 0.2,
            return_full_text: false
          }
        }),
      }
    );

    if (!response.ok) {
      res.status(response.status).json({ error: `HF: ${response.status}` });
      return;
    }

    const data = await response.json();
    const content = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;

    // Try to extract JSON
    const jsonMatch = content?.match(/\{[\s\S]*\}/);
    const json = jsonMatch ? jsonMatch[0] : content;

    res.json({
      message: { role: 'assistant', content: json }
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.use(express.static(join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
