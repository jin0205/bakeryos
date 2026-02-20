
import React from 'react';

interface HeaderProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleTheme }) => {
  return (
    <header className="bg-white dark:bg-stone-900 shadow-sm border-b border-stone-200 dark:border-stone-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-stone-50 tracking-tight">
              Sourdough <span className="text-amber-600">Pro AI</span>
            </h1>
            <div className="flex items-center gap-4">
              <p className="hidden md:block text-stone-500 dark:text-stone-400 text-sm">Your AI-Powered Baking Partner</p>
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                aria-label="Toggle Dark Mode"
              >
                {isDarkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
