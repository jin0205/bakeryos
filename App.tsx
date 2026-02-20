
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Tabs from './components/Tabs';
import RecipeManagement from './components/RecipeManagement';
import BakingLab from './components/BakingLab';
import BatchPlanner from './components/BatchPlanner';
import InventoryManagement from './components/InventoryManagement';
import CostAnalysis from './components/CostAnalysis';

type Tab = 'management' | 'planner' | 'inventory' | 'cost' | 'lab';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('management');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('sourdough_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sourdough_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sourdough_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const renderContent = () => {
    switch (activeTab) {
      case 'management':
        return <RecipeManagement />;
      case 'planner':
        return <BatchPlanner />;
      case 'inventory':
        return <InventoryManagement />;
      case 'cost':
        return <CostAnalysis />;
      case 'lab':
        return <BakingLab />;
      default:
        return <RecipeManagement />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-800 dark:text-stone-100 font-sans transition-colors duration-300">
      <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-lg overflow-hidden border border-stone-200 dark:border-stone-800">
          <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="p-6 md:p-10">
            {renderContent()}
          </div>
        </div>
        <footer className="text-center text-stone-500 dark:text-stone-400 mt-8 text-sm">
          <p>&copy; {new Date().getFullYear()} Sourdough Pro AI. Elevate your baking.</p>
        </footer>
      </main>
    </div>
  );
};

export default App;
