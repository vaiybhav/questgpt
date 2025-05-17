'use client';

import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import ImageIcon from '@/components/icons/ImageIcon';

export interface StoryDisplayHandle {
  forceComplete: () => void;
}

interface StoryDisplayProps {
  story: string;
  speed?: number;
  onTypingComplete?: () => void;
  genreName?: string;
  onImageButtonClick?: () => void;
  isPrimaryDisplay?: boolean;
}

// Create interfaces for custom component props
interface MarkdownComponentProps {
  children?: ReactNode;
  href?: string;
  className?: string;
}

const StoryDisplay = forwardRef<StoryDisplayHandle, StoryDisplayProps>(({ story, speed = 30, onTypingComplete, genreName, onImageButtonClick, isPrimaryDisplay }, ref) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const storyRef = useRef(story);
  const onTypingCompleteRef = useRef(onTypingComplete);

  useEffect(() => {
    storyRef.current = story;
    onTypingCompleteRef.current = onTypingComplete;
  });

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setDisplayedText('');
    setIsTyping(false);

    if (storyRef.current && storyRef.current.length > 0) {
      if (speed <= 0) {
        setDisplayedText(storyRef.current);
        setIsTyping(false);
        if (onTypingCompleteRef.current) onTypingCompleteRef.current();
        return;
      }

      setIsTyping(true);
      let currentIndex = 0;
      intervalRef.current = setInterval(() => {
        if (currentIndex < storyRef.current.length) {
          setDisplayedText(storyRef.current.substring(0, currentIndex + 1));
          currentIndex++;
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setIsTyping(false);
          if (onTypingCompleteRef.current) onTypingCompleteRef.current();
        }
      }, speed);
    } else {
      setDisplayedText(storyRef.current || ''); 
      setIsTyping(false);
      if (onTypingCompleteRef.current) onTypingCompleteRef.current();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [story, speed]);

  useImperativeHandle(ref, () => ({
    forceComplete: () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setDisplayedText(storyRef.current);
      setIsTyping(false);
      if (onTypingCompleteRef.current) {
        onTypingCompleteRef.current(); 
      }
    },
  }));

  // Define custom Markdown components to maintain the styling
  const markdownComponents = {
    p: ({children}: MarkdownComponentProps) => <span className="text-gray-200 leading-relaxed">{children}</span>,
    strong: ({children}: MarkdownComponentProps) => <span className="text-gray-100 font-bold">{children}</span>,
    em: ({children}: MarkdownComponentProps) => <span className="text-gray-100 italic">{children}</span>,
    
    // Headings
    h1: ({children}: MarkdownComponentProps) => <h1 className="text-xl font-bold text-purple-300 mt-3 mb-2">{children}</h1>,
    h2: ({children}: MarkdownComponentProps) => <h2 className="text-lg font-bold text-purple-200 mt-2 mb-1">{children}</h2>,
    h3: ({children}: MarkdownComponentProps) => <h3 className="text-md font-bold text-purple-100 mt-2 mb-1">{children}</h3>,
    
    // Lists
    ul: ({children}: MarkdownComponentProps) => <ul className="list-disc pl-5 my-2">{children}</ul>,
    ol: ({children}: MarkdownComponentProps) => <ol className="list-decimal pl-5 my-2">{children}</ol>,
    li: ({children}: MarkdownComponentProps) => <li className="text-gray-200 my-1">{children}</li>,
    
    // Links
    a: ({href, children}: MarkdownComponentProps) => (
      <a 
        href={href} 
        className="text-purple-400 hover:text-purple-300 underline" 
        target="_blank" 
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    
    // Code blocks
    code: ({children, className}: MarkdownComponentProps) => (
      <code className={`${className || ''} bg-purple-900/40 px-1 py-0.5 rounded text-sm`}>
        {children}
      </code>
    ),
    
    // Horizontal rule
    hr: () => <hr className="border-purple-700/50 my-4" />
  };

  // Base classes for the message bubble
  const bubbleBaseClasses = "p-4 rounded-lg shadow w-auto max-w-[85%]";
  // Classes for AI message bubble (similar to historical AI messages)
  const aiBubbleClasses = `${bubbleBaseClasses} bg-gray-700/50 text-gray-200 self-start mr-auto`;

  return (
    // Applied bubble styling to the root of StoryDisplay
    <div className={aiBubbleClasses}>
      {isPrimaryDisplay && genreName && ( 
        <div className="flex justify-between items-center mb-1 pb-1 border-b border-purple-600/30">
          <h1 className="text-sm font-medium text-purple-300">{genreName} AI</h1> 
          {onImageButtonClick && (
            <button 
              onClick={onImageButtonClick} 
              className="p-1 rounded-md hover:bg-purple-600/70 transition-colors"
              aria-label="Generate Image"
              title="Generate image from this message"
            >
              <ImageIcon className="w-4 h-4 text-purple-300 hover:text-purple-100" />
            </button>
          )}
        </div>
      )}
      {/* Removed explicit padding from this div as parent now has it */}
      <div className="text-gray-200 leading-relaxed whitespace-pre-wrap pt-1 min-h-[3rem]"> 
        <ReactMarkdown components={markdownComponents}>
          {displayedText}
        </ReactMarkdown>
        {isTyping && <span className="animate-blink ml-px">|</span>}
      </div>
    </div>
  );
});

StoryDisplay.displayName = "StoryDisplay";
export default StoryDisplay; 