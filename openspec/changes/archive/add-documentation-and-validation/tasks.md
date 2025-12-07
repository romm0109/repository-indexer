## 1. Documentation
- [ ] 1.1 Create `README.md` with project overview, setup, and usage instructions.
- [ ] 1.2 Install `@nestjs/swagger` and `swagger-ui-express`.
- [ ] 1.3 Configure Swagger in `src/main.ts`.
- [ ] 1.4 Add Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`) to controllers.

## 2. Validation
- [ ] 2.1 Install `class-validator` and `class-transformer`.
- [ ] 2.2 Enable global `ValidationPipe` in `src/main.ts`.
- [ ] 2.3 Create DTOs for all API request bodies (e.g., `IndexRepoDto`, `SearchDto`).
- [ ] 2.4 Add validation decorators (`@IsString`, `@IsInt`, etc.) to DTO properties.
- [ ] 2.5 Update controllers to use DTOs instead of `any` or plain interfaces.