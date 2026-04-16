import React from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ProductionIcon } from './icons/ProductionIcon';
import { BoxIcon } from './icons/BoxIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { LabIcon } from './icons/LabIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { LabTab } from './BakingLab';
import { ProductionTab } from '../App';

type Tab = 'home' | 'formulas' | 'production' | 'inventory' | 'cost' | 'lab';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  activeLabTab: LabTab;
  setActiveLabTab: (tab: LabTab) => void;
  activeProductionTab: ProductionTab;
  setActiveProductionTab: (tab: ProductionTab) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const HomeIcon: React.ComponentType<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const mainNavItems: { id: Tab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home',        label: 'Home',            Icon: HomeIcon },
  { id: 'formulas',    label: 'Formula Library', Icon: ClipboardIcon },
  { id: 'production',  label: 'Production',      Icon: ProductionIcon },
  { id: 'inventory',   label: 'Inventory',        Icon: BoxIcon },
  { id: 'cost',        label: 'Cost & Margin',    Icon: CalculatorIcon },
  { id: 'lab',         label: 'R&D Lab',          Icon: LabIcon },
];

const labSubItems: { id: LabTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'assistant',   label: 'AI Assistant', Icon: SparklesIcon },
  { id: 'calculators', label: 'Calculators',  Icon: CalculatorIcon },
];

const productionSubItems: { id: ProductionTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'work-orders',   label: 'Work Orders',         Icon: ClipboardIcon },
  { id: 'schedule',      label: 'Production Schedule', Icon: CalendarIcon },
  { id: 'batch-builder', label: 'Batch Builder',       Icon: CalculatorIcon },
];

const Sidebar: React.FC<SidebarProps> = ({
  activeTab, setActiveTab, activeLabTab, setActiveLabTab,
  activeProductionTab, setActiveProductionTab, isDarkMode, toggleTheme
}) => {
  return (
    <aside className="w-64 flex-shrink-0 h-screen sticky top-0 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col transition-colors duration-300">
      {/* Branding */}
      <div className="px-6 py-5 border-b border-stone-200 dark:border-stone-800">
        <h1 className="text-lg font-black text-stone-900 dark:text-stone-50 tracking-tight">
          Bakery<span className="text-amber-600">OS</span>
        </h1>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">Production Intelligence Platform</p>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto min-h-0 p-3 space-y-1">
        {mainNavItems.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === id
                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${activeTab === id ? 'text-amber-500' : 'text-stone-400'}`} />
            {label}
          </button>
        ))}

        {/* Production sub-navigation */}
        {activeTab === 'production' && (
          <div className="ml-3 pl-3 border-l-2 border-amber-200 dark:border-amber-800/40 space-y-0.5 pt-1">
            {productionSubItems.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveProductionTab(id)}
                className={`flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  activeProductionTab === id
                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                    : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <Icon className={`mr-2.5 h-4 w-4 flex-shrink-0 ${activeProductionTab === id ? 'text-amber-500' : 'text-stone-400'}`} />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Baking Lab sub-navigation */}
        {activeTab === 'lab' && (
          <div className="ml-3 pl-3 border-l-2 border-amber-200 dark:border-amber-800/40 space-y-0.5 pt-1">
            {labSubItems.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveLabTab(id)}
                className={`flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  activeLabTab === id
                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                    : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <Icon className={`mr-2.5 h-4 w-4 flex-shrink-0 ${activeLabTab === id ? 'text-amber-500' : 'text-stone-400'}`} />
                {label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Dark Mode Toggle */}
      <div className="p-4 border-t border-stone-200 dark:border-stone-800">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-stone-600 dark:text-stone-400 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
          <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
