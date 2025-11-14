## `cda config` TUI library selection

### Candidates considered
- **enquirer** – Mature checkbox prompts, but relies on CommonJS dynamic `require`. This breaks under our ESM-only build and would complicate `pkg` bundling.
- **@inquirer/prompts** – Modern ESM successor, yet still pulls in the full `rxjs`/`figures` stack and performs `process.stdout` mutation that `pkg` marks as unsupported without extra assets.
- **@clack/prompts** – Lightweight ESM module leveraging lower-level TTY control without global monkey patching. Works out-of-the-box on Windows PowerShell and macOS/Linux shells and has been proven in other pkg-distributed CLIs.

### Decision
We adopted **@clack/prompts** because it:
1. Operates natively in pure ESM projects with no transpilation tricks.
2. Keeps dependencies minimal (no Node-API bindings, no CJS fallbacks) so `pkg` analysis can inline it cleanly.
3. Provides multi-select prompts with the exact key bindings we spec’d (arrow keys + space, Esc cancel).

### Validation
- Added runtime dependency (`package.json`) and wired `runConfigInteractiveUi` to use `multiselect`.
- Created `scripts/tuiSpike.mjs`, a standalone script that exercises the prompt with sample constraints. The spike runs successfully via `node scripts/tuiSpike.mjs` in both PowerShell and bash shells, confirming Unicode rendering and keyboard handling were stable.
- Manually inspected the generated `dist-exe/cda.exe` (via `npm run build:exe`) to ensure pkg copies the new dependency modules. No extra pkg config entries were required.

### Trade-offs
- Clack renders one prompt at a time, so we lose the continuously updating summary from the bespoke renderer. We mitigate by keeping the summary/logging logic in `runConfigCommand` and plan to add post-save stats in a follow-up bead.
- Because Clack drives stdin/stdout directly, automated tests continue to inject a stub `runInteractive` implementation so Vitest does not need a PTY harness. This keeps the CLI test matrix fast while still ensuring persistence logic is validated.
