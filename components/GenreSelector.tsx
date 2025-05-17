'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Search, Telescope } from 'lucide-react';

export interface Genre {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
}

export const genres: Genre[] = [
  {
    id: 'fantasy',
    name: 'Fantasy',
    description: 'Swords, sorcery, and mythical creatures in a far-off land.',
    icon: BookOpen,
  },
  {
    id: 'mystery',
    name: 'Mystery',
    description: 'Unravel clues, solve puzzles, and expose the hidden truth.',
    icon: Search,
  },
  {
    id: 'sci-fi',
    name: 'Sci-Fi',
    description: 'Explore distant galaxies, advanced tech, and alien civilizations.',
    icon: Telescope,
  },
];

interface GenreSelectorProps {
  onGenreSelect?: (genreId: string) => void;
  initialGenre?: string;
}

const GenreSelector: React.FC<GenreSelectorProps> = ({ onGenreSelect, initialGenre }) => {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(initialGenre || null);

  // Check localStorage for saved genre if not provided via props
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedGenre = localStorage.getItem('questgpt-genre');
      if (savedGenre) {
        setSelectedGenre(savedGenre);
        if (onGenreSelect) {
          onGenreSelect(savedGenre);
        }
      }
    }
  }, []); // Only run on mount

  const handleGenreSelect = (genreId: string) => {
    setSelectedGenre(genreId);
    if (onGenreSelect) {
      onGenreSelect(genreId);
    }
    
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('questgpt-genre', genreId);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {genres.map((genre) => (
          <div
            key={genre.id}
            className={`relative p-6 bg-gray-800 rounded-xl shadow-lg cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-purple-500/50 
                        ${selectedGenre === genre.id ? 'border-2 border-purple-500 ring-2 ring-purple-500 ring-opacity-50' : 'border-2 border-gray-700'}`}
            onClick={() => handleGenreSelect(genre.id)}
          >
            {selectedGenre === genre.id && (
              <CheckCircle className="absolute top-3 right-3 h-6 w-6 text-purple-400" />
            )}
            <genre.icon className="h-12 w-12 text-purple-400 mb-4" />
            <h3 className="text-2xl font-semibold text-white mb-2">{genre.name}</h3>
            <p className="text-gray-400 text-sm">{genre.description}</p>
          </div>
        ))}
      </div>
      {selectedGenre && (
        <div className="mt-8 text-center">
          <p className="text-lg text-gray-300">
            Selected theme: <span className="font-semibold text-purple-400">{genres.find(g => g.id === selectedGenre)?.name}</span>
          </p>
        </div>
      )}
    </div>
  );
};

// Helper function to get genre name from ID
export function getGenreName(genreId: string): string {
  const genre = genres.find(g => g.id === genreId);
  return genre ? genre.name : 'Fantasy';
}

export default GenreSelector; 