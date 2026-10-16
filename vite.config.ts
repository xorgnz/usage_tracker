import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { ApplicationConfig } from './src/lib/server/config/ApplicationConfig';

// Resolve file-based settings before the foreground development server starts listening.
export default defineConfig(async function createDevelopmentConfig()
{
    const projectRoot = fileURLToPath(new URL('.', import.meta.url));
    const configuration = await ApplicationConfig.load(projectRoot);

    return {
        root: projectRoot,
        envFile: false,
        plugins: [sveltekit()],
        server: {
            host: '127.0.0.1',
            port: configuration.port,
            strictPort: true
        }
    };
});
