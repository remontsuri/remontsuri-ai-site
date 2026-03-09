/**
 * Vercel Serverless Function: /api/chat
 * Uses Gemini API when GEMINI_API_KEY is set (deployment on Vercel).
 * For local dev with Ollama, use Express server (server.js) instead.
 */
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export const config = { maxDuration: 60 };

export default async function handler(
  req: { method?: string; body?: { messages?: Array<{ content?: string }> } },
  res: { status: (code: number) => { json: (body: object) => void }; json: (body: object) => void }
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const { messages } = req.body || {};
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    const userMessage = messages[messages.length - 1]?.content || '';
    if (userMessage.length > 50000) {
      return res.status(400).json({ error: 'Message too long. Maximum 50000 characters allowed.' });
    }

    const sanitizedMessage = userMessage.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: sanitizedMessage }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[api/chat] Gemini error:', response.status, errorText);
      return res.status(response.status).json({
        error: `Gemini API error: ${response.status}`,
      });
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const content =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const json = jsonMatch ? jsonMatch[0] : content;

    if (json.length > 100000) {
      return res.status(500).json({ error: 'Response too large from AI model' });
    }

    return res.status(200).json({
      message: { role: 'assistant' as const, content: json },
    });
  } catch (e) {
    console.error('[api/chat] Exception:', e);
    return res.status(500).json({
      error: e instanceof Error ? e.message : 'Unknown error',
    });
  }
}
