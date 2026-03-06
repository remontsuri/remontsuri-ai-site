import { AnalysisResult } from "../types";

const API_URL = '/api/analyze';
const MODEL_NAME = 'deepseek-v3.1:671b-cloud';

const MAX_RETRIES = 5;

export const analyzeTranscript = async (text: string, signal?: AbortSignal): Promise<AnalysisResult> => {
  const prompt = `Ты психолог. Проанализируй текст и верни ТОЛЬКО JSON.

Обязательные поля: summary (строка), language (строка), riskLevel (одно из: Low, Medium, High).

Дополнительные поля (могут быть пустыми массивами):
- defenseMechanisms: массив объектов с полями name, description, frequency, exampleQuote
- attachmentProfile: объект с полями style, confidence, indicators
- emotionalTriggers: массив объектов с полями trigger, response, intensity
- themes: массив объектов с полями title, description, relevanceScore
- emotionTrend: массив объектов с полями segment, happiness, sadness, anger, anxiety
- sentimentTrend: массив объектов с полями segment, score, label
- therapyRecommendations: массив строк
- keyQuotes: массив объектов с полями text, category, analysis
- academicNotes: строка

Пример ответа:
{"summary":"Описание","language":"Russian","riskLevel":"Low","defenseMechanisms":[],"attachmentProfile":{"style":"Secure","confidence":75,"indicators":[]},"emotionalTriggers":[],"themes":[],"emotionTrend":[],"sentimentTrend":[],"therapyRecommendations":[],"keyQuotes":[],"academicNotes":""}

Текст для анализа:
${text}

Верни ТОЛЬКО JSON, без пояснений.`;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          format: 'json',
          options: {
            temperature: 0.1,
            top_p: 0.9,
          }
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.message?.content;

      if (!content) {
        throw new Error("No response from AI");
      }

      let jsonText = content.trim();
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/```$/, '').trim();

      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const result = JSON.parse(jsonText) as AnalysisResult;

      if (!result.summary || !result.riskLevel) {
        throw new Error("Missing required fields");
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
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt} failed:`, lastError.message);

      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }

      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
      }
    }
  }

  throw lastError || new Error("Failed to analyze transcript");
};
