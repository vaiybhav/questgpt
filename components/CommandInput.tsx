'use client';

import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Send } from 'lucide-react';

export interface CommandInputHandle {
  focusInput: () => void;
}

interface CommandInputProps {
  onCommandSubmit: (command: string) => void;
  disabled?: boolean; // To disable input while AI is "thinking"
  placeholder?: string; // Add placeholder prop
}

const CommandInput = forwardRef<CommandInputHandle, CommandInputProps>(({ onCommandSubmit, disabled = false, placeholder }, ref) => {
  const [command, setCommand] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Expose the focusInput method
  useImperativeHandle(ref, () => ({
    focusInput: () => {
      if (inputRef.current && !disabled) {
        inputRef.current.focus();
      }
    }
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim() === '' || disabled) return;
    onCommandSubmit(command);
    setCommand('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex items-center gap-3 p-2 bg-gray-800 border border-gray-700 rounded-xl shadow-lg">
      <input
        ref={inputRef}
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        placeholder={placeholder || (disabled ? "AI is pondering..." : "What do you do next?")}
        className="flex-grow p-3 bg-transparent text-white placeholder-gray-500 focus:outline-none rounded-lg disabled:cursor-not-allowed"
        disabled={disabled}
      />
      <button
        type="submit"
        className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transform transition-transform duration-200 ease-out hover:scale-110 active:scale-100"
        disabled={command.trim() === '' || disabled}
      >
        <Send size={20} />
      </button>
    </form>
  );
});

CommandInput.displayName = "CommandInput";
export default CommandInput; 