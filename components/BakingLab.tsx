
import React from 'react';
import AiBakersChat from './AiBakersChat';
import FermentationEngine from './FermentationEngine';
import RecipeImporter from './RecipeImporter';
import MeasurementConverter from './MeasurementConverter';
import DDTCalculator from './DDTCalculator';
import RecipeBrainstormer from './RecipeBrainstormer';

export type LabTab = 'assistant' | 'fermentation' | 'pdf' | 'converter' | 'ddt' | 'brainstorm';

interface BakingLabProps {
  activeLabTab: LabTab;
  onNavigateToLibrary?: () => void;
}

const LAB_TAB_LABELS: Record<LabTab, string> = {
  assistant:    "Baker's Assistant",
  brainstorm:   'Recipe Brainstormer',
  fermentation: 'Fermentation Engine',
  ddt:          'DDT Water Temp',
  pdf:          'Recipe Importer',
  converter:    'Converter',
};

const BakingLab: React.FC<BakingLabProps> = ({ activeLabTab, onNavigateToLibrary }) => {
  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">
          R&amp;D LAB / {LAB_TAB_LABELS[activeLabTab].toUpperCase()}
        </p>
      </div>
      <div className="bg-white dark:bg-stone-900/40 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800/60 p-6 min-h-[600px] transition-colors duration-300">
        {activeLabTab === 'assistant' && (
          <div className="animate-fade-in h-full"><AiBakersChat /></div>
        )}
        {activeLabTab === 'fermentation' && (
          <div className="animate-fade-in"><FermentationEngine /></div>
        )}
        {activeLabTab === 'ddt' && (
          <div className="animate-fade-in"><DDTCalculator /></div>
        )}
        {activeLabTab === 'pdf' && (
          <div className="animate-fade-in"><RecipeImporter /></div>
        )}
        {activeLabTab === 'converter' && (
          <div className="animate-fade-in"><MeasurementConverter /></div>
        )}
        {activeLabTab === 'brainstorm' && (
          <div className="animate-fade-in">
            <RecipeBrainstormer onNavigateToLibrary={onNavigateToLibrary} />
          </div>
        )}
      </div>
    </div>
  );
};

export default BakingLab;
