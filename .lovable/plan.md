# Complete the nine existing AAS instances

## What will change

Keep asset identities, type links and existing UNS placement unchanged. Add missing submodels using the current templates, populate only verified values already stored on each asset, and connect matching existing RDS instances in both directions.

## Proposed RDS links

These are matches by equipment description, instance number, site and UNS Cell—not certification of the existing class codes.

| AAS instance | Existing RDS designation |
|---|---|
| CNC5_Machine_01 | =H1-H1+PIL.STANS.HALL5.LN01 |
| CNC5_Machine_02 | =H2-H1+PIL.STANS.HALL5.LN01 |
| CNC_Lathe_01 | =M1-H2+PIL.STANS.HALL5.LN01 |
| CNC_Lathe_02 | =M2-H2+PIL.STANS.HALL5.LN01 |
| FuelPump_01 | =V1-V1+PIL.STANS.HALL3.LN01 |
| FuelPump_02 | =V2-V1+PIL.STANS.HALL3.LN01 |
| SolenoidValve_01 | =Q1-Q1+PIL.STANS.HALL3.LN01 |
| NavComputer_01 | No matching RDS instance; leave unresolved |
| NavComputer_02 | No matching RDS instance; leave unresolved |

Do not connect navigation computers to the temperature sensors sharing their Cell. Do not invent new navigation-computer class codes. Existing pump designations use V, whose applicability to IEC 81346-2:2019 remains unverified; retain them only as approved existing project designations.

## Proposed submodels

- All nine instances: Nameplate using the current IDTA 02006-3-0 template.
- Four CNC instances: TechnicalData using the current IDTA 02003-2-0 template; OperationalData using the current project template, with no fabricated readings or status values.
- Pumps, valve and navigation computers: defer FlowCharacteristics, ValveData and SoftwareData until engineering definitions and property semantics are supplied; the stored type submodels currently contain no properties and use legacy semantic IDs.
- Populate Nameplate URIOfTheProduct, ManufacturerName and SerialNumber from the existing asset fields. Populate TechnicalData manufacturer from the same source.
- Do not treat the internal type name as a manufacturer product model or infer manufacture year from a serial number. Unknown ratings, dates, product designations, addresses and other required information remain unset.

This creates usable starting records, not fully populated or certified IDTA-conformant equipment documentation. Existing type submodels are not rewritten in this task.

## Technical implementation and checks

1. Prepare a narrowly scoped, tracked data migration for the nine reviewed instances using the current template structures and semantic IDs; no application code changes.
2. Recheck expected identities, sites, Cell links and unoccupied RDS targets before writing. Abort rather than guess if the data has changed.
3. Insert only missing submodels and properties, preserve existing values, and set reciprocal AAS/RDS links atomically. Retain existing audit triggers and verify generated change records.
4. Add and run a focused migration test for the approved mappings, preserved identity/UNS placement, unknown values and repeat-run safety.
5. Verify stored links, property semantic IDs and syntax, then check the completed records through a signed-in app session if available.

## Remaining blockers

- Two navigation-computer RDS designations need engineer-approved function/product codes.
- Mandatory manufacturer documentation and technical ratings are missing; they cannot be inferred safely.
- IEC 81346-2:2019 class verification remains a separate task.