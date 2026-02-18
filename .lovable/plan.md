# Track and Trace System for Transport Containers

## Overview

Implement a complete Track and Trace system that follows the UNS architecture you described. A transport container (Ladungstraeger) maintains a **stable identity** while its **location**, **status**, and **context** (orders, shipments) change dynamically throughout its journey.

---

## 1. Database Schema

### New Tables

`**tracked_assets**` - Stable identity for containers/carriers


| Column                  | Type          | Description                                      |
| ----------------------- | ------------- | ------------------------------------------------ |
| id                      | uuid (PK)     | Internal ID                                      |
| asset_id                | text (unique) | Stable identifier, e.g. `container-000812`       |
| asset_type              | text          | `container`, `pallet`, `carrier`, etc.           |
| description             | text          | Human-readable description                       |
| current_location_path   | text          | Current location, e.g. `plant-ch/line-3`         |
| current_state           | text          | `in_transit`, `at_rest`, `in_use`, `maintenance` |
| current_quality_state   | text          | `ok`, `warning`, `blocked`                       |
| metadata                | jsonb         | Extra attributes (owner, dimensions, etc.)       |
| site_id                 | uuid          | Site-based multi-tenancy                         |
| created_at / updated_at | timestamptz   | Timestamps                                       |


`**asset_events**` - All events (locationChanged, qualityViolation, stateChanged, etc.)


| Column        | Type        | Description                                                                             |
| ------------- | ----------- | --------------------------------------------------------------------------------------- |
| id            | uuid (PK)   | Event ID                                                                                |
| asset_id      | uuid (FK)   | Reference to tracked_asset                                                              |
| event_type    | text        | `locationChanged`, `qualityViolation`, `stateChanged`, `contextBound`, `contextUnbound` |
| from_location | text        | Previous location path (nullable)                                                       |
| to_location   | text        | New location path (nullable)                                                            |
| reason        | text        | Why the event happened                                                                  |
| payload       | jsonb       | Full event payload (temperature, limit, etc.)                                           |
| created_by    | text        | User or system that triggered it                                                        |
| site_id       | uuid        | Site-based multi-tenancy                                                                |
| created_at    | timestamptz | Event timestamp                                                                         |


`**asset_context_bindings**` - Active context links (orders, work orders, shipments)


| Column                | Type        | Description                      |
| --------------------- | ----------- | -------------------------------- |
| id                    | uuid (PK)   | Binding ID                       |
| asset_id              | uuid (FK)   | Reference to tracked_asset       |
| context_type          | text        | `order`, `workorder`, `shipment` |
| context_id            | text        | e.g. `PO-471193`, `WO-90331`     |
| is_active             | boolean     | Currently bound?                 |
| bound_at / unbound_at | timestamptz | When bound/released              |
| site_id               | uuid        | Site-based multi-tenancy         |


All tables get RLS policies matching the existing site-based pattern and `updated_at` triggers.

---

## 2. UNS Topic Generation

Each tracked asset automatically generates UNS-compliant topic paths:

```text
Identity:     enterprise/assets/{assetId}
Telemetry:    enterprise/assets/{assetId}/telemetry/location
              enterprise/assets/{assetId}/telemetry/temperature
Status:       enterprise/assets/{assetId}/status/state
              enterprise/assets/{assetId}/status/quality
Events:       enterprise/assets/{assetId}/events/locationChanged
              enterprise/assets/{assetId}/events/qualityViolation
Location:     enterprise/locations/{currentPath}/assets/{assetId}
Context:      enterprise/contexts/{type}/{contextId}/assets/{assetId}
```

These are computed from the asset's data, not stored as separate UNS nodes.

---

## 3. New UI Tab: "Track and Trace"

Add a fourth navigation tab alongside UNS, AAS, and RDS.

### Layout (3 sections):

**Top: Asset List / Search**

- Table of tracked assets with columns: Asset ID, Type, Current Location, State, Quality, Active Contexts
- Search/filter by ID, location, state, context
- "Add Asset" button

**Middle: Journey Visualization**

- When an asset is selected, show a horizontal **step timeline** of its journey:
`Supplier -> Receiving -> Warehouse -> Production -> Shipping -> Customer`
- Each step shows timestamp, duration at location, and any events/violations
- Current position is highlighted
- Quality violations are flagged with warning icons

**Bottom: Detail Panels (tabs)**

- **Events**: Full event log (timeline view reusing existing `RDSLocationHistory` pattern)
- **Contexts**: Active order/workorder/shipment bindings with bind/unbind actions
- **Topics**: Generated UNS/MQTT/Sparkplug B topic paths for this asset
- **Telemetry**: Latest sensor values (location, temperature, shock) displayed as cards

---

## 4. Actions

- **Move Asset**: Select target location from UNS hierarchy, provide reason -> creates `locationChanged` event, updates `current_location_path`
- **Bind Context**: Attach asset to an order/workorder/shipment
- **Unbind Context**: Release asset from a context
- **Report Quality Violation**: Log a quality event (type, measured value, limit, location)
- **Change State**: Update asset state (`in_transit`, `at_rest`, etc.)

---

## 5. Files to Create/Modify

### New Files

- `src/hooks/useTrackedAssets.ts` - CRUD + queries for tracked_assets, events, contexts
- `src/components/tracking/AssetList.tsx` - Searchable/filterable asset table
- `src/components/tracking/AssetJourneyTimeline.tsx` - Horizontal step visualization
- `src/components/tracking/AssetDetailPanel.tsx` - Tabbed detail view (Events, Contexts, Topics, Telemetry)
- `src/components/tracking/MoveAssetDialog.tsx` - Move asset to new location
- `src/components/tracking/BindContextDialog.tsx` - Bind/unbind order context
- `src/components/tracking/CreateTrackedAssetDialog.tsx` - Create new tracked asset
- `src/components/tracking/QualityViolationDialog.tsx` - Report quality event

### Modified Files

- `src/pages/Index.tsx` - Add `tracking` tab with the new components
- `src/components/layout/AppSidebar.tsx` - Add "Track and Trace" nav item
- `src/components/layout/MobileNav.tsx` - Add tracking to mobile nav
- `src/types/industrial.ts` - Add `TrackedAsset`, `AssetEvent`, `AssetContextBinding` types

---

## 6. Sample Data

Pre-populate with a demo container (`container-000812`) that has traveled:

1. `supplier-italy/loading` (2 days ago)
2. `plant-ch/receiving` (1.5 days ago)
3. `plant-ch/warehouse` (1 day ago)
4. `plant-ch/line-3` (current)

With one quality violation event (temperature excursion at supplier) and bindings to `PO-471193` and `WO-90331`.

---

## Technical Notes

- Reuses existing site-based multi-tenancy pattern (site_id + RLS)
- Topic paths are computed client-side from asset data (same approach as existing `hierarchyUtils.ts`)
- The journey timeline uses the `asset_events` table filtered by `event_type = 'locationChanged'`
- Realtime can be enabled on `asset_events` for live dashboard updates (optional follow-up)  
  
  
!Do not break the existing logic to connectd RDS, UNS, ... - but update with new functionality!