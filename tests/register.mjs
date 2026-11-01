import { register } from 'node:module';

// Compile test-only TypeScript and Svelte imports without changing application resolution.
register('./loader.mjs', import.meta.url);
