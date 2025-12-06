'use client';

import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  text: string;
  className?: string;
}

type Segment =
  | { type: 'text'; value: string }
  | { type: 'math'; value: string; display: boolean };

function splitMath(text: string): Segment[] {
  const segments: Segment[] = [];
  const pattern = /(\$\$[^$]+\$\$|\$[^$]+\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    const display = raw.startsWith('$$');
    const value = raw.slice(display ? 2 : 1, display ? -2 : -1);
    segments.push({ type: 'math', value, display });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  if (segments.length === 0) {
    return [{ type: 'text', value: text }];
  }
  return segments;
}

export default function MathText({ text, className }: MathTextProps) {
  const normalized = useMemo(() => {
    const raw = text ?? '';
    if (!raw.includes('$') && /\\[a-zA-Z]+/.test(raw)) {
      return `$${raw}$`;
    }
    return raw;
  }, [text]);

  const parts = useMemo(() => splitMath(normalized), [normalized]);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.value}</span>;
        }
        const html = katex.renderToString(part.value, { throwOnError: false, displayMode: part.display });
        return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </span>
  );
}
