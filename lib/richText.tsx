import React from 'react';

// Parses minimal markup into React elements.
// Supported: newlines → <br>, [label](url) links (https?:// only), **bold**, *italic*
export function formatRichText(text: string): React.ReactNode {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      result.push(<br key={`br-${lineIndex}`} />);
    }
    result.push(...formatLine(line, lineIndex * 10000));
  });

  return <>{result}</>;
}

function formatLine(text: string, baseKey: number): React.ReactNode[] {
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = baseKey;

  while ((match = linkPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...formatInline(text.slice(lastIndex, match.index), key));
      key += 100;
    }
    parts.push(
      <a
        key={key++}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        {match[1]}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(...formatInline(text.slice(lastIndex), key));
  }

  return parts;
}

function formatInline(text: string, baseKey: number): React.ReactNode[] {
  const inlinePattern = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = baseKey;

  while ((match = inlinePattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[0].startsWith('**')) {
      parts.push(<strong key={key++}>{match[2]}</strong>);
    } else {
      parts.push(<em key={key++}>{match[3]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
