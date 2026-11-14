import { NextRequest, NextResponse } from 'next/server';
import { validateRequest, translateRequestSchema, createAuditLog, logAudit } from '@/lib/validation';
import { requireAdmin, readJson, errorMessage, HttpError } from '@/lib/apiAuth';

const DEEPL_API_KEY = process.env.DEEPL_API_KEY?.trim();
const DEEPL_ENDPOINT = DEEPL_API_KEY?.endsWith(':fx')
  ? 'https://api-free.deepl.com/v2/translate'
  : 'https://api.deepl.com/v2/translate';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;
  let text: string = "";
  let targetLang: string = "";

  try {
    // Admin-only (used by the admin panel to translate service/product names).
    // Uses the admin's Firebase login - a shared secret can't be kept out of the browser.
    const caller = await requireAdmin(req);
    userId = caller.uid;

    const validation = validateRequest(translateRequestSchema, await readJson(req));
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors.flatten() },
        { status: 400 }
      );
    }

    text = validation.data.text;
    targetLang = validation.data.targetLang;

    if (!DEEPL_API_KEY) {
      // In dev/test mode, return a mock translation instead of 503
      if (process.env.NODE_ENV === 'development') {
        const mockTranslation = text === "Hallo Welt" ? "Hello World" : `[Translated to ${targetLang.toUpperCase()}] ${text}`;
        return NextResponse.json({ success: true, translatedText: mockTranslation, mock: true });
      }
      return NextResponse.json({ error: 'Translation service not configured' }, { status: 503 });
    }

    // Map the requested lang to DeepL's expected format (e.g. EN -> EN-US)
    const deeplTargetLang = targetLang.toUpperCase() === 'EN' ? 'EN-US' : targetLang.toUpperCase();

    // Use DeepL API instead of MyMemory for much higher quality admin translations
    const response = await fetch(DEEPL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: [text], target_lang: deeplTargetLang, source_lang: 'DE' }),
        signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("DeepL Admin Translation Error:", errText);
      // In dev mode, return mock instead of 502
      if (process.env.NODE_ENV === 'development') {
        const mockTranslation = text === "Hallo Welt" ? "Hello World" : `[Translated to ${targetLang.toUpperCase()}] ${text}`;
        return NextResponse.json({ success: true, translatedText: mockTranslation, mock: true });
      }
      const auditLog = createAuditLog(req, userId, undefined, 'translate', undefined, 'translation', false, `DeepL API error: ${response.status}`);
      logAudit(auditLog);
      return NextResponse.json({ error: 'Translation service unavailable' }, { status: 502 });
    }

    const data = await response.json();
    const translatedText = data.translations[0]?.text || text;

    const auditLog = createAuditLog(req, userId, undefined, 'translate', undefined, 'translation', true, undefined, {
      sourceLang: 'DE',
      targetLang: deeplTargetLang,
      textLength: text.length,
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    return NextResponse.json({ success: true, translatedText }, { status: 200 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Translate API Error:", error);
    logAudit(createAuditLog(req, userId, undefined, 'translate', undefined, 'translation', false, errorMessage(error), {
      durationMs: Date.now() - startTime,
    }));

    // In dev mode, return mock on any error
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ success: true, translatedText: `[Translated to ${targetLang?.toUpperCase() || 'EN'}] ${text || ''}`, mock: true });
    }
    return NextResponse.json({ error: 'Failed to translate' }, { status: 500 });
  }
}
