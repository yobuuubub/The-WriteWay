import { NextRequest, NextResponse } from 'next/server';
import { translateContent } from '../../../lib/ai';

export async function POST(request: NextRequest) {
  try {
    const { content, targetLanguage = 'en' } = await request.json();
    const text = (content || '').toString();
    const language = (targetLanguage || 'en').toString();

    if (!text) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    const translation = await translateContent(text, language);
    return NextResponse.json({
      success: true,
      original: translation.original,
      translated: translation.translated,
      targetLanguage: translation.targetLanguage,
    });
  } catch (error: any) {
    const message = error?.message || 'Translation failed';
    let status = 500;
    if (message.includes('unsupported_target_language')) status = 400;
    else if (message.includes('translation_unavailable')) status = 503;
    else if (message.includes('translation_provider_error')) status = 502;
    return NextResponse.json({ error: message }, { status });
  }
}
