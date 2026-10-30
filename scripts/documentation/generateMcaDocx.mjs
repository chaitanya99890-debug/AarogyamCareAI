import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = fs.readFileSync(path.join(root, 'docs/project-report/AarogyamCareAI_MCA_Mini_Project_Report.md'), 'utf8').replace(/\r/g, '');
const output = path.join(root, 'output/project-report/AarogyamCareAI_MCA_Mini_Project_Report.docx');

const esc = (v) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clean = (v) => v.replace(/\*\*/g, '').replace(/`/g, '').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)').replace(/[–—]/g, '-').trim();
const run = (text, bold = false, size = 24) => `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="${size}"/>${bold ? '<w:b/>' : ''}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
const para = (text = '', { style = '', align = 'both', bold = false, size = 24, pageBreak = false, spacing = 180 } = {}) => `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}<w:jc w:val="${align}"/><w:spacing w:line="360" w:lineRule="auto" w:after="${spacing}"/>${pageBreak ? '<w:rPr/><w:pageBreakBefore/>' : ''}</w:pPr>${run(clean(text), bold, size)}</w:p>`;
const cell = (text, header = false) => `<w:tc><w:tcPr><w:tcW w:w="2200" w:type="dxa"/>${header ? '<w:shd w:fill="D9EAF7"/>' : ''}</w:tcPr>${para(text, { align: 'left', bold: header, size: 18, spacing: 0 })}</w:tc>`;
const table = (rows) => `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="6"/><w:left w:val="single" w:sz="6"/><w:bottom w:val="single" w:sz="6"/><w:right w:val="single" w:sz="6"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>${rows.map((r, i) => `<w:tr>${r.map(c => cell(c, i === 0)).join('')}</w:tr>`).join('')}</w:tbl>`;

let body = '';
function frontPage(lines) { body += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`; for (const [text, size, bold] of lines) body += para(text, { align: 'center', size, bold, spacing: 220 }); }
frontPage([
  ['[COLLEGE / UNIVERSITY NAME]', 32, true], ['Department of Master of Computer Applications', 28, true], ['', 24, false],
  ['AAROGYAMCAREAI', 40, true], ['AI-Powered Healthcare Companion', 30, true], ['', 24, false],
  ['A Mini Project Report', 28, true], ['Submitted in Partial Fulfillment of the Requirements', 24, false], ['for the Award of the Degree of Master of Computer Applications', 24, false], ['', 24, false],
  ['Submitted by', 24, true], ['[Student Name]  |  [Enrollment Number]', 24, false], ['', 24, false], ['Under the Guidance of', 24, true], ['[Project Guide Name]', 24, false], ['', 24, false], ['Academic Year: [20XX-20XX]', 24, true],
]);
frontPage([
  ['CERTIFICATE', 32, true],
  ['This is to certify that the mini project report entitled “AarogyamCareAI - AI-Powered Healthcare Companion” is a bona fide work carried out by [Student Name] ([Enrollment Number]) in partial fulfillment of the requirements for the award of the degree of Master of Computer Applications during the academic year [20XX-20XX], under my guidance.', 24, false],
  ['', 24, false], ['Project Guide: ____________________', 24, false], ['Head of Department: ____________________', 24, false], ['Date: ____________________     Place: ____________________', 24, false],
]);
frontPage([
  ['ACKNOWLEDGEMENT', 32, true],
  ['I express sincere gratitude to my project guide, the Head of the Department, faculty members, family and friends for their guidance, encouragement and support during the development and documentation of AarogyamCareAI.', 24, false],
  ['', 24, false], ['[Student Name]', 24, false],
]);
frontPage([
  ['TABLE OF CONTENTS', 32, true],
  ['1. Introduction     1.1 Abstract     1.2 Existing System and Need     1.3 Scope     1.4 Operating Environment', 22, false],
  ['2. Analysis and Design     2.1 Modules through 2.11 Input and Output Screens', 22, false],
  ['3. Coding     3.1 Complete Code of One Module', 22, false],
  ['4. Testing     4.1 Test Strategy through 4.4 Test Case / Test Script', 22, false],
  ['5. Limitations of Proposed System     6. Proposed Enhancements', 22, false],
  ['7. Conclusion     8. Bibliography     Appendix A: Documentation Verification', 22, false],
  ['Update this generated table of contents in Microsoft Word after adding final page numbers and screenshots.', 20, false],
]);

const lines = source.split('\n');
for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i];
  if (!line.trim()) continue;
  if (line.startsWith('# ')) { body += para(line.slice(2), { style: 'Chapter', align: 'center', bold: true, size: 32, pageBreak: true }); continue; }
  if (line.startsWith('## ')) { body += para(line.slice(3), { style: 'Heading1', bold: true, size: 28 }); continue; }
  if (line.startsWith('### ')) { body += para(line.slice(4), { style: 'Heading2', bold: true, size: 26 }); continue; }
  if (line.startsWith('```')) { const block = []; i += 1; while (i < lines.length && !lines[i].startsWith('```')) block.push(lines[i++]); body += para(block.join(' '), { align: 'left', size: 18 }); continue; }
  if (line.startsWith('|') && i + 1 < lines.length && /^\|\s*:?-+/.test(lines[i + 1])) {
    const rows = [line];
    i += 2;
    while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
    const parsed = rows.map(row => row.trim().slice(1, -1).split('|').map(x => clean(x.trim())));
    body += table(parsed); i -= 1; continue;
  }
  if (/^[-*]\s+/.test(line)) { body += para(`• ${line.replace(/^[-*]\s+/, '')}`, { align: 'left' }); continue; }
  body += para(line);
}

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/><w:pgNumType w:fmt="decimal"/></w:sectPr></w:body></w:document>`;
const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:styleId="Chapter"><w:name w:val="Chapter"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="Heading 2"/></w:style></w:styles>`;
const files = {
  '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
  '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  'word/document.xml': documentXml,
  'word/styles.xml': styles,
};
const crc32 = (buffer) => { let c = ~0; for (const x of buffer) { c ^= x; for (let i = 0; i < 8; i += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return (~c) >>> 0; };
const parts = []; const central = []; let cursor = 0;
for (const [name, value] of Object.entries(files)) { const data = Buffer.from(value, 'utf8'); const nameBuf = Buffer.from(name); const crc = crc32(data); const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50,0); local.writeUInt16LE(20,4); local.writeUInt16LE(0,6); local.writeUInt16LE(0,8); local.writeUInt32LE(crc,14); local.writeUInt32LE(data.length,18); local.writeUInt32LE(data.length,22); local.writeUInt16LE(nameBuf.length,26); parts.push(local,nameBuf,data); const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50,0); cd.writeUInt16LE(20,4); cd.writeUInt16LE(20,6); cd.writeUInt32LE(crc,16); cd.writeUInt32LE(data.length,20); cd.writeUInt32LE(data.length,24); cd.writeUInt16LE(nameBuf.length,28); cd.writeUInt32LE(cursor,42); central.push(cd,nameBuf); cursor += local.length + nameBuf.length + data.length; }
const centralData = Buffer.concat(central); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50,0); end.writeUInt16LE(Object.keys(files).length,8); end.writeUInt16LE(Object.keys(files).length,10); end.writeUInt32LE(centralData.length,12); end.writeUInt32LE(cursor,16); fs.writeFileSync(output, Buffer.concat([...parts,centralData,end]));
console.log(`Created ${output}`);
