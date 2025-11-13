# Full-Stack Fixture Matrix

These fixture projects back the full-stack constraint bundle tests. Each directory mirrors a small repo layout that future validations can reference.

- `baseline-compliant` – canonical layout that honors presenters, ports, and adapters.
- `ui-direct-domain` – React component imports domain services directly.
- `domain-randomness` – Domain service uses Date/Math.random inline.
- `adapter-mismatch` – Infra adapter forgets to implement its port.
- `config-leak` – Application service reads process.env outside config entrypoint.
- `api-boundary-blur` – Controller returns domain models without DTO mapping.
