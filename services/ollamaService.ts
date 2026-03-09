import { AnalysisResult } from "../types";

// Use Vite proxy (/api/ -> localhost:11434) for dev mode
const API_BASE = '';

// Logging utility
const log = (stage: string, data?: unknown) => {
  console.log(`[OllamaService] ${stage}`, data ? data : '');
};

export const analyzeTranscript = async (text: string, signal?: AbortSignal): Promise<AnalysisResult> => {
  const model = 'qwen2.5-coder:14b';

  log('Starting analysis with model:', model);

  // Validate and sanitize input
  if (!text || typeof text !== 'string') {
    throw new Error("Некорректный текст для анализа");
  }

  // Check for empty or whitespace-only text
  if (text.trim().length === 0) {
    throw new Error("Некорректный текст для анализа");
  }

  // Limit text length to prevent abuse
  const maxLength = 50000;
  if (text.length > maxLength) {
    throw new Error(`Текст слишком длинный. Максимум ${maxLength} символов.`);
  }

  // Basic sanitization to remove control characters
  const sanitizedText = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

  const prompt = `You are a psychologist. Analyze this text and return ONLY valid JSON with these fields:
- summary: brief summary in Russian
- language: detected language
- riskLevel: "Low", "Medium", or "High"
- defenseMechanisms: array of objects with name, description, frequency, exampleQuote
- attachmentProfile: object with style, confidence, indicators
- emotionalTriggers: array of objects with trigger, response, intensity
- themes: array of objects with title, description, relevanceScore

Text to analyze: ${sanitizedText}

Respond ONLY with valid JSON, no explanations.`;

  try {
    log('Sending request to Ollama API...');
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        options: { temperature: 0.2, num_predict: 2048 }
      }),
      signal,
    });

    log('Response status:', response.status);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Модель "${model}" не найдена. Установите: ollama pull ${model}`);
      }
      throw new Error(`Ollama: ${response.status}`);
    }

    const data = await response.json();
    const content = data.message?.content;
    log('Received response from model, content length:', content?.length);

    if (!content) throw new Error("Пустой ответ от модели");

    // Extract JSON
    let json = content.trim()
      .replace(/^```json\n?/, '')
      .replace(/^```\n?/, '')
      .replace(/```$/, '');

    const match = json.match(/\{[\s\S]*\}/);
    if (match) json = match[0];

    // Validate JSON structure before parsing
    if (!json.startsWith('{') || !json.endsWith('}')) {
      throw new Error("Неверный формат ответа от модели");
    }

    const result = JSON.parse(json) as AnalysisResult;

    log('Parsed JSON result:', result);

    if (!result.summary || !result.riskLevel) {
      throw new Error("Неполный ответ от модели");
    }

    // Validate and sanitize the response data
    const validatedSummary = typeof result.summary === 'string' ? result.summary.substring(0, 1000) : 'Unknown';
    const validatedLanguage = typeof result.language === 'string' ? result.language.substring(0, 50) : 'Unknown';
    const validatedRiskLevel = ['Low', 'Medium', 'High'].includes(result.riskLevel) ? result.riskLevel : 'Low';

    const resultWithDefaults: AnalysisResult = {
      summary: validatedSummary,
      language: validatedLanguage,
      riskLevel: validatedRiskLevel,
      defenseMechanisms: Array.isArray(result.defenseMechanisms) ? result.defenseMechanisms.slice(0, 20).map(mech => ({
        name: typeof mech.name === 'string' ? mech.name.substring(0, 100) : 'Unknown',
        description: typeof mech.description === 'string' ? mech.description.substring(0, 500) : '',
        frequency: ['High', 'Medium', 'Low'].includes(mech.frequency) ? mech.frequency : 'Low',
        exampleQuote: typeof mech.exampleQuote === 'string' ? mech.exampleQuote.substring(0, 200) : ''
      })) : [],
      attachmentProfile: result.attachmentProfile && typeof result.attachmentProfile === 'object' ? {
        style: typeof result.attachmentProfile.style === 'string' ? result.attachmentProfile.style.substring(0, 100) : 'Unknown',
        confidence: typeof result.attachmentProfile.confidence === 'number' ? Math.min(Math.max(result.attachmentProfile.confidence, 0), 100) : 0,
        indicators: Array.isArray(result.attachmentProfile.indicators) ? result.attachmentProfile.indicators.slice(0, 10).map(ind => 
          typeof ind === 'string' ? ind.substring(0, 200) : '') : []
      } : { style: 'Unknown', confidence: 0, indicators: [] },
      emotionalTriggers: Array.isArray(result.emotionalTriggers) ? result.emotionalTriggers.slice(0, 10).map(trigger => ({
        trigger: typeof trigger.trigger === 'string' ? trigger.trigger.substring(0, 100) : '',
        response: typeof trigger.response === 'string' ? trigger.response.substring(0, 300) : '',
        intensity: typeof trigger.intensity === 'number' ? Math.min(Math.max(trigger.intensity, 1), 10) : 1
      })) : [],
      themes: Array.isArray(result.themes) ? result.themes.slice(0, 10).map(theme => ({
        title: typeof theme.title === 'string' ? theme.title.substring(0, 100) : '',
        description: typeof theme.description === 'string' ? theme.description.substring(0, 300) : '',
        relevanceScore: typeof theme.relevanceScore === 'number' ? Math.min(Math.max(theme.relevanceScore, 0), 100) : 0
      })) : [],
      emotionTrend: Array.isArray(result.emotionTrend) ? result.emotionTrend.slice(0, 50).map(trend => ({
        segment: typeof trend.segment === 'number' ? Math.max(trend.segment, 0) : 0,
        happiness: typeof trend.happiness === 'number' ? Math.min(Math.max(trend.happiness, 0), 10) : 0,
        sadness: typeof trend.sadness === 'number' ? Math.min(Math.max(trend.sadness, 0), 10) : 0,
        anger: typeof trend.anger === 'number' ? Math.min(Math.max(trend.anger, 0), 10) : 0,
        anxiety: typeof trend.anxiety === 'number' ? Math.min(Math.max(trend.anxiety, 0), 10) : 0
      })) : [],
      sentimentTrend: Array.isArray(result.sentimentTrend) ? result.sentimentTrend.slice(0, 50).map(trend => ({
        segment: typeof trend.segment === 'number' ? Math.max(trend.segment, 0) : 0,
        score: typeof trend.score === 'number' ? Math.min(Math.max(trend.score, -1), 1) : 0,
        label: typeof trend.label === 'string' ? trend.label.substring(0, 50) : ''
      })) : [],
      therapyRecommendations: Array.isArray(result.therapyRecommendations) ? result.therapyRecommendations.slice(0, 10).map(rec => 
        typeof rec === 'string' ? rec.substring(0, 500) : '') : [],
      keyQuotes: Array.isArray(result.keyQuotes) ? result.keyQuotes.slice(0, 20).map(quote => ({
        text: typeof quote.text === 'string' ? quote.text.substring(0, 300) : '',
        category: typeof quote.category === 'string' ? quote.category.substring(0, 50) : '',
        analysis: typeof quote.analysis === 'string' ? quote.analysis.substring(0, 300) : ''
      })) : [],
      academicNotes: typeof result.academicNotes === 'string' ? result.academicNotes.substring(0, 2000) : '',
    };

    log('Analysis completed successfully!');
    return resultWithDefaults;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    console.error('Ollama Error:', error);
    if (error instanceof SyntaxError) {
      throw new Error("Неверный формат ответа от модели");
    }
    throw error;
  }
};
