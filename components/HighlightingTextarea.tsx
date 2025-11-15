
import React, { useRef, useLayoutEffect, useCallback } from 'react';
import type { Assignment, Selection } from '../types';
import { hexToRgba } from '../utils';

interface HighlightingTextareaProps {
  text: string;
  assignments: Assignment[];
  onTextChange: (text: string) => void;
  onSelect: (selection: Selection | null) => void;
  speakerColors: { [key: string]: string };
  id: string; // Add id to the props
}

export const HighlightingTextarea: React.FC<HighlightingTextareaProps> = ({
  text,
  assignments,
  onTextChange,
  onSelect,
  speakerColors,
  id, // Destructure id from props
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightsRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (highlightsRef.current && textareaRef.current) {
      highlightsRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightsRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  useLayoutEffect(() => {
    handleScroll();
  }, [text, assignments, handleScroll]);

  const renderHighlights = () => {
    const sortedAssignments = [...assignments].sort((a, b) => a.start - b.start);
    const parts = [];
    let lastIndex = 0;

    sortedAssignments.forEach((assignment) => {
      // Add text before the current assignment (if any)
      if (assignment.start > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, assignment.start)}</span>);
      }
      // Add the highlighted text
      const hexColor = speakerColors[assignment.speakerId] || '#FFFFFF';
      const color = hexToRgba(hexColor, 0.3);

      parts.push(
        <span key={`assignment-${assignment.id}`} style={{ backgroundColor: color }} className="rounded-sm">
          {text.substring(assignment.start, assignment.end)}
        </span>
      );
      lastIndex = assignment.end;
    });

    // Add any remaining text after the last assignment
    if (lastIndex < text.length) {
      parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>);
    }
     // Add a trailing newline to ensure the last line height is matched
    parts.push(<br key="final-break" />);

    return parts;
  };
  
  const handleSelectionChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      const target = e.currentTarget;
      onSelect({ start: target.selectionStart, end: target.selectionEnd });
  };
  
  const commonStyles: React.CSSProperties = {
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    padding: '1rem',
    fontSize: '1rem',
    lineHeight: '1.5rem',
    fontFamily: 'monospace',
    border: '1px solid transparent',
    borderRadius: '0.5rem',
  };

  return (
    <div className="relative w-full h-full">
      <div
        ref={highlightsRef}
        className="absolute inset-0 overflow-auto pointer-events-none text-gray-100"
        style={commonStyles}
      >
        {renderHighlights()}
      </div>
      <textarea
        id={id} // Pass id to the textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        onScroll={handleScroll}
        onSelect={handleSelectionChange}
        spellCheck="false"
        className="absolute inset-0 w-full h-full resize-none bg-transparent text-transparent caret-indigo-400 focus:outline-none"
        style={commonStyles}
      />
    </div>
  );
};
