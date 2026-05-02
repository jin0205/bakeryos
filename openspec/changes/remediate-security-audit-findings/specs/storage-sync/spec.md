# Storage Sync

## ADDED Requirements

### Requirement: Syncable Key Alignment

The frontend storage key union, storage service sync list, and Worker valid data key list SHALL agree for all generic syncable app data.

#### Scenario: Sales data sync

- **WHEN** the frontend saves `bakeryos_distributions`, `bakeryos_square_item_map`, or `bakeryos_square_sales_cache`
- **THEN** the Worker SHALL accept authenticated `PUT /api/data/<key>` requests for those keys
- **AND** authenticated `GET /api/data/<key>` requests SHALL return the stored envelope.

#### Scenario: Private credential key rejection

- **WHEN** a client sends an authenticated request to `/api/data/bakeryos_square_credentials`
- **THEN** the Worker SHALL reject the request as an invalid generic data key.

### Requirement: Pending Sync Flushes During Startup Sync

The storage service SHALL retry queued failed writes during normal startup/sync flow, not only when the browser fires an `online` event.

#### Scenario: Queued write retries on sync

- **GIVEN** a key is present in `bakeryos_pending_sync`
- **AND** `VITE_BAKERY_API_TOKEN` is configured
- **WHEN** `syncAll()` runs while the browser is online
- **THEN** the storage service SHALL retry pushing the queued key to `/api/data/<key>`
- **AND** it SHALL remove the key from the queue after a successful response.

