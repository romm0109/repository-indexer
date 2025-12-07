# Change: Add MCP Server Integration

## Why
The code-indexer service currently exposes search capabilities only through HTTP REST endpoints. To enable AI assistants and other MCP-compatible clients to directly access these search capabilities, we need to add Model Context Protocol (MCP) server support. This will allow the service to function as both a traditional REST API and an MCP server, making it easier for AI tools to search and retrieve code context.

## What Changes
- Add completely independent MCP module that can be conditionally loaded
- Expose all three search endpoints as MCP tools:
  - `search_code_semantic` - Semantic search using vector embeddings (parameters: query, prompt, top_k)
  - `search_code_fulltext` - Full-text search for exact/partial matches (parameters: textQuery, payload, top_k)
  - `search_code_by_payload` - Search by metadata filters only (parameters: payload, top_k)
- **Collection configuration in MCP client**: collectionName(s) are configured in the MCP client configuration file, not passed as tool parameters
- Implement MCP protocol handlers for tool discovery and execution
- Add configuration for MCP server transport (stdio/SSE) and default collection(s)
- **Zero impact on existing code** - MCP module only loads when enabled
- Maintain complete backward compatibility with existing REST API

## Impact
- **Affected specs**: New capability `mcp-server` will be created
- **Affected code**:
  - New module: `src/mcp/` (completely isolated MCP implementation)
  - Minimal change: `src/app.module.ts` (conditional import of McpModule)
  - Configuration: `src/config/configuration.ts` (MCP settings including default collections)
  - Dependencies: `package.json` (add `@modelcontextprotocol/sdk`)
- **Existing code impact**: **NONE** - when MCP is disabled, no MCP code loads
- **Breaking changes**: None - this is purely additive and isolated
- **Benefits**:
  - AI assistants can directly query the codebase
  - Reduced integration complexity for MCP clients
  - Dual-mode operation (HTTP + MCP) with zero interference
  - Can be completely removed without affecting the application