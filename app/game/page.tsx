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

const initialStoryTemplates = {
  fantasy: "Welcome to your fantasy adventure! I'm here to help you create the story YOU want to experience. You can be a mighty warrior, a cunning rogue, a powerful wizard, or anything else you imagine. What kind of character would you like to play as? Or would you like to describe the world and situation you'd like to start in? You're in control - tell me how you want your adventure to begin!",
  
  mystery: "Welcome to your mystery adventure! You're in control of this story. Who are you - a detective, a witness, a suspect? What mystery would you like to solve? You can set this anywhere from a Victorian mansion to a cyberpunk metropolis. Or, if you prefer, I can suggest some starting scenarios. How would you like your mystery to begin?",
  
  "sci-fi": "Welcome to your sci-fi adventure! This universe is yours to shape. Are you an explorer, a rebel, an AI, or something entirely different? Would you like to explore distant stars, future Earth, or an alien civilization? Tell me about your character or the world you want to create, and we'll begin your cosmic journey. You're in control - how does your story start?"
};

const defaultInitialStory = "Welcome to your adventure! I'm here to help you create exactly the story you want to experience. You can tell me what kind of character you want to play as, what setting you'd like, or what kind of quest you're interested in. You can even create multiple characters! The adventure is completely in your control - what would you like to do?";

interface StorySegment {
  id: number;
  text: string;
  type: 'user' | 'ai';
}

// Define interfaces for custom component props
interface MarkdownComponentProps {
  children?: ReactNode;
  href?: string;
  className?: string;
}

export default function GamePage() {
  const searchParams = useSearchParams();
  const genre = searchParams.get('genre') || 'fantasy';
  const genreName = getGenreName(genre);
  
  // Handle direct navigation to /game without a genre parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // If no genre in URL, check localStorage
      if (!searchParams.get('genre')) {
        const savedGenre = localStorage.getItem('questgpt-genre');
        if (savedGenre && savedGenre !== 'fantasy') {
          // Redirect to include the saved genre
          window.location.href = `/game?genre=${savedGenre}`;
        }
      } else {
        // Save the current genre to localStorage
        localStorage.setItem('questgpt-genre', genre);
      }
    }
  }, [genre, searchParams]);
  
  // Get initial story based on genre
  const initialStory = initialStoryTemplates[genre as keyof typeof initialStoryTemplates] || defaultInitialStory;
  
  const [storyLog, setStoryLog] = useState<StorySegment[]>([{ id: 0, text: initialStory, type: 'ai' }]);
  const [isAiThinking, setIsAiThinking] = useState(false); // For disabling input
  const storyDisplayRef = useRef<StoryDisplayHandle>(null);
  const commandInputRef = useRef<CommandInputHandle>(null);
  const storyContainerRef = useRef<HTMLDivElement>(null);
  const [currentAnimatingStoryId, setCurrentAnimatingStoryId] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');

  useEffect(() => {
    // Focus the input once on mount
    if (commandInputRef.current) {
      setTimeout(() => {
        commandInputRef.current?.focusInput();
      }, 500); // Small delay to ensure DOM is ready
    }
  }, []);

  useEffect(() => {
    if (storyContainerRef.current) {
      storyContainerRef.current.scrollTop = storyContainerRef.current.scrollHeight;
    }
    
    // Set the document title to include the genre
    document.title = `QuestGPT - ${genreName} Adventure`;
    
    // Focus the input after each AI response (when not thinking)
    if (!isAiThinking && commandInputRef.current) {
      commandInputRef.current.focusInput();
    }
  }, [storyLog, genreName, isAiThinking]); // Add isAiThinking to dependencies
  
  // Build the context from previous exchanges
  const getContext = () => {
    // Limit to last 10 exchanges to avoid token limits
    // Use the current animating story ID to get the most recent AI text for the image prompt
    const currentAiSegment = storyLog.find(segment => segment.id === currentAnimatingStoryId && segment.type === 'ai');
    const promptForImage = currentAiSegment ? currentAiSegment.text : storyLog.length > 0 ? storyLog[storyLog.length -1].text : defaultInitialStory;

    const relevantHistory = storyLog.slice(-10); 
    return {
      history: relevantHistory.map(segment => {
        if (segment.type === 'user') {
          return `Player: ${segment.text.replace('> ', '')}`;
        } else {
          return `AI: ${segment.text}`;
        }
      }).join('\n\n'),
      currentPrompt: promptForImage
    }
  };

  const handleCommandSubmit = async (command: string) => {
    // Clear any previous errors
    setError(null);
    
    // First, always add the user's original input to the chat log, without filtering
    const newUserEntry: StorySegment = {
      id: storyLog.length, 
      text: `> ${command}`,
      type: 'user',
    };
    
    setStoryLog(prev => [...prev, newUserEntry]);
    
    // If AI was animating its last response, force complete it.
    const lastSegment = storyLog[storyLog.length - 1];
    if (lastSegment && lastSegment.type === 'ai' && lastSegment.id === currentAnimatingStoryId && storyDisplayRef.current) {
      storyDisplayRef.current.forceComplete();
    }

    // Check for prohibited content in user input - but only for response processing, not display
    if (containsProhibitedContent(command)) {
      setError("Your message contains inappropriate language.");
      setIsAiThinking(true);
      setCurrentAnimatingStoryId(-1);
      
      // Add warning message to story log as an AI response
      const warningEntry: StorySegment = {
        id: storyLog.length + 1,
        text: getContentWarningMessage(),
        type: 'ai',
      };
      
      // Short delay to make it seem like the AI is thinking
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setStoryLog(prev => [...prev, warningEntry]);
      setCurrentAnimatingStoryId(warningEntry.id);
      setIsAiThinking(false);
      return; // Don't process command further
    }
    
    setIsAiThinking(true); 
    setCurrentAnimatingStoryId(-1); // No AI story is animating now, user text just added

    try {
      // Call our API to get a response
      const response = await fetch('/api/game/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          context: getContext().history,
          genre, // Include the genre in the API request
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();
      
      // Check if the response is educational about inappropriate content
      let finalResponse = data.response;
      if (!isEducationalResponse(finalResponse)) {
        // Only filter if it's not an educational response
        finalResponse = filterProhibitedContent(finalResponse);
      }
      
      const newAiEntry: StorySegment = {
        id: storyLog.length + 1, // Ensure unique ID
        text: finalResponse,
        type: 'ai',
      };
      
      setStoryLog(prev => [...prev, newAiEntry]);
      setCurrentAnimatingStoryId(newAiEntry.id);
    } catch (err: any) {
      console.error('Error getting AI response:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      
      // Add error message to story log
      const errorAiEntry: StorySegment = {
        id: storyLog.length + 1,
        text: `The world seems to go silent. (Error: ${err.message || 'Something went wrong. Please try again.'})`,
        type: 'ai',
      };
      
      setStoryLog(prev => [...prev, errorAiEntry]);
      setCurrentAnimatingStoryId(errorAiEntry.id);
    } finally {
      setIsAiThinking(false);
    }
  };

  // Define custom Markdown components to maintain styling
  const markdownComponents = {
    p: ({children}: MarkdownComponentProps) => <span className="leading-relaxed">{children}</span>,
    strong: ({children}: MarkdownComponentProps) => <span className="font-bold">{children}</span>,
    em: ({children}: MarkdownComponentProps) => <span className="italic">{children}</span>,
    
    // Headings
    h1: ({children}: MarkdownComponentProps) => <h1 className="text-xl font-bold text-purple-300 mt-3 mb-2">{children}</h1>,
    h2: ({children}: MarkdownComponentProps) => <h2 className="text-lg font-bold text-purple-200 mt-2 mb-1">{children}</h2>,
    h3: ({children}: MarkdownComponentProps) => <h3 className="text-md font-bold text-purple-100 mt-2 mb-1">{children}</h3>,
    
    // Lists
    ul: ({children}: MarkdownComponentProps) => <ul className="list-disc pl-5 my-2">{children}</ul>,
    ol: ({children}: MarkdownComponentProps) => <ol className="list-decimal pl-5 my-2">{children}</ol>,
    li: ({children}: MarkdownComponentProps) => <li className="my-1">{children}</li>,
    
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
    hr: () => <hr className="border-purple-700/50 my-4" />,
    // Custom component to handle image generation button clicks within Markdown
    button: (props: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode, className?: string }) => {
      if (props.className === 'generate-image-button') {
        return (
          <button 
            onClick={() => {
              const { currentPrompt } = getContext();
              setSelectedPrompt(currentPrompt);
              setShowImageModal(true);
            }}
            className="ml-2 inline-block bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-1 px-2 rounded-md shadow-md transition-colors duration-150"
          >
            <ImageIcon className="w-3 h-3 inline-block mr-1" /> Generate Image
          </button>
        );
      }
      // eslint-disable-next-line react/prop-types
      return <button {...props}>{props.children}</button>;
    }
  };

  // Function to handle image button click from StoryDisplay header
  const handlePrimaryImageButtonClick = () => {
    const { currentPrompt } = getContext();
    setSelectedPrompt(currentPrompt);
    setShowImageModal(true);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans relative">
      {/* Header Section */}
      <header className="flex items-center justify-between p-4 bg-gray-800 shadow-md fixed top-0 left-0 right-0 z-10">
        <Link href="/" className="flex items-center text-purple-400 hover:text-purple-300 transition-colors">
          <ArrowLeft size={20} className="mr-2" />
          <span className="text-lg font-semibold">Back to Home</span>
        </Link>
        {/* <h1 className="text-xl font-bold text-purple-300">{genreName} Adventure</h1> Removed as it's now in StoryDisplay */}
        <button 
          onClick={() => { /* Share functionality to be implemented */ }}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-150 flex items-center"
        >
          <Share2 size={18} className="mr-2" />
          Share Adventure
        </button>
      </header>

      {/* Main Content Area - Full width, provides padding for fixed header/footer, and centers the chat window + side panel */}
      <main 
        className="flex-grow overflow-hidden p-6 pt-24 pb-32 bg-gray-900 flex flex-row justify-center items-start gap-4" // Changed to flex-row, items-start, overflow-hidden
      >
        {/* Centered Chat Window - will take up available space or a max-width */}
        <div 
          ref={storyContainerRef} 
          className="flex-1 max-w-3xl flex flex-col space-y-4 overflow-y-auto h-full bg-gray-800/40 p-4 rounded-lg shadow-xl border border-purple-700/30 hide-scrollbar"
        >
          {storyLog.map((segment) => {
            if (segment.id === currentAnimatingStoryId && segment.type === 'ai') {
              return (
                <StoryDisplay 
                  key={`story-${segment.id}`} // Unique key
                  ref={storyDisplayRef} 
                  story={segment.text} 
                  speed={15} // Changed speed from 30 to 15
                  onTypingComplete={() => {if (commandInputRef.current) commandInputRef.current.focusInput()}}
                  genreName={genreName} 
                  onImageButtonClick={handlePrimaryImageButtonClick}
                  isPrimaryDisplay={true} // This is the main display
                />
              );
            } else {
              // Static message rendering
              return (
                <div 
                  key={`static-${segment.id}`} // Unique key
                  className={`p-4 rounded-lg shadow ${segment.type === 'user' ? 'bg-purple-700/50 text-purple-100 self-end ml-auto w-auto max-w-[85%]' : 'bg-gray-700/50 text-gray-200 self-start mr-auto w-auto max-w-[85%]'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`block text-sm font-medium ${segment.type === 'user' ? 'text-purple-300' : 'text-purple-400'}`}>
                      {segment.type === 'user' ? 'You' : `${genreName} AI`}
                    </span>
                    {segment.type === 'ai' && segment.id !== 0 && (
                      <button 
                        onClick={() => {
                          setSelectedPrompt(segment.text);
                          setShowImageModal(true);
                        }}
                        className="ml-2 p-1 rounded-md hover:bg-purple-600/70 transition-colors"
                        title="Generate image from this message"
                        aria-label="Generate image from this message"
                      >
                        <ImageIcon className="w-4 h-4 text-purple-300 hover:text-purple-100" />
                      </button>
                    )}
                  </div>
                  <ReactMarkdown components={markdownComponents}>
                    {segment.text}
                  </ReactMarkdown>
                </div>
              );
            }
          })}

          {error && (
            <div className="mt-4 p-3 bg-red-700/30 text-red-300 border border-red-500 rounded-md">
              Error: {error}
            </div>
          )}
        </div>

        {/* Image Generator Pill - now part of the flex row, conditionally rendered */}
        {showImageModal && (
          <div className="h-full w-full max-w-md sm:max-w-lg md:max-w-xl">
            {/* Wrapper to give ImageGeneratorPill a container in the flex layout */}
            <ImageGeneratorPill 
              isOpen={showImageModal} // isOpen still controls its internal rendering
              onClose={() => setShowImageModal(false)} 
              prompt={selectedPrompt}
            />
          </div>
        )}
      </main>

      {/* Input Area - Remains fixed full width at the bottom */}
      <CommandInput 
        ref={commandInputRef} 
        onCommandSubmit={handleCommandSubmit}
        disabled={isAiThinking} 
        placeholder={isAiThinking ? "AI is thinking..." : "What do you do next?"} 
      />
    </div>
  );
} 