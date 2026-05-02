## LowStockAlert Component — Design Response

### TypeScript Types

The relevant type is `InventoryItem` in `/Users/kevin/sourdough-pro-ai/types.ts`. The `quantity` field is stored in grams (confirmed by both the inline comment and all read/write code in `InventoryManagement.tsx`). No unit conversion is needed — compare directly against 500.

### localStorage Key

The inventory is stored under **`sourdough_inventory`** (not the `bakeryos_` prefix used by theme/work-orders). This is the key used in `InventoryManagement.tsx`:

```ts
localStorage.getItem('sourdough_inventory')
```

### Hook: `useLowStockCount`

Rather than a rendered component, the cleanest approach is a custom hook. It can live in a new `hooks/useLowStockCount.ts` file and be called from `App.tsx`.

```ts
// hooks/useLowStockCount.ts
import { useState, useEffect } from 'react';
import { InventoryItem } from '../types';

const LOW_STOCK_THRESHOLD_GRAMS = 500;

export function useLowStockCount(): number {
  const [count, setCount] = useState<number>(0);

  const computeCount = () => {
    const raw = localStorage.getItem('sourdough_inventory');
    if (!raw) { setCount(0); return; }
    try {
      const items: InventoryItem[] = JSON.parse(raw);
      setCount(items.filter(item => item.quantity < LOW_STOCK_THRESHOLD_GRAMS).length);
    } catch {
      setCount(0);
    }
  };

  useEffect(() => {
    computeCount();
    window.addEventListener('storage', computeCount);
    return () => window.removeEventListener('storage', computeCount);
  }, []);

  return count;
}
```

### Sidebar Integration

1. Call `useLowStockCount()` in `App.tsx` and pass the result as `lowStockCount: number` prop to `<Sidebar>`.
2. Add `lowStockCount: number` to `SidebarProps`.
3. Inside the `mainNavItems.map()` in `Sidebar.tsx`, conditionally render a badge span next to the Inventory label when `id === 'inventory' && lowStockCount > 0`.

Badge element:

```tsx
{id === 'inventory' && lowStockCount > 0 && (
  <span className="ml-2 inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full text-[10px] font-black bg-red-500 text-white">
    {lowStockCount}
  </span>
)}
```

### Key Design Decisions

- **Hook not component**: A count is data, not UI. The hook can be consumed anywhere without extra DOM nesting.
- **Threshold 500g**: `quantity` is always in grams; 500g is a sensible commercial bakery low-stock floor.
- **Count lives in App.tsx**: Avoids Sidebar reading localStorage directly.
- **Red badge**: Differentiates from amber brand palette so the alert reads as urgent.
