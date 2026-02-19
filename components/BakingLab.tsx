
import React, { useState } from 'react';
import ImageAnalyzer from './ImageAnalyzer';
import BakersAssistant from './BakersAssistant';
import RecipeLab from './RecipeLab';
import RecipeImporter from './RecipeImporter';
import MeasurementConverter from './MeasurementConverter';
import DesignShowcase from './DesignShowcase';
import DDTCalculator from './DDTCalculator';
import { CameraIcon } from './icons/CameraIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { LabIcon } from './icons/LabIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';

type LabTab = 'assistant' | 'analyzer' | 'science' | 'pdf' | 'converter' | 'ddt' | 'showcase';

const BakingLab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LabTab>('assistant');

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-1">Baking Lab</h2>
        <p className="text-stone-600 dark:text-stone-400">Your AI-powered research and development center.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sub-navigation Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <nav className="flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-2 bg-white dark:bg-stone-900 p-2 rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm overflow-x-auto">
            <button
              onClick={() => setActiveTab('assistant')}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'assistant'
                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <SparklesIcon className={`mr-3 h-5 w-5 ${activeTab === 'assistant' ? 'text-amber-500' : 'text-stone-400'}`} />
              <span className="whitespace-nowrap">Baker's Assistant</span>
            </button>

            <button
              onClick={() => setActiveTab('analyzer')}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'analyzer'
                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <CameraIcon className={`mr-3 h-5 w-5 ${activeTab === 'analyzer' ? 'text-amber-500' : 'text-stone-400'}`} />
              <span className="whitespace-nowrap">Crumb Analyzer</span>
            </button>

            <button
              onClick={() => setActiveTab('science')}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'science'
                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <LabIcon className={`mr-3 h-5 w-5 ${activeTab === 'science' ? 'text-amber-500' : 'text-stone-400'}`} />
              <span className="whitespace-nowrap">Dev & Fermentation</span>
            </button>

            <button
              onClick={() => setActiveTab('ddt')}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'ddt'
                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`mr-3 h-5 w-5 ${activeTab === 'ddt' ? 'text-amber-500' : 'text-stone-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="whitespace-nowrap">DDT Water Temp</span>
            </button>

            <button
              onClick={() => setActiveTab('pdf')}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'pdf'
                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <DocumentIcon className={`mr-3 h-5 w-5 ${activeTab === 'pdf' ? 'text-amber-500' : 'text-stone-400'}`} />
              <span className="whitespace-nowrap">Recipe Importer</span>
            </button>

            <button
              onClick={() => setActiveTab('converter')}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'converter'
                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <CalculatorIcon className={`mr-3 h-5 w-5 ${activeTab === 'converter' ? 'text-amber-500' : 'text-stone-400'}`} />
              <span className="whitespace-nowrap">Converter</span>
            </button>

            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 mt-2">
                <button
                    onClick={() => setActiveTab('showcase')}
                    className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'showcase'
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100'
                    }`}
                >
                    <SparklesIcon className={`mr-3 h-5 w-5 ${activeTab === 'showcase' ? 'text-indigo-500' : 'text-stone-400'}`} />
                    <span className="whitespace-nowrap font-bold">Design Themes</span>
                </button>
            </div>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-grow">
           <div className="bg-white dark:bg-stone-900/40 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800/60 p-6 min-h-[600px] transition-colors duration-300">
             {activeTab === 'assistant' && (
               <div className="animate-fade-in">
                 <BakersAssistant />
               </div>
             )}
             {activeTab === 'analyzer' && (
               <div className="animate-fade-in">
                 <ImageAnalyzer />
               </div>
             )}
             {activeTab === 'science' && (
               <div className="animate-fade-in">
                 <RecipeLab />
               </div>
             )}
             {activeTab === 'ddt' && (
               <div className="animate-fade-in">
                 <DDTCalculator />
               </div>
             )}
             {activeTab === 'pdf' && (
               <div className="animate-fade-in">
                 <RecipeImporter />
               </div>
             )}
             {activeTab === 'converter' && (
               <div className="animate-fade-in">
                 <MeasurementConverter />
               </div>
             )}
             {activeTab === 'showcase' && (
               <div className="animate-fade-in">
                 <DesignShowcase />
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default BakingLab;
