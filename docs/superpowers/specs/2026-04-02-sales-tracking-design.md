# Sales Tracking — Layer 1 Design Spec
**Date:** 2026-04-02
**Status:** Approved

## Context

Kevin distributes bread to three Square-connected locations on his property (food1, food2, bread hall). Currently there is no way to know how much of what he distributed actually sold. This feature adds distribution logging and Square sales sync so he can see sell-through (distributed vs. sold vs. remaining) per item per location per day. This is Layer 1 of a larger forecasting initiative — data accumulates here before Layer 2 (AI-powered forecasting) is built.

---

## Data Model

Four new localStorage keys:

### `bakeryos_distributions`
Array of distribution log entries:
```ts
{
  id: string
  date: string               // ISO date, e.g. "2026-04-02"
  location: 'food1' | 'food2' | 'bread'
  item_name: string          // BakeryOS bread item name
  quantity_distributed: number
  notes?: string
}
```

### `bakeryos_square_credentials`
One entry per location:
```ts
{
  location_id: 'food1' | 'food2' | 'bread'
  access_token: string       // Personal access token (does not expire)
  square_location_id: string // Square's internal location ID
}
```

### `bakeryos_square_item_map`
Maps Square catalog items to BakeryOS bread items:
```ts
{
  square_item_name: string   // As it appears in Square catalog
  bread_item_name: string    // BakeryOS item name
  units_per_sale: number     // e.g. 1 for burger bun, 3 for slider trio
  location_id: 'food1' | 'food2' | 'bread'
}
```

### `bakeryos_square_sales_cache`
Cached sync results with timestamp:
```ts
{
  last_synced_at: string     // ISO datetime
  sales: {
    location_id: string
    date: string
    square_item_name: string
    quantity_sold: number
  }[]
  sync_errors: {
    location_id: string
    error: string
  }[]
}
```

Sales data is **not fetched on page load** — it is cached from the last manual sync and refreshed on demand via a "Sync Square" button.

---

## UI Layout

New top-level tab: **Sales Tracking**

### Sync Bar (top of page)
- "Last synced: X hours ago" (or "Never synced" if no cache)
- "Sync Square" button — triggers sync across all 3 locations
- Per-location status indicators showing last sync success/failure

### Distribution Log (main content)
Table with columns: Date | Item | Location | Qty Distributed | Qty Sold | Remaining | Sell-Through %

- "+ Log Distribution" button opens a form: date picker, location dropdown (food1/food2/bread), item name (from BakeryOS recipe list), quantity, optional notes
- Qty Sold and Remaining are computed from the sales cache — if no cache data exists for a row, show "—" with a "no sales data" indicator
- Rows sortable by date (default: newest first)

### Settings (sub-tab or collapsible section)
Two config areas:

**Square Credentials**
For each of the 3 locations: label, access token input, Square location ID input, connection status indicator.

**Item Mapping**
- "Fetch Square Catalog" button — calls Square List Catalog Items for all 3 locations, populates a picker
- Table of mappings: Square Item (dropdown from catalog) | Maps To (BakeryOS item name) | Units Per Sale | Location
- "+ Add Mapping" to add rows, trash icon to remove

---

## Square API Integration

**Endpoints used:**
- `GET /v2/catalog/list` — called once from Settings to populate the item mapping picker. Not called on sync.
- `POST /v2/orders/search` — called per location on each sync, filtered by date range (earliest distribution date to today)

**Sync flow:**
1. User hits "Sync Square"
2. For each of the 3 locations in parallel:
   - Call Orders Search with date range covering all logged distributions
   - Filter results to mapped items only
   - Aggregate quantity sold per item per date
3. Merge results + any errors into `bakeryos_square_sales_cache` with current timestamp
4. Distribution table re-renders from updated cache

**Authentication:** Personal access tokens (non-expiring) stored in `bakeryos_square_credentials`. No OAuth refresh logic needed.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| 401 from Square | Red indicator on sync bar: "Credentials invalid for [location] — check Settings" |
| No mapped items in response | Warning: "No mapped items found in Square data for this period — check Item Mapping in Settings" |
| Partial sync failure | Save successful locations to cache, show which location(s) failed with error message |
| Distribution with no matching sales data | Show full distributed qty as remaining, "no sales data" indicator — not blank |
| Offline / network error | Show last cached data with "Sync failed — showing cached data from X" |

---

## Out of Scope (Layer 1)
- Forecasting / pattern recognition (Layer 2)
- Attendance data / event tagging
- Automatic/scheduled syncs
- Historical Square data backfill beyond distribution log date range
