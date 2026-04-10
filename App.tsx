
import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Sidebar from './components/Sidebar';
import RecipeManagement from './components/RecipeManagement';
import BakingLab, { LabTab } from './components/BakingLab';
import BatchPlanner from './components/BatchPlanner';
import InventoryManagement from './components/InventoryManagement';
import CostAnalysis from './components/CostAnalysis';
import WorkOrders from './components/WorkOrders';
import ProductionSchedule from './components/ProductionSchedule';
import { PlannerItem, WorkOrder, WorkOrderLineItem } from './types';

type Tab = 'formulas' | 'production' | 'inventory' | 'cost' | 'lab';
export type ProductionTab = 'work-orders' | 'schedule' | 'batch-builder';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('formulas');
  const [activeLabTab, setActiveLabTab] = useState<LabTab>('assistant');
  const [activeProductionTab, setActiveProductionTab] = useState<ProductionTab>('work-orders');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('bakeryos_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('bakeryos_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('bakeryos_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleSetActiveTab = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'lab') setActiveLabTab('assistant');
    if (tab === 'production') setActiveProductionTab('work-orders');
  };

  const handleCreateWorkOrder = (items: PlannerItem[], scheduledDate: string, status: 'draft' | 'scheduled') => {
    const stored = localStorage.getItem('bakeryos_work_orders');
    let existing: WorkOrder[] = [];
    if (stored) {
      try { existing = JSON.parse(stored); } catch (e) { console.error(e); }
    }

    const woNumber = Math.max(...existing.map(w => w.woNumber), 0) + 1;
    const year = new Date().getFullYear();
    const id = `WO-${year}-${String(woNumber).padStart(4, '0')}`;

    const lineItems: WorkOrderLineItem[] = items.map(item => {
      const { recipe, count } = item;
      const totalMass = count * (recipe.weightPerLoaf || 0);
      const allIngs = [...(recipe.flours || []), ...(recipe.ingredients || [])];
      const totalPct = allIngs.reduce((sum, i) => sum + (Number(i.percentage) || 0), 0);
      const baseFlourWeight = totalPct > 0 ? totalMass / (totalPct / 100) : 0;

      const ingredientRequirements: Record<string, number> = {};
      allIngs.forEach(ing => {
        if (!ing.name) return;
        const weight = (baseFlourWeight * (Number(ing.percentage) || 0)) / 100;
        ingredientRequirements[ing.name] = (ingredientRequirements[ing.name] || 0) + weight;
      });

      return {
        recipeId: recipe.id,
        recipeName: recipe.name,
        recipeVersion: recipe.version,
        count,
        weightPerUnit: recipe.weightPerLoaf || 0,
        ingredientRequirements,
      };
    });

    const totalDoughKg = items.reduce((sum, item) => sum + item.count * (item.recipe.weightPerLoaf || 0), 0) / 1000;

    const newWO: WorkOrder = {
      id,
      woNumber,
      status,
      createdAt: new Date().toISOString(),
      scheduledDate: scheduledDate || null,
      startedAt: null,
      completedAt: null,
      lineItems,
      totalDoughKg,
      estimatedCost: 0,
      inventoryDeducted: false,
      notes: '',
    };

    const updated = [...existing, newWO];
    localStorage.setItem('bakeryos_work_orders', JSON.stringify(updated));
    setActiveTab('production');
    setActiveProductionTab('work-orders');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'formulas':   return <RecipeManagement />;
      case 'production':
        switch (activeProductionTab) {
          case 'work-orders':   return <WorkOrders />;
          case 'schedule':      return <ProductionSchedule />;
          case 'batch-builder': return <BatchPlanner onCreateWorkOrder={handleCreateWorkOrder} />;
          default:              return <WorkOrders />;
        }
      case 'inventory':  return <InventoryManagement />;
      case 'cost':       return <CostAnalysis />;
      case 'lab':        return <BakingLab activeLabTab={activeLabTab} onNavigateToLibrary={() => handleSetActiveTab('formulas')} />;
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
        activeProductionTab={activeProductionTab}
        setActiveProductionTab={setActiveProductionTab}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {renderContent()}
        </div>
      </main>
      <Analytics />
    </div>
  );
};

export default App;
