
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import RecipeManagement from './components/RecipeManagement';
import BakingLab, { LabTab } from './components/BakingLab';
import BatchPlanner from './components/BatchPlanner';
import InventoryManagement from './components/InventoryManagement';
import CostAnalysis from './components/CostAnalysis';

type Tab = 'management' | 'planner' | 'inventory' | 'cost' | 'lab';

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

  const handleSetActiveTab = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'lab') setActiveLabTab('assistant');
  };

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
    <div className="flex h-screen overflow-hidden bg-stone-100 dark:bg-stone-950 text-stone-800 dark:text-stone-100 font-sans transition-colors duration-300">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        activeLabTab={activeLabTab}
        setActiveLabTab={setActiveLabTab}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
