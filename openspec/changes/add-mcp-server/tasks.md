## 1. Setup and Dependencies
- [ ] 1.1 Add `@modelcontextprotocol/sdk` to package.json dependencies
- [ ] 1.2 Run `npm install` to install the MCP SDK
- [ ] 1.3 Update TypeScript types if needed for MCP SDK

## 2. Configuration
- [ ] 2.1 Add MCP configuration schema to `src/config/configuration.ts`
- [ ] 2.2 Add MCP environment variables to `.env.example` (including MCP_COLLECTION_NAME and MCP_COLLECTION_NAMES)
- [ ] 2.3 Update configuration validation for MCP settings
- [ ] 2.4 Set default values (MCP_ENABLED=false, MCP_TRANSPORT=stdio)
- [ ] 2.5 Add logic to parse MCP_COLLECTION_NAMES as comma-separated list
- [ ] 2.6 Add validation to ensure at least one collection is configured when MCP is enabled

## 3. MCP Module Structure
- [ ] 3.1 Create `src/mcp/` directory
- [ ] 3.2 Create `src/mcp/mcp.module.ts` with dynamic module (forRoot() method)
- [ ] 3.3 Create `src/mcp/mcp.service.ts` for MCP server lifecycle
- [ ] 3.4 Create `src/mcp/tools/` directory for tool definitions
- [ ] 3.5 Add conditional import of McpModule in `src/app.module.ts` (only when MCP_ENABLED=true)
- [ ] 3.6 Ensure McpModule imports SearchModule for SearchService access

## 4. MCP Server Core
- [ ] 4.1 Implement MCP server initialization in `mcp.service.ts`
- [ ] 4.2 Set up stdio transport configuration
- [ ] 4.3 Implement tool discovery handler (list_tools)
- [ ] 4.4 Implement tool execution dispatcher
- [ ] 4.5 Add graceful shutdown handling
- [ ] 4.6 Wire MCP server to NestJS lifecycle hooks (OnModuleInit, OnModuleDestroy)
- [ ] 4.7 Inject SearchService and ConfigService via constructor
- [ ] 4.8 Read configured collection name(s) from configuration on initialization
- [ ] 4.9 Add validation to ensure collection(s) are configured before accepting tool calls

## 5. Semantic Search Tool
- [ ] 5.1 Create `src/mcp/tools/semantic-search.tool.ts`
- [ ] 5.2 Define tool schema with parameters (query, prompt, top_k) - NO collectionName parameter
- [ ] 5.3 Implement tool handler that injects configured collection(s) and calls SearchService.search()
- [ ] 5.4 Add parameter validation for query, prompt, and top_k
- [ ] 5.5 Format response to MCP tool result format
- [ ] 5.6 Add error handling and mapping
- [ ] 5.7 Return configuration error if no collection is configured

## 6. Full-Text Search Tool
- [ ] 6.1 Create `src/mcp/tools/fulltext-search.tool.ts`
- [ ] 6.2 Define tool schema with parameters (textQuery, payload, top_k) - NO collectionName parameter
- [ ] 6.3 Implement tool handler that injects configured collection(s) and calls SearchService.fulltextSearch()
- [ ] 6.4 Add parameter validation for textQuery, payload, and top_k
- [ ] 6.5 Format response to MCP tool result format
- [ ] 6.6 Add error handling and mapping
- [ ] 6.7 Return configuration error if no collection is configured

## 7. Payload Search Tool
- [ ] 7.1 Create `src/mcp/tools/payload-search.tool.ts`
- [ ] 7.2 Define tool schema with parameters (payload, top_k) - NO collectionName parameter
- [ ] 7.3 Implement tool handler that injects configured collection(s) and calls SearchService.searchByPayload()
- [ ] 7.4 Add parameter validation for payload and top_k
- [ ] 7.5 Format response to MCP tool result format
- [ ] 7.6 Add error handling and mapping
- [ ] 7.7 Return configuration error if no collection is configured

## 8. Error Handling
- [ ] 8.1 Create error mapping utility for NestJS exceptions to MCP errors
- [ ] 8.2 Map BadRequestException to -32602 (Invalid params)
- [ ] 8.3 Map NotFoundException to -32001 (Resource not found)
- [ ] 8.4 Map other exceptions to -32603 (Internal error)
- [ ] 8.5 Ensure error messages are descriptive and helpful

## 9. Main Application Integration
- [ ] 9.1 Update `src/app.module.ts` with conditional McpModule import
- [ ] 9.2 Verify HTTP server is completely unaffected when MCP is disabled
- [ ] 9.3 Add logging for MCP module loading/unloading
- [ ] 9.4 Test application starts correctly with MCP_ENABLED=true
- [ ] 9.5 Test application starts correctly with MCP_ENABLED=false (default)
- [ ] 9.6 Verify zero performance impact when MCP is disabled

## 10. Unit Tests
- [ ] 10.1 Create `src/mcp/mcp.service.spec.ts`
- [ ] 10.2 Test MCP server initialization
- [ ] 10.3 Test tool discovery returns correct tool list (verify no collectionName in parameters)
- [ ] 10.4 Test semantic search tool handler with configured collection
- [ ] 10.5 Test full-text search tool handler with configured collection
- [ ] 10.6 Test payload search tool handler with configured collection
- [ ] 10.7 Test error handling when no collection is configured
- [ ] 10.8 Test error handling and mapping for other errors
- [ ] 10.9 Test graceful shutdown
- [ ] 10.10 Test multi-collection configuration

## 11. Integration Tests
- [ ] 11.1 Create `test/mcp.e2e-spec.ts`
- [ ] 11.2 Test MCP server accepts connections when enabled
- [ ] 11.3 Test MCP module doesn't load when disabled
- [ ] 11.4 Test tool discovery via MCP protocol (verify parameters don't include collectionName)
- [ ] 11.5 Test semantic search tool execution with single collection configuration
- [ ] 11.6 Test full-text search tool execution with single collection configuration
- [ ] 11.7 Test payload search tool execution with single collection configuration
- [ ] 11.8 Test tools with multi-collection configuration
- [ ] 11.9 Test error when no collection is configured
- [ ] 11.10 Test error responses are properly formatted
- [ ] 11.11 Verify HTTP API works identically with MCP enabled/disabled

## 12. Documentation
- [ ] 12.1 Update README.md with MCP server section
- [ ] 12.2 Document MCP configuration environment variables (including collection configuration)
- [ ] 12.3 Add example MCP client configuration showing collection setup (e.g., for Claude Desktop)
- [ ] 12.4 Document all three MCP tools with parameter descriptions (emphasize no collectionName parameter)
- [ ] 12.5 Explain collection configuration strategy and rationale
- [ ] 12.6 Add troubleshooting section for common MCP issues (including missing collection config)
- [ ] 12.7 Include example tool invocations
- [ ] 12.8 Document both single and multi-collection configuration examples

## 13. Validation and Cleanup
- [ ] 13.1 Run `npm run lint` and fix any linting issues
- [ ] 13.2 Run `npm run format` to format all new code
- [ ] 13.3 Run `npm test` to ensure all unit tests pass
- [ ] 13.4 Run `npm run test:e2e` to ensure all integration tests pass
- [ ] 13.5 Verify complete backward compatibility with existing HTTP API
- [ ] 13.6 Verify zero impact when MCP_ENABLED=false (default state)
- [ ] 13.7 Test with a real MCP client (e.g., Claude Desktop or Cline)
- [ ] 13.8 Confirm MCP module can be completely removed without breaking the app