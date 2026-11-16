# Existing asset completion
- [x] Simplify asset details into overview, submodels, connections and history; overview tests passed and preview build is OK.
- [ ] Verify the deployed read-only, single-session asset chatbot with a real asset: current signed-in preview serves the older detail screen without the chat control.
- [x] Prepare and test guarded data repair using current templates (15 tests passed).
- [x] Update the approved property value-type rule, apply the tested repair atomically, and verify reciprocal links, submodels and audit records (25 tests; 17 submodels, 191 property rows, seven reciprocal RDS links, 31 audit entries).
- [x] Check repaired CNC asset and three submodels in the authenticated app; history shows no visible entries for this session, while privileged reads confirm audit records. Admin-only audit access was preserved.
- [ ] Navigation-computer RDS codes: blocked on engineer-approved codes.
- [ ] Missing manufacturer documentation and ratings: blocked on engineering data.