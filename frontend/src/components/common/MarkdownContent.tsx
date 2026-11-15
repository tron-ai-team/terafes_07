import React, { useState } from 'react';
import { Copy, Check, Terminal, AlertTriangle, Search, ExternalLink } from 'lucide-react';
import { SearchResultItem, SearchStatus } from '../../types/chat';

interface MarkdownContentProps {
  content: string;
  isUser?: boolean;
  truncated?: boolean;
  finishReason?: string;
  search?: SearchStatus;
}

interface ParsedBlock {
  type: 'code' | 'text';
  language?: string;
  content: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  isUser = false,
  truncated = false,
  finishReason,
  search,
}) => {
  const parseBlocks = (text: string): ParsedBlock[] => {
    const blocks: ParsedBlock[] = [];
    const codeFenceRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)(?:```|$)/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeFenceRegex.exec(text)) !== null) {
      const textBefore = text.slice(lastIndex, match.index);
      if (textBefore.trim()) {
        blocks.push({ type: 'text', content: textBefore });
      }

      const language = match[1]?.trim() || 'code';
      const code = match[2] || '';
      blocks.push({ type: 'code', language, content: code });

      lastIndex = match.index + match[0].length;
    }

    const remainingText = text.slice(lastIndex);
    if (remainingText.trim() || blocks.length === 0) {
      blocks.push({ type: 'text', content: remainingText || text });
    }

    return blocks;
  };

  if (isUser) {
    return (
      <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">
        {content}
      </div>
    );
  }

  const blocks = parseBlocks(content);
  const sources = search?.results?.filter((r) => r?.url) ?? [];

  return (
    <div className="space-y-3 leading-relaxed text-slate-800 break-words [overflow-wrap:anywhere] min-w-0">
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return (
            <CodeBlockCard
              key={idx}
              language={block.language || 'code'}
              code={block.content}
            />
          );
        }
        return (
          <RichTextBlock
            key={idx}
            text={block.content}
            sources={sources}
          />
        );
      })}

      {(truncated || finishReason === 'length') && (
        <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-300 text-amber-900 text-xs flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Response truncated:</strong> The model reached its maximum token output limit (1,536 tokens). Type{' '}
            <code className="bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-mono font-bold">continue</code> to generate the rest of the code.
          </span>
        </div>
      )}

      {search && search.mode !== 'off' && (
        <div className="mt-2 pt-2 border-t border-slate-100 space-y-2">
          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <Search className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Search ({search.mode}):</span>
              {search.status === 'unavailable' ? (
                <span className="text-amber-600 font-medium">Provider unavailable</span>
              ) : search.status === 'ok' && sources.length > 0 ? (
                <span className="text-emerald-600 font-medium">{sources.length} sources</span>
              ) : search.status === 'timeout' || search.status === 'error' ? (
                <span className="text-amber-600 font-medium">{search.detail || search.status}</span>
              ) : (
                <span className="text-slate-400">Skipped (general reasoning query)</span>
              )}
            </div>
            {search.query && (
              <span className="italic truncate max-w-full sm:max-w-[220px]" title={search.query}>
                &ldquo;{search.query}&rdquo;
              </span>
            )}
          </div>

          {sources.length > 0 && (
            <ul className="space-y-1.5" aria-label="Search sources">
              {sources.map((result, i) => (
                <li key={`${result.url}-${i}`}>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 hover:bg-blue-50/70 hover:border-blue-200 px-2.5 py-2 transition-colors min-w-0"
                  >
                    <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold font-mono">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-800 group-hover:text-blue-700">
                        <span className="truncate">{result.title || hostFromUrl(result.url)}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-60" aria-hidden />
                      </span>
                      <span className="block text-[10px] text-blue-600/80 truncate mt-0.5">
                        {result.url}
                      </span>
                      {result.snippet && (
                        <span className="block text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                          {result.snippet}
                        </span>
                      )}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

interface CodeBlockCardProps {
  language: string;
  code: string;
}

const CodeBlockCard: React.FC<CodeBlockCardProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable');
      }
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const lineCount = code.split('\n').length;

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0d131f] text-slate-100 shadow-xl overflow-hidden my-2.5 max-w-full min-w-0">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#090d16] border-b border-slate-800 text-[11px] gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="w-3.5 h-3.5 text-[#00DFFF] shrink-0" />
          <span className="font-mono font-bold uppercase tracking-wider text-slate-300 truncate">
            {language}
          </span>
          <span className="text-[10px] text-slate-500 font-mono shrink-0">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 hover:text-white text-slate-300 transition-colors text-[11px] font-semibold shrink-0"
          title="Copy full code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="p-3 sm:p-4 overflow-x-auto max-h-[min(500px,55vh)] overflow-y-auto font-mono text-[11px] sm:text-[12px] leading-relaxed text-slate-200">
        <pre className="m-0 font-inherit min-w-0">
          <code>{highlightCode(code, language)}</code>
        </pre>
      </div>
    </div>
  );
};

function highlightCode(code: string, _language: string): React.ReactNode[] {
  const lines = code.split('\n');

  return lines.map((line, lineIdx) => {
    const tokens = tokenizeLine(line);

    return (
      <div key={lineIdx} className="table-row">
        <span className="table-cell pr-3 sm:pr-4 select-none text-slate-600 text-right text-[11px] w-8">
          {lineIdx + 1}
        </span>
        <span className="table-cell whitespace-pre">{tokens}</span>
      </div>
    );
  });
}

function tokenizeLine(line: string): React.ReactNode[] {
  if (!line) return ['\n'];

  const trimmed = line.trim();
  if (trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return [<span key={0} className="text-slate-500 italic">{line}</span>];
  }

  const regex = /(".*?"|'.*?'|`.*?`|\b(?:def|class|return|import|from|export|const|let|var|function|async|await|if|else|elif|for|while|try|except|catch|finally|with|as|in|of|switch|case|default|break|continue|type|interface|extends|implements|new|this|throw)\b|\b(?:str|int|float|bool|list|dict|Promise|Array|Record|string|number|boolean|any|void|null|undefined|true|false|None|True|False)\b|\b\d+\b|[{}()[\].,;:+\-*/%=<>!&|^~]+|\s+|[a-zA-Z_$][a-zA-Z0-9_$]*)/g;

  const nodes: React.ReactNode[] = [];
  let match: RegExpExecArray | null;
  let idx = 0;

  const keywords = new Set([
    'def', 'class', 'return', 'import', 'from', 'export', 'const', 'let', 'var', 'function',
    'async', 'await', 'if', 'else', 'elif', 'for', 'while', 'try', 'except', 'catch', 'finally',
    'with', 'as', 'in', 'of', 'switch', 'case', 'default', 'break', 'continue', 'type', 'interface',
    'extends', 'implements', 'new', 'this', 'throw'
  ]);

  const builtins = new Set([
    'str', 'int', 'float', 'bool', 'list', 'dict', 'Promise', 'Array', 'Record', 'string',
    'number', 'boolean', 'any', 'void', 'null', 'undefined', 'true', 'false', 'None', 'True', 'False'
  ]);

  while ((match = regex.exec(line)) !== null) {
    const token = match[0];
    if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
      nodes.push(<span key={idx++} className="text-emerald-300">{token}</span>);
    } else if (keywords.has(token)) {
      nodes.push(<span key={idx++} className="text-[#00DFFF] font-bold">{token}</span>);
    } else if (builtins.has(token)) {
      nodes.push(<span key={idx++} className="text-purple-300">{token}</span>);
    } else if (/^\d+$/.test(token)) {
      nodes.push(<span key={idx++} className="text-amber-300">{token}</span>);
    } else {
      nodes.push(token);
    }
  }

  return nodes.length > 0 ? nodes : [line];
}

type RichSegment =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] };

/**
 * Split assistant text into paragraphs, headings, and lists while preserving
 * fenced-code-free markdown structure.
 */
export function segmentRichText(text: string): RichSegment[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const segments: RichSegment[] = [];
  let paragraphBuf: string[] = [];
  let listBuf: { type: 'ul' | 'ol'; items: string[] } | null = null;

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
      const level = Math.min(headingMatch[1].length, 3) as 1 | 2 | 3;
      segments.push({ kind: 'heading', level, text: headingMatch[2] });
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

const RichTextBlock: React.FC<{ text: string; sources: SearchResultItem[] }> = ({
  text,
  sources,
}) => {
  const segments = segmentRichText(text);

  return (
    <div className="space-y-2 min-w-0">
      {segments.map((segment, idx) => {
        if (segment.kind === 'heading') {
          const Tag = (`h${segment.level + 2}` as 'h3' | 'h4' | 'h5');
          const size =
            segment.level === 1
              ? 'text-sm sm:text-base font-extrabold'
              : segment.level === 2
                ? 'text-xs sm:text-sm font-bold'
                : 'text-xs font-bold';
          return (
            <Tag key={idx} className={`${size} text-slate-900 tracking-tight`}>
              {formatInlineElements(segment.text, sources)}
            </Tag>
          );
        }

        if (segment.kind === 'ul') {
          return (
            <ul key={idx} className="list-disc pl-4 space-y-1 text-slate-800">
              {segment.items.map((item, i) => (
                <li key={i} className="leading-relaxed">
                  {formatInlineElements(item, sources)}
                </li>
              ))}
            </ul>
          );
        }

        if (segment.kind === 'ol') {
          return (
            <ol key={idx} className="list-decimal pl-4 space-y-1 text-slate-800">
              {segment.items.map((item, i) => (
                <li key={i} className="leading-relaxed">
                  {formatInlineElements(item, sources)}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={idx} className="whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
            {formatInlineElements(segment.text, sources)}
          </p>
        );
      })}
    </div>
  );
};

/**
 * Inline formatting: code, bold, markdown links, bare URLs, and citation markers.
 * Citation forms: [1], [Source][1], [[1]] mapped to search.results[n-1] when present.
 */
export function formatInlineElements(
  text: string,
  sources: SearchResultItem[] = [],
): React.ReactNode[] {
  // Groups: 1=code, 2=bold, 3=md-label, 4=md-url, 5=source-n, 6=dbl-n, 7=bare-n, 8=bare-url
  const regex =
    /(`[^`]+`)|\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\[Source\]\s*\[(\d+)\]|\[\[(\d+)\]\]|\[(\d+)\]|(https?:\/\/[^\s<>()\[\]"]+)/gi;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];

    if (match[1]) {
      nodes.push(
        <code
          key={nodes.length}
          className="px-1.5 py-0.5 rounded-md bg-blue-50 border border-blue-200/60 font-mono text-[11px] text-blue-700 font-semibold break-all"
        >
          {match[1].slice(1, -1)}
        </code>,
      );
    } else if (match[2]) {
      nodes.push(
        <strong key={nodes.length} className="font-bold text-slate-900">
          {match[2]}
        </strong>,
      );
    } else if (match[3] && match[4]) {
      nodes.push(
        <a
          key={nodes.length}
          href={match[4]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 underline underline-offset-2 break-all"
        >
          {match[3]}
        </a>,
      );
    } else if (match[5] || match[6] || match[7]) {
      const n = Number(match[5] || match[6] || match[7]);
      nodes.push(<CitationChip key={nodes.length} index={n} sources={sources} />);
    } else if (match[8]) {
      nodes.push(
        <a
          key={nodes.length}
          href={match[8]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 underline underline-offset-2 break-all"
        >
          {match[8]}
        </a>,
      );
    } else {
      nodes.push(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

const CitationChip: React.FC<{ index: number; sources: SearchResultItem[] }> = ({
  index,
  sources,
}) => {
  const source = Number.isFinite(index) && index >= 1 ? sources[index - 1] : undefined;

  if (source?.url) {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        title={source.title || source.url}
        className="inline-flex items-center justify-center mx-0.5 px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold font-mono hover:bg-blue-200 align-baseline no-underline"
      >
        [{index}]
      </a>
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center mx-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold font-mono align-baseline"
      title="Source metadata unavailable"
    >
      [{index}]
    </span>
  );
};
