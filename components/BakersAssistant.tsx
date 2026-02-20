
import React, { useState } from 'react';
import { getGroundedResponse } from '../services/geminiService';
import Spinner from './Spinner';
import { GeminiGroundedResponse } from '../types';
import { LinkIcon } from './icons/LinkIcon';

const BakersAssistant: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [response, setResponse] = useState<GeminiGroundedResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setResponse(null);
    const result = await getGroundedResponse(query);
    setResponse(result);
    setIsLoading(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-2">Baker's Assistant</h2>
      <p className="text-stone-600 dark:text-stone-400 mb-6">Ask anything about sourdough. From the science of starters to the latest milling techniques, get answers grounded in up-to-date web search results.</p>
      
      <form onSubmit={handleSubmit} className="flex gap-4 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., What's the best temperature for bulk fermentation?"
          className="flex-grow block w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm dark:text-stone-100 transition-colors"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:bg-stone-300 dark:disabled:bg-stone-800 transition-colors"
        >
          {isLoading ? <Spinner /> : 'Ask'}
        </button>
      </form>

      <div className="bg-stone-50 dark:bg-stone-800/40 p-6 rounded-lg border border-stone-200 dark:border-stone-700/60 min-h-[200px] transition-colors duration-300">
        {isLoading && (
           <div className="flex items-center justify-center h-full">
             <div className="text-center">
                <Spinner />
                <p className="mt-2 text-stone-500 dark:text-stone-400">Searching for the best answer...</p>
             </div>
           </div>
        )}
        {response && (
          <div>
            <div className="prose prose-stone dark:prose-invert max-w-none mb-6" dangerouslySetInnerHTML={{ __html: response.text.replace(/\n/g, '<br />') }} />
            {response.metadata?.groundingChunks && response.metadata.groundingChunks.length > 0 && (
              <div>
                <h4 className="font-semibold text-stone-700 dark:text-stone-300 text-sm mb-2">Sources:</h4>
                <ul className="space-y-2">
                  {response.metadata.groundingChunks.map((chunk, index) => chunk.web && (
                    <li key={index}>
                      <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 hover:underline">
                        <LinkIcon className="w-4 h-4 mr-2" />
                        {chunk.web.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BakersAssistant;
