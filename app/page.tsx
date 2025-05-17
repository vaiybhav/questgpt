'use client';

import GenreSelector from '@/components/GenreSelector';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';

export default function HomePage() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedGenre = localStorage.getItem('questgpt-genre');
      if (savedGenre) {
        setSelectedGenre(savedGenre);
      } else {
        setSelectedGenre('fantasy');
      }
    }
  }, []);
  
  const handleGenreSelect = (genreId: string) => {
    setSelectedGenre(genreId);
  };
  
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-8 animate-fadeIn delay-100 duration-700">
        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text animate-slideInUp duration-500">
          Your AI Adventure Awaits!
        </h1>
        <p className="text-lg md:text-xl text-ui-foreground-muted max-w-2xl mx-auto animate-slideInUp delay-200 duration-500">
          Choose a genre and embark on an AI-powered adventure where your choices shape the story.
        </p>
        
        <div className="animate-slideInUp delay-300 duration-500">
          <GenreSelector onGenreSelect={handleGenreSelect} initialGenre={selectedGenre || undefined} />
        </div>

        <div className="animate-slideInUp delay-400 duration-500">
          <Link href={`/game?genre=${selectedGenre || 'fantasy'}`}>
            <button 
              className="mt-12 px-8 py-4 bg-brand hover:bg-brand-600 text-white font-semibold rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-opacity-75 text-xl transform transition-all duration-300 ease-in-out hover:scale-105 active:scale-100 active:bg-brand-700"
            >
              Start Your Adventure
            </button>
          </Link>
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 animate-fadeIn delay-500 duration-700">
        <Link href="/admin" className="flex items-center text-ui-foreground-muted hover:text-brand-400 text-sm opacity-70 hover:opacity-100 transition-all duration-300 ease-in-out">
          <Shield size={16} className="mr-1" />
          <span>Admin</span>
        </Link>
      </div>
    </main>
  );
} 