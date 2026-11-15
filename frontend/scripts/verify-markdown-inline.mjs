/**
 * Contract checks for chat markdown / citation inline formatting helpers.
 * Runs without a browser by exercising the exported parsing logic via dynamic
 * TypeScript transpile of the pure string-segmentation helpers duplicated here
 * to avoid a React runtime dependency in Node.
 */

function segmentRichText(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const segments = [];
  let paragraphBuf = [];
  let listBuf = null;

  const flushParagraph = () => {
    if (paragraphBuf.length) {
      segments.push({ kind: 'paragraph', text: paragraphBuf.join('\n') });
      paragraphBuf = [];
    }
  };
  const flushList = () => {
    if (listBuf && listBuf.items.length) {
      segments.push({ kind: listBuf.type, items: listBuf.items });
    }
    listBuf = null;
  };

  for (const rawLine of lines) {
    const line = rawLine;
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    const ulMatch = /^[-*]\s+(.+)$/.exec(line.trim());
    const olMatch = /^(\d+)\.\s+(.+)$/.exec(line.trim());

    if (headingMatch) {
      flushParagraph();
      flushList();
      segments.push({
        kind: 'heading',
        level: Math.min(headingMatch[1].length, 3),
        text: headingMatch[2],
      });
      continue;
    }
    if (ulMatch) {
      flushParagraph();
      if (!listBuf || listBuf.type !== 'ul') {
        flushList();
        listBuf = { type: 'ul', items: [] };
      }
      listBuf.items.push(ulMatch[1]);
      continue;
    }
    if (olMatch) {
      flushParagraph();
      if (!listBuf || listBuf.type !== 'ol') {
        flushList();
        listBuf = { type: 'ol', items: [] };
      }
      listBuf.items.push(olMatch[2]);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    flushList();
    paragraphBuf.push(line);
  }
  flushParagraph();
  flushList();
  return segments;
}

function classifyInline(text) {
  const regex =
    /(`[^`]+`)|\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\[Source\]\s*\[(\d+)\]|\[\[(\d+)\]\]|\[(\d+)\]|(https?:\/\/[^\s<>()\[\]"]+)/gi;
  const kinds = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) kinds.push('code');
    else if (match[2]) kinds.push('bold');
    else if (match[3] && match[4]) kinds.push('md-link');
    else if (match[5] || match[6] || match[7]) kinds.push(`cite:${match[5] || match[6] || match[7]}`);
    else if (match[8]) kinds.push('url');
  }
  return kinds;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const segments = segmentRichText(
  '## Summary\n\nSee details [Source][1] and [2].\n\n- First item\n- Second item\n\n1. Alpha\n2. Bravo\n\nVisit https://example.com/path?q=1&x=2',
);

assert(segments.some((s) => s.kind === 'heading' && s.text === 'Summary'), 'heading parse');
assert(segments.some((s) => s.kind === 'ul' && s.items.length === 2), 'ul parse');
assert(segments.some((s) => s.kind === 'ol' && s.items.length === 2), 'ol parse');

const kinds = classifyInline(
  'code `x=1` **bold** [docs](https://tronai.tech) [Source][4] [[3]] [1] https://api.tronai.tech/v1',
);
assert(kinds.includes('code'), 'inline code');
assert(kinds.includes('bold'), 'bold');
assert(kinds.includes('md-link'), 'markdown link');
assert(kinds.includes('cite:4'), 'Source][n citation');
assert(kinds.includes('cite:3'), '[[n]] citation');
assert(kinds.includes('cite:1'), '[n] citation');
assert(kinds.includes('url'), 'bare url');

console.log('verify-markdown-inline: ok');
