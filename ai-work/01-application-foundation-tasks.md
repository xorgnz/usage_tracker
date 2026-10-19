# Tasks: Application Foundation

## Planning Context

- Feature: `01-application-foundation`; remains planned.
- Requirements: `01-application-foundation-prd.md`.
- Technology baseline: `00-master-techstack.md`, choices TC1, TC1.1, TC2, TC3, TC3.1, TC3.2, TC3.3, and TC4.
- Architecture: `00-architecture.md`, Initial local execution mode. Use one foreground server through `npm run dev` for development and initial local use.
- The execution-mode question in the older scope, PRD, and technology context has been resolved by the architecture record. Do not treat it as an outstanding blocker.
- This task list does not authorize implementation, feature activation, dependency installation, or test authoring.

## Implementation Placement

The repository currently contains only `package.json` and a starter `index.js`; there are no existing application modules or tests to extend.

Use standard SvelteKit routes and layout components for presentation. Keep configuration parsing, defaults, and validation together in a named server-side configuration class, accessible to startup tooling without importing browser code. Keep route loading thin and return plain serializable status data. These are local organization choices within the approved single-server application, not separate services or processes.

## Relevant Files

Existing:
- `package.json` — replace starter scripts and declare approved dependencies.
- `index.js` — retire the starter entry point when the SvelteKit application replaces it.
- `.gitignore` — already excludes local environment files and generated output; preserves environment examples.

Expected application files, with exact names finalized during implementation:
- `svelte.config.js`, `vite.config.ts`, `tsconfig.json` — framework, startup tooling, and strict TypeScript configuration.
- `src/app.html` — SvelteKit document shell.
- `src/lib/server/config/` — cohesive configuration loading and validation owner.
- `src/routes/+layout.svelte` — shared branding and sidebar.
- `src/routes/+layout.server.ts` — thin mapping of server-derived folder availability to page data, if shared across views.
- `src/routes/+page.svelte` — Monitoring landing page.
- `src/routes/analysis/+page.svelte` — Analysis placeholder.
- `.env.example`, `README.md` — configuration template and local operating instructions.
- `package-lock.json` — dependency resolution produced by user-performed installation.

## Tasks

- [x] 1 - Establish the SvelteKit and TypeScript foundation
  - [x] 1.1 - Replace the starter application with the standard SvelteKit structure using the approved stack, strict TypeScript checking, and Svelte scoped CSS.
  - [x] 1.2 - Declare compatible dependencies and npm scripts for development startup and svelte-check validation. Record the precise Node.js 24 runtime version used during setup.
  - [x] 1.3 - Remove the obsolete starter entry point and placeholder test script as part of replacing their roles. Do not add a production startup mode or choose an unapproved deployment adapter.
  - [x] 1.4 - Provide installation instructions for the user; do not run npm install or npm i. Retain the resulting package-lock.json when the user performs installation. Dependent validation waits for dependencies to be available.

- [x] 2 - Implement cohesive file-based configuration
  - [x] 2.1 - Introduce a named server-side configuration owner that reads project-root .env with Node's built-in parser and owns typed settings, defaults, and validation.
  - [x] 2.2 - Resolve application settings from file values and documented defaults, without ambient shell-variable overrides. Use port 5173 and the current WSL user's ~/.claude directory when settings are omitted.
  - [x] 2.3 - Handle home-directory path resolution explicitly and report invalid supplied settings with actionable errors. Distinguish an unavailable source directory from invalid configuration so the shell can still run.
  - [x] 2.4 - Add .env.example documenting the supported settings and defaults; keep the user's .env untracked.

- [x] 3 - Integrate deterministic local startup
  - [x] 3.1 - Connect npm run dev and Vite startup to the configuration owner so validation occurs before listening and application settings are interpreted consistently.
  - [x] 3.2 - Bind the single foreground server to localhost on the configured port, fail clearly when the port is occupied, and report the local URL.
  - [x] 3.3 - Ensure development and initial regular use follow the same startup path; introduce no background service, container, or separate backend process.

- [x] 4 - Build the preliminary navigation shell
  - [x] 4.1 - Add Usage Tracker branding and a left sidebar with Monitoring and Analysis links and a visible current-location indication.
  - [x] 4.2 - Make Monitoring the landing page, with placeholder framing for an active-session list and selected-session activity.
  - [x] 4.3 - Add the Analysis placeholder and clearly identify unimplemented behavior. Do not fabricate sessions, usage, or working selection controls.
  - [x] 4.4 - Surface source-folder unavailability through server-derived serializable page data, keeping filesystem/configuration code out of browser bundles and session files unread.
  - [x] 4.5 - Keep the desktop layout simple and use semantic navigation with keyboard-accessible links. Defer detailed visual design and navigation for later capabilities.

- [x] 5 - Document local operation
  - [x] 5.1 - Document WSL and Node.js prerequisites, user-performed dependency installation, and the committed lockfile.
  - [x] 5.2 - Explain .env setup, defaults, path handling, validation errors, missing-folder behavior, and the rule against ambient application-setting overrides.
  - [x] 5.3 - Document npm run dev, the local URL, terminal shutdown, and the static validation command. Explain that the same foreground mode supports initial regular use.
  - [x] 5.4 - Identify the placeholder boundaries so users do not expect session functionality in this feature.

- [x] 6 - Validate the foundation without authoring tests
  - [x] 6.1 - Run the configured Svelte/TypeScript check after dependencies are available and resolve issues within this feature's scope.
  - [x] 6.2 - Verify startup and navigation inside WSL, localhost binding, URL reporting, foreground shutdown, and truthful placeholder content. Follow the project's requirement for explicit authorization before starting a server; otherwise provide the user with the smoke-check steps and record their results.
  - [x] 6.3 - Verify defaults, file-provided settings, conflicting exported application settings, invalid port values, an occupied port, and an unavailable Claude Code directory through targeted checks. Preserve existing local settings and leave no processes running.
  - [x] 6.4 - Confirm no session files are read, server-only configuration remains outside browser bundles, and generated output and local .env remain excluded from Git. Record validation results and any checks that could not be completed.

- [ ] 7 - Author and run foundation regression tests
  - [ ] 7.1 - Establish a repeatable test command using the existing stack where practical. Use reusable builders and isolated temporary project directories for configuration cases; preserve the real .env, Claude directory, and ambient environment after each test. Test execution is separate from this planning update.
  - [ ] 7.2 - Cover absent .env and omitted settings, default port 5173 and OS-account home resolution, file-specified values, quoted values, and conflicting exported PORT, CLAUDE_DIRECTORY, and HOME values. Confirm ambient values do not override file settings or documented defaults.
  - [ ] 7.3 - Cover port boundaries 1 and 65535 and rejection of empty, zero, negative, oversized, fractional, and nonnumeric values. Assert actionable configuration errors and cover unreadable .env files.
  - [ ] 7.4 - Cover relative source paths resolved against the supplied project root, ~ and ~/ expansion, and rejection of empty/whitespace-only paths, NUL characters, ~username paths, explicit drive-letter paths, and backslash-prefixed paths. Exercise the documented behavior without changing path policy.
  - [ ] 7.5 - Cover accessible, missing, non-directory, and permission-denied source paths, distinguishing unavailable-folder status from invalid settings. Verify the configuration owner checks only directory metadata/access and never reads session files; simulate permission errors where elevated accounts make real permissions unreliable.
  - [ ] 7.6 - Cover the layout loader's plain availability payload and shell behavior for available and unavailable folders on both routes. Ensure no configuration instance or server-only implementation is exposed to browser code.
  - [ ] 7.7 - Add navigation coverage for the Monitoring landing route, Analysis route, branding, current-page indication, keyboard navigation, skip-link focus, and narrow-screen usability. Assert truthful placeholder behavior only where the corresponding feature is still unimplemented; avoid freezing Monitoring's feature 1 placeholder as later features replace it.
  - [ ] 7.8 - Add controlled startup integration coverage for configured/default ports, ignored ambient port overrides, loopback binding, local URL reporting, invalid configuration before listening, occupied-port failure without fallback, and foreground shutdown. Use temporary settings and bounded child processes with guaranteed cleanup; obtain required authorization before launching application servers.
  - [ ] 7.9 - Run the authored tests and npm run check in the supported environment. Record native Windows and WSL results separately, including checks not exercised. Dependency installation remains user-run; do not change dependencies or start persistent processes as part of this planning task.

## Task 1 Execution Notes

- Runtime observed: Node.js v24.21.0 and npm 11.19.0 inside WSL.
- SvelteKit 3 stores framework configuration in vite.config.ts; the earlier expected svelte.config.js is not required.
- Dependency versions were checked against registry peer requirements; TypeScript 6 is selected to satisfy SvelteKit and svelte-check.
- Dependency installation and generation of package-lock.json await the user. Svelte/TypeScript validation cannot run until dependencies are installed.
- No server was started and no tests were authored.

## Task 2 Execution Notes

- Added ApplicationConfig under src/lib/server/config, with PORT and CLAUDE_DIRECTORY file settings, defaults, validation, and directory availability status.
- Added .env.example; confirmed .env is ignored and the example remains trackable.
- Startup integration is intentionally left to task 3.
- npm run check could not reach diagnostics because the installed Rolldown native binding is unavailable. Dependencies and package-lock.json were preserved.
- Standalone strict TypeScript checking of ApplicationConfig passed with explicit Node types. A direct Node import and configuration load also passed.
- No tests were authored and no server was started.

## Task 3 Execution Notes

- Vite startup loads ApplicationConfig from the project root before listening, with automatic Vite environment-file loading disabled.
- The foreground npm run dev path binds to 127.0.0.1 at the configured port with strictPort enabled; Vite reports the URL and fails on occupied ports.
- Updated .env.example to explain that settings are read at startup and require a restart.
- Standalone strict TypeScript checking of vite.config.ts and ApplicationConfig passed; git diff --check passed.
- npm run check remains blocked before diagnostics by the missing installed Rolldown native binding. Dependencies and lockfile were not changed.
- Runtime listening and port-conflict behavior were not exercised because no server was started. No tests were authored.
## Task 4 Execution Notes

- Added the shared sidebar, current-page indication, keyboard focus styles, and skip link.
- Monitoring remains the landing page with active-session and selected-session activity placeholders; Analysis has a conversation-inspection placeholder.
- The thin server layout loader returns only folder availability and its explanatory message; no session files are read and no configuration instance reaches the browser.
- npm run check passed using native Windows Node with zero Svelte errors or warnings. Vite separately reported existing notices about the extensionless startup import and deprecated envFile option.
- No server was started, no browser inspection was performed, and no tests were authored.

## Task 5 Execution Notes

- Updated README.md with runtime prerequisites, user-performed installation from the committed lockfile, configuration, path rules, validation failures, and unavailable-folder behavior.
- Documented foreground startup, local URL, shutdown, static checking, and the current Monitoring and Analysis placeholder boundaries.
- Distinguished current native Windows execution from the original WSL target and documented the existing explicit Windows source-path restriction without changing application behavior.
- Reviewed documentation against the implementation; git diff --check passed. No application commands, servers, or tests were run for this documentation-only task.

## Task 6 Validation Results (2026-10-18)

- Environment: native Windows Node and PowerShell, following the corrected execution instructions; WSL runtime behavior was not checked.
- 6.1 passed: npm run check completed with zero Svelte errors or warnings. Vite still emits the existing extensionless-import and deprecated-envFile notices.
- Configuration checks passed using ApplicationConfig directly in an isolated OS temporary directory: absent .env defaults, conflicting exported PORT and CLAUDE_DIRECTORY ignored, file-specified port, quoted relative source folder, accessible source folder, missing folder, and a source path pointing to a file.
- Invalid configuration checks passed for empty, zero, negative, oversized, fractional, and nonnumeric ports, plus empty paths, ~username paths, and explicit drive-letter paths.
- Temporary validation data was removed after checking the resolved cleanup path; project .env, installed dependencies, and lockfile were not modified. No tests were added to the repository.
- Source inspection confirms that the only application readFile call reads .env; source folders are inspected through metadata/access only. Filesystem imports and configuration ownership remain in server-only modules, and the layout returns plain availability fields. The user confirmed that browser-source searches were clear on both Monitoring and Analysis; no production build was inspected.
- Git ignore checks confirm .env, .svelte-kit output, and node_modules are ignored; git diff --check passed.
- 6.2 passed: the user confirmed startup, browser navigation, keyboard access, current-page indication, loopback binding, local URL output, and Ctrl+C shutdown checks.
- 6.3 passed: the user confirmed the occupied-port startup check; the other targeted configuration cases above passed.
- 6.4 passed: source and ignore checks above passed, and the user confirmed clear DevTools source searches for ApplicationConfig and filesystem imports on both pages. The agent started no server; the user performed the runtime checks.

### Completion

Task 6 is complete based on agent checks and user-reported runtime and browser-source checks. The user reported a missing /favicon.ico (404), deferred as a non-blocking cosmetic issue. No automated tests were authored. Feature status remains unchanged.
