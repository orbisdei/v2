// React Native port of the web app's lib/richText.tsx.
// Supported markup (same grammar): newlines, [label](url) links
// (https?:// only), **bold**, *italic*. Renders nested <Text> nodes;
// links open in the system browser.

import React from 'react';
import { Linking, Text, type StyleProp, type TextStyle } from 'react-native';

// Returns the normalized URL only if it parses and is plain http(s);
// anything else (javascript:, data:, malformed) is rejected.
function toSafeHttpUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
  } catch {
    // fall through
  }
  return null;
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
      parts.push(
        <Text key={key++} style={{ fontWeight: 'bold' }}>
          {match[2]}
        </Text>
      );
    } else {
      parts.push(
        <Text key={key++} style={{ fontStyle: 'italic' }}>
          {match[3]}
        </Text>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
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
    const href = toSafeHttpUrl(match[2]);
    if (href) {
      parts.push(
        <Text
          key={key++}
          style={{ textDecorationLine: 'underline' }}
          onPress={() => Linking.openURL(href)}
        >
          {match[1]}
        </Text>
      );
    } else {
      parts.push(...formatInline(match[1], key));
      key += 100;
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(...formatInline(text.slice(lastIndex), key));
  }

  return parts;
}

interface RichTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/** The ONLY correct way to render short_description / tag descriptions —
 *  mobile counterpart of the web SiteDescription component. */
export function RichText({ text, style, numberOfLines }: RichTextProps) {
  const lines = text.split('\n');
  const children: React.ReactNode[] = [];
  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) children.push('\n');
    children.push(...formatLine(line, lineIndex * 10000));
  });
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}
