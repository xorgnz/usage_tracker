# Master Technology Stack

## Technology Choices

- `TC1` - Node.js 24 LTS
  - `TC1.1` - Node built-in environment-file parser
- `TC2` - TypeScript with strict checking
- `TC3` - SvelteKit
  - `TC3.1` - Vite
  - `TC3.2` - Svelte scoped CSS
  - `TC3.3` - svelte-check
- `TC4` - npm with a committed lockfile

## Technology Choice Details

### TC1 - Node.js 24 LTS

- Status: Approved
- Source: `01-application-foundation`
- Choice: Use Node.js 24 LTS as the runtime inside WSL.
- Rationale: Provide a supported LTS runtime with a newer baseline than Node.js 22.
- Constraints: Use compatible dependency versions and record the precise runtime version during setup.

#### TC1.1 - Node built-in environment-file parser

- Status: Approved
- Source: `01-application-foundation`
- Choice: Use node:util parseEnv to parse the project-root .env file explicitly.
- Rationale: Supply the required file parsing without an additional configuration dependency.
- Constraints: Application settings must come from file values and documented defaults; ambient environment values must not silently override them. Parsing does not replace application validation.

### TC2 - TypeScript with strict checking

- Status: Approved
- Source: `01-application-foundation`
- Choice: Use TypeScript with strict checking for application code.
- Rationale: Follow the required language direction and catch type errors during validation.
- Constraints: Keep compiler settings compatible with the selected SvelteKit tooling.

### TC3 - SvelteKit

- Status: Approved
- Source: `01-application-foundation`
- Choice: Use SvelteKit as the application framework with its native routing and server capabilities.
- Rationale: Follow the required application framework direction.
- Constraints: Use compatible framework and dependency versions. Development and regular-use execution modes remain unresolved.

#### TC3.1 - Vite

- Status: Approved
- Source: `01-application-foundation`
- Choice: Use Vite for SvelteKit-integrated development and build tooling.
- Rationale: Use the framework's integrated tooling.
- Constraints: Keep the Vite version compatible with SvelteKit and Node.js 24.

#### TC3.2 - Svelte scoped CSS

- Status: Approved
- Source: `01-application-foundation`
- Choice: Use Svelte scoped CSS to style the preliminary application shell.
- Rationale: Keep the small, provisional UI independent of an additional styling framework.
- Constraints: Detailed visual design remains deferred; no UI component library or utility CSS framework is selected.

#### TC3.3 - svelte-check

- Status: Approved
- Source: `01-application-foundation`
- Choice: Use svelte-check for Svelte component and TypeScript validation through an npm check command.
- Rationale: Validate Svelte components as well as TypeScript.
- Constraints: Keep tooling versions compatible. This choice does not authorize test authoring.

### TC4 - npm with a committed lockfile

- Status: Approved
- Source: `01-application-foundation`
- Choice: Use npm for package management and command scripts, with a committed package-lock.json.
- Rationale: Match the requested command workflow and record resolved dependencies.
- Constraints: Dependency installation must be performed by the user. This record does not select development or regular-use execution modes.
