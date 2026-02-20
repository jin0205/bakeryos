import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import RecipeManagement from './components/RecipeManagement';
import BakingLab from './components/BakingLab';
import BatchPlanner from './components/BatchPlanner';
import InventoryManagement from './components/InventoryManagement';
import CostAnalysis from './components/CostAnalysis';

export type Tab = 'management' | 'planner' | 'inventory' | 'cost' | 'lab';
export type LabTab = 'assistant' | 'analyzer' | 'science' | 'pdf' | 'converter' | 'ddt' | 'showcase';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('management');
  const [activeLabTab, setActiveLabTab] = useState<LabTab>('assistant');
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
      case 'management': return <RecipeManagement />;
      case 'planner':    return <BatchPlanner />;
      case 'inventory':  return <InventoryManagement />;
      case 'cost':       return <CostAnalysis />;
      case 'lab':        return <BakingLab activeLabTab={activeLabTab} />;
      default:           return <RecipeManagement />;
    }
  };

  return (
    <div className="flex h-screen bg-stone-950 text-stone-100 font-sans overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeLabTab={activeLabTab}
        setActiveLabTab={setActiveLabTab}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />
      <main className="flex-1 overflow-y-auto bg-stone-950">
        <div className="px-8 py-8 min-h-full">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
