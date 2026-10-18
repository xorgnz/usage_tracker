# Usage Tracker

A local TypeScript/SvelteKit application for monitoring and analyzing Claude Code sessions.

## Prerequisites and installation

Use Node.js 24, version 24.21.0 or later within that major version, and npm. The `.nvmrc` records Node.js 24.21.0; it does not switch runtimes automatically.

Current development and validation use native Windows Node and PowerShell. WSL is the original application target; running there requires Linux Node/npm and dependencies installed for Linux. Do not share an installed `node_modules` directory between Windows and WSL: native dependencies are platform-specific.

From the project root, install the committed dependency resolution yourself:

```powershell
npm ci
```

Keep `package-lock.json` in version control. Use `npm install` when intentionally changing dependency resolution, and review the resulting lockfile. Installation runs `svelte-kit sync` through the prepare script.

## Configuration

Optionally copy the example to a local configuration file, without overwriting an existing `.env`:

```powershell
Copy-Item .env.example .env
```

When running inside WSL, the equivalent copy command is `cp -n .env.example .env`.

Edit the project-root `.env`:

```dotenv
PORT=5173
CLAUDE_DIRECTORY=~/.claude
```

| Setting | Default when omitted | Accepted value |
|---|---|---|
| `PORT` | `5173` | An integer from 1 through 65535. |
| `CLAUDE_DIRECTORY` | `~/.claude` | A source-directory path, with the path rules below. |

A missing `.env` uses defaults. Empty settings are invalid. Application settings come only from this file and documented defaults; exported `PORT` and `CLAUDE_DIRECTORY` values do not override them. Shell-variable references such as `$HOME` are literal text, not expanded.

Relative paths resolve from the project root. `~` and `~/` resolve from the current operating-system account's home directory, independently of an exported `HOME`. Other users' `~username` paths are unsupported. Quote values containing `#` or intentional surrounding whitespace.

The current source-path validator rejects drive-letter and backslash-prefixed paths, including explicit `C:/...` paths on Windows. For a Windows home directory, use `~/.claude`; project-relative paths also work. In WSL, use Linux paths such as `/home/name/.claude` or `/mnt/c/Users/name/.claude`. WSL mount paths do not refer to Windows drives when running native Windows Node.

Invalid ports, empty paths, unsupported path forms, and unreadable configuration files stop loading with an explanatory error. A missing source folder, a path pointing to a file, or a folder lacking access permissions is reported as unavailable without preventing use of the shell. Only folder metadata and access are checked; session files are not read.

The local `.env` is ignored by Git; `.env.example` is committed. Restart the application after changing configuration.

## Running locally

From the project root:

```powershell
npm run dev
```

The server runs in the foreground and reports its local URL, normally `http://127.0.0.1:5173/`. Open that URL in a browser. It binds to loopback only and uses the configured port; if that port is occupied, startup fails rather than selecting another port.

Keep the terminal open while using the application and press Ctrl+C to stop it. The same command supports development and initial regular use. There is no separate production startup command, background service, or container requirement.

## Current functionality

- Monitoring at `/` is the landing page, with placeholder areas for active sessions and selected-session activity.
- Analysis at `/analysis` is a conversation-inspection placeholder.
- Shared navigation identifies the current page and supports keyboard use.
- An unavailable source folder is reported in the shared shell.

Session discovery, conversation loading, live refresh, token accounting, and cost estimation are not implemented. Placeholder text does not represent real session data, and session selection is not functional yet.

## Validation

Run the existing static check from the same environment in which dependencies were installed:

```powershell
npm run check
```

This generates framework types and runs Svelte/TypeScript diagnostics without starting a server. It passed using Windows Node during task 4. Earlier missing Rolldown native-binding errors occurred when Linux Node attempted to use Windows-installed dependencies.

Vite currently prints notices about an extensionless configuration import and the deprecated `envFile` option. No automated test suite has been added.

## Framework configuration

SvelteKit 3 configuration lives in `vite.config.ts`; there is no separate `svelte.config.js`. No deployment adapter has been selected for the current development-server execution mode.
