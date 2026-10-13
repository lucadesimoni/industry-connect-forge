# ADR 0001: Mapping the ISA-95 hierarchy onto Sparkplug B IDs

- Status: Accepted
- Date: 2026-10-14

## Context

Sparkplug B 3.0 offers exactly three identifier levels (`group_id`, `edge_node_id`,
`device_id`). Each must be valid UTF-8 without `+`, `/`, `#`, and
`group_id/edge_node_id` must be unique in the MQTT infrastructure. The UNS uses
five ISA-95 levels (Enterprise, Site, Area, Line, Cell). The standard does not
prescribe how a deeper hierarchy maps onto the three IDs. This is a **design
choice**, not a requirement of Sparkplug.

## Decision

| Sparkplug ID | Value | Example |
|---|---|---|
| `group_id` | Enterprise | `Pilatus` |
| `edge_node_id` | Site, Area, Line joined with `-` (sanitized) | `Stans-Hall-3-Line_01` |
| `device_id` | Cell name, AAS idShort, or RDS designation without location | `CNC_5`, `Robot_0001`, `=M1-DRV1` |

One edge node (gateway) per production line. Implemented in
`generateSparkplugBTopic` (`src/lib/hierarchyUtils.ts`) and
`generateAASSparkplugTopic` (`src/lib/sparkplugPayload.ts`).

## Alternatives considered

1. **group_id = Enterprise-Site-Area ("Parris method")**, edge = Line. This gives
   smaller groups, but host applications that subscribe per group then need one
   subscription per area.
2. **group_id = Site**: loses the enterprise in multi-enterprise brokers.
3. **AAS globalAssetId as device_id**: rejected, because IRIs contain `/` and `:`
   and are long (Sparkplug: "should be as short as possible").

## Consequences

- `-` inside names is ambiguous after joining (`Hall-3` vs. levels `Hall`/`3`).
  The UNS path in the payload or AAS remains the source of truth; the edge node
  ID is only an address.
- Renaming a Site, Area or Line changes the edge node ID, which means new
  births. Treat renames as a commissioning event.
- Aliases must be unique per edge node, so devices on the same line need
  disjoint alias ranges (`aliasBase`).
