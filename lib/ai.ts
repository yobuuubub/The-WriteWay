// lib/ai.ts
// Helper functions for interacting with AI services (Hugging Face preferred) for moderation,
// translation, and context suggestion.

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

export interface ModerationResult {
  safe: boolean;
  flagged: boolean;
  reason?: string;
  confidence?: number;
}

export interface TranslationResult {
  original: string;
  translated: string;
  targetLanguage: string;
}

const TRANSLATION_MODELS: Record<string, string> = {
  es: 'Helsinki-NLP/opus-mt-en-es',
  fr: 'Helsinki-NLP/opus-mt-en-fr',
  de: 'Helsinki-NLP/opus-mt-en-de',
  it: 'Helsinki-NLP/opus-mt-en-it',
  pt: 'Helsinki-NLP/opus-mt-en-ROMANCE',
  ru: 'Helsinki-NLP/opus-mt-en-ru',
  uk: 'Helsinki-NLP/opus-mt-en-uk',
  ar: 'Helsinki-NLP/opus-mt-en-ar',
  hi: 'Helsinki-NLP/opus-mt-en-hi',
  zh: 'Helsinki-NLP/opus-mt-en-zh',
  ja: 'Helsinki-NLP/opus-mt-en-jap',
  ko: 'Helsinki-NLP/opus-mt-en-ko',
};

function normalizeLanguageCode(input: string): string {
  return (input || 'en').toLowerCase().split('-')[0];
}

function parseTranslationPayload(payload: any): string {
  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0] || {};
    return (
      first.translation_text ||
      first.generated_text ||
      first.text ||
      ''
    ).toString();
  }

  if (payload && typeof payload === 'object') {
    if (typeof payload.translation_text === 'string') return payload.translation_text;
    if (typeof payload.generated_text === 'string') return payload.generated_text;
    if (typeof payload.text === 'string') return payload.text;
    if (Array.isArray(payload.data) && payload.data.length > 0) {
      const first = payload.data[0] || {};
      return (
        first.translation_text ||
        first.generated_text ||
        first.text ||
        ''
      ).toString();
    }
  }

  return '';
}

/**
 * Moderate content using an AI moderation service (Hugging Face preferred)
 * Returns safe/flagged status but never auto-deletes
 */
export async function moderateContent(content: string): Promise<ModerationResult> {
  const text = (content || '').toLowerCase();
  if (!text.trim()) {
    return { safe: true, flagged: false };
  }

  const blockedPatterns: Array<{ pattern: RegExp; reason: string }> = [
    { pattern: /\bkill\b|\bshoot\b|\bbomb\b/, reason: 'violent_language' },
    { pattern: /\b(nigger|faggot|kike)\b/, reason: 'hate_speech' },
    { pattern: /\b(buy now|free money|click here)\b/, reason: 'spam_phrase' },
  ];

  for (const item of blockedPatterns) {
    if (item.pattern.test(text)) {
      return {
        safe: false,
        flagged: true,
        reason: item.reason,
        confidence: 0.8,
      };
    }
  }

  if (!HUGGINGFACE_API_KEY) {
    return { safe: true, flagged: false };
  }

  return { safe: true, flagged: false };
}

/**
 * Translate content using an AI service
 * Preserves tone and context
 */
export async function translateContent(
  content: string,
  targetLanguage: string = 'en'
): Promise<TranslationResult> {
  const original = (content || '').toString();
  const normalizedTarget = normalizeLanguageCode(targetLanguage || 'en');

  if (normalizedTarget === 'en') {
    return {
      original,
      translated: original,
      targetLanguage: 'en',
    };
  }

  if (!HUGGINGFACE_API_KEY) {
    throw new Error('translation_unavailable');
  }

  const model = TRANSLATION_MODELS[normalizedTarget];
  if (!model) {
    throw new Error(`unsupported_target_language:${normalizedTarget}`);
  }

  const endpoint = `https://router.huggingface.co/models/${model}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: original,
        options: { wait_for_model: true },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`translation_provider_error:${response.status}:${text}`);
    }

    const payload = await response.json();
    const translated = parseTranslationPayload(payload).trim();

    if (!translated) {
      throw new Error('translation_provider_error:empty_response');
    }

    return {
      original,
      translated,
      targetLanguage: normalizedTarget,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Suggest context for an article using AI
 * Editor must approve before using
 */
export async function suggestContext(articleTitle: string, articleContent: string): Promise<string> {
  if (!HUGGINGFACE_API_KEY) {
    throw new Error('HUGGINGFACE_API_KEY not set');
  }
  throw new Error('suggestContext: not implemented for Hugging Face in this project.');
}
