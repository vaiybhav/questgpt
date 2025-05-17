import { ReactNode } from 'react';
import ImageGeneratorPill from './ImageGeneratorPill';

interface MessageProps {
  content: string;
  isUser?: boolean;
  timestamp?: string;
  showImagePill?: boolean;
}

export default function Message({ 
  content, 
  isUser = false, 
  timestamp, 
  showImagePill = true 
}: MessageProps) {
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div 
          className={`relative px-4 py-3 rounded-lg ${
            isUser 
              ? 'bg-purple-600 text-white rounded-tr-none' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-none'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{content}</p>
          
          {timestamp && (
            <div className="text-xs opacity-70 mt-1">
              {timestamp}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 