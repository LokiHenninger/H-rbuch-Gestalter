
import React, { useRef, useLayoutEffect, useCallback } from 'react';
import type { Assignment, Selection, AtmosphereSuggestion } from '../types';
import { hexToRgba } from '../utils';

interface HighlightingTextareaProps {
  text: string;
  assignments: Assignment[];
  atmosphereSuggestions: AtmosphereSuggestion[];
  onTextChange: (text: string) => void;
  onSelect: (selection: Selection | null) => void;
  speakerColors: { [key: string]: string };
  id: string;
}

interface Segment {
  start: number;
  end: number;
  assignment?: Assignment;
  atmosphere?: AtmosphereSuggestion;
}

export const HighlightingTextarea: React.FC<HighlightingTextareaProps> = ({
  text,
  assignments,
  atmosphereSuggestions,
  onTextChange,
  onSelect,
  speakerColors,
  id,
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
  }, [text, assignments, atmosphereSuggestions, handleScroll]);

  const renderHighlights = () => {
    // Create a set of all "change points" in the text
    const points = new Set([0, text.length]);
    [...assignments, ...atmosphereSuggestions].forEach(item => {
      points.add(item.start);
      points.add(item.end);
    });

    // Sort the points to create segments
    const sortedPoints = Array.from(points).sort((a, b) => a - b);
    
    const segments = [];
    for (let i = 0; i < sortedPoints.length - 1; i++) {
        const start = sortedPoints[i];
        const end = sortedPoints[i + 1];

        if (start >= end) continue; // Skip zero-length segments

        const midPoint = start + (end - start) / 2;

        // Find which assignment and atmosphere apply to this segment
        const assignment = assignments.find(a => midPoint >= a.start && midPoint < a.end);
        const atmosphere = atmosphereSuggestions.find(s => midPoint >= s.start && midPoint < s.end);
        
        const segmentText = text.substring(start, end);

        const style: React.CSSProperties = {};
        if (assignment) {
            const hexColor = speakerColors[assignment.speakerId] || '#FFFFFF';
            style.backgroundColor = hexToRgba(hexColor, 0.3);
        }
        if (atmosphere) {
            style.textDecoration = 'underline wavy rgba(59, 130, 246, 0.7)'; // blue-500
            style.textDecorationSkipInk = 'none';
        }

        segments.push(
            <span key={`${start}-${end}`} style={style} title={atmosphere?.description}>
                {segmentText}
            </span>
        );
    }
    
    segments.push(<br key="final-break" />);

    return segments;
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
