# Usage Tracker

A local application for monitoring and analyzing Claude Code sessions, running inside WSL.

## Foundation setup

The runtime observed during setup was Node.js `v24.21.0` with npm `11.19.0` inside WSL. Use Node.js 24; `.nvmrc` records the setup version.

Run these commands yourself from the project root inside WSL:

```sh
npm install
npm run check
```

Installation runs `svelte-kit sync` through the prepare script. Keep the generated `package-lock.json` in version control. Once a lockfile exists, use `npm ci` to reproduce its dependency resolution.

To run the application in the foreground:

```sh
npm run dev
```

Open the local URL reported in the terminal. Press Ctrl+C to stop the server. This development mode also serves initial local use; a separate production startup mode is deferred.

## Current implementation

Task 1 provides the minimal SvelteKit application, TypeScript configuration, scoped styling, and npm scripts. File-based configuration, startup policy, and the navigation shell are later tasks. Session functionality is not implemented.

The framework is SvelteKit 3, whose configuration lives in `vite.config.ts`; no separate `svelte.config.js` or deployment adapter is needed for this development-only foundation.

## Validation

`npm run check` generates framework types and runs Svelte/TypeScript diagnostics. It requires dependencies installed in WSL. No test suite has been added.
