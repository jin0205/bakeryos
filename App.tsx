
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import RecipeManagement from './components/RecipeManagement';
import BakingLab, { LabTab } from './components/BakingLab';
import BatchPlanner from './components/BatchPlanner';
import InventoryManagement from './components/InventoryManagement';
import CostAnalysis from './components/CostAnalysis';
import WorkOrders from './components/WorkOrders';
import ProductionSchedule from './components/ProductionSchedule';
import Dashboard from './components/Dashboard';
import SalesTracking from './components/SalesTracking';
import ContextPanel from './components/ContextPanel';
import { PlannerItem, WorkOrder, WorkOrderLineItem, SavedRecipe, InventoryItem } from './types';
import { storageService } from './services/storageService';
import Spinner from './components/Spinner';

type Tab = 'home' | 'formulas' | 'production' | 'inventory' | 'cost' | 'lab' | 'sales';
export type ProductionTab = 'work-orders' | 'schedule' | 'batch-builder';
type ThemeMode = 'light' | 'amoled';

export type PanelPayload =
  | { type: 'formula';         data: SavedRecipe }
  | { type: 'work-order';      data: WorkOrder }
  | { type: 'inventory';       data: InventoryItem }
  | { type: 'kpi-work-orders'; items: WorkOrder[] }
  | { type: 'kpi-inventory';   items: InventoryItem[] }
  | { type: 'kpi-formulas';    items: SavedRecipe[] }
  | { type: 'kpi-batch';       items: PlannerItem[] };

const VALID_TABS: Tab[] = ['home', 'formulas', 'production', 'inventory', 'cost', 'lab', 'sales'];
const VALID_PRODUCTION_TABS: ProductionTab[] = ['work-orders', 'schedule', 'batch-builder'];
const VALID_LAB_TABS: LabTab[] = ['assistant', 'calculators'];

function parseHash(): { tab: Tab; productionTab: ProductionTab; labTab: LabTab } {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [segment1, segment2] = hash.split('/') as [string, string];
  const tab = VALID_TABS.includes(segment1 as Tab) ? (segment1 as Tab) : 'home';
  const productionTab = (tab === 'production' && VALID_PRODUCTION_TABS.includes(segment2 as ProductionTab))
    ? (segment2 as ProductionTab) : 'work-orders';
  const labTab = (tab === 'lab' && VALID_LAB_TABS.includes(segment2 as LabTab))
    ? (segment2 as LabTab) : 'assistant';
  return { tab, productionTab, labTab };
}

function buildHash(tab: Tab, productionTab: ProductionTab, labTab: LabTab): string {
  if (tab === 'production') return `#/${tab}/${productionTab}`;
  if (tab === 'lab') return `#/${tab}/${labTab}`;
  return `#/${tab}`;
}

const App: React.FC = () => {
  const initial = parseHash();
  const [activeTab, setActiveTab] = useState<Tab>(initial.tab);
  const [activeLabTab, setActiveLabTab] = useState<LabTab>(initial.labTab);
  const [activeProductionTab, setActiveProductionTab] = useState<ProductionTab>(initial.productionTab);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('bakeryos_theme');
    if (saved === 'amoled' || saved === 'dark') return 'amoled';
    if (saved === 'light') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'amoled' : 'light';
  });
  const [panel, setPanel] = useState<PanelPayload | null>(null);

  const hasLocalData = (['bakeryos_recipes', 'bakeryos_inventory', 'bakeryos_planner_items', 'bakeryos_work_orders'] as const)
    .some(k => localStorage.getItem(k) !== null);
  const [syncing, setSyncing] = useState(!hasLocalData);

  useEffect(() => {
    storageService.syncAll().finally(() => setSyncing(false));
  }, []);

  const openPanel  = (p: PanelPayload) => setPanel(p);
  const closePanel = () => setPanel(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-light', 'theme-amoled');
    root.classList.add(themeMode === 'amoled' ? 'theme-amoled' : 'theme-light');
    localStorage.setItem('bakeryos_theme', themeMode);
  }, [themeMode]);

  const toggleTheme = () => setThemeMode((prev) => (prev === 'amoled' ? 'light' : 'amoled'));

  // Sync hash → state (browser back/forward)
  useEffect(() => {
    const onHashChange = () => {
      const { tab, productionTab, labTab } = parseHash();
      setActiveTab(tab);
      setActiveProductionTab(productionTab);
      setActiveLabTab(labTab);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Sync state → hash
  useEffect(() => {
    const next = buildHash(activeTab, activeProductionTab, activeLabTab);
    if (window.location.hash !== next) window.location.hash = next;
  }, [activeTab, activeProductionTab, activeLabTab]);

  const handleSetActiveTab = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'lab') setActiveLabTab('assistant');
    if (tab === 'production') setActiveProductionTab('work-orders');
  };

  const handleCreateWorkOrder = (items: PlannerItem[], scheduledDate: string, status: 'draft' | 'scheduled') => {
    const existing = storageService.load<WorkOrder>('bakeryos_work_orders');

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

    storageService.save('bakeryos_work_orders', [...existing, newWO]);
    setActiveTab('production');
    setActiveProductionTab('work-orders');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':       return <Dashboard onOpenPanel={openPanel} onNavigate={handleSetActiveTab} />;
      case 'formulas':   return <RecipeManagement onOpenPanel={openPanel} />;
      case 'production':
        switch (activeProductionTab) {
          case 'work-orders':   return <WorkOrders onOpenPanel={openPanel} />;
          case 'schedule':      return <ProductionSchedule />;
          case 'batch-builder': return <BatchPlanner onCreateWorkOrder={handleCreateWorkOrder} />;
          default:              return <WorkOrders onOpenPanel={openPanel} />;
        }
      case 'inventory':  return <InventoryManagement onOpenPanel={openPanel} />;
      case 'cost':       return <CostAnalysis />;
      case 'lab':        return <BakingLab activeLabTab={activeLabTab} onNavigateToLibrary={() => handleSetActiveTab('formulas')} />;
      case 'sales':      return <SalesTracking />;
      default:           return <Dashboard onOpenPanel={openPanel} onNavigate={handleSetActiveTab} />;
    }
  };

  if (syncing) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-100 dark:bg-stone-950">
        <div className="flex flex-col items-center gap-3 text-stone-500 dark:text-stone-400">
          <Spinner />
          <p className="text-sm">Syncing your bakery data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-stone-100 dark:bg-stone-950 text-stone-800 dark:text-stone-100 font-sans transition-colors duration-300">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        activeLabTab={activeLabTab}
        setActiveLabTab={setActiveLabTab}
        activeProductionTab={activeProductionTab}
        setActiveProductionTab={setActiveProductionTab}
        themeMode={themeMode}
        toggleTheme={toggleTheme}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {renderContent()}
        </div>
      </main>
      <ContextPanel panel={panel} onClose={closePanel} />
    </div>
  );
};

export default App;
