export interface TranslateParams {
  text: string;
  sourceLang: string;
  targetLang: string;
  provider?: TranslationProvider;
}

export interface TranslateResponse {
  translatedText: string;
  detectedSourceLang?: string;
  provider: string;
}

export type TranslationProvider = 'mymemory' | 'lingva' | 'googletranslate' | 'deepseek' | 'gemini';

export const TRANSLATION_PROVIDERS = [
  { id: 'googletranslate', name: 'Google Translate', limit: 'Free' },
  { id: 'deepseek', name: 'DeepSeek (LLM)', limit: 'API Key' },
  { id: 'gemini', name: 'Gemini (LLM)', limit: 'API Key' },
  { id: 'mymemory', name: 'MyMemory', limit: 'Free 500/day' },
  { id: 'lingva', name: 'Lingva Translate', limit: 'Free' },
] as const;

async function translateWithMyMemory(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  const params = new URLSearchParams({
    q: text,
    langpair: `${sourceLang}|${targetLang}`,
  });

  const response = await fetch(
    `https://api.mymemory.translated.net/get?${params}`
  );

  if (!response.ok) {
    throw new Error(`MyMemory API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.responseStatus !== 200) {
    throw new Error(data.responseDetails || 'Translation failed');
  }

  return data.responseData.translatedText;
}

async function translateWithLingva(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  const encodedText = encodeURIComponent(text);
  const response = await fetch(
    `https://lingva.ml/api/v1/${sourceLang}/${targetLang}/${encodedText}`
  );

  if (!response.ok) {
    throw new Error(`Lingva API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.translation;
}

async function translateWithGoogleTranslate(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: sourceLang,
    tl: targetLang,
    dt: 't',
    q: text,
  });

  const response = await fetch(
    `https://translate.googleapis.com/translate_a/single?${params}`
  );

  if (!response.ok) {
    throw new Error(`Google Translate API error: ${response.statusText}`);
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Invalid response from Google Translate');
  }

  const segments = (data[0] as unknown[]).flatMap((item) => {
    if (Array.isArray(item) && typeof item[0] === 'string') {
      return item[0];
    }

    return [];
  });

  if (segments.length === 0) {
    throw new Error('Invalid response from Google Translate');
  }

  return segments.join('');
}

async function translateWithDeepSeek(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error('DeepSeek API key not configured');
  }

  const langMap: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German',
    it: 'Italian', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese',
    ko: 'Korean', zh: 'Chinese', ar: 'Arabic', hi: 'Hindi',
  };

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Translate the given text accurately and naturally. Only return the translation, no explanations.'
        },
        {
          role: 'user',
          content: `Translate from ${langMap[sourceLang] || sourceLang} to ${langMap[targetLang] || targetLang}: ${text}`
        }
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function translateWithGemini(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const langMap: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German',
    it: 'Italian', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese',
    ko: 'Korean', zh: 'Chinese', ar: 'Arabic', hi: 'Hindi',
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Translate from ${langMap[sourceLang] || sourceLang} to ${langMap[targetLang] || targetLang}. Only return the translation, no explanations:\n\n${text}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
        }
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text.trim();
}

export async function translateText({
  text,
  sourceLang,
  targetLang,
  provider = 'googletranslate',
}: TranslateParams): Promise<TranslateResponse> {
  try {
    let translatedText: string;

    switch (provider) {
      case 'mymemory':
        translatedText = await translateWithMyMemory(text, sourceLang, targetLang);
        break;
      case 'lingva':
        translatedText = await translateWithLingva(text, sourceLang, targetLang);
        break;
      case 'googletranslate':
        translatedText = await translateWithGoogleTranslate(text, sourceLang, targetLang);
        break;
      case 'deepseek':
        translatedText = await translateWithDeepSeek(text, sourceLang, targetLang);
        break;
      case 'gemini':
        translatedText = await translateWithGemini(text, sourceLang, targetLang);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    return {
      translatedText,
      detectedSourceLang: sourceLang,
      provider,
    };
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to translate text'
    );
  }
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
];
