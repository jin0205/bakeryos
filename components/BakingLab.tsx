
import React, { useState } from 'react';
import AiBakersChat from './AiBakersChat';
import RecipeBrainstormer from './RecipeBrainstormer';
import MeasurementConverter from './MeasurementConverter';
import DDTCalculator from './DDTCalculator';

export type LabTab = 'assistant' | 'calculators';

interface BakingLabProps {
  activeLabTab: LabTab;
  onNavigateToLibrary?: () => void;
}

const LAB_TAB_LABELS: Record<LabTab, string> = {
  assistant:   'AI Assistant',
  calculators: 'Calculators',
};

const BakingLab: React.FC<BakingLabProps> = ({ activeLabTab, onNavigateToLibrary }) => {
  const [assistantMode, setAssistantMode] = useState<'chat' | 'brainstorm'>('chat');
  const [calcMode, setCalcMode] = useState<'ddt' | 'converter'>('ddt');

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">
          R&amp;D LAB / {LAB_TAB_LABELS[activeLabTab].toUpperCase()}
        </p>
      </div>
      <div className="bg-white dark:bg-stone-900/40 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800/60 p-6 min-h-[600px] transition-colors duration-300">
        {activeLabTab === 'assistant' && (
          <div className="animate-fade-in">
            <div role="tablist" aria-label="Assistant mode" className="flex gap-2 mb-6">
              <button
                id="lab-tab-chat"
                role="tab"
                aria-selected={assistantMode === 'chat'}
                aria-controls="lab-panel-chat"
                onClick={() => setAssistantMode('chat')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  assistantMode === 'chat'
                    ? 'bg-amber-600 text-white'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                Baker's Assistant
              </button>
              <button
                id="lab-tab-brainstorm"
                role="tab"
                aria-selected={assistantMode === 'brainstorm'}
                aria-controls="lab-panel-brainstorm"
                onClick={() => setAssistantMode('brainstorm')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  assistantMode === 'brainstorm'
                    ? 'bg-amber-600 text-white'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                Recipe Brainstormer
              </button>
            </div>
            {assistantMode === 'chat'
              ? <div id="lab-panel-chat" role="tabpanel" aria-labelledby="lab-tab-chat"><AiBakersChat /></div>
              : <div id="lab-panel-brainstorm" role="tabpanel" aria-labelledby="lab-tab-brainstorm"><RecipeBrainstormer onNavigateToLibrary={onNavigateToLibrary} /></div>
            }
          </div>
        )}
        {activeLabTab === 'calculators' && (
          <div className="animate-fade-in">
            <div role="tablist" aria-label="Calculator mode" className="flex gap-2 mb-6">
              <button
                id="lab-tab-ddt"
                role="tab"
                aria-selected={calcMode === 'ddt'}
                aria-controls="lab-panel-ddt"
                onClick={() => setCalcMode('ddt')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  calcMode === 'ddt'
                    ? 'bg-amber-600 text-white'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                DDT Water Temp
              </button>
              <button
                id="lab-tab-converter"
                role="tab"
                aria-selected={calcMode === 'converter'}
                aria-controls="lab-panel-converter"
                onClick={() => setCalcMode('converter')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  calcMode === 'converter'
                    ? 'bg-amber-600 text-white'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                Converter
              </button>
            </div>
            {calcMode === 'ddt'
              ? <div id="lab-panel-ddt" role="tabpanel" aria-labelledby="lab-tab-ddt"><DDTCalculator /></div>
              : <div id="lab-panel-converter" role="tabpanel" aria-labelledby="lab-tab-converter"><MeasurementConverter /></div>
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default BakingLab;
