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

- [ ] 1 - Establish the SvelteKit and TypeScript foundation
  - [ ] 1.1 - Replace the starter application with the standard SvelteKit structure using the approved stack, strict TypeScript checking, and Svelte scoped CSS.
  - [ ] 1.2 - Declare compatible dependencies and npm scripts for development startup and svelte-check validation. Record the precise Node.js 24 runtime version used during setup.
  - [ ] 1.3 - Remove the obsolete starter entry point and placeholder test script as part of replacing their roles. Do not add a production startup mode or choose an unapproved deployment adapter.
  - [ ] 1.4 - Provide installation instructions for the user; do not run npm install or npm i. Retain the resulting package-lock.json when the user performs installation. Dependent validation waits for dependencies to be available.

- [ ] 2 - Implement cohesive file-based configuration
  - [ ] 2.1 - Introduce a named server-side configuration owner that reads project-root .env with Node's built-in parser and owns typed settings, defaults, and validation.
  - [ ] 2.2 - Resolve application settings from file values and documented defaults, without ambient shell-variable overrides. Use port 5173 and the current WSL user's ~/.claude directory when settings are omitted.
  - [ ] 2.3 - Handle home-directory path resolution explicitly and report invalid supplied settings with actionable errors. Distinguish an unavailable source directory from invalid configuration so the shell can still run.
  - [ ] 2.4 - Add .env.example documenting the supported settings and defaults; keep the user's .env untracked.

- [ ] 3 - Integrate deterministic local startup
  - [ ] 3.1 - Connect npm run dev and Vite startup to the configuration owner so validation occurs before listening and application settings are interpreted consistently.
  - [ ] 3.2 - Bind the single foreground server to localhost on the configured port, fail clearly when the port is occupied, and report the local URL.
  - [ ] 3.3 - Ensure development and initial regular use follow the same startup path; introduce no background service, container, or separate backend process.

- [ ] 4 - Build the preliminary navigation shell
  - [ ] 4.1 - Add Usage Tracker branding and a left sidebar with Monitoring and Analysis links and a visible current-location indication.
  - [ ] 4.2 - Make Monitoring the landing page, with placeholder framing for an active-session list and selected-session activity.
  - [ ] 4.3 - Add the Analysis placeholder and clearly identify unimplemented behavior. Do not fabricate sessions, usage, or working selection controls.
  - [ ] 4.4 - Surface source-folder unavailability through server-derived serializable page data, keeping filesystem/configuration code out of browser bundles and session files unread.
  - [ ] 4.5 - Keep the desktop layout simple and use semantic navigation with keyboard-accessible links. Defer detailed visual design and navigation for later capabilities.

- [ ] 5 - Document local operation
  - [ ] 5.1 - Document WSL and Node.js prerequisites, user-performed dependency installation, and the committed lockfile.
  - [ ] 5.2 - Explain .env setup, defaults, path handling, validation errors, missing-folder behavior, and the rule against ambient application-setting overrides.
  - [ ] 5.3 - Document npm run dev, the local URL, terminal shutdown, and the static validation command. Explain that the same foreground mode supports initial regular use.
  - [ ] 5.4 - Identify the placeholder boundaries so users do not expect session functionality in this feature.

- [ ] 6 - Validate the foundation without authoring tests
  - [ ] 6.1 - Run the configured Svelte/TypeScript check after dependencies are available and resolve issues within this feature's scope.
  - [ ] 6.2 - Verify startup and navigation inside WSL, localhost binding, URL reporting, foreground shutdown, and truthful placeholder content. Follow the project's requirement for explicit authorization before starting a server; otherwise provide the user with the smoke-check steps and record their results.
  - [ ] 6.3 - Verify defaults, file-provided settings, conflicting exported application settings, invalid port values, an occupied port, and an unavailable Claude Code directory through targeted checks. Preserve existing local settings and leave no processes running.
  - [ ] 6.4 - Confirm no session files are read, server-only configuration remains outside browser bundles, and generated output and local .env remain excluded from Git. Record validation results and any checks that could not be completed.

## Deferred Test Work

Test authoring requires separate authorization. Potential coverage includes configuration precedence and defaults, invalid settings and port conflicts, missing-folder behavior, and navigation placeholders.
