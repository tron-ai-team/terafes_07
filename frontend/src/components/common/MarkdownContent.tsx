import React, { useState } from 'react';
import { Copy, Check, Terminal, Code2, AlertTriangle, Search, ExternalLink } from 'lucide-react';
import { SearchStatus } from '../../types/chat';

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
  // Parse message into text blocks and fenced code blocks
  const parseBlocks = (text: string): ParsedBlock[] => {
    const blocks: ParsedBlock[] = [];
    // Regex matches ```[optional language]\n[code]``` or unclosed fence if truncated
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
    return <div className="whitespace-pre-wrap leading-relaxed">{content}</div>;
  }

  const blocks = parseBlocks(content);

  return (
    <div className="space-y-3 leading-relaxed text-slate-800">
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
        return <RichTextParagraph key={idx} text={block.content} />;
      })}

      {/* Truncation warning banner if token cap was hit */}
      {(truncated || finishReason === 'length') && (
        <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-300 text-amber-900 text-xs flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Response truncated:</strong> The model reached its maximum token output limit (1,536 tokens). Type{' '}
            <code className="bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-mono font-bold">continue</code> to generate the rest of the code.
          </span>
        </div>
      )}

      {/* Web search status indicator if search was performed or unavailable */}
      {search && search.mode !== 'off' && (
        <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Search className="w-3 h-3 text-slate-400" />
            <span>Search ({search.mode}):</span>
            {search.status === 'unavailable' ? (
              <span className="text-amber-600 font-medium">Provider unavailable (no API configured)</span>
            ) : search.status === 'ok' && search.results && search.results.length > 0 ? (
              <span className="text-emerald-600 font-medium">{search.results.length} results referenced</span>
            ) : (
              <span className="text-slate-400">Skipped (general reasoning query)</span>
            )}
          </div>
          {search.query && (
            <span className="italic truncate max-w-[200px]" title={search.query}>
              "{search.query}"
            </span>
          )}
        </div>
      )}
    </div>
  );
};

interface CodeBlockCardProps {
  language: string;
  code: string;
}

const CodeBlockCard: React.FC<CodeBlockCardProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = code.split('\n').length;

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0d131f] text-slate-100 shadow-xl overflow-hidden my-2.5">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#090d16] border-b border-slate-800 text-[11px]">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-[#00DFFF]" />
          <span className="font-mono font-bold uppercase tracking-wider text-slate-300">
            {language}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 hover:text-white text-slate-300 transition-colors text-[11px] font-semibold"
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
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body with Highlighting and Scrollbars */}
      <div className="p-4 overflow-x-auto max-h-[500px] overflow-y-auto font-mono text-[12px] leading-relaxed text-slate-200">
        <pre className="m-0 font-inherit">
          <code>{highlightCode(code, language)}</code>
        </pre>
      </div>
    </div>
  );
};

/**
 * Lightweight, zero-dependency syntax highlighter for Python, TypeScript, JS, HTML/CSS, JSON, SQL.
 */
function highlightCode(code: string, _language: string): React.ReactNode[] {
  const lines = code.split('\n');

  return lines.map((line, lineIdx) => {
    // Regex for comments, strings, keywords, numbers, types
    const tokens = tokenizeLine(line);

    return (
      <div key={lineIdx} className="table-row">
        <span className="table-cell pr-4 select-none text-slate-600 text-right text-[11px] w-8">
          {lineIdx + 1}
        </span>
        <span className="table-cell whitespace-pre">{tokens}</span>
      </div>
    );
  });
}

function tokenizeLine(line: string): React.ReactNode[] {
  // If line is empty
  if (!line) return ['\n'];

  // Check for whole line comment
  const trimmed = line.trim();
  if (trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return [<span key={0} className="text-slate-500 italic">{line}</span>];
  }

  // Tokenize words, strings, symbols
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

/**
 * Formats rich text paragraphs with inline code blocks, bold text, and line breaks.
 */
const RichTextParagraph: React.FC<{ text: string }> = ({ text }) => {
  const paragraphs = text.split('\n\n');

  return (
    <div className="space-y-2">
      {paragraphs.map((p, pIdx) => {
        if (!p.trim()) return null;
        // Format inline code and bold
        const parts = formatInlineElements(p);
        return (
          <p key={pIdx} className="whitespace-pre-wrap leading-relaxed">
            {parts}
          </p>
        );
      })}
    </div>
  );
};

function formatInlineElements(text: string): React.ReactNode[] {
  // Matches inline code `code` or bold **bold**
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={nodes.length}
          className="px-1.5 py-0.5 rounded-md bg-blue-50 border border-blue-200/60 font-mono text-[11px] text-blue-700 font-semibold"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={nodes.length} className="font-bold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}
