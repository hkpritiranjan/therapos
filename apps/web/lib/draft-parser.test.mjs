import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDraft, formatStreamPreview } from './draft-parser.ts';

const soapJson = `{
  "format": "SOAP",
  "subjective": "Client reported sleeping better.",
  "objective": "Affect brighter; \\"engaged\\" throughout.",
  "assessment": "Early gains.",
  "plan": "Continue CBT."
}`;

test('SOAP: complete JSON fills each field (regression: raw JSON landed in Subjective)', () => {
  const r = parseDraft('SOAP', soapJson);
  assert.equal(r.subjective, 'Client reported sleeping better.');
  assert.equal(r.objective, 'Affect brighter; "engaged" throughout.');
  assert.equal(r.assessment, 'Early gains.');
  assert.equal(r.plan, 'Continue CBT.');
  assert.ok(!r.subjective.includes('{'));
});

test('SOAP: JSON wrapped in code fences', () => {
  assert.equal(parseDraft('SOAP', '```json\n' + soapJson + '\n```').plan, 'Continue CBT.');
});

test('DAP and BIRP key mapping', () => {
  const dap = parseDraft('DAP', '{"format":"DAP","data":"d","dapAssessment":"a","dapPlan":"p"}');
  assert.deepEqual(dap, { data: 'd', dapAssessment: 'a', dapPlan: 'p' });
  const birp = parseDraft('BIRP', '{"behavior":"b","intervention":"i","birpResponse":"r","birpPlan":"p"}');
  assert.deepEqual(birp, { behavior: 'b', intervention: 'i', birpResponse: 'r', birpPlan: 'p' });
});

test('partial (still streaming) JSON yields the sections seen so far', () => {
  const partial = '{\n  "format": "SOAP",\n  "subjective": "Client reported sle';
  assert.equal(parseDraft('SOAP', partial).subjective, 'Client reported sle');
  const two = '{"subjective": "Done.", "objective": "Affect bri';
  const r = parseDraft('SOAP', two);
  assert.equal(r.subjective, 'Done.');
  assert.equal(r.objective, 'Affect bri');
});

test('labelled prose still works as a fallback', () => {
  const prose = 'Subjective: Slept better.\nObjective: Brighter.\nAssessment: Gains.\nPlan: CBT.';
  const r = parseDraft('SOAP', prose);
  assert.deepEqual(r, { subjective: 'Slept better.', objective: 'Brighter.', assessment: 'Gains.', plan: 'CBT.' });
});

test('FREE format returns trimmed text', () => {
  assert.deepEqual(parseDraft('FREE', '  A narrative note.  '), { freeText: 'A narrative note.' });
});

test('stream preview never shows raw JSON', () => {
  const p = formatStreamPreview('SOAP', '{\n  "format": "SOAP",\n  "subjective": "Slept bet');
  assert.equal(p, 'Subjective\nSlept bet');
  assert.equal(formatStreamPreview('SOAP', '{\n  "form'), '');
});
