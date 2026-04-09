import React, { useState, useEffect, useRef } from 'react';
import { getChatResponse } from '../services/claudeService';
import { SavedRecipe, InventoryItem, PlannerItem } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import Spinner from './Spinner';

type ChatMessage = { id: string; role: 'user' | 'model'; content: string };

const buildSystemInstruction = (
  recipes: SavedRecipe[],
  inventory: InventoryItem[],
  plannerItems: PlannerItem[]
): string => {
  const lines: string[] = [
    'You are a professional sourdough baking assistant with deep expertise in fermentation science, recipe formulation, and bakery operations.',
    'You have direct access to the user\'s bakery data below. Use it to give specific, personalized answers.',
    '',
  ];

  if (recipes.length > 0) {
    lines.push(`RECIPE LIBRARY (${recipes.length} recipe${recipes.length !== 1 ? 's' : ''}):`);
    for (const r of recipes) {
      const flourPct = r.flours.reduce((sum, f) => sum + f.percentage, 0);
      const waterIngredient = r.ingredients.find(ing => /water/i.test(ing.name));
      const hydration = flourPct > 0 && waterIngredient
        ? Math.round((waterIngredient.percentage / flourPct) * 100)
        : null;
      const levainIngredient = r.ingredients.find(ing => /levain|starter/i.test(ing.name));
      const levainPct = levainIngredient ? Math.round(levainIngredient.percentage) : null;
      const parts = [`"${r.name}"`];
      if (hydration !== null) parts.push(`${hydration}% hydration`);
      if (levainPct !== null) parts.push(`${levainPct}% levain`);
      if (r.weightPerLoaf) parts.push(`${r.weightPerLoaf}g/loaf`);
      lines.push(`- ${parts.join(', ')}`);
    }
    lines.push('');
  } else {
    lines.push('RECIPE LIBRARY: No recipes saved yet.');
    lines.push('');
  }

  if (inventory.length > 0) {
    lines.push('INVENTORY:');
    for (const item of inventory) {
      let entry = `- ${item.name}: ${item.quantity.toLocaleString()}g`;
      if (item.costPerKg) entry += ` ($${item.costPerKg.toFixed(2)}/kg)`;
      lines.push(entry);
    }
    lines.push('');
  } else {
    lines.push('INVENTORY: No items tracked yet.');
    lines.push('');
  }

  if (plannerItems.length > 0) {
    lines.push('ACTIVE BATCH PLAN:');
    for (const item of plannerItems) {
      lines.push(`- ${item.count}x ${item.recipe.name}`);
    }
    lines.push('');
  } else {
    lines.push('ACTIVE BATCH PLAN: No items in the current plan.');
    lines.push('');
  }

  return lines.join('\n');
};

const AiBakersChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [systemInstruction, setSystemInstruction] = useState('');
  const [contextSummary, setContextSummary] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const recipes: SavedRecipe[] = JSON.parse(localStorage.getItem('sourdough_recipes') || '[]');
      const inventory: InventoryItem[] = JSON.parse(localStorage.getItem('sourdough_inventory') || '[]');
      const plannerItems: PlannerItem[] = JSON.parse(localStorage.getItem('sourdough_planner_items') || '[]');

      setSystemInstruction(buildSystemInstruction(recipes, inventory, plannerItems));

      const parts: string[] = [];
      if (recipes.length > 0) parts.push(`${recipes.length} recipe${recipes.length !== 1 ? 's' : ''}`);
      if (inventory.length > 0) parts.push(`${inventory.length} ingredient${inventory.length !== 1 ? 's' : ''}`);
      if (plannerItems.length > 0) parts.push(`${plannerItems.length} batch item${plannerItems.length !== 1 ? 's' : ''}`);
      setContextSummary(parts.length > 0 ? parts.join(' · ') : 'No bakery data yet');
    } catch {
      setSystemInstruction('You are a professional sourdough baking assistant.');
      setContextSummary('Context unavailable');
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    const history = nextMessages.map(m => ({
      role: (m.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    }));

    const responseText = await getChatResponse(history, systemInstruction);

    const modelMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      content: responseText,
    };
    setMessages(prev => [...prev, modelMsg]);
    setIsLoading(false);
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: '560px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Baker's Assistant</h2>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-0.5">Context-aware AI chat powered by your bakery data.</p>
        </div>
        <button
          onClick={handleNewChat}
          className="px-3 py-1.5 text-sm font-medium text-stone-600 dark:text-stone-400 border border-stone-300 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
        >
          New Chat
        </button>
      </div>

      {/* Context chip */}
      <div className="mb-4 flex-shrink-0">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-medium border border-amber-200 dark:border-amber-800/40">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {contextSummary}
        </span>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">Ask anything about your recipes, inventory, or baking science</p>
            <p className="text-stone-400 dark:text-stone-600 text-xs mt-1">e.g. "What's my highest hydration recipe?" or "Do I have enough flour for my batch plan?"</p>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-amber-600 text-white rounded-br-sm'
                  : 'bg-stone-100 dark:bg-stone-800 rounded-bl-sm'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="text-sm">{msg.content}</p>
              ) : (
                <MarkdownRenderer content={msg.content} className="text-sm" />
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-stone-100 dark:bg-stone-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
              <Spinner />
              <span className="text-xs text-stone-500 dark:text-stone-400">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="flex gap-2 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about your recipes, inventory, or baking..."
          disabled={isLoading}
          className="flex-grow px-4 py-2.5 text-sm bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:text-stone-100 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:bg-stone-400 dark:disabled:bg-stone-700 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default AiBakersChat;
