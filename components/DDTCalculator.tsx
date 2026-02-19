
import React, { useState, useEffect } from 'react';

const DDTCalculator: React.FC = () => {
  const [targetDoughTemp, setTargetDoughTemp] = useState<number>(25);
  const [airTemp, setAirTemp] = useState<number>(22);
  const [flourTemp, setFlourTemp] = useState<number>(21);
  const [starterTemp, setStarterTemp] = useState<number>(21);
  const [frictionFactor, setFrictionFactor] = useState<number>(2); // Typical for hand-mixed or slow spiral
  const [unit, setUnit] = useState<'C' | 'F'>('C');

  const [waterTemp, setWaterTemp] = useState<number>(0);

  useEffect(() => {
    // Formula: (Target * 3) - (Air + Flour + Starter + Friction)
    // Or (Target * 4) if using a poolish/soaker too, but 3 is standard for sourdough.
    const result = (targetDoughTemp * 3) - (airTemp + flourTemp + starterTemp + frictionFactor);
    setWaterTemp(result);
  }, [targetDoughTemp, airTemp, flourTemp, starterTemp, frictionFactor]);

  const toggleUnit = () => {
    if (unit === 'C') {
      setTargetDoughTemp(Math.round(targetDoughTemp * 9/5 + 32));
      setAirTemp(Math.round(airTemp * 9/5 + 32));
      setFlourTemp(Math.round(flourTemp * 9/5 + 32));
      setStarterTemp(Math.round(starterTemp * 9/5 + 32));
      setFrictionFactor(Math.round(frictionFactor * 9/5)); // Friction is a delta
      setUnit('F');
    } else {
      setTargetDoughTemp(Math.round((targetDoughTemp - 32) * 5/9));
      setAirTemp(Math.round((airTemp - 32) * 5/9));
      setFlourTemp(Math.round((flourTemp - 32) * 5/9));
      setStarterTemp(Math.round((starterTemp - 32) * 5/9));
      setFrictionFactor(Math.round(frictionFactor * 5/9));
      setUnit('C');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100">DDT Calculator</h3>
        <button 
          onClick={toggleUnit}
          className="text-xs font-bold px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700"
        >
          Switch to °{unit === 'C' ? 'F' : 'C'}
        </button>
      </div>
      
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Control your fermentation by calculating the exact water temperature needed to hit your Desired Dough Temperature.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Target Dough Temp</label>
            <input 
              type="number" 
              value={targetDoughTemp} 
              onChange={e => setTargetDoughTemp(parseFloat(e.target.value) || 0)}
              className="w-full bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 rounded-lg p-3 text-lg font-bold"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Ambient Air</label>
              <input type="number" value={airTemp} onChange={e => setAirTemp(parseFloat(e.target.value) || 0)} className="w-full bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 rounded-lg p-2 text-sm font-bold" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Flour Temp</label>
              <input type="number" value={flourTemp} onChange={e => setFlourTemp(parseFloat(e.target.value) || 0)} className="w-full bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 rounded-lg p-2 text-sm font-bold" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Starter Temp</label>
              <input type="number" value={starterTemp} onChange={e => setStarterTemp(parseFloat(e.target.value) || 0)} className="w-full bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 rounded-lg p-2 text-sm font-bold" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Mixer Friction</label>
              <input type="number" value={frictionFactor} onChange={e => setFrictionFactor(parseFloat(e.target.value) || 0)} className="w-full bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 rounded-lg p-2 text-sm font-bold" />
            </div>
          </div>
        </div>

        <div className="bg-amber-600 rounded-2xl p-8 text-white text-center shadow-lg shadow-amber-600/20">
          <span className="block text-xs font-black uppercase tracking-[0.2em] mb-2 opacity-80">Required Water Temp</span>
          <span className="text-6xl font-black">{Math.round(waterTemp)}°{unit}</span>
          <p className="mt-4 text-xs opacity-70 leading-relaxed">
            {waterTemp < 4 ? "Caution: Temperature is very low. You may need ice." : 
             waterTemp > 45 ? "Caution: Temperature is very high. This may damage your yeast/bacteria." : 
             "Ideal range for controlled fermentation."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DDTCalculator;
