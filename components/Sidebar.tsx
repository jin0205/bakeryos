import React from 'react';
import { Tab, LabTab } from '../App';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { BoxIcon } from './icons/BoxIcon';
import { CameraIcon } from './icons/CameraIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { DocumentIcon } from './icons/DocumentIcon';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  activeLabTab: LabTab;
  setActiveLabTab: (tab: LabTab) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const mainNavItems: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'management', label: 'Recipe Management', Icon: CalculatorIcon },
  { id: 'planner',    label: 'Batch Planner',     Icon: ClipboardIcon },
  { id: 'inventory',  label: 'Inventory',          Icon: BoxIcon },
  {
    id: 'cost',
    label: 'Cost Analysis',
    Icon: ({ className }) => <span className={`font-bold text-base leading-none ${className ?? ''}`}>$</span>,
  },
];

const labSubItems: { id: LabTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'assistant', label: "Baker's Assistant", Icon: SparklesIcon },
  { id: 'analyzer',  label: 'Crumb Analyzer',   Icon: CameraIcon },
  {
    id: 'science',
    label: 'Dev & Fermentation',
    Icon: ({ className }) => (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    id: 'ddt',
    label: 'DDT Water Temp',
    Icon: ({ className }) => (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  { id: 'pdf',       label: 'Recipe Importer', Icon: DocumentIcon },
  { id: 'converter', label: 'Converter',        Icon: CalculatorIcon },
  { id: 'showcase',  label: 'Design Themes',    Icon: SparklesIcon },
];

const Sidebar: React.FC<SidebarProps> = ({
  activeTab, setActiveTab,
  activeLabTab, setActiveLabTab,
  isDarkMode, toggleTheme,
}) => {
  const isLabActive = activeTab === 'lab';

  const handleMainNav = (id: Tab) => setActiveTab(id);

  const handleLabNav = (id: LabTab) => {
    setActiveTab('lab');
    setActiveLabTab(id);
  };

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col h-screen sticky top-0 bg-stone-900 dark:bg-stone-950 border-r border-stone-800 transition-colors">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-stone-800">
        <h1 className="text-lg font-bold text-stone-50 tracking-tight leading-tight">
          Sourdough <span className="text-amber-500">Pro AI</span>
        </h1>
        <p className="text-[10px] text-stone-500 mt-0.5 uppercase tracking-widest">Baking Partner</p>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {mainNavItems.map(({ id, label, Icon }) => {
          const isActive = activeTab === id && !isLabActive;
          return (
            <button
              key={id}
              onClick={() => handleMainNav(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                isActive
                  ? 'bg-amber-600/20 text-amber-400 border-l-2 border-amber-500'
                  : 'border-l-2 border-transparent text-stone-400 hover:text-stone-100 hover:bg-stone-800'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-amber-500' : 'text-stone-500'}`} />
              {label}
            </button>
          );
        })}

        {/* Baking Lab Group */}
        <div className="pt-3">
          <p className="px-3 mb-1 text-[10px] font-black uppercase tracking-widest text-stone-600">
            Baking Lab
          </p>
          {labSubItems.map(({ id, label, Icon }) => {
            const isActive = isLabActive && activeLabTab === id;
            return (
              <button
                key={id}
                onClick={() => handleLabNav(id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-amber-600/20 text-amber-400 border-l-2 border-amber-500'
                    : 'border-l-2 border-transparent text-stone-400 hover:text-stone-100 hover:bg-stone-800'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-amber-500' : 'text-stone-500'}`} />
                {label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Dark Mode Toggle */}
      <div className="px-3 py-4 border-t border-stone-800">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
          {isDarkMode ? 'Light mode' : 'Dark mode'}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
