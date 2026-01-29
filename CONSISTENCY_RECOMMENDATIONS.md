# Consistency Recommendations: Linking, Naming, Uniqueness & Standards

This document proposes concrete changes to make linking, naming, uniqueness, and industry standards more consistent across UNS, RDS, and AAS. The application already contains strong domain knowledge and helper utilities (UNS metadata builders, Sparkplug topic generation, and relationship validators), so the focus is on tightening conventions and centralizing rules.

## 1) Enforce a Single Source of Truth for Topics

**Problem:** The system currently uses both `uns_path` and `mqtt_topic` for UNS metadata, while RDS metadata stores `uns_topic` and `broker_topic`. This can introduce divergence when downstream consumers assume a consistent topic format.

**Proposal:**
- Introduce a normalized topic contract:
  - `uns_path`: canonical UNS hierarchy path (`Enterprise/Site/Area/Line/Cell`).
  - `mqtt_topic`: canonical MQTT topic derived from `uns_path` (normalized/lowercase).
  - `sparkplug_topic`: canonical Sparkplug topic derived from `uns_path`.
- Update RDS and AAS metadata references to store the canonical MQTT topic, but **always** reference `uns_path` for hierarchy logic.
- Add a single utility function (e.g., `normalizeUnsTopic(unsPath)`), and use it everywhere a topic is persisted.

**Implementation touchpoints:**
- `src/lib/hierarchyUtils.ts`: make `generateMQTTTopic` the standard normalization and export as canonical topic builder.
- `src/hooks/useAssetMovement.ts`: update `uns_topic` and `broker_topic` to use the canonical `mqtt_topic` instead of raw `uns_path` so RDS metadata is aligned with MQTT format.
- `src/components/uns/UNSDetailPanel.tsx`: explicitly label `UNS Path` vs `MQTT Topic` to avoid ambiguity.

## 2) Add Strict Metadata Types for UNS/AAS/RDS

**Problem:** Metadata is currently untyped (`Record<string, any>`) in core types, which weakens consistency and allows drift.

**Proposal:**
- Add explicit metadata interfaces and use them in the core types:
  - `UNSNodeMetadata` with: `uns_path`, `mqtt_topic`, `sparkplug_topic`, `rds_location`, `full_rds_designation`, `sparkplug_device_topics`.
  - `RDSMetadata` with: `uns_topic`, `broker_topic`, `sparkplug_topic`, `aas_id`, `last_moved_at`.
  - `AASMetadata` with: `uns_topic`, `sparkplug_topic`, optional domain fields (part number, lot, revision).
- Update helper functions (`buildUNSMetadata`, AAS/RDS creation flows) to return typed metadata.

**Benefits:** Ensures all topic fields are consistently named and prevents missing/duplicated keys across entities.

## 3) Normalize Naming & Uniqueness Constraints

**Problem:** There is no centralized place that enforces uniqueness and naming rules consistently for UNS nodes, AAS asset IDs, and RDS designations.

**Proposal:**
- Add a shared validation module (`src/lib/validation.ts`) with:
  - UNS naming rules (length/character constraints, uniqueness per parent or per site).
  - AAS `assetId` uniqueness and formatting (already enforced in DB but add UI validation).
  - RDS designation format checks consistent with IEC 81346: `=FUNC[-PROD][+LOCATION]`.
- Update dialog validations to use this shared module.

**DB Constraints to add:**
- Unique constraint on `uns_nodes (parent_id, name)` (per site if multi-site enforced).
- Unique constraint on `rds_designations.designation` (per site).
- Already enforced: `aas.asset_id` unique; ensure consistent validation and error messages.

## 4) Centralize Link Semantics (UNS ↔ AAS/RDS)

**Problem:** Linking is correct but scattered. Some screens use helper functions while others derive relationships directly.

**Proposal:**
- Define a single source of truth for relationships:
  - Centralize in `src/lib/relationshipHelpers.ts` with:
    - `getUNSForAAS`, `getUNSForRDS`
    - `findAllEntitiesAtLocation`
    - `validateUNSLevelForLink` (Line/Cell only for assets)
- Update UI panels to use these helpers instead of duplicating filter logic.

**Validation rules to enforce:**
- AAS and RDS can link only to **Line** or **Cell** UNS levels.
- Location aspects (`+`) should not link to UNS nodes (location is the UNS itself).

## 5) Align Sparkplug Topic Strategy

**Problem:** Sparkplug topic generation is implemented in multiple places. It should always derive from `uns_path`.

**Proposal:**
- Use `buildUNSPath` for all Sparkplug topics (AAS and UNS).
- Persist `sparkplug_topic` in UNS metadata and mirror it to RDS/AAS metadata for uniform visibility.
- Define device IDs consistently (use `assetId` everywhere).

## 6) UI: Make Naming & Linking Explicit

**Proposal:**
- In detail panels, show:
  - `UNS Path` (hierarchy), `MQTT Topic` (normalized), `Sparkplug Topic`.
  - RDS: `Designation`, `Location Aspect`, `UNS Link`, `Broker Topic`.
- Use badges or labels to clarify where topic values come from (hierarchy vs. normalization).

## 7) Enforce Site-Scoped Consistency

**Proposal:**
- Require `site_id` on UNS/AAS/RDS and enforce all uniqueness constraints per site.
- Ensure all link validation functions accept `site_id` and filter accordingly.

---

## Summary of Minimal Changes to Implement First

1. **Typed metadata** in `src/types/industrial.ts`.
2. **Canonical topic normalization** in `src/lib/hierarchyUtils.ts` with an exported helper.
3. **RDS/AAS metadata updates** in `useAssetMovement` and create/update flows.
4. **Shared validation module** to enforce naming/uniqueness rules.
5. **UI labeling** changes for clarity on `UNS Path` vs `MQTT Topic`.

These changes align with existing domain knowledge already embedded in the app, and only require centralization and enforcement rather than new domain logic.
