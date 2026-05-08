# LowStockAlert Component — Design Response

## TypeScript Types Used

From `types.ts` (import directly, never redefine locally):

```ts
import { InventoryItem } from '../types';
```

The relevant shape:

```ts
export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;   // Always in grams
  costPerKg?: number;
  lastUpdated: string;
  packageWeight?: number;
  packageUnit?: UnitOfMeasure;
  itemsPerPackage?: number;
  costPerPackage?: number;
}
```

`quantity` is always stored in grams, so comparing directly against `500` requires no unit conversion.

---

## localStorage Key

The skill's storage schema identifies:

| Key | Type |
|-----|------|
| `sourdough_inventory` | `InventoryItem[]` |

This is a legacy-prefixed key that predates the `bakeryos_<feature>` convention and must NOT be renamed (would wipe user data).

Reading pattern:

```ts
const inventory: InventoryItem[] = JSON.parse(
  localStorage.getItem('sourdough_inventory') || '[]'
);
```

---

## Hook: `useLowStockCount`

Rather than coupling the badge logic inside `Sidebar.tsx`, a small custom hook keeps the concern isolated and reusable:

```ts
// hooks/useLowStockCount.ts
import { useState, useEffect } from 'react';
import { InventoryItem } from '../types';

const LOW_STOCK_THRESHOLD_G = 500;

export function useLowStockCount(): number {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    function compute() {
      const inventory: InventoryItem[] = JSON.parse(
        localStorage.getItem('sourdough_inventory') || '[]'
      );
      setCount(inventory.filter(item => item.quantity < LOW_STOCK_THRESHOLD_G).length);
    }

    compute();
    window.addEventListener('storage', compute);
    return () => window.removeEventListener('storage', compute);
  }, []);

  return count;
}
```

---

## Component: `LowStockAlert`

A pure presentational badge that renders nothing when count is zero:

```tsx
// components/LowStockAlert.tsx
import React from 'react';

interface LowStockAlertProps {
  count: number;
}

const LowStockAlert: React.FC<LowStockAlertProps> = ({ count }) => {
  if (count === 0) return null;

  return (
    <span className="ml-auto inline-flex items-center justify-center
                     min-w-[1.25rem] h-5 px-1
                     bg-amber-600 text-white
                     text-xs font-bold rounded-full
                     leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
};

export default LowStockAlert;
```

---

## Wiring Into the Sidebar

Call `useLowStockCount()` at the top of the `Sidebar` component, then add the badge inside the Inventory button:

```tsx
{id === 'inventory' && <LowStockAlert count={lowStockCount} />}
```

---

## Key Invariants Applied

- `InventoryItem.quantity` is always in grams — threshold comparison `item.quantity < 500` is correct with no conversion.
- The localStorage key is `sourdough_inventory`, not `bakeryos_inventory` — legacy prefix preserved.
- `InventoryItem` imported from `../types`, never redefined.
- Badge uses `bg-amber-600 text-white` — consistent with BakeryOS brand conventions.
