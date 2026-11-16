# Architecture rules
- Keep reviewed one-off data repairs in scripts with guarded, atomic SQL and focused tests; apply data-only writes through the database data-write tool rather than schema migrations.
- Reuse current AAS templates for repairs and clear non-structural default values before filling verified fields, so template defaults cannot become fabricated equipment readings.
- Asset explanations use a read-only Cloud function with the caller's session and RLS-filtered records; never accept client-supplied asset facts or expose write tools.
- Keep explanation chat as one in-memory conversation scoped to the selected asset, using AI Elements and Gateway streaming; no history storage is needed.