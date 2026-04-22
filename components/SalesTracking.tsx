import React, { useState, useMemo, useCallback } from 'react';
import { storageService } from '../services/storageService';
import { fetchCatalogItemNames, syncAllLocations } from '../services/squareService';
import type {
  DistributionEntry, SquareCredential, SquareItemMapping,
  SquareSalesCache, SquareLocationId, SavedRecipe,
} from '../types';
import { SheetsIcon } from './icons/SheetsIcon';

type SubTab = 'log' | 'settings';
const LOCATIONS: SquareLocationId[] = ['food1', 'food2', 'bread'];
const LOCATION_LABELS: Record<SquareLocationId, string> = {
  food1: 'Food 1', food2: 'Food 2', bread: 'Bread Hall',
};

function emptyCredential(location_id: SquareLocationId): SquareCredential {
  return { location_id, access_token: '', square_location_id: '' };
}

// Square integration types use snake_case to match Square API field names directly.
function computeSellThrough(
  dist: DistributionEntry,
  salesCache: SquareSalesCache | null,
  mappings: SquareItemMapping[],
): { qtySold: number | null; remaining: number | null; sellThrough: number | null } {
  if (!salesCache) return { qtySold: null, remaining: null, sellThrough: null };

  const relevantMappings = mappings.filter(
    m => m.bread_item_name === dist.item_name && m.location_id === dist.location,
  );
  if (relevantMappings.length === 0) return { qtySold: null, remaining: null, sellThrough: null };

  let totalSold = 0;
  for (const mapping of relevantMappings) {
    const entry = salesCache.sales.find(
      s =>
        s.location_id === dist.location &&
        s.date === dist.date &&
        s.square_item_name === mapping.square_item_name,
    );
    if (entry) totalSold += entry.quantity_sold * mapping.units_per_sale;
  }

  const remaining = dist.quantity_distributed - totalSold;
  const sellThrough =
    dist.quantity_distributed > 0 ? (totalSold / dist.quantity_distributed) * 100 : 0;

  return { qtySold: totalSold, remaining, sellThrough };
}

const SalesTracking: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('log');

  const [distributions, setDistributions] = useState<DistributionEntry[]>(
    () => storageService.load<DistributionEntry>('bakeryos_distributions'),
  );
  const [credentials, setCredentials] = useState<SquareCredential[]>(() => {
    const saved = storageService.load<SquareCredential>('bakeryos_square_credentials');
    return LOCATIONS.map(loc => saved.find(c => c.location_id === loc) ?? emptyCredential(loc));
  });
  const [itemMappings, setItemMappings] = useState<SquareItemMapping[]>(
    () => storageService.load<SquareItemMapping>('bakeryos_square_item_map'),
  );
  const [salesCache, setSalesCache] = useState<SquareSalesCache | null>(() => {
    const cached = storageService.load<SquareSalesCache>('bakeryos_square_sales_cache');
    return cached[0] ?? null;
  });

  const [syncing, setSyncing] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [catalogItems, setCatalogItems] = useState<Partial<Record<SquareLocationId, string[]>>>({});
  const [fetchingCatalog, setFetchingCatalog] = useState(false);

  const recipes = useMemo(
    () => storageService.load<SavedRecipe>('bakeryos_recipes'),
    [],
  );
  const recipeNames = useMemo(() => recipes.map(r => r.name).sort(), [recipes]);

  const saveCredentials = useCallback((updated: SquareCredential[]) => {
    setCredentials(updated);
    storageService.save('bakeryos_square_credentials', updated);
  }, []);

  const saveItemMappings = useCallback((updated: SquareItemMapping[]) => {
    setItemMappings(updated);
    storageService.save('bakeryos_square_item_map', updated);
  }, []);

  const handleSync = async () => {
    const configured = credentials.filter(c => c.access_token && c.square_location_id);
    if (configured.length === 0) return;
    const earliest = distributions.reduce(
      (min, d) => (d.date < min ? d.date : min),
      new Date().toISOString().substring(0, 10),
    );
    setSyncing(true);
    try {
      const cache = await syncAllLocations(configured, itemMappings, earliest);
      setSalesCache(cache);
      storageService.save('bakeryos_square_sales_cache', [cache]);
    } finally {
      setSyncing(false);
    }
  };

  const handleFetchCatalog = async () => {
    setFetchingCatalog(true);
    const results: Partial<Record<SquareLocationId, string[]>> = {};
    await Promise.all(
      credentials
        .filter(c => c.access_token && c.square_location_id)
        .map(async c => {
          try {
            results[c.location_id] = await fetchCatalogItemNames(c);
          } catch {
            results[c.location_id] = [];
          }
        }),
    );
    setCatalogItems(results);
    setFetchingCatalog(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <SheetsIcon className="h-7 w-7 text-amber-600" />
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Sales Tracking</h1>
      </div>

      <div className="flex gap-1 border-b border-stone-200 dark:border-stone-700">
        {(['log', 'settings'] as SubTab[]).map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px capitalize ${
              subTab === t
                ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
            }`}
          >
            {t === 'log' ? 'Distribution Log' : 'Settings'}
          </button>
        ))}
      </div>

      {subTab === 'log' && (
        <LogTab
          distributions={distributions}
          setDistributions={setDistributions}
          salesCache={salesCache}
          itemMappings={itemMappings}
          recipeNames={recipeNames}
          syncing={syncing}
          onSync={handleSync}
          showLogForm={showLogForm}
          setShowLogForm={setShowLogForm}
        />
      )}

      {subTab === 'settings' && (
        <SettingsTab
          credentials={credentials}
          onSaveCredentials={saveCredentials}
          itemMappings={itemMappings}
          onSaveItemMappings={saveItemMappings}
          catalogItems={catalogItems}
          onFetchCatalog={handleFetchCatalog}
          fetchingCatalog={fetchingCatalog}
          recipeNames={recipeNames}
        />
      )}
    </div>
  );
};

interface SettingsTabProps {
  credentials: SquareCredential[];
  onSaveCredentials: (c: SquareCredential[]) => void;
  itemMappings: SquareItemMapping[];
  onSaveItemMappings: (m: SquareItemMapping[]) => void;
  catalogItems: Partial<Record<SquareLocationId, string[]>>;
  onFetchCatalog: () => void;
  fetchingCatalog: boolean;
  recipeNames: string[];
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  credentials, onSaveCredentials, itemMappings, onSaveItemMappings,
  catalogItems, onFetchCatalog, fetchingCatalog, recipeNames,
}) => {
  const handleCredentialChange = (
    idx: number,
    field: keyof Omit<SquareCredential, 'location_id'>,
    value: string,
  ) => {
    const updated = credentials.map((c, i) => (i === idx ? { ...c, [field]: value } : c));
    onSaveCredentials(updated);
  };

  const addMapping = () => {
    onSaveItemMappings([
      ...itemMappings,
      { square_item_name: '', bread_item_name: '', units_per_sale: 1, location_id: 'food1' },
    ]);
  };

  const updateMapping = (idx: number, field: keyof SquareItemMapping, value: string | number) => {
    onSaveItemMappings(itemMappings.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  };

  const removeMapping = (idx: number) => {
    onSaveItemMappings(itemMappings.filter((_, i) => i !== idx));
  };

  const allCatalogNames = useMemo(() => {
    const names = new Set<string>();
    Object.values(catalogItems).forEach(arr => arr?.forEach(n => names.add(n)));
    return Array.from(names).sort();
  }, [catalogItems]);

  return (
    <div className="space-y-8">
      <section className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50 mb-4">Square Credentials</h2>
        <div className="space-y-6">
          {credentials.map((cred, idx) => (
            <div key={cred.location_id} className="space-y-3">
              <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300">
                {LOCATION_LABELS[cred.location_id]}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">
                    Personal Access Token
                  </label>
                  <input
                    type="password"
                    value={cred.access_token}
                    onChange={e => handleCredentialChange(idx, 'access_token', e.target.value)}
                    placeholder="EAAAl..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">
                    Square Location ID
                  </label>
                  <input
                    type="text"
                    value={cred.square_location_id}
                    onChange={e => handleCredentialChange(idx, 'square_location_id', e.target.value)}
                    placeholder="LXXXXXXXXX"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`inline-block w-2 h-2 rounded-full ${cred.access_token && cred.square_location_id ? 'bg-green-500' : 'bg-stone-300 dark:bg-stone-600'}`} />
                <span className="text-stone-500 dark:text-stone-400">
                  {cred.access_token && cred.square_location_id ? 'Configured' : 'Not configured'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Item Mapping</h2>
          <button
            onClick={onFetchCatalog}
            disabled={fetchingCatalog}
            className="px-3 py-1.5 text-xs font-medium bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors disabled:opacity-50"
          >
            {fetchingCatalog ? 'Fetching…' : 'Fetch Square Catalog'}
          </button>
        </div>

        {Object.keys(catalogItems).length > 0 && (
          <p className="text-xs text-green-600 dark:text-green-400 mb-3">
            Catalog loaded — {allCatalogNames.length} items found
          </p>
        )}

        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-stone-500 dark:text-stone-400 px-1">
            <span className="col-span-4">Square Item</span>
            <span className="col-span-4">Maps To (BakeryOS)</span>
            <span className="col-span-2">Units/Sale</span>
            <span className="col-span-1">Location</span>
            <span className="col-span-1" />
          </div>

          {itemMappings.length === 0 && (
            <p className="text-sm text-stone-400 dark:text-stone-500 py-4 text-center">
              No mappings yet — add one below or fetch the catalog first
            </p>
          )}

          {itemMappings.map((mapping, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              {allCatalogNames.length > 0 ? (
                <select
                  value={mapping.square_item_name}
                  onChange={e => updateMapping(idx, 'square_item_name', e.target.value)}
                  className="col-span-4 px-2 py-1.5 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">Select item…</option>
                  {allCatalogNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={mapping.square_item_name}
                  onChange={e => updateMapping(idx, 'square_item_name', e.target.value)}
                  placeholder="Square item name"
                  className="col-span-4 px-2 py-1.5 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              )}

              <select
                value={mapping.bread_item_name}
                onChange={e => updateMapping(idx, 'bread_item_name', e.target.value)}
                className="col-span-4 px-2 py-1.5 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Select bread…</option>
                {recipeNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>

              <input
                type="number"
                min={1}
                value={mapping.units_per_sale}
                onChange={e => updateMapping(idx, 'units_per_sale', parseInt(e.target.value, 10) || 1)}
                className="col-span-2 px-2 py-1.5 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />

              <select
                value={mapping.location_id}
                onChange={e => updateMapping(idx, 'location_id', e.target.value as SquareLocationId)}
                className="col-span-1 px-2 py-1.5 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{LOCATION_LABELS[loc]}</option>
                ))}
              </select>

              <button
                onClick={() => removeMapping(idx)}
                aria-label="Remove mapping"
                className="col-span-1 flex items-center justify-center text-stone-400 hover:text-red-500 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}

          <button
            onClick={addMapping}
            className="mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
          >
            + Add Mapping
          </button>
        </div>
      </section>
    </div>
  );
};

interface LogTabProps {
  distributions: DistributionEntry[];
  setDistributions: (d: DistributionEntry[]) => void;
  salesCache: SquareSalesCache | null;
  itemMappings: SquareItemMapping[];
  recipeNames: string[];
  syncing: boolean;
  onSync: () => void;
  showLogForm: boolean;
  setShowLogForm: (v: boolean) => void;
}

const EMPTY_FORM = {
  date: new Date().toISOString().substring(0, 10),
  location: 'food1' as SquareLocationId,
  item_name: '',
  quantity_distributed: 1,
  notes: '',
};

const LogTab: React.FC<LogTabProps> = ({
  distributions, setDistributions, salesCache, itemMappings,
  recipeNames, syncing, onSync, showLogForm, setShowLogForm,
}) => {
  const [form, setForm] = useState(EMPTY_FORM);

  const sorted = useMemo(
    () => [...distributions].sort((a, b) => b.date.localeCompare(a.date)),
    [distributions],
  );

  const lastSyncedLabel = useMemo(() => {
    if (!salesCache) return 'Never synced';
    const diff = Date.now() - new Date(salesCache.last_synced_at).getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor(diff / 60000);
    if (hours >= 24) return `Last synced: ${Math.floor(hours / 24)}d ago`;
    if (hours >= 1) return `Last synced: ${hours}h ago`;
    return `Last synced: ${mins}m ago`;
  }, [salesCache]);

  const handleSubmitLog = () => {
    if (!form.item_name || form.quantity_distributed < 1) return;
    const entry: DistributionEntry = {
      id: `dist-${Date.now()}`,
      date: form.date,
      location: form.location,
      item_name: form.item_name,
      quantity_distributed: form.quantity_distributed,
      notes: form.notes || undefined,
    };
    const updated = [...distributions, entry];
    setDistributions(updated);
    storageService.save('bakeryos_distributions', updated);
    setForm(EMPTY_FORM);
    setShowLogForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">{lastSyncedLabel}</p>
            {salesCache?.sync_errors && salesCache.sync_errors.length > 0 && (
              <div className="space-y-0.5">
                {salesCache.sync_errors.map(e => (
                  <p key={e.location_id} className="text-xs text-red-600 dark:text-red-400">
                    ⚠ {e.error}
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {LOCATIONS.map(loc => {
                const hasError = salesCache?.sync_errors.some(e => e.location_id === loc);
                const hasSales = salesCache?.sales.some(s => s.location_id === loc);
                return (
                  <div key={loc} className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        !salesCache ? 'bg-stone-300 dark:bg-stone-600' :
                        hasError ? 'bg-red-500' :
                        hasSales ? 'bg-green-500' : 'bg-amber-400'
                      }`}
                    />
                    {LOCATION_LABELS[loc]}
                  </div>
                );
              })}
            </div>
            <button
              onClick={onSync}
              disabled={syncing}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {syncing ? 'Syncing…' : 'Sync Square'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowLogForm(true)}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
        >
          + Log Distribution
        </button>
      </div>

      <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
        {sorted.length === 0 ? (
          <div className="p-8 text-center text-stone-400 dark:text-stone-500 text-sm">
            No distributions logged yet. Click "+ Log Distribution" to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/50">
                <th className="text-left px-4 py-3 font-medium text-stone-600 dark:text-stone-400">Date</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600 dark:text-stone-400">Item</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600 dark:text-stone-400">Location</th>
                <th className="text-right px-4 py-3 font-medium text-stone-600 dark:text-stone-400">Distributed</th>
                <th className="text-right px-4 py-3 font-medium text-stone-600 dark:text-stone-400">Sold</th>
                <th className="text-right px-4 py-3 font-medium text-stone-600 dark:text-stone-400">Remaining</th>
                <th className="text-right px-4 py-3 font-medium text-stone-600 dark:text-stone-400">Sell-Through</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
              {sorted.map(dist => {
                const { qtySold, remaining, sellThrough } = computeSellThrough(dist, salesCache, itemMappings);
                const noData = qtySold === null;
                return (
                  <tr key={dist.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                    <td className="px-4 py-3 text-stone-700 dark:text-stone-300">{dist.date}</td>
                    <td className="px-4 py-3 text-stone-900 dark:text-stone-100 font-medium">{dist.item_name}</td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{LOCATION_LABELS[dist.location]}</td>
                    <td className="px-4 py-3 text-right text-stone-900 dark:text-stone-100">{dist.quantity_distributed}</td>
                    <td className="px-4 py-3 text-right">
                      {noData ? (
                        <span className="text-stone-300 dark:text-stone-600 text-xs">no sales data</span>
                      ) : (
                        <span className="text-stone-900 dark:text-stone-100">{qtySold}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {noData ? (
                        <span className="text-stone-300 dark:text-stone-600 text-xs">—</span>
                      ) : (
                        <span className={remaining! < 0 ? 'text-red-600' : 'text-stone-900 dark:text-stone-100'}>
                          {remaining}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {noData ? (
                        <span className="text-stone-300 dark:text-stone-600 text-xs">—</span>
                      ) : (
                        <span className={`font-medium ${sellThrough! >= 80 ? 'text-green-600 dark:text-green-400' : sellThrough! >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {sellThrough!.toFixed(0)}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showLogForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Log Distribution</h2>

            <div>
              <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">Location</label>
              <select
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value as SquareLocationId }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{LOCATION_LABELS[loc]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">Item</label>
              {recipeNames.length > 0 ? (
                <select
                  value={form.item_name}
                  onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">Select bread item…</option>
                  {recipeNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={form.item_name}
                  onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))}
                  placeholder="e.g. Country Sourdough"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              )}
            </div>

            <div>
              <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">Quantity Distributed</label>
              <input
                type="number"
                min={1}
                value={form.quantity_distributed}
                onChange={e => setForm(f => ({ ...f, quantity_distributed: parseInt(e.target.value, 10) || 1 }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">Notes (optional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Saturday farmers market"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSubmitLog}
                disabled={!form.item_name || form.quantity_distributed < 1}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                Log Distribution
              </button>
              <button
                onClick={() => { setShowLogForm(false); setForm(EMPTY_FORM); }}
                className="px-4 py-2 text-stone-600 dark:text-stone-400 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesTracking;
