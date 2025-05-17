'use client';

import { useState, FormEvent } from 'react';
import Message from './Message';

export default function Chat() {
  const [messages, setMessages] = useState<Array<{ content: string; isUser: boolean; timestamp: string }>>([
    {
      content: "Welcome to your mystery adventure! You're in control of this story. Who are you - a detective, a witness, a suspect? What mystery would you like to solve? You can set this anywhere from a Victorian mansion to a cyberpunk metropolis. Or, if you prefer, I can suggest some starting scenarios. How would you like your mystery to begin?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isSubmitting) return;
    
    const userMessage = {
      content: inputValue,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsSubmitting(true);
    
    // Simulating AI response - in a real app, you'd call your backend API here
    setTimeout(() => {
      const aiResponse = {
        content: `I'll craft a mystery based on your input: "${inputValue}". Let's explore this scenario together...`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-purple-300">Mystery Adventure</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 bg-gray-900 rounded-lg">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <Message
              key={index}
              content={message.content}
              isUser={message.isUser}
              timestamp={message.timestamp}
              showImagePill={!message.isUser}
            />
          ))}
          
          {isSubmitting && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="What do you do next?"
            className="flex-1 bg-gray-800 text-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
} 