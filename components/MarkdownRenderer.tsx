import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const renderInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const raw = match[0];
      if (raw.startsWith('`')) {
        parts.push(
          <code key={match.index} className="bg-stone-100 dark:bg-stone-800 text-amber-700 dark:text-amber-400 px-1 py-0.5 rounded text-sm font-mono">
            {raw.slice(1, -1)}
          </code>
        );
      } else {
        parts.push(<strong key={match.index}>{raw.slice(2, -2)}</strong>);
      }
      lastIndex = match.index + raw.length;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts;
  };

  const renderBlock = (lines: string[]): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Fenced code block
      if (line.startsWith('```')) {
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        nodes.push(
          <pre key={i} className="bg-stone-900 dark:bg-stone-950 text-stone-100 p-4 rounded-lg text-sm font-mono overflow-x-auto my-3">
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        continue;
      }

      // h2
      if (line.startsWith('## ')) {
        nodes.push(
          <h2 key={i} className="text-lg font-bold text-stone-800 dark:text-stone-100 mt-5 mb-2">
            {renderInline(line.slice(3))}
          </h2>
        );
        i++;
        continue;
      }

      // h3
      if (line.startsWith('### ')) {
        nodes.push(
          <h3 key={i} className="text-base font-semibold text-stone-700 dark:text-stone-200 mt-4 mb-1.5">
            {renderInline(line.slice(4))}
          </h3>
        );
        i++;
        continue;
      }

      // h4
      if (line.startsWith('#### ')) {
        nodes.push(
          <h4 key={i} className="text-sm font-semibold text-stone-700 dark:text-stone-300 mt-3 mb-1">
            {renderInline(line.slice(5))}
          </h4>
        );
        i++;
        continue;
      }

      // Unordered list
      if (line.match(/^[-*] /)) {
        const listItems: React.ReactNode[] = [];
        while (i < lines.length && lines[i].match(/^[-*] /)) {
          listItems.push(
            <li key={i} className="ml-4 text-stone-700 dark:text-stone-300">
              {renderInline(lines[i].slice(2))}
            </li>
          );
          i++;
        }
        nodes.push(
          <ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-2">
            {listItems}
          </ul>
        );
        continue;
      }

      // Ordered list
      if (line.match(/^\d+\. /)) {
        const listItems: React.ReactNode[] = [];
        while (i < lines.length && lines[i].match(/^\d+\. /)) {
          const text = lines[i].replace(/^\d+\. /, '');
          listItems.push(
            <li key={i} className="ml-4 text-stone-700 dark:text-stone-300">
              {renderInline(text)}
            </li>
          );
          i++;
        }
        nodes.push(
          <ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 my-2">
            {listItems}
          </ol>
        );
        continue;
      }

      // Blank line — paragraph break (skip)
      if (line.trim() === '') {
        i++;
        continue;
      }

      // Paragraph
      nodes.push(
        <p key={i} className="text-stone-700 dark:text-stone-300 leading-relaxed my-1.5">
          {renderInline(line)}
        </p>
      );
      i++;
    }

    return nodes;
  };

  const lines = content.split('\n');

  return (
    <div className={`prose-sm max-w-none ${className}`}>
      {renderBlock(lines)}
    </div>
  );
};

export default MarkdownRenderer;
