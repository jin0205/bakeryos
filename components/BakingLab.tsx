
import React from 'react';
import ImageAnalyzer from './ImageAnalyzer';
import BakersAssistant from './BakersAssistant';
import RecipeLab from './RecipeLab';
import RecipeImporter from './RecipeImporter';
import MeasurementConverter from './MeasurementConverter';
import DesignShowcase from './DesignShowcase';
import DDTCalculator from './DDTCalculator';

export type LabTab = 'assistant' | 'analyzer' | 'science' | 'pdf' | 'converter' | 'ddt' | 'showcase';

interface BakingLabProps {
  activeLabTab: LabTab;
}

const BakingLab: React.FC<BakingLabProps> = ({ activeLabTab }) => {
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-1">Baking Lab</h2>
        <p className="text-stone-600 dark:text-stone-400">Your AI-powered research and development center.</p>
      </div>

      <div className="bg-white dark:bg-stone-900/40 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800/60 p-6 min-h-[600px] transition-colors duration-300">
        {activeLabTab === 'assistant' && (
          <div className="animate-fade-in"><BakersAssistant /></div>
        )}
        {activeLabTab === 'analyzer' && (
          <div className="animate-fade-in"><ImageAnalyzer /></div>
        )}
        {activeLabTab === 'science' && (
          <div className="animate-fade-in"><RecipeLab /></div>
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
        {activeLabTab === 'showcase' && (
          <div className="animate-fade-in"><DesignShowcase /></div>
        )}
      </div>
    </div>
  );
};

export default BakingLab;
