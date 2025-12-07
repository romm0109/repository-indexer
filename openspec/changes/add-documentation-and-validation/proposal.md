# Change: Add Documentation and Validation

## Why
The project currently lacks comprehensive documentation (README) and API specifications (OpenAPI/Swagger). Additionally, input validation for API endpoints is missing, which can lead to runtime errors and security vulnerabilities.

## What Changes
- Add a `README.md` file with project setup, usage instructions, and architecture overview.
- Integrate `@nestjs/swagger` to generate OpenAPI documentation.
- Implement `class-validator` and `class-transformer` for request body validation.
- Add DTOs (Data Transfer Objects) with validation decorators for all API endpoints.

## Impact
- **Affected Specs:**
  - `documentation` (New capability)
  - `api-validation` (New capability)
- **Affected Code:**
  - `src/main.ts` (Swagger setup, Global ValidationPipe)
  - `src/**/*.dto.ts` (New DTO files)
  - `src/**/*.controller.ts` (Use DTOs in handlers)
  - `README.md` (New file)