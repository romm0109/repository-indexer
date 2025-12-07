# Design: MCP Server Integration

## Context
The Model Context Protocol (MCP) is an open protocol that standardizes how applications provide context to LLMs. By implementing an MCP server, the code-indexer service can be directly consumed by AI assistants (like Claude Desktop, Cline, etc.) without requiring custom integration code.

The service currently has three search endpoints that would be valuable as MCP tools:
1. Semantic search (vector similarity)
2. Full-text search (exact/partial matching)
3. Payload search (metadata filtering)

## Goals / Non-Goals

**Goals:**
- Expose existing search functionality via MCP protocol
- Support stdio transport for local AI assistant integration
- Maintain full backward compatibility with REST API
- Minimal code duplication between HTTP and MCP handlers
- Follow MCP specification for tool definitions and responses

**Non-Goals:**
- Replacing the HTTP API (both will coexist)
- Supporting SSE transport initially (can be added later)
- Modifying existing search logic or algorithms
- Adding new search capabilities (focus on protocol integration)

## Decisions

### Architecture Pattern: Independent MCP Module
**Decision:** Create a completely independent MCP module that can be conditionally loaded without affecting the HTTP server or any existing functionality.

**Rationale:**
- Zero impact on existing HTTP API when MCP is disabled
- MCP module is only imported when `MCP_ENABLED=true`
- No changes to existing modules, controllers, or services
- Can be completely removed without affecting the application
- Independent lifecycle management

**Implementation approach:**
- Use NestJS dynamic module registration
- Conditionally import McpModule in [`app.module.ts`](src/app.module.ts:1) based on configuration
- MCP module imports SearchModule to access [`SearchService`](src/search/search.service.ts:9)
- No reverse dependencies - existing modules don't know about MCP

**Alternatives considered:**
- Dual-mode in same module: Would require changes to existing code
- Separate MCP server process: Adds deployment complexity, requires IPC or network calls

### Transport: stdio
**Decision:** Implement stdio transport as the primary MCP transport mechanism.

**Rationale:**
- Standard for local AI assistant integration
- Simpler than SSE for initial implementation
- Matches common MCP server patterns
- Can add SSE later if needed for web-based clients

### Tool Naming Convention
**Decision:** Use `search_code_*` prefix for all MCP tools.

**Rationale:**
- Clear namespace prevents conflicts with other MCP servers
- Descriptive names indicate purpose
- Follows common MCP tool naming patterns

**Tool mappings:**
- `search_code_semantic` → [`POST /search`](src/search/search.controller.ts:11)
- `search_code_fulltext` → [`POST /search/fulltext`](src/search/search.controller.ts:38)
- `search_code_by_payload` → [`POST /search/payload`](src/search/search.controller.ts:25)

### Module Structure
**Decision:** Create completely isolated `src/mcp/` module with conditional loading.

**Structure:**
```
src/mcp/
├── mcp.module.ts          # Dynamic NestJS module with forRoot()
├── mcp.service.ts         # MCP server lifecycle & tool handlers
├── tools/                 # Tool definitions
│   ├── semantic-search.tool.ts
│   ├── fulltext-search.tool.ts
│   └── payload-search.tool.ts
└── dto/                   # MCP-specific DTOs (if needed)
```

**Module registration in app.module.ts:**
```typescript
@Module({
  imports: [
    // Existing modules...
    SearchModule,
    // Conditionally load MCP module
    ...(process.env.MCP_ENABLED === 'true' ? [McpModule.forRoot()] : []),
  ],
})
export class AppModule {}
```

**Rationale:**
- Complete isolation - MCP code only loads when enabled
- No changes to existing modules
- McpModule imports SearchModule (one-way dependency)
- Can be completely removed without affecting the app
- Follows NestJS dynamic module pattern

### Dependency Injection
**Decision:** McpModule imports SearchModule and injects [`SearchService`](src/search/search.service.ts:9) into McpService.

**Implementation:**
```typescript
@Module({
  imports: [SearchModule],  // Import to access SearchService
  providers: [McpService],
  exports: [McpService],
})
export class McpModule {
  static forRoot(): DynamicModule {
    return {
      module: McpModule,
      imports: [SearchModule],
      providers: [McpService],
    };
  }
}
```

**Rationale:**
- One-way dependency: MCP → Search (not Search → MCP)
- SearchModule remains unchanged
- No code duplication
- Easy to mock for testing
- Complete isolation of MCP concerns

### Configuration
**Decision:** Add MCP configuration to existing [`configuration.ts`](src/config/configuration.ts:1).

**Configuration schema:**
```typescript
mcp: {
  enabled: boolean;           // Enable/disable MCP server
  transport: 'stdio' | 'sse'; // Transport type
  name: string;               // Server name for MCP clients
  version: string;            // Server version
}
```

**Rationale:**
- Centralized configuration management
- Environment-based control
- Consistent with existing config patterns

### Error Handling
**Decision:** Map NestJS exceptions to MCP error responses.

**Error mapping:**
- `BadRequestException` → MCP error with code -32602 (Invalid params)
- `NotFoundException` → MCP error with code -32001 (Resource not found)
- Other exceptions → MCP error with code -32603 (Internal error)

**Rationale:**
- Follows JSON-RPC 2.0 error codes (MCP basis)
- Provides meaningful error messages to clients
- Maintains consistency with HTTP error handling

## Implementation Strategy

### Phase 1: Core MCP Server
1. Add `@modelcontextprotocol/sdk` dependency
2. Create MCP module structure
3. Implement stdio transport
4. Add tool discovery (list_tools)
5. Wire up to NestJS lifecycle

### Phase 2: Tool Implementation
1. Implement `search_code_semantic` tool
2. Implement `search_code_fulltext` tool
3. Implement `search_code_by_payload` tool
4. Add input validation using existing DTOs
5. Map responses to MCP format

### Phase 3: Testing & Documentation
1. Add unit tests for MCP service
2. Add integration tests for tool execution
3. Update README with MCP usage instructions
4. Add example MCP client configuration

## Risks / Trade-offs

### Risk: stdio Transport Limitations
**Risk:** stdio transport only works for local processes, not suitable for remote clients.

**Mitigation:** 
- Document this limitation clearly
- Design with SSE transport in mind for future addition
- Most AI assistants use stdio for local MCP servers

### Risk: Module Loading Complexity
**Risk:** Conditional module loading might cause issues if not handled properly.

**Mitigation:**
- Use NestJS dynamic modules (well-established pattern)
- Test both enabled and disabled states thoroughly
- Document the conditional loading clearly
- Ensure MCP module has no side effects when not loaded

### Trade-off: Code Duplication vs Abstraction
**Trade-off:** Some parameter mapping code will be duplicated between HTTP controllers and MCP tools.

**Decision:** Accept minimal duplication for clarity.

**Rationale:**
- Over-abstraction would make code harder to understand
- HTTP and MCP have different parameter structures
- Duplication is limited to parameter mapping only
- Business logic remains shared in [`SearchService`](src/search/search.service.ts:9)

## Migration Plan

**No migration needed** - this is purely additive functionality.

**Rollout:**
1. Deploy with MCP disabled by default (`MCP_ENABLED=false`)
2. Verify HTTP API works exactly as before (zero impact)
3. Test MCP functionality in staging environment with `MCP_ENABLED=true`
4. Enable MCP in production via configuration
5. Monitor for any performance impact
6. Document MCP usage for users

**Rollback:**
- Set `MCP_ENABLED=false` to disable MCP server
- MCP module won't be loaded at all
- Zero impact on HTTP API
- Can remove MCP code entirely if needed

## Open Questions

1. **Should we support multiple concurrent MCP connections?**
   - Initial answer: No, stdio is typically 1:1
   - Can revisit if SSE transport is added

2. **Should MCP tools support all the same parameters as HTTP endpoints?**
   - Initial answer: Yes, for feature parity
   - May simplify some optional parameters based on usage

3. **Should we add MCP-specific rate limiting?**
   - Initial answer: No, rely on existing service-level limits
   - Can add if abuse is detected