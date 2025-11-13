# Local AI Migration Plan (Client-side ONNX via transformers.js)

This plan replaces the current DeepSeek usage with a fully local, client-executed model using transformers.js (ONNX Runtime Web). The goal is to parse LinkedIn PDF text into a strict JSON schema entirely in the browser (or in a hybrid flow where the server only extracts raw text).

## Objectives
- Remove dependency on remote LLMs (DeepSeek, API keys, network calls).
- Run resume parsing locally in the client using a small text2text model.
- Keep existing JSON schema (`src/schemas/cv.ts`) and validation (Valibot) unchanged.
- Preserve current UX: upload PDF → get structured CV data → preview Harvard CV → export DOCX.

## Approaches
- Option A — Client-only: Client extracts PDF text with `pdfjs-dist`, runs local model, renders.
- Option B — Hybrid (recommended for minimal changes): Server returns only raw text; client runs local model. No remote AI calls.

We will implement Option B first (smaller code delta), then optionally add Option A.

## Model Selection
- Default: `Xenova/flan-t5-small` (~80–100MB), fast enough for short prompts and adequate for schema extraction.
- Better quality: `Xenova/flan-t5-base` (~250MB), slower but more reliable JSON adherence.
- Multilingual fallback (Spanish/English): `Xenova/mt5-small` — use only if FLAN-T5 struggles with Spanish.

Notes
- transformers.js automatically loads ONNX-quantized models provided by the `Xenova/*` repos.
- Start with `flan-t5-small`. If outputs are weak, switch to `flan-t5-base`.

## Hosting Model Assets
- Quick start (online-first run): Let transformers.js download weights on first use.
- Fully offline: Pre-download model files and serve statically at `/models/<model-id>/...`.
  - Configure transformers.js: `env.allowLocalModels = true` and `env.localModelPath = '/models'`.
  - Optional: self-host ONNX Runtime Web wasm files and set `env.backends.onnx.wasm.wasmPaths`.

## Architecture Overview
1. Server (unchanged for PDF): Accepts PDF upload, returns `{ rawText }` only.
2. Client: Receives `rawText`, detects language, builds prompt, runs local model, gets JSON string.
3. Client: Cleans/repairs JSON if needed, validates with Valibot, stores to `localStorage`, renders UI.

## Incremental Plan

### Phase 1 — Dependencies and Scaffolding
- Add dependencies:
  - `@xenova/transformers` (required)
  - `pdfjs-dist` (only if going client-only for PDF extraction)
- Create `src/local/aiParser.ts` with:
  - `splitSections(cleanData, language)` — reuse current segmentation logic.
  - `parseResumeLocally(cleanData, language)` — loads transformers.js pipeline and returns validated CV.
- Keep model configurable via env/global: `LOCAL_MODEL` default `Xenova/flan-t5-small`.

### Phase 2 — Client Flow (Hybrid)
- Update `src/index.tsx` server route `/api/upload` to return `{ success, rawText }` (remove DeepSeek call and JSON building).
- Update `src/App.tsx`:
  - After receiving `rawText`, call `parseResumeLocally(rawText, getResumeLanguage(rawText))`.
  - On success, `localStorage.setItem('parsedCv', JSON.stringify(cv))` and set state.
  - On failure, show useful error; keep spinner and status text.

### Phase 3 — Remove DeepSeek
- Remove `@ai-sdk/deepseek` dependency from `package.json`.
- Remove DeepSeek imports and usage in `src/index.tsx` (`formatResumeData`).
- Optionally keep a small `formatResumeDataRuleBased` for emergency fallback (regex-only minimal fields).

### Phase 4 — Optional Client-only PDF
- Add `pdfjs-dist` usage in client to extract text directly from the file input.
- Bypass `/api/upload` entirely; feed extracted `rawText` to local parser.
- Keep server endpoints for dev convenience, but not required.

### Phase 5 — Quality, Performance, and Offline
- Tune prompts to reduce hallucinations, enforce strict JSON.
- Add JSON repair step (best-effort) before Valibot validation.
- Lazy-load parser on demand (dynamic import) to keep initial bundle small.
- Prefer WebGPU if available: `env.device = 'webgpu'`, fallback to `wasm`.
- Host models locally for offline use when deploying into isolated servers.

## File-by-File Changes

### 1) `package.json`
- Add: `@xenova/transformers`
- Optional (client-only PDF): `pdfjs-dist`
- Remove: `@ai-sdk/deepseek` (after migration verified)

Scripts unchanged. No build step required beyond Bun’s dev server.

### 2) `src/local/aiParser.ts` (new)
Skeleton implementation:

```ts
// src/local/aiParser.ts
import type { CV } from '../schemas/cv';

export function getResumeLanguage(data: string): 'ES' | 'EN' | 'UNK' {
  const es = ["contactar", "extracto", "experiencia", "educación"].every(w => data.toLowerCase().includes(w));
  const en = ["contact", "summary", "experience", "education"].every(w => data.toLowerCase().includes(w));
  if (es) return 'ES';
  if (en) return 'EN';
  return 'UNK';
}

export function splitSections(cleanData: string, language: 'ES' | 'EN') {
  // Copy logic from current server implementation, adjusting keywords per language.
  if (language === 'ES') {
    const headerSection = cleanData.substring(0, cleanData.indexOf('Extracto')).trim();
    const summarySection = cleanData.substring(cleanData.indexOf('Extracto'), cleanData.indexOf('Experiencia')).trim();
    const experienceSection = cleanData.substring(cleanData.indexOf('Experiencia'), cleanData.indexOf('Educación')).trim();
    const educationSection = cleanData.substring(cleanData.indexOf('Educación'), cleanData.indexOf('Aptitudes principales')).trim();
    const skillsSection = cleanData.substring(cleanData.indexOf('Aptitudes principales')).trim();
    const contactInfo = headerSection.substring(headerSection.indexOf('Contactar')).trim();
    return { headerSection, summarySection, experienceSection, educationSection, skillsSection, contactInfo };
  } else {
    const headerSection = cleanData.substring(0, cleanData.indexOf('Summary')).trim();
    const summarySection = cleanData.substring(cleanData.indexOf('Summary'), cleanData.indexOf('Experience')).trim();
    const experienceSection = cleanData.substring(cleanData.indexOf('Experience'), cleanData.indexOf('Education')).trim();
    const educationSection = cleanData.substring(cleanData.indexOf('Education'), cleanData.indexOf('Skills')).trim();
    const skillsSection = cleanData.substring(cleanData.indexOf('Skills')).trim();
    const contactInfo = headerSection.substring(headerSection.indexOf('Contact')).trim();
    return { headerSection, summarySection, experienceSection, educationSection, skillsSection, contactInfo };
  }
}

export async function parseResumeLocally(cleanData: string, language: 'ES' | 'EN'): Promise<CV> {
  const { pipeline, env } = await import('@xenova/transformers');
  // Execution backend preference
  env.device = (navigator as any).gpu ? 'webgpu' : 'wasm';
  // If hosting models locally:
  // env.allowLocalModels = true;
  // env.localModelPath = '/models';

  const modelId = (globalThis as any).LOCAL_MODEL || 'Xenova/flan-t5-small';
  const pipe = await pipeline('text2text-generation', modelId, { quantized: true });

  const { headerSection, summarySection, experienceSection, educationSection, skillsSection, contactInfo } = splitSections(cleanData, language);

  const schemaDescription = `{
    "contact": {"github": "string", "mobile": "string", "email": "string", "linkedin": "string"},
    "name": "string", "title": "string", "location": "string", "summary": "string",
    "skills": {"mainSkills": ["string"], "languages": [{"name":"string","level":"string"}]},
    "experience": [{"company":"string","position":"string","startDate":"string","endDate":"string","duration":"string","location":"string","description":["string"]}],
    "education": [{"institution":"string","degree":"string","field":"string","period":"string"}]
  }`;

  const instr = language === 'ES'
    ? 'Extrae y estructura el CV de LinkedIn en Español al SIGUIENTE JSON EXACTO.'
    : 'Extract and structure the English LinkedIn resume into the EXACT JSON below.';

  const prompt = `${instr}\n\nHeader/Contact: ${headerSection}\nContact Info: ${contactInfo}\nSummary: ${summarySection}\nExperience: ${experienceSection}\nEducation: ${educationSection}\nSkills: ${skillsSection}\n\nSchema:\n${schemaDescription}\n\nRules:\n- Return ONLY valid JSON\n- Use "" or [] for missing fields\n- Ensure email is valid\n- Dates in "Month Year"\n- No extra text, no code fences`;

  const out = await pipe(prompt, { max_new_tokens: 512, temperature: 0, repetition_penalty: 1.0 });
  let text = Array.isArray(out) ? out[0].generated_text : (out as any).generated_text;
  text = String(text).trim().replace(/^```json\s*|^```\s*|```$/g, '');

  // Optional best-effort repair (keep minimal to avoid overfitting)
  try {
    const parsed = JSON.parse(text);
    const { CVSchema } = await import('../schemas/cv');
    const v = await import('valibot');
    return v.parse(CVSchema, parsed);
  } catch (e) {
    // Last attempt: small fixes for trailing commas/newlines
    const repaired = text.replace(/,\s*([}\]])/g, '$1');
    const parsed = JSON.parse(repaired);
    const { CVSchema } = await import('../schemas/cv');
    const v = await import('valibot');
    return v.parse(CVSchema, parsed);
  }
}
```

### 3) `src/index.tsx` (server)
- Remove DeepSeek usage and function `formatResumeData`.
- Keep `pdfToText` and `isLinkedInResume`.
- Change `/api/upload` to return only `{ success: true, rawText }`.

Example (sketch):
```ts
// inside /api/upload POST
const pdfBuffer = await pdfFile.arrayBuffer();
const text = await pdfToText(new Uint8Array(pdfBuffer));
if (!isLinkedInResume(text)) return Response.json({ error: 'Not a LinkedIn resume' }, { status: 400 });
return Response.json({ success: true, rawText: text });
```

### 4) `src/App.tsx` (client)
- After `fetch('/api/upload')`, invoke local parser:

```ts
import { parseResumeLocally, getResumeLanguage } from './local/aiParser';

// ... after receiving response
const payload = await response.json();
if (response.ok) {
  const lang = getResumeLanguage(payload.rawText);
  const clean = payload.rawText.replace(/Page\s+\d+\s+of\s+\d+/gi, '').replace(/\n\s*\n\s*\n/g, '\n');
  const cv = await parseResumeLocally(clean, lang === 'UNK' ? 'EN' : lang);
  localStorage.setItem('parsedCv', JSON.stringify(cv));
  setCvData(cv);
  setUploadStatus('PDF processed locally!');
  setActiveTab('data');
} else {
  setUploadStatus(payload.error || 'Error processing PDF');
}
```

### 5) Optional Client-only PDF (no server)
- Replace upload handler to process the selected `File` directly:
  - Use `pdfjs-dist` to iterate pages and build `rawText`.
  - Then same `parseResumeLocally` flow.
- Keep server scripts for dev convenience if desired.

## Prompt and JSON Enforcement
- Keep prompt short, deterministic:
  - `temperature: 0`, `repetition_penalty: 1.0`.
  - “Return ONLY valid JSON”, “No extra text” instructions.
- Strip code fences and trailing commas.
- Validate with Valibot; surface errors to user.

## Performance Tuning
- Start with `flan-t5-small`; switch to `flan-t5-base` for quality.
- Lazy-load parser on demand (dynamic import) to keep initial JS small.
- Limit input size: cap section lengths if resumes are very long.
- Prefer WebGPU when available; fallback to WASM.
- Consider caching model in IndexedDB (transformers.js handles this), so subsequent runs are faster.

## Security & Privacy
- No external AI calls; data stays on the client.
- If using Option B, server only sees raw PDF and extracted text; does not send it out.
- Sanitize output before rendering; all rendering is text-only in current UI.

## Testing Plan
- Unit-like checks with real PDFs (EN/ES):
  - Validate output against `CVSchema` (should pass without manual edits).
  - Confirm dates and emails formats.
- Error paths:
  - Non-LinkedIn PDFs → proper error message.
  - Model output non-JSON → repair → still validated or clear error.
- Performance:
  - First-run load under acceptable time on target hardware (model download can be large on first use).

## Rollout Strategy
- Phase 1: Hybrid path behind a feature flag `LOCAL_MODEL=1` (or UI toggle) to test locally.
- Phase 2: Remove DeepSeek, cleanup dependencies.
- Phase 3: Optional: client-only PDF.

## Deliverables
- `src/local/aiParser.ts` implemented.
- Modified `src/index.tsx` to return `{ rawText }` only.
- Modified `src/App.tsx` to call local parser.
- Updated `README.md` with local model setup and offline hosting notes.
- (Optional) `/models` static assets with ONNX weights for offline deployment.

## Acceptance Criteria
- Uploading a LinkedIn PDF produces a validated `CV` object without any external AI/API calls.
- Both English and Spanish resumes parse to the expected schema.
- No regressions in Harvard CV generation or DOCX download.

## Next Steps After Merge
- Evaluate model quality; consider `flan-t5-base` if needed.
- Add light rule-based augmentations for fields that models commonly miss (e.g., phone normalization).
- Add Telemetry toggle (local only) for anonymous performance metrics (optional).

---

If you want, I can implement this plan directly: add the parser module, update the server route to return raw text, and wire the client to the local model. Then you can test with `bun dev` and compare results.
