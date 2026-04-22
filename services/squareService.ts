import type { SquareCredential, SquareItemMapping, SquareSalesCache, SquareSaleEntry, SquareLocationId } from '../types';

const SQUARE_BASE = 'https://connect.squareup.com/v2';

export async function fetchCatalogItemNames(
  credential: SquareCredential,
): Promise<string[]> {
  const res = await fetch(`${SQUARE_BASE}/catalog/list?types=ITEM`, {
    headers: { Authorization: `Bearer ${credential.access_token}` },
  });
  if (!res.ok) throw new Error(`Square catalog fetch failed: ${res.status}`);
  const body = await res.json() as { objects?: { type: string; item_data?: { name?: string } }[] };
  return (body.objects ?? [])
    .filter(o => o.type === 'ITEM' && o.item_data?.name)
    .map(o => o.item_data!.name!);
}

async function searchOrders(
  credential: SquareCredential,
  startDate: string,
  endDate: string,
  mappings: SquareItemMapping[],
): Promise<{ entries: SquareSaleEntry[]; error?: string }> {
  const mappedNames = new Set(
    mappings.filter(m => m.location_id === credential.location_id).map(m => m.square_item_name),
  );

  try {
    const res = await fetch(`${SQUARE_BASE}/orders/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credential.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location_ids: [credential.square_location_id],
        query: {
          filter: {
            date_time_filter: {
              closed_at: {
                start_at: `${startDate}T00:00:00Z`,
                end_at: `${endDate}T23:59:59Z`,
              },
            },
            state_filter: { states: ['COMPLETED'] },
          },
        },
      }),
    });

    if (res.status === 401) {
      return { entries: [], error: `Credentials invalid for ${credential.location_id} — check Settings` };
    }
    if (!res.ok) {
      return { entries: [], error: `Square API error ${res.status} for ${credential.location_id}` };
    }

    const body = await res.json() as {
      orders?: {
        closed_at?: string;
        created_at?: string;
        line_items?: { name?: string; quantity?: string }[];
      }[];
    };

    const aggregated = new Map<string, SquareSaleEntry>();

    for (const order of body.orders ?? []) {
      const date = (order.closed_at ?? order.created_at ?? '').substring(0, 10);
      if (!date) continue;

      for (const item of order.line_items ?? []) {
        if (!item.name || !mappedNames.has(item.name)) continue;
        const key = `${credential.location_id}|${date}|${item.name}`;
        const existing = aggregated.get(key);
        const qty = parseInt(item.quantity ?? '1', 10);
        if (existing) {
          existing.quantity_sold += qty;
        } else {
          aggregated.set(key, {
            location_id: credential.location_id,
            date,
            square_item_name: item.name,
            quantity_sold: qty,
          });
        }
      }
    }

    return { entries: Array.from(aggregated.values()) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return { entries: [], error: `${credential.location_id}: ${msg}` };
  }
}

export async function syncAllLocations(
  credentials: SquareCredential[],
  mappings: SquareItemMapping[],
  startDate: string,
): Promise<SquareSalesCache> {
  const endDate = new Date().toISOString().substring(0, 10);

  const results = await Promise.all(
    credentials.map(c => searchOrders(c, startDate, endDate, mappings)),
  );

  const allSales: SquareSaleEntry[] = [];
  const errors: { location_id: SquareLocationId; error: string }[] = [];

  for (let i = 0; i < credentials.length; i++) {
    const { entries, error } = results[i];
    allSales.push(...entries);
    if (error) errors.push({ location_id: credentials[i].location_id, error });
  }

  return {
    last_synced_at: new Date().toISOString(),
    sales: allSales,
    sync_errors: errors,
  };
}
