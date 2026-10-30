import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = path.resolve(root, process.argv[2] ?? 'docs/project-report/phase-1-inventory.md');
const output = path.resolve(root, process.argv[3] ?? 'output/project-report/AarogyamCareAI_Phase_1_Evidence_Inventory.pdf');
const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 48;
const maxChars = 91;

function sanitize(text) {
  return text
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wrap(text, width) {
  const words = sanitize(text).split(' ').filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (!current || `${current} ${word}`.length <= width) current = current ? `${current} ${word}` : word;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function esc(text) { return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }

const sourceLines = fs.readFileSync(source, 'utf8').replace(/\r/g, '').split('\n');
const pages = [];
let current = [];
let y = pageHeight - margin;

function newPage() {
  pages.push(current);
  current = [];
  y = pageHeight - margin;
}

function add(text, { font = 'F1', size = 10, indent = 0, leading = 14, width = maxChars } = {}) {
  const lines = wrap(text, Math.max(24, width - Math.floor(indent / 5)));
  if (y - lines.length * leading < margin + 24) newPage();
  for (const line of lines) {
    current.push(`BT /${font} ${size} Tf 1 0 0 1 ${margin + indent} ${y.toFixed(2)} Tm (${esc(line)}) Tj ET`);
    y -= leading;
  }
}

for (let i = 0; i < sourceLines.length; i += 1) {
  const line = sourceLines[i];
  if (!line.trim()) { y -= 4; continue; }
  if (line.startsWith('# ')) { add(line.slice(2), { font: 'F2', size: 18, leading: 23, width: 65 }); y -= 5; continue; }
  if (line.startsWith('## ')) { add(line.slice(3), { font: 'F2', size: 14, leading: 19, width: 72 }); y -= 2; continue; }
  if (line.startsWith('### ')) { add(line.slice(4), { font: 'F2', size: 11.5, leading: 16, width: 80 }); continue; }
  if (line.startsWith('```')) {
    i += 1;
    while (i < sourceLines.length && !sourceLines[i].startsWith('```')) { add(sourceLines[i], { font: 'F3', size: 8, leading: 10, indent: 12, width: 82 }); i += 1; }
    y -= 3;
    continue;
  }
  if (/^\|/.test(line)) {
    if (/^\|\s*:?-+/.test(line)) continue;
    add(line.replace(/^\|\s?/, '').replace(/\s?\|$/,'').replace(/\s*\|\s*/g, '  |  '), { font: 'F1', size: 8, leading: 11, width: 102 });
    continue;
  }
  if (/^\d+\.\s+/.test(line)) { add(line, { indent: 9, width: 87 }); continue; }
  if (line.startsWith('- ')) { add(`• ${line.slice(2)}`, { indent: 9, width: 87 }); continue; }
  add(line);
}
if (current.length) pages.push(current);

const objects = [];
function addObject(value) { objects.push(value); return objects.length; }
const catalogId = addObject('');
const pagesId = addObject('');
const regularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>');
const boldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>');
const monoId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');
const pageIds = [];
for (let index = 0; index < pages.length; index += 1) {
  const footer = `BT /F1 8 Tf 1 0 0 1 ${(pageWidth / 2 - 22).toFixed(2)} 26 Tm (Page ${index + 1} of ${pages.length}) Tj ET`;
  const content = `${pages[index].join('\n')}\n${footer}\n`;
  const contentId = addObject(`<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}endstream`);
  const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${regularId} 0 R /F2 ${boldId} 0 R /F3 ${monoId} 0 R >> >> /Contents ${contentId} 0 R >>`);
  pageIds.push(pageId);
}
objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

let pdf = '%PDF-1.4\n%PDF generated locally\n';
const offsets = [0];
for (let i = 0; i < objects.length; i += 1) {
  offsets.push(Buffer.byteLength(pdf, 'ascii'));
  pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
}
const xref = Buffer.byteLength(pdf, 'ascii');
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (let i = 1; i < offsets.length; i += 1) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info << /Title (AarogyamCareAI Phase 1 Evidence Inventory) /Author (AarogyamCareAI) >> >>\nstartxref\n${xref}\n%%EOF\n`;
fs.writeFileSync(output, pdf, 'ascii');
console.log(`Created ${output} (${pageIds.length} pages).`);
