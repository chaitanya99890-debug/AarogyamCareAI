import fs from 'node:fs';
import zlib from 'node:zlib';

const input = process.argv[2];
const archive = fs.readFileSync(input);
let offset = 0;
let documentXml = '';
while (offset < archive.length) {
  const start = archive.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]), offset);
  if (start < 0) break;
  const method = archive.readUInt16LE(start + 8);
  const compressedSize = archive.readUInt32LE(start + 18);
  const nameLength = archive.readUInt16LE(start + 26);
  const extraLength = archive.readUInt16LE(start + 28);
  const name = archive.subarray(start + 30, start + 30 + nameLength).toString();
  const dataStart = start + 30 + nameLength + extraLength;
  const data = archive.subarray(dataStart, dataStart + compressedSize);
  if (name === 'word/document.xml') documentXml = (method === 8 ? zlib.inflateRawSync(data) : data).toString();
  offset = dataStart + compressedSize;
}
const decode = (value) => value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x([0-9A-F]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
const paragraphs = [];
for (const match of documentXml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
  const paragraph = match[0];
  const style = (paragraph.match(/<w:pStyle w:val="([^"]+)/) ?? [])[1] ?? '';
  const text = [...paragraph.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((node) => node[1]).join('');
  if (text.trim()) paragraphs.push(`${style ? `${style} | ` : ''}${decode(text)}`);
}
console.log(paragraphs.slice(0, 650).join('\n'));
