import { AnalysisResult } from "../types";

// Always use /api (works both locally via Vite proxy and on Express server)
const API_URL = '';
const MODEL = 'qwen2.5-14b-instruct';

export const analyzeTranscript = async (text: string, signal?: AbortSignal): Promise<AnalysisResult> => {
  const prompt = `Ты психолог. Верни JSON.

Обязательные: summary, language, riskLevel (Low/Medium/High).

Опциональные: defenseMechanisms, attachmentProfile, emotionalTriggers, themes, emotionTrend, sentimentTrend, therapyRecommendations, keyQuotes, academicNotes.

JSON: ${text}

Ответь ТОЛЬКО JSON.`;

  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        options: { temperature: 0.2, num_predict: 2048 }
      }),
      signal,
    });

    if (!response.ok) throw new Error(`Ollama: ${response.status}`);

    const data = await response.json();
    const content = data.message?.content;
    if (!content) throw new Error("Нет ответа");

    // Extract JSON
    let json = content.trim()
      .replace(/^```json\n?/, '')
      .replace(/^```\n?/, '')
      .replace(/```$/, '');

    const match = json.match(/\{[\s\S]*\}/);
    if (match) json = match[0];

    const result = JSON.parse(json) as AnalysisResult;

    if (!result.summary || !result.riskLevel) {
      throw new Error("Неполный ответ");
    }

    return {
      summary: result.summary,
      language: result.language || 'Unknown',
      riskLevel: result.riskLevel,
      defenseMechanisms: result.defenseMechanisms || [],
      attachmentProfile: result.attachmentProfile || { style: 'Unknown', confidence: 0, indicators: [] },
      emotionalTriggers: result.emotionalTriggers || [],
      themes: result.themes || [],
      emotionTrend: result.emotionTrend || [],
      sentimentTrend: result.sentimentTrend || [],
      therapyRecommendations: result.therapyRecommendations || [],
      keyQuotes: result.keyQuotes || [],
      academicNotes: result.academicNotes || '',
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    console.error('Error:', error);
    throw error;
  }
};
