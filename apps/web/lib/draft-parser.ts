import type { NoteFormat } from '@therapos/shared';

export interface DraftFields {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  data: string;
  dapAssessment: string;
  dapPlan: string;
  behavior: string;
  intervention: string;
  birpResponse: string;
  birpPlan: string;
  freeText: string;
}

type DraftKey = keyof DraftFields;

/** Section keys the API prompt asks the model to return, per format. */
const FORMAT_KEYS: Record<Exclude<NoteFormat, 'FREE'>, DraftKey[]> = {
  SOAP: ['subjective', 'objective', 'assessment', 'plan'],
  DAP: ['data', 'dapAssessment', 'dapPlan'],
  BIRP: ['behavior', 'intervention', 'birpResponse', 'birpPlan'],
};

const SECTION_TITLES: Record<DraftKey, string> = {
  subjective: 'Subjective',
  objective: 'Objective',
  assessment: 'Assessment',
  plan: 'Plan',
  data: 'Data',
  dapAssessment: 'Assessment',
  dapPlan: 'Plan',
  behavior: 'Behavior',
  intervention: 'Intervention',
  birpResponse: 'Response',
  birpPlan: 'Plan',
  freeText: 'Note',
};

/** Alternate key names a model might use for the same section. */
const KEY_ALIASES: Record<string, DraftKey> = {
  response: 'birpResponse',
};

function unescapeJsonString(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return raw.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
}

function stripFences(text: string): string {
  return text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
}

/** 1. Complete JSON object. */
function parseCompleteJson(format: Exclude<NoteFormat, 'FREE'>, text: string): Partial<DraftFields> | null {
  const cleaned = stripFences(text);
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    const out: Partial<DraftFields> = {};
    let found = false;
    for (const [k, v] of Object.entries(obj)) {
      const key = (KEY_ALIASES[k] ?? k) as DraftKey;
      if (FORMAT_KEYS[format].includes(key) && typeof v === 'string') {
        out[key] = v.trim();
        found = true;
      }
    }
    return found ? out : null;
  } catch {
    return null;
  }
}

/** 2. JSON that is still streaming (unterminated string, no closing brace). */
function parsePartialJson(format: Exclude<NoteFormat, 'FREE'>, text: string): Partial<DraftFields> | null {
  const cleaned = stripFences(text);
  const out: Partial<DraftFields> = {};
  let found = false;
  for (const key of FORMAT_KEYS[format]) {
    const names = key === 'birpResponse' ? [key, 'response'] : [key];
    for (const name of names) {
      const m = cleaned.match(new RegExp(`"${name}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)(?:"|$)`));
      if (m) {
        out[key] = unescapeJsonString(m[1]).trim();
        found = true;
        break;
      }
    }
  }
  return found ? out : null;
}

/** 3. Labelled prose ("Subjective: ..."), for models that ignore the JSON instruction. */
function extractSection(text: string, labels: string[], stopLabels: string[]): string | undefined {
  const labelPat = labels.map((l) => `(?:\\*{1,2})?\\s*${l}(?:\\s+\\([^)]*\\))?(?:\\*{1,2})?`).join('|');
  const stopPat = stopLabels.map((l) => `(?:\\*{1,2})?\\s*${l}(?:\\s+\\([^)]*\\))?(?:\\*{1,2})?\\s*[:\\-]`).join('|');
  const regex = new RegExp(
    `(?:^|\\n)(?:#{1,3}\\s*)?(?:${labelPat})\\s*[:\\-]?\\s*\\n?([\\s\\S]*?)(?=(?:\\n(?:#{1,3}\\s*)?(?:${stopPat}))|$)`,
    'i',
  );
  const match = text.match(regex);
  return match ? match[1].trim() : undefined;
}

function parseLabelledProse(format: Exclude<NoteFormat, 'FREE'>, text: string): Partial<DraftFields> {
  if (format === 'SOAP') {
    const s = extractSection(text, ['Subjective', 'S'], ['Objective', 'Assessment', 'Plan']);
    const o = extractSection(text, ['Objective', 'O'], ['Assessment', 'Plan']);
    const a = extractSection(text, ['Assessment', 'A'], ['Plan']);
    const p = extractSection(text, ['Plan', 'P'], []);
    if ([s, o, a, p].some((x) => x !== undefined)) {
      return { subjective: s ?? '', objective: o ?? '', assessment: a ?? '', plan: p ?? '' };
    }
    return { subjective: text.trim() };
  }
  if (format === 'DAP') {
    const d = extractSection(text, ['Data', 'D'], ['Assessment', 'Plan']);
    const a = extractSection(text, ['Assessment', 'A'], ['Plan']);
    const p = extractSection(text, ['Plan', 'P'], []);
    if ([d, a, p].some((x) => x !== undefined)) {
      return { data: d ?? '', dapAssessment: a ?? '', dapPlan: p ?? '' };
    }
    return { data: text.trim() };
  }
  const b = extractSection(text, ['Behavior', 'B'], ['Intervention', 'Response', 'Plan']);
  const i = extractSection(text, ['Intervention', 'I'], ['Response', 'Plan']);
  const r = extractSection(text, ['Response', 'R'], ['Plan']);
  const p = extractSection(text, ['Plan', 'P'], []);
  if ([b, i, r, p].some((x) => x !== undefined)) {
    return { behavior: b ?? '', intervention: i ?? '', birpResponse: r ?? '', birpPlan: p ?? '' };
  }
  return { behavior: text.trim() };
}

/**
 * Turn streamed model output into note fields.
 * The API asks for JSON; labelled prose is accepted as a fallback.
 */
export function parseDraft(format: NoteFormat, text: string): Partial<DraftFields> {
  if (format === 'FREE') return { freeText: text.trim() };
  return (
    parseCompleteJson(format, text) ??
    parsePartialJson(format, text) ??
    parseLabelledProse(format, text)
  );
}

/** Human-readable preview while the draft is still streaming (never raw JSON). */
export function formatStreamPreview(format: NoteFormat, text: string): string {
  if (format === 'FREE') return text;
  const parsed = parseCompleteJson(format, text) ?? parsePartialJson(format, text);
  if (!parsed) return /^\s*[`{]/.test(text) ? '' : text;
  return FORMAT_KEYS[format]
    .filter((k) => parsed[k] !== undefined)
    .map((k) => `${SECTION_TITLES[k]}\n${parsed[k]}`)
    .join('\n\n');
}
