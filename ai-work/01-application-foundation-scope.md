# Project Scope: Application Foundation

## Overview

Establish a runnable TypeScript/SvelteKit application for Usage Tracker, replacing the starter with a foundation for subsequent features. Provide a simple UI shell with navigation framing for Monitoring and Analysis.

## Problem Statement

The repository currently contains only a starter application. Usage Tracker needs a runnable local application, preliminary navigation, and deterministic file-based configuration before session functionality can be developed.

## Target Users

The project owner, running the application locally inside WSL.

## Core Objectives

1. Run the application through documented npm run commands.
2. Provide a simple UI shell and preliminary layout for Monitoring and Analysis.
3. Establish local configuration and localhost access for subsequent features.

## In Scope

- Establish the SvelteKit application using TypeScript.
- Provide a runnable application through documented npm run commands.
- Add a simple UI shell with navigation framing and placeholder views for Monitoring and Analysis.
- Establish a preliminary layout; detailed visual design will be revisited later.
- Read configuration from a local environment file without requiring exported shell variables or allowing ambient environment values to silently override file settings.
- Support configuration of the Claude Code folder and local listening port.
- Serve the interface on localhost.

## Explicitly Out of Scope

These exclusions apply to this foundation feature, rather than the project as a whole.

- Session discovery, file reading, conversation parsing, usage accounting, live monitoring, and analysis functionality, which belong to subsequent features.
- Detailed visual design.
- Containers, remote access, and authentication.

## Assumptions and Constraints

- Use SvelteKit with TypeScript.
- Execute locally inside WSL under the owner's control.
- The application will not run in a container.
- Provide browser access through localhost on a configurable port.
- Use a local environment file as the application configuration source.
- Development and regular-use execution modes remain unresolved.
- The feature remains planned; scope approval does not activate implementation.

## Unresolved Architectural Questions

- What execution modes and npm commands should support development and regular local use, and how should they differ? See `00-architecture.md`.
