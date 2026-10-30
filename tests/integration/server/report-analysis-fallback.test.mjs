import assert from 'node:assert/strict'

// Mirrors the server's accepted, provider-independent response contract.
function parseJsonObject(text) {
  const trimmed = text?.trim() ?? ''
  if (!trimmed) return {}
  return JSON.parse(trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''))
}

const payload = parseJsonObject('```json\n{"summary":"Visible result","keyFindings":[]}\n```')
assert.equal(payload.summary, 'Visible result')
assert.deepEqual(payload.keyFindings, [])
console.log('report-analysis JSON fallback parsing passed')
