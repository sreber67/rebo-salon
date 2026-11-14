import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { z } from 'zod';
import { adminDb } from '@/lib/firebaseAdmin';
import { createAuditLog, logAudit } from '@/lib/validation';
import { readJson, errorResponse, errorMessage } from '@/lib/apiAuth';
import { buildTranslationSource } from '@/lib/translations';

// Public: any visitor can switch the site language. The texts to translate are built
// here on the server from the site's own content - never taken from the request -
// so nobody can plant their own text into the shared translations everyone sees.

const DEEPL_API_KEY = process.env.DEEPL_API_KEY?.trim();
const DEEPL_ENDPOINT = DEEPL_API_KEY?.endsWith(':fx')
  ? 'https://api-free.deepl.com/v2/translate'
  : 'https://api.deepl.com/v2/translate';

const LANG_CODE_MAP: Record<string, string> = {
  en: 'EN-US', es: 'ES', fr: 'FR', it: 'IT', nl: 'NL', tr: 'TR',
  pl: 'PL', ru: 'RU', ar: 'AR', zh: 'ZH', ja: 'JA',
};

const requestSchema = z.object({
  targetLang: z.enum(Object.keys(LANG_CODE_MAP) as [string, ...string[]]),
});

// Values that must stay exactly as they are (ids, links, prices, dates)
const KEEP_KEYS = new Set(['id', 'image', 'images', 'heroImage', 'aboutImage', 'galleryImages', 'price', 'oldPrice', 'holidays', 'durationMins', 'stockCount']);
const isUntranslatable = (text: string) =>
  /^https?:\/\//i.test(text) || /^\d{4}-\d{2}-\d{2}$/.test(text) || /^[\d\s.,€$%:+-]*$/.test(text);

type Leaf = { path: string[]; text: string };

function collectLeaves(value: unknown, path: string[] = [], out: Leaf[] = []): Leaf[] {
  if (KEEP_KEYS.has(path[path.length - 1])) return out;
  if (typeof value === 'string') {
    // DeepL rejects empty strings
    if (value.trim() !== '' && !isUntranslatable(value)) out.push({ path, text: value });
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => collectLeaves(item, [...path, String(i)], out));
  } else if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) collectLeaves((value as Record<string, unknown>)[key], [...path, key], out);
  }
  return out;
}

function applyTranslations(template: unknown, translated: Map<string, string>, path: string[] = []): unknown {
  if (typeof template === 'string') return translated.get(path.join('.')) ?? template;
  if (Array.isArray(template)) return template.map((item, i) => applyTranslations(item, translated, [...path, String(i)]));
  if (template && typeof template === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(template)) {
      result[key] = applyTranslations((template as Record<string, unknown>)[key], translated, [...path, key]);
    }
    return result;
  }
  return template;
}

function mockTranslate(value: unknown): unknown {
  if (typeof value === 'string') return value.trim() === '' ? value : `[EN] ${value}`;
  if (Array.isArray(value)) return value.map(mockTranslate);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mockTranslate(v)]));
  }
  return value;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const parsed = requestSchema.safeParse(await readJson(req));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Unsupported language' }, { status: 400 });
    }
    const { targetLang } = parsed.data;

    const [servicesSnap, productsSnap, stylistsSnap, settingsSnap, cacheSnap] = await Promise.all([
      adminDb.collection('services').get(),
      adminDb.collection('products').get(),
      adminDb.collection('stylists').get(),
      adminDb.doc('settings/general').get(),
      adminDb.doc('settings/translations').get(),
    ]);
    const withId = (snap: FirebaseFirestore.QuerySnapshot) => snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const sourceDict = buildTranslationSource(
      withId(servicesSnap), withId(productsSnap), withId(stylistsSnap), settingsSnap.data() || { holidays: [] },
    );

    // Serve the stored translation while the site's texts haven't changed since it was made
    const sourceHash = createHash('sha256').update(JSON.stringify(sourceDict)).digest('hex');
    const cache = cacheSnap.data();
    if (cache?.[targetLang] && cache.sourceHashes?.[targetLang] === sourceHash) {
      return NextResponse.json({ success: true, translatedDict: cache[targetLang], cached: true });
    }

    if (!DEEPL_API_KEY) {
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({ success: true, translatedDict: mockTranslate(sourceDict), mock: true });
      }
      logAudit(createAuditLog(req, undefined, undefined, 'translate_ui', undefined, 'translation_cache', false, 'DeepL API key not configured'));
      return NextResponse.json({ error: 'Translation service not configured' }, { status: 503 });
    }

    const leaves = collectLeaves(sourceDict);
    const texts = leaves.map(l => l.text);
    const translatedTexts: string[] = [];

    // DeepL accepts up to 50 texts per request
    const CHUNK_SIZE = 50;
    for (let i = 0; i < texts.length; i += CHUNK_SIZE) {
      const res = await fetch(DEEPL_ENDPOINT, {
        method: 'POST',
        headers: { 'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: texts.slice(i, i + CHUNK_SIZE), target_lang: LANG_CODE_MAP[targetLang], source_lang: 'DE' }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('[translate-ui] DeepL Error:', res.status, errText);
        logAudit(createAuditLog(req, undefined, undefined, 'translate_ui', undefined, 'translation_cache', false, `DeepL API error: ${res.status}`));
        return NextResponse.json({ error: 'Translation service unavailable' }, { status: 502 });
      }
      const data = await res.json();
      translatedTexts.push(...data.translations.map((t: { text: string }) => t.text));
    }

    const translatedMap = new Map(leaves.map((leaf, i) => [leaf.path.join('.'), translatedTexts[i]]));
    const translatedDict = applyTranslations(sourceDict, translatedMap);

    try {
      // updatedAt keeps the TTL index from deleting this document
      await adminDb.doc('settings/translations').set({
        [targetLang]: translatedDict,
        sourceHashes: { [targetLang]: sourceHash },
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (cacheError) {
      console.error('Failed to cache translation in Firestore:', cacheError);
    }

    logAudit(createAuditLog(req, undefined, undefined, 'translate_ui', undefined, 'translation_cache', true, undefined, {
      targetLang,
      stringsTranslated: texts.length,
      durationMs: Date.now() - startTime,
    }));
    return NextResponse.json({ success: true, translatedDict });
  } catch (error) {
    console.error('[translate-ui] Translation Pipeline Error:', error);
    logAudit(createAuditLog(req, undefined, undefined, 'translate_ui', undefined, 'translation_cache', false, errorMessage(error), {
      durationMs: Date.now() - startTime,
    }));
    return errorResponse(error, 'Translation failed');
  }
}
