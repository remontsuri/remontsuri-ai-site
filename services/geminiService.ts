import { AnalysisResult } from "../types";

const API_URL = '/api/analyze';
const MODEL_NAME = 'deepseek-v3.1:671b-cloud';

const MAX_RETRIES = 2;

export const analyzeTranscript = async (text: string, signal?: AbortSignal): Promise<AnalysisResult> => {
  const prompt = `Ты психолог. Проанализируй текст и верни JSON.

Обязательные: summary, language, riskLevel (Low/Medium/High).

Дополнительные: defenseMechanisms, attachmentProfile, emotionalTriggers, themes, emotionTrend, sentimentTrend, therapyRecommendations, keyQuotes, academicNotes.

Пример: {"summary":"текст","language":"Russian","riskLevel":"Low","defenseMechanisms":[],"attachmentProfile":{"style":"Secure","confidence":75,"indicators":[]},"emotionalTriggers":[],"themes":[],"emotionTrend":[],"sentimentTrend":[],"therapyRecommendations":[],"keyQuotes":[],"academicNotes":""}

Текст: ${text}

JSON:`;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          options: { temperature: 0.2, num_predict: 512 }
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.message?.content;

      if (!content) {
        throw new Error("No response from AI");
      }

      let jsonText = content.trim();
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/```$/, '').trim();

      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonText = jsonMatch[0];

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
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  throw lastError || new Error("Failed to analyze transcript");
};
