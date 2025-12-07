## Context
The project currently lacks formal API documentation and input validation. This makes it difficult for developers to understand how to use the API and increases the risk of errors due to invalid input.

## Goals / Non-Goals
- **Goals:**
  - Provide a clear and up-to-date `README.md`.
  - Generate interactive API documentation using Swagger/OpenAPI.
  - Enforce strict input validation for all API endpoints using DTOs and decorators.
- **Non-Goals:**
  - Implementing authentication/authorization (out of scope for this change).
  - Adding comprehensive unit/e2e tests for all edge cases (validation tests only).

## Decisions
- **Decision:** Use `@nestjs/swagger` for API documentation.
  - **Why:** It integrates seamlessly with NestJS and generates OpenAPI specs automatically from decorators.
- **Decision:** Use `class-validator` and `class-transformer` for validation.
  - **Why:** Standard approach in NestJS ecosystem, declarative, and powerful.
- **Decision:** Enable global `ValidationPipe`.
  - **Why:** Ensures consistent validation across the entire application without manual pipe application in every controller.

## Risks / Trade-offs
- **Risk:** Breaking changes for clients sending invalid data that was previously accepted (but likely caused issues).
  - **Mitigation:** Document the new validation rules clearly in the Swagger UI.

## Migration Plan
- No data migration required.
- Clients may need to update their requests to comply with the new validation rules.