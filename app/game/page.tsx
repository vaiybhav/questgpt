'use client';

import Link from 'next/link';
import { ArrowLeft, Share2 } from 'lucide-react';
import StoryDisplay, { StoryDisplayHandle } from '@/components/StoryDisplay';
import CommandInput, { CommandInputHandle } from '@/components/CommandInput';
import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { getGenreName } from '@/components/GenreSelector';
import ReactMarkdown from 'react-markdown';
import ImageGeneratorPill from '@/components/ImageGeneratorPill';
import ImageIcon from '@/components/icons/ImageIcon';
import { 
  containsProhibitedContent, 
  filterProhibitedContent, 
  getContentWarningMessage,
  isEducationalResponse 
} from '@/lib/contentFilter';

// Story templates for different genres
const storyTemplates = {
  fantasy: "Welcome to your fantasy adventure! Create any character you want - a warrior, rogue, wizard, or something unique. What's your story?",
  mystery: "Ready to solve a mystery? You could be a detective, witness, or even the culprit. Where should we begin?",
  "sci-fi": "The cosmos awaits! Whether you're an explorer, rebel, or something else entirely - the universe is yours to shape."
};

const defaultStory = "Welcome! Tell me about your character or the world you want to explore. The story is in your hands.";

// Basic types
type StorySegment = {
  id: number;
  text: string;
  type: 'user' | 'narrator';
};

type Genre = 'fantasy' | 'mystery' | 'sci-fi';

// Define interfaces for custom component props
interface MarkdownComponentProps {
  children?: ReactNode;
  href?: string;
  className?: string;
}

export default function GamePage() {
  const params = useSearchParams();
  const genre = (params.get('genre') || 'fantasy') as Genre;
  const genreName = getGenreName(genre);
  
  // State
  const [log, setLog] = useState<StorySegment[]>([{ id: 0, text: storyTemplates[genre] || defaultStory, type: 'narrator' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImages, setShowImages] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [currentId, setCurrentId] = useState(0);

  // Refs
  const storyRef = useRef<StoryDisplayHandle>(null);
  const inputRef = useRef<CommandInputHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle genre selection/persistence
  useEffect(() => {
    const savedGenre = localStorage.getItem('quest-genre');
    if (!params.get('genre') && savedGenre && savedGenre !== 'fantasy') {
      window.location.href = `/game?genre=${savedGenre}`;
    } else {
      localStorage.setItem('quest-genre', genre);
    }
  }, [genre, params]);

  // Auto-scroll and focus handling
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    
    document.title = `Quest Adventure - ${genreName}`;
    
    if (!loading && inputRef.current) {
      inputRef.current.focusInput();
    }
  }, [log, genreName, loading]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focusInput(), 500);
  }, []);

  // Get context for story generation
  const getContext = () => {
    const current = log.find(s => s.id === currentId && s.type === 'narrator');
    const promptText = current?.text || log[log.length - 1]?.text || defaultStory;

    const history = log.slice(-10).map(s => 
      s.type === 'user' ? 
        `Player: ${s.text.replace('> ', '')}` : 
        `Narrator: ${s.text}`
    ).join('\n\n');

    return { history, currentPrompt: promptText };
  };

  // Handle command submission
  const handleCommand = async (cmd: string) => {
    if (!cmd.trim()) return;
    
    setError(null);
    setLog(prev => [...prev, { id: prev.length, text: `> ${cmd}`, type: 'user' }]);
    
    const last = log[log.length - 1];
    if (last?.type === 'narrator' && last.id === currentId && storyRef.current) {
      storyRef.current.forceComplete();
    }

    if (containsProhibitedContent(cmd)) {
      setError("Let's keep it family-friendly!");
      return;
    }
    
    setLoading(true);
    setCurrentId(-1);

    try {
      const res = await fetch('/api/game/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: cmd,
          context: getContext().history,
          genre
        })
      });

      if (!res.ok) throw new Error('Failed to get response');

      const { response } = await res.json();
      const filtered = filterProhibitedContent(response);
      
      setLog(prev => [...prev, { 
        id: prev.length + 1,
        text: filtered,
        type: 'narrator'
      }]);
      setCurrentId(log.length + 1);

    } catch (err) {
      console.error(err);
      setError('Something went wrong - try again?');
      setLog(prev => [...prev, {
        id: prev.length + 1,
        text: 'The story pauses momentarily...',
        type: 'narrator'
      }]);
      setCurrentId(log.length + 1);
    }

    setLoading(false);
  };

  // Markdown styling
  const mdStyles = {
    p: ({children}: MarkdownComponentProps) => <span className="leading-relaxed">{children}</span>,
    strong: ({children}: MarkdownComponentProps) => <span className="font-bold">{children}</span>,
    em: ({children}: MarkdownComponentProps) => <span className="italic">{children}</span>,
    h1: ({children}: MarkdownComponentProps) => <h1 className="text-xl font-bold text-purple-300 mt-3 mb-2">{children}</h1>,
    h2: ({children}: MarkdownComponentProps) => <h2 className="text-lg font-bold text-purple-200 mt-2 mb-1">{children}</h2>,
    h3: ({children}: MarkdownComponentProps) => <h3 className="text-md font-bold text-purple-100 mt-2 mb-1">{children}</h3>,
    ul: ({children}: MarkdownComponentProps) => <ul className="list-disc pl-5 my-2">{children}</ul>,
    ol: ({children}: MarkdownComponentProps) => <ol className="list-decimal pl-5 my-2">{children}</ol>,
    li: ({children}: MarkdownComponentProps) => <li className="my-1">{children}</li>,
    a: ({href, children}: MarkdownComponentProps) => (
      <a href={href} className="text-purple-400 hover:text-purple-300 underline" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    code: ({children, className}: MarkdownComponentProps) => (
      <code className={`${className || ''} bg-purple-900/40 px-1 py-0.5 rounded text-sm`}>
        {children}
      </code>
    ),
    hr: () => <hr className="border-purple-700/50 my-4" />,
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      <header className="flex items-center justify-between p-4 bg-gray-800 shadow-md fixed top-0 left-0 right-0 z-10">
        <Link href="/" className="flex items-center text-purple-400 hover:text-purple-300">
          <ArrowLeft size={20} className="mr-2" />
          <span className="text-lg font-semibold">Back</span>
        </Link>
        <button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md flex items-center">
          <Share2 size={18} className="mr-2" />
          Share
        </button>
      </header>

      <main className="flex-grow overflow-hidden p-6 pt-24 pb-32 bg-gray-900 flex flex-row justify-center items-start gap-4">
        <div ref={containerRef} className="flex-1 max-w-3xl flex flex-col space-y-4 overflow-y-auto h-full bg-gray-800/40 p-4 rounded-lg shadow-xl border border-purple-700/30">
          {log.map(segment => {
            if (segment.id === currentId && segment.type === 'narrator') {
              return (
                <StoryDisplay 
                  key={segment.id}
                  ref={storyRef}
                  story={segment.text}
                  speed={15}
                  onTypingComplete={() => inputRef.current?.focusInput()}
                  genreName={genreName}
                  onImageButtonClick={() => {
                    setPrompt(getContext().currentPrompt);
                    setShowImages(true);
                  }}
                  isPrimaryDisplay={true}
                />
              );
            }

            const isUser = segment.type === 'user';
            return (
              <div key={segment.id} className={`p-4 rounded-lg shadow ${
                isUser ? 'bg-purple-700/50 text-purple-100 self-end ml-auto' : 
                'bg-gray-700/50 text-gray-200 self-start mr-auto'
              } w-auto max-w-[85%]`}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-sm font-medium ${isUser ? 'text-purple-300' : 'text-purple-400'}`}>
                    {isUser ? 'You' : genreName}
                  </span>
                  {!isUser && segment.id !== 0 && (
                    <button 
                      onClick={() => {
                        setPrompt(segment.text);
                        setShowImages(true);
                      }}
                      className="ml-2 p-1 rounded-md hover:bg-purple-600/70"
                      title="Generate image"
                    >
                      <ImageIcon className="w-4 h-4 text-purple-300 hover:text-purple-100" />
                    </button>
                  )}
                </div>
                <ReactMarkdown components={mdStyles}>{segment.text}</ReactMarkdown>
              </div>
            );
          })}

          {error && (
            <div className="mt-4 p-3 bg-red-700/30 text-red-300 border border-red-500 rounded-md">
              {error}
            </div>
          )}
        </div>

        {showImages && (
          <div className="h-full w-full max-w-md sm:max-w-lg md:max-w-xl">
            <ImageGeneratorPill 
              isOpen={showImages}
              onClose={() => setShowImages(false)}
              prompt={prompt}
            />
          </div>
        )}
      </main>

      <CommandInput 
        ref={inputRef}
        onCommandSubmit={handleCommand}
        disabled={loading}
        placeholder={loading ? "Processing..." : "What happens next?"}
      />
    </div>
  );
} 