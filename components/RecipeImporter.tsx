import React, { useState, useMemo } from 'react';
import { parseRecipePdf, parseRecipeText } from '../services/geminiService';
import { SavedRecipe, Ingredient } from '../types';
import Spinner from './Spinner';
import { DocumentIcon } from './icons/DocumentIcon';
import { SheetsIcon } from './icons/SheetsIcon';

interface ExtractedData {
    name: string;
    numberOfLoaves: number;
    weightPerLoaf: number;
    ingredients: { name: string; weight: number }[];
}

interface PreviewIngredient {
    name: string;
    weight: number;
    isFlour: boolean;
}

interface PreviewState {
    name: string;
    numberOfLoaves: number;
    weightPerLoaf: number;
    ingredients: PreviewIngredient[];
}

const FLOUR_KEYWORDS = [
    'flour', 'wheat', 'rye', 'spelt', 'semolina', 'durum', 
    'einkorn', 'emmer', 'kamut', 'strong', 'bread', 'all-purpose', 
    'plain', 'wholemeal', 't55', 't65', 't45', 't80', 't110', 't150',
    'manitoba', '00 flour'
];

const EXCLUSION_KEYWORDS = [
    'levain', 'starter', 'dusting', 'rice flour', 'discard', 'preferment'
];

type ImportMode = 'pdf' | 'sheets';

const RecipeImporter: React.FC = () => {
    const [mode, setMode] = useState<ImportMode>('pdf');
    const [file, setFile] = useState<File | null>(null);
    const [sheetsInput, setSheetsInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [previewData, setPreviewData] = useState<PreviewState | null>(null);
    const [successMessage, setSuccessMessage] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== 'application/pdf') {
                setError('Please upload a valid PDF file.');
                return;
            }
            setFile(selectedFile);
            setError('');
            setPreviewData(null);
            setSuccessMessage('');
        }
    };

    const isLikelyFlour = (name: string): boolean => {
        const lowerName = name.toLowerCase();
        const hasFlourKeyword = FLOUR_KEYWORDS.some(k => lowerName.includes(k));
        const isExcluded = EXCLUSION_KEYWORDS.some(k => lowerName.includes(k));
        return hasFlourKeyword && !isExcluded;
    };

    const processExtractedJson = (jsonString: string) => {
        let data: ExtractedData;
        try {
            data = JSON.parse(jsonString);
        } catch (jsonErr) {
            throw new Error("Could not interpret the extracted data structure.");
        }
        
        if (!data || !data.ingredients || !Array.isArray(data.ingredients) || data.ingredients.length === 0) {
            throw new Error("No identifiable ingredients found.");
        }

        const hasValidWeights = data.ingredients.some(i => i.weight && !isNaN(Number(i.weight)) && Number(i.weight) > 0);
        if (!hasValidWeights) {
             throw new Error("Ingredients were found but weights could not be determined.");
        }
        
        const processedIngredients: PreviewIngredient[] = data.ingredients.map(ing => ({
            name: ing.name,
            weight: Number(ing.weight) || 0,
            isFlour: isLikelyFlour(ing.name)
        }));

        const hasFlour = processedIngredients.some(i => i.isFlour);
        if (!hasFlour && processedIngredients.length > 0) {
             const maxWeight = Math.max(...processedIngredients.map(i => i.weight));
             const heaviest = processedIngredients.find(i => i.weight === maxWeight);
             if (heaviest) heaviest.isFlour = true;
        }

        setPreviewData({
            name: data.name || "Imported Recipe",
            numberOfLoaves: Number(data.numberOfLoaves) || 1,
            weightPerLoaf: Number(data.weightPerLoaf) || 1000,
            ingredients: processedIngredients
        });
    };

    const handleExtract = async () => {
        setIsLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            let jsonString = '';
            if (mode === 'pdf') {
                if (!file) throw new Error("No file selected.");
                jsonString = await parseRecipePdf(file);
            } else {
                if (!sheetsInput.trim()) throw new Error("Please enter a URL or paste sheet data.");
                
                let contentToParse = sheetsInput;
                
                // Check if it's a Google Sheets URL
                if (sheetsInput.includes('docs.google.com/spreadsheets')) {
                    const match = sheetsInput.match(/\/d\/([a-zA-Z0-9-_]+)/);
                    if (match && match[1]) {
                        const spreadsheetId = match[1];
                        // Attempt to fetch as public CSV
                        const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
                        try {
                            const response = await fetch(csvUrl);
                            if (response.ok) {
                                contentToParse = await response.text();
                            } else {
                                // Fallback: just send the URL to Gemini, maybe it can use search tool if public
                                console.warn("Failed to fetch direct CSV, sheet might be private. Sending URL to AI.");
                            }
                        } catch (fetchErr) {
                            console.warn("CORS or network error fetching CSV. Sending text to AI.");
                        }
                    }
                }
                
                jsonString = await parseRecipeText(contentToParse);
            }
            
            processExtractedJson(jsonString);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to extract recipe data.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: keyof PreviewState, value: string | number) => {
        if (!previewData) return;
        setPreviewData({ ...previewData, [field]: value });
    };

    const handleIngredientChange = (index: number, field: keyof PreviewIngredient, value: string | number | boolean) => {
        if (!previewData) return;
        const updatedIngs = [...previewData.ingredients];
        updatedIngs[index] = { ...updatedIngs[index], [field]: value };
        setPreviewData({ ...previewData, ingredients: updatedIngs });
    };

    const totalFlourWeight = useMemo(() => {
        if (!previewData) return 0;
        return previewData.ingredients.reduce((sum, ing) => ing.isFlour ? sum + (Number(ing.weight) || 0) : sum, 0);
    }, [previewData]);

    const calculatePercentagesAndSave = () => {
        if (!previewData) return;
        if (totalFlourWeight <= 0) {
            alert("Total Flour Weight is 0. Please select at least one ingredient in the 'Flour?' column to act as the 100% base.");
            return;
        }

        const allIngredients = previewData.ingredients.map((ing, idx) => ({
            id: idx + 1,
            name: ing.name,
            percentage: parseFloat(((Number(ing.weight) / totalFlourWeight) * 100).toFixed(1)),
            isFlour: ing.isFlour
        }));

        const finalFlours: Ingredient[] = allIngredients
            .filter(i => i.isFlour)
            .map(({ isFlour, ...rest }) => rest);
            
        const finalIngredients: Ingredient[] = allIngredients
            .filter(i => !i.isFlour)
            .map(({ isFlour, ...rest }) => rest);

        // Added missing targetLoafWeight to fix TypeScript error
        const newRecipe: SavedRecipe = {
            id: Date.now().toString(),
            name: previewData.name || `Imported ${mode === 'pdf' ? 'PDF' : 'Sheets'} Recipe`,
            numberOfLoaves: Number(previewData.numberOfLoaves) || 1,
            weightPerLoaf: Number(previewData.weightPerLoaf) || 1000,
            targetLoafWeight: Number(previewData.weightPerLoaf) || 1000,
            flours: finalFlours,
            ingredients: finalIngredients,
            date: new Date().toLocaleDateString(),
            version: 1,
            history: [],
        };

        try {
            const existingStr = localStorage.getItem('sourdough_recipes');
            const existing: SavedRecipe[] = existingStr ? JSON.parse(existingStr) : [];
            const updated = [...existing, newRecipe];
            localStorage.setItem('sourdough_recipes', JSON.stringify(updated));
            setSuccessMessage("Recipe saved successfully! Check the Recipe Management tab.");
            setPreviewData(null);
            setFile(null);
            setSheetsInput('');
        } catch (e) {
            console.error("Save failed", e);
            setError("Failed to save recipe to local storage.");
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Recipe Importer</h2>
                <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
                    <button 
                        onClick={() => { setMode('pdf'); setError(''); setPreviewData(null); }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'pdf' ? 'bg-white dark:bg-stone-900 text-amber-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                        PDF File
                    </button>
                    <button 
                        onClick={() => { setMode('sheets'); setError(''); setPreviewData(null); }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'sheets' ? 'bg-white dark:bg-stone-900 text-green-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                        Google Sheets
                    </button>
                </div>
            </div>

            <p className="text-stone-600 dark:text-stone-400 mb-6">
                {mode === 'pdf' 
                    ? 'Upload a digital recipe card or sheet (PDF). AI will extract the ingredients and normalize all units into grams.' 
                    : 'Paste a Google Sheets URL or copy-paste rows directly from your spreadsheet. Ensure your sheet is "Published to web" for best URL extraction.'}
            </p>

            {/* Input Area */}
            {!previewData && (
                <div className="bg-stone-50 dark:bg-stone-900/40 border-2 border-dashed border-stone-300 dark:border-stone-700/60 rounded-lg p-8 text-center hover:border-amber-500 dark:hover:border-amber-600 transition-colors mb-8">
                    {mode === 'pdf' ? (
                        <>
                            <DocumentIcon className="mx-auto h-12 w-12 text-stone-400 dark:text-stone-50 mb-3" />
                            <label htmlFor="pdf-upload" className="cursor-pointer">
                                <span className="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
                                    {file ? file.name : 'Click to select a PDF file'}
                                </span>
                                <input id="pdf-upload" type="file" accept="application/pdf" className="sr-only" onChange={handleFileChange} />
                            </label>
                        </>
                    ) : (
                        <div className="max-w-2xl mx-auto space-y-4">
                            <SheetsIcon className="mx-auto h-12 w-12 text-green-500 mb-3" />
                            <textarea
                                value={sheetsInput}
                                onChange={(e) => setSheetsInput(e.target.value)}
                                placeholder="Paste Google Sheets URL or row data here..."
                                className="w-full h-32 p-3 text-sm bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-md focus:ring-amber-500 focus:border-amber-500 dark:text-stone-100"
                            />
                            <p className="text-[10px] text-stone-400 text-left">
                                Tip: If using a URL, make sure the sheet is public or go to File &gt; Share &gt; Publish to web.
                            </p>
                        </div>
                    )}
                    
                    <button
                        onClick={handleExtract}
                        disabled={isLoading || (mode === 'pdf' ? !file : !sheetsInput.trim())}
                        className={`mt-4 px-8 py-2.5 rounded-md text-sm font-bold text-white transition-all shadow-md ${
                            mode === 'pdf' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'
                        } disabled:bg-stone-300 dark:disabled:bg-stone-800 disabled:cursor-not-allowed`}
                    >
                        {isLoading ? <Spinner /> : `Extract from ${mode === 'pdf' ? 'PDF' : 'Sheets'}`}
                    </button>

                    {error && <p className="mt-4 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-800">{error}</p>}
                    {successMessage && <p className="mt-4 text-sm text-green-600 dark:text-green-400 font-medium">{successMessage}</p>}
                </div>
            )}

            {/* Preview Area */}
            {previewData && (
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-sm overflow-hidden animate-fade-in transition-colors">
                    <div className="bg-stone-50 dark:bg-stone-950/50 px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                            <h3 className="font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                                Recipe Preview
                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold ${mode === 'pdf' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                    {mode.toUpperCase()} Import
                                </span>
                            </h3>
                            <p className="text-xs text-stone-500">Heuristics applied. Verify weights before saving.</p>
                        </div>
                        <div className="text-right">
                             <div className="text-xs text-stone-500 uppercase tracking-wide">Total Flour</div>
                             <div className="font-bold text-lg text-amber-600">{totalFlourWeight.toFixed(0)} g</div>
                        </div>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">Recipe Name</label>
                                <input type="text" value={previewData.name} onChange={(e) => handleInputChange('name', e.target.value)} className="block w-full px-3 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 rounded-md text-sm dark:text-stone-100" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">Yield (Loaves)</label>
                                <input type="number" value={previewData.numberOfLoaves} onChange={(e) => handleInputChange('numberOfLoaves', parseFloat(e.target.value))} className="block w-full px-3 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 rounded-md text-sm dark:text-stone-100" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">Weight / Loaf (g)</label>
                                <input type="number" value={previewData.weightPerLoaf} onChange={(e) => handleInputChange('weightPerLoaf', parseFloat(e.target.value))} className="block w-full px-3 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 rounded-md text-sm dark:text-stone-100" />
                            </div>
                        </div>

                        <div className="border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-800">
                                <thead className="bg-stone-50 dark:bg-stone-950">
                                    <tr>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-stone-500 uppercase w-12">Flour?</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-stone-500 uppercase">Ingredient</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-stone-500 uppercase">Weight (g)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-200 dark:divide-stone-800 bg-white dark:bg-stone-900">
                                    {previewData.ingredients.map((ing, idx) => (
                                        <tr key={idx} className={ing.isFlour ? 'bg-amber-50 dark:bg-amber-900/10' : ''}>
                                            <td className="px-4 py-2 text-center">
                                                <input type="checkbox" checked={ing.isFlour} onChange={(e) => handleIngredientChange(idx, 'isFlour', e.target.checked)} className="h-4 w-4 text-amber-600 rounded cursor-pointer" />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input type="text" value={ing.name} onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)} className="w-full text-sm bg-transparent border-0 p-0 focus:ring-0 dark:text-stone-100" />
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <input type="number" value={ing.weight} onChange={(e) => handleIngredientChange(idx, 'weight', parseFloat(e.target.value))} className="w-20 text-right text-sm bg-transparent border-0 p-0 focus:ring-0 dark:text-stone-100" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end pt-4 gap-4">
                            <button onClick={() => setPreviewData(null)} className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900">Cancel</button>
                            <button onClick={calculatePercentagesAndSave} disabled={totalFlourWeight <= 0} className="px-6 py-2 bg-amber-600 text-white rounded-md text-sm font-bold hover:bg-amber-700 disabled:bg-stone-300">Save Recipe</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecipeImporter;