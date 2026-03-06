const OLLAMA_URL = 'http://localhost:11434';
const MODEL_NAME = 'minimax-m2.5:cloud';

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export const analyzeTranscript = async (text: string, signal?: AbortSignal): Promise<AnalysisResult> => {
  const prompt = `Ты эксперт-психолог и научный ассистент. Твоя задача — проанализировать предоставленную стенограмму интервью, используя психоаналитические и психодинамические подходы.

ВАЖНО: Весь вывод должен быть строго на РУССКОМ ЯЗЫКЕ в формате JSON.

Инструкции:
1. Определи язык стенограммы (вывод на русском).
2. Определи уровень психологического риска (Low, Medium, High).
3. Определи защитные механизмы (по классификации Вайланта).
4. Оцени тип привязанности (Боулби/Эйнсворт).
5. Выяви эмоциональные триггеры и реакции.
6. Выдели ключевые темы и паттерны.
7. Проведи анализ эмоций по 10 сегментам (happiness, sadness, anger, anxiety - шкала 0-10).
8. Дай рекомендации по терапии.
9. Выбери ключевые цитаты.
10. Создай научные заметки в Markdown.

Верни ВАЛИДНЫЙ JSON с такой структурой:
{
  "summary": "краткое резюме",
  "language": "язык",
  "riskLevel": "Low|Medium|High",
  "defenseMechanisms": [{"name": "", "description": "", "frequency": "High|Medium|Low", "exampleQuote": ""}],
  "attachmentProfile": {"style": "", "confidence": 0-100, "indicators": []},
  "emotionalTriggers": [{"trigger": "", "response": "", "intensity": 1-10}],
  "themes": [{"title": "", "description": "", "relevanceScore": 0-100}],
  "emotionTrend": [{"segment": 1-10, "happiness": 0-10, "sadness": 0-10, "anger": 0-10, "anxiety": 0-10}],
  "therapyRecommendations": [""],
  "keyQuotes": [{"text": "", "category": "", "analysis": ""}],
  "academicNotes": "markdown текст"
}

Стенограмма:
${text}`;

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: prompt,
        stream: false,
        format: 'json',
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data: OllamaResponse = await response.json();
    const jsonText = data.response;

    if (!jsonText) {
      throw new Error("No response from AI");
    }

    // Try to parse JSON, handling potential markdown code blocks
    try {
      // Remove markdown code block wrappers if present
      const cleanedJson = jsonText.replace(/^```json\n?/, '').replace(/```$/, '').trim();
      return JSON.parse(cleanedJson) as AnalysisResult;
    } catch (parseError) {
      console.error("Failed to parse JSON:", jsonText);
      throw new Error("Invalid JSON response from AI");
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    console.error("Analysis failed:", error);
    throw error;
  }
};
