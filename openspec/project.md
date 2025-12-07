# Project Context

## Purpose
The `code-indexer` project is a NestJS-based application designed to index source code.
[TODO: User to refine specific goals, e.g., "for semantic search," "for LLM context retrieval," or "static analysis".]

## Tech Stack
- **Language:** TypeScript (Target: ES2023, Module: NodeNext)
- **Framework:** NestJS (v11)
- **Runtime:** Node.js
- **Testing:** Jest, Supertest
- **Linting/Formatting:** ESLint, Prettier

## Project Conventions

### Code Style
- **Formatting:** Enforced by Prettier (see `.prettierrc`).
- **Linting:** Enforced by ESLint (see `eslint.config.mjs`).
- **Naming:** Standard TypeScript/NestJS conventions:
  - Classes: PascalCase
  - Variables/Functions: camelCase
  - Filenames: kebab-case (e.g., `app.module.ts`)
- **Type Safety:** `strictNullChecks` is enabled.

### Architecture Patterns
- **Modular Architecture:** Functionality is organized into NestJS Modules (`@Module`).
- **Dependency Injection:** Uses NestJS DI for loose coupling between components.
- **Layered Structure:**
  - **Controllers:** Handle incoming requests (HTTP).
  - **Services:** Contain business logic.

### Testing Strategy
- **Unit Tests:** Located alongside source files (e.g., `*.spec.ts`). Run with `npm test`.
- **E2E Tests:** Located in the `test/` directory. Run with `npm run test:e2e`.
- **Coverage:** Enforced/checked via `npm run test:cov`.

### Git Workflow
- **Branching:** Feature branches merged into the main branch.
- **Commits:** Follow standard conventions (e.g., `feat:`, `fix:`, `chore:`).

## Domain Context
- **Code Analysis:** The system operates on source code files, requiring handling of file I/O and potentially AST parsing or text processing.

## Important Constraints
- **Node.js Environment:** The application runs in a Node.js environment.

## External Dependencies
- **NestJS Ecosystem:** Relies on `@nestjs/common`, `@nestjs/core`, etc.
