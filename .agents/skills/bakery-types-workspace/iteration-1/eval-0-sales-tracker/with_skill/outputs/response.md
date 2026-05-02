## TypeScript Types Used

Import from `types.ts` — never redefine locally:

```ts
import { WorkOrder, WorkOrderLineItem } from '../types';
```

Key fields on `WorkOrder`:
- `status: WorkOrderStatus` — filter for `'complete'`
- `completedAt: string | null` — used to scope to current week
- `lineItems: WorkOrderLineItem[]` — each has `recipeName` and `count`
- `estimatedCost: number` — WorkOrder-level total cost (not per line item)

## localStorage Key

```ts
const workOrders: WorkOrder[] = JSON.parse(
  localStorage.getItem('bakeryos_work_orders') || '[]'
);
```

Key is `bakeryos_work_orders` (modern prefix — do not rename).

## Aggregation Logic

Since `estimatedCost` is WorkOrder-level, apportion it across `lineItems` proportionally by unit count:

```ts
for (const wo of completed) {
  const totalUnits = wo.lineItems.reduce((sum, li) => sum + li.count, 0);
  for (const li of wo.lineItems) {
    const share = totalUnits > 0 ? li.count / totalUnits : 0;
    const revenue = wo.estimatedCost * share;
    // accumulate into Map keyed by li.recipeName
  }
}
```

## Component Structure

`SalesTracker` is a `React.FC` with no props. It uses `useMemo` to read and aggregate localStorage on mount. It renders:
1. A page heading + subtitle (completed work order count for the week)
2. A summary card showing total estimated weekly revenue in amber
3. A table with columns: Recipe | Units Produced | Est. Revenue | % of Total — sorted descending by revenue, using the standard BakeryOS table/card Tailwind patterns

## Wiring

- Add `'sales'` to the `Tab` union in `Sidebar.tsx`
- Add an entry to `mainNavItems` in `Sidebar.tsx`
- Import and render `<SalesTracker />` in `App.tsx` when `activeTab === 'sales'`
