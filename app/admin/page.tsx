'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCcw, MailCheck, AlertTriangle } from 'lucide-react';

interface KeyStatus {
  totalKeys: number;
  availableKeys: number;
  currentKeyIndex: number; 
}

interface KeyValidation {
  keyNumber: number;
  valid: boolean;
  error?: string;
}

export default function AdminPage() {
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [keyValidations, setKeyValidations] = useState<KeyValidation[] | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);

  // Fetch key status
  const fetchKeyStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/game/key-status');
      if (!response.ok) {
        throw new Error('Failed to fetch key status');
      }
      const data = await response.json();
      setKeyStatus(data);
      setMessage(null);
    } catch (error: any) {
      setMessage({ text: error.message || 'An error occurred', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Validate all API keys
  const validateAllKeys = async () => {
    setValidationLoading(true);
    try {
      const response = await fetch('/api/game/key-status?validate=true');
      if (!response.ok) {
        throw new Error('Failed to validate keys');
      }
      const data = await response.json();
      setKeyStatus({
        totalKeys: data.totalKeys,
        availableKeys: data.availableKeys,
        currentKeyIndex: data.currentKeyIndex
      });
      setKeyValidations(data.keyValidations);
      setMessage({ text: 'API keys validated successfully', type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.message || 'An error occurred', type: 'error' });
    } finally {
      setValidationLoading(false);
    }
  };

  // Mark current key as exhausted (for testing)
  const exhaustKey = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/game/exhaust-key', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to exhaust key');
      }
      const data = await response.json();
      setMessage({ text: data.message, type: 'success' });
      // Refresh key status
      fetchKeyStatus();
    } catch (error: any) {
      setMessage({ text: error.message || 'An error occurred', type: 'error' });
      setLoading(false);
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/game/notify', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }
      const data = await response.json();
      setMessage({ text: 'Test notification email sent successfully', type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.message || 'An error occurred', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch key status on component mount
  useEffect(() => {
    fetchKeyStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col p-4 md:p-8">
      <header className="flex justify-between items-center mb-8">
        <Link href="/" className="flex items-center text-purple-400 hover:text-purple-300 px-4 py-2 rounded-lg transform transition-all duration-200 ease-out hover:scale-110 hover:bg-purple-500/10 active:scale-100">
          <ArrowLeft size={24} className="mr-2" />
          Back to Home
        </Link>
        <h1 className="text-2xl font-bold text-purple-300">QuestGPT Admin Panel</h1>
      </header>

      <main className="flex-grow flex flex-col items-center w-full max-w-3xl mx-auto">
        <div className="w-full p-6 bg-purple-900/20 border border-purple-700/30 rounded-xl shadow-xl backdrop-blur-sm mb-6">
          <h2 className="text-xl font-semibold mb-6 text-purple-300">API Key Management</h2>
          
          {/* Status Display */}
          <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
            <h3 className="text-lg font-medium mb-3 text-purple-200">Key Status</h3>
            {loading && !keyStatus ? (
              <p className="text-gray-400">Loading...</p>
            ) : keyStatus ? (
              <div className="space-y-2">
                <p>Total Keys: <span className="font-semibold text-purple-300">{keyStatus.totalKeys}</span></p>
                <p>Available Keys: <span className={`font-semibold ${keyStatus.availableKeys <= 2 ? 'text-red-400' : 'text-green-400'}`}>
                  {keyStatus.availableKeys}
                </span></p>
                <p>Current Active Key: <span className="font-semibold text-purple-300">#{keyStatus.currentKeyIndex}</span></p>
                
                {keyStatus.availableKeys <= 2 && (
                  <div className="flex items-center mt-2 p-2 bg-red-900/30 border border-red-800 rounded-lg text-red-300">
                    <AlertTriangle size={20} className="mr-2 text-red-400" />
                    <span>Running low on available API keys!</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-red-400">Failed to load key status</p>
            )}
          </div>
          
          {/* Key Validation Results */}
          {keyValidations && (
            <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
              <h3 className="text-lg font-medium mb-3 text-purple-200">API Key Validation Results</h3>
              <div className="space-y-3">
                {keyValidations.map((validation) => (
                  <div 
                    key={validation.keyNumber}
                    className={`p-3 rounded-lg ${validation.valid ? 'bg-green-900/30 border border-green-800' : 'bg-red-900/30 border border-red-800'}`}
                  >
                    <p className="font-medium">
                      Key #{validation.keyNumber}: 
                      <span className={validation.valid ? 'text-green-400 ml-2' : 'text-red-400 ml-2'}>
                        {validation.valid ? 'Valid' : 'Invalid'}
                      </span>
                    </p>
                    {!validation.valid && validation.error && (
                      <p className="text-red-300 text-sm mt-1">{validation.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Message Display */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-900/30 border border-green-800 text-green-300' : 
              'bg-red-900/30 border border-red-800 text-red-300'
            }`}>
              {message.text}
            </div>
          )}
          
          {/* Controls */}
          <div className="flex flex-col md:flex-row flex-wrap gap-4">
            <button
              onClick={fetchKeyStatus}
              disabled={loading}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:text-gray-300 text-white font-medium rounded-lg transition-colors"
            >
              <RefreshCcw size={18} className="mr-2" />
              Refresh Status
            </button>
            
            <button
              onClick={validateAllKeys}
              disabled={validationLoading}
              className="flex items-center justify-center px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-900 disabled:text-gray-300 text-white font-medium rounded-lg transition-colors"
            >
              {validationLoading ? 'Validating...' : 'Validate API Keys'}
            </button>
            
            <button
              onClick={exhaustKey}
              disabled={loading || (keyStatus?.availableKeys || 0) < 1}
              className="flex items-center justify-center px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-900 disabled:text-gray-300 text-white font-medium rounded-lg transition-colors"
            >
              <AlertTriangle size={18} className="mr-2" />
              Test Key Rotation
            </button>
            
            <button
              onClick={sendTestNotification}
              disabled={loading}
              className="flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:text-gray-300 text-white font-medium rounded-lg transition-colors"
            >
              <MailCheck size={18} className="mr-2" />
              Send Test Email
            </button>
          </div>
        </div>
        
        <div className="w-full p-6 bg-purple-900/20 border border-purple-700/30 rounded-xl shadow-xl backdrop-blur-sm mb-6">
          <h2 className="text-xl font-semibold mb-4 text-purple-300">Tips for Troubleshooting</h2>
          
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="font-medium text-purple-200">Email Notification Issues:</h3>
              <p>1. Check that you've set the correct Gmail app password in your .env file</p>
              <p>2. Ensure you're using an app password (not your normal Gmail password)</p>
              <p>3. Check Gmail settings to allow less secure apps if using an older Gmail account</p>
            </div>
            
            <div>
              <h3 className="font-medium text-purple-200">Gemini API Key Issues:</h3>
              <p>1. Verify API keys are correct and not expired</p>
              <p>2. Check if the keys have proper permissions for the Gemini Pro model</p>
              <p>3. API keys might have usage quotas or rate limits</p>
              <p>4. Use the "Validate API Keys" button to check each key directly</p>
            </div>
          </div>
        </div>
        
        {/* Game Link */}
        <div className="mt-2 mb-8">
          <Link href="/game" className="flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors">
            Go to Game
          </Link>
        </div>
      </main>
    </div>
  );
} 