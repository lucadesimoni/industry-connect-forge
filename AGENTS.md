# Architecture rules
- Keep reviewed one-off data repairs in scripts with guarded, atomic SQL and focused tests; apply data-only writes through the database data-write tool rather than schema migrations.
- Reuse current AAS templates for repairs and clear non-structural default values before filling verified fields, so template defaults cannot become fabricated equipment readings.