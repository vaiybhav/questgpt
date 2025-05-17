'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import ImageIcon from '@/components/icons/ImageIcon';

interface ImageGeneratorPillProps {
  prompt: string;
  isOpen: boolean;
  onClose: () => void;
}

const REGENERATE_COOLDOWN_MS = 3000; // 3 seconds cooldown

export default function ImageGeneratorPill({ prompt, isOpen, onClose }: ImageGeneratorPillProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageHistory, setImageHistory] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activePromptForCurrentImage, setActivePromptForCurrentImage] = useState<string | null>(null);
  const [isRegenerateCoolingDown, setIsRegenerateCoolingDown] = useState(false);
  const regenerateCooldownTimer = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 512, height: 512 });

  // Measure container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        // Ensure dimensions are valid and at least 64px
        const validWidth = Math.max(64, Math.round(width));
        const validHeight = Math.max(64, Math.round(height));
        // Limit to sizes that Stable Horde can handle well (multiples of 64)
        const adjustedWidth = Math.floor(validWidth / 64) * 64;
        const adjustedHeight = Math.floor(validHeight / 64) * 64;
        
        setContainerDimensions({ 
          width: adjustedWidth, 
          height: adjustedHeight 
        });
      }
    };

    // Initial measurement
    if (isOpen) {
      // Delay to ensure container is rendered
      setTimeout(updateDimensions, 100);
    }

    // Update on resize
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isOpen]);

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (regenerateCooldownTimer.current) {
        clearTimeout(regenerateCooldownTimer.current);
      }
    };
  }, []);

  // Add image to history when generated
  useEffect(() => {
    if (imageData) {
      setImageHistory(prevHistory => {
        // Only add if it's not already the last image in history
        if (prevHistory.length === 0 || prevHistory[prevHistory.length - 1] !== imageData) {
          const newHistory = [...prevHistory, imageData];
          setCurrentImageIndex(newHistory.length - 1); // Point to the newly added image
          return newHistory;
        }
        return prevHistory;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageData]); // imageHistory is correctly not in deps to avoid loops

  // Automatically generate image when prompt changes and modal is open
  useEffect(() => {
    if (isOpen && prompt && prompt !== activePromptForCurrentImage && !isLoading) {
      setActivePromptForCurrentImage(prompt); // Lock in the new prompt
      setImageData(null);       // Clear previous image for this new prompt
      setError(null);         // Clear previous error
      setImageHistory([]);    // Clear history for this new prompt
      setCurrentImageIndex(0);
      generateImage(); // Automatically generate when prompt is new and modal opens
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, isOpen, activePromptForCurrentImage, isLoading]);

  const generateImage = async () => {
    if (isLoading) {
      console.log('Already generating an image, skipping...');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
          width: containerDimensions.width,
          height: containerDimensions.height
        }),
      });
      
      if (response.status === 429) {
        // Rate limit error
        setError("Easy there, Picasso! You're generating images too quickly. Please wait a moment.");
        setIsLoading(false); // Ensure loading is stopped
        return;
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to generate image (status: ${response.status})`);
      }
      
      if (!data.image) {
        throw new Error('No image data returned from API');
      }
      
      setImageData(data.image);
      setIsLoading(false);
      console.log('Image data received successfully for prompt:', prompt);
    } catch (err) {
      if (!(err instanceof Error && err.message.includes("Picasso"))) { // Avoid overwriting specific rate limit message
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
      console.error('Error generating image:', err);
      setIsLoading(false); // Ensure loading is stopped on error
    }
  };

  const handleRegenerateClick = () => {
    if (isRegenerateCoolingDown || isLoading) {
      console.log('Skipping regenerate - cooling down or already loading');
      return;
    }

    setIsRegenerateCoolingDown(true);
    setActivePromptForCurrentImage(null); // Reset the active prompt to trigger a new generation
    setImageData(null); 
    setError(null);

    if (regenerateCooldownTimer.current) clearTimeout(regenerateCooldownTimer.current);
    regenerateCooldownTimer.current = setTimeout(() => {
      setIsRegenerateCoolingDown(false);
    }, REGENERATE_COOLDOWN_MS);
  };

  const getImageElement = (img: string) => {
    if (!img) return null;
    
    const isUrl = img.startsWith('http');
    const imageStyles = "w-full h-full object-cover rounded-lg shadow-lg"; // Changed from object-contain to object-cover
    
    if (isUrl) {
      return (
        <img 
          src={img} 
          alt="AI generated image" 
          className={imageStyles}
        />
      );
    } else {
      return (
        <img 
          src={`data:image/png;base64,${img}`} 
          alt="AI generated image" 
          className={imageStyles}
        />
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="h-full bg-gray-800/90 backdrop-blur-md shadow-2xl p-4 sm:p-6 flex flex-col border-l-2 border-purple-700/50 rounded-lg overflow-y-auto hide-scrollbar">
      <div className="w-full h-full relative flex flex-col">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700/50">
          <h3 className="text-lg font-semibold text-purple-300">
            Image Generator
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-gray-700 transition-colors"
            aria-label="Close image generator"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <div className="text-xs text-gray-400 mb-3 p-2 bg-gray-900/50 rounded-md border border-gray-700/50">
          <p className="font-semibold text-gray-300">Prompt:</p>
          <p className="truncate">{prompt}</p>
          <p className="text-xs text-gray-500 mt-1">Image size: {containerDimensions.width}×{containerDimensions.height}px</p>
        </div>

        {/* Image display area - takes remaining space and scrolls if needed */}
        <div 
          ref={containerRef}
          className="flex-grow flex items-center justify-center overflow-hidden bg-gray-900/50 rounded-lg p-1 min-h-[200px] border border-gray-700/50 h-full"
        >
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-4 flex-grow">
              <div className="w-10 h-10 border-4 border-gray-700 border-t-purple-500 rounded-full animate-spin"></div>
              <p className="mt-3 text-sm text-gray-300 text-center">
                Generating image... This can take a moment.
              </p>
            </div>
          )}
          
          {error && !isLoading && (
            <div className="p-3 bg-red-800/40 text-red-200 rounded-lg flex-grow text-sm w-full">
              <p className="font-medium text-base">Oops! Image Generation Failed</p>
              <p className="text-xs mt-1 leading-relaxed">{error}</p>
            </div>
          )}
          
          {!imageData && !imageHistory.length && !isLoading && !error && (
            <div className="flex flex-col items-center justify-center py-4 flex-grow">
              <p className="text-gray-400 text-sm">Ready to generate.</p>
              {/* Auto-generates on open, so button might not be needed here often */}
            </div>
          )}
          
          {(imageData || imageHistory.length > 0) && !isLoading && !error && (
            <div className="flex items-center justify-center w-full h-full">
              {getImageElement(imageData || imageHistory[currentImageIndex])}
            </div>
          )}
        </div>

        {/* Controls area */}
        {(imageData || imageHistory.length > 0) && !isLoading && !error && (
          <div className="w-full flex items-center justify-between mt-4 pt-4 border-t border-gray-700/50 gap-2">
            {imageHistory.length > 1 ? (
              <div className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentImageIndex === 0 || isLoading}
                  className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:hover:bg-purple-600 transition-colors"
                  aria-label="Previous image"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-sm text-gray-300 bg-gray-700/80 px-3 py-1.5 rounded-md">
                  {currentImageIndex + 1} / {imageHistory.length}
                </span>
                <button
                  onClick={() => setCurrentImageIndex(prev => Math.min(imageHistory.length - 1, prev + 1))}
                  disabled={currentImageIndex === imageHistory.length - 1 || isLoading}
                  className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:hover:bg-purple-600 transition-colors"
                  aria-label="Next image"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            ) : (
              <div className="flex-1" /> /* Spacer */
            )}
            
            <button
              onClick={handleRegenerateClick}
              disabled={isLoading || isRegenerateCoolingDown}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ease-in-out group"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-4 w-4 mr-1.5 transition-transform duration-300 ${isLoading && !isRegenerateCoolingDown ? 'animate-spin' : 'group-hover:rotate-90'}`}
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              {isRegenerateCoolingDown ? 'Wait...' : (isLoading ? 'Working...' : 'Regenerate')}
            </button>
          </div>
        )}
        
        {/* Fallback for no image and no loading/error, e.g. initial state before auto-gen */}
        {!isLoading && !error && !imageData && imageHistory.length === 0 && (
             <div className="mt-4 pt-4 border-t border-gray-700/50 flex justify-end">
                <p className="text-xs text-gray-500">Image will generate automatically.</p>
             </div>
        )}

      </div>
    </div>
  );
} 