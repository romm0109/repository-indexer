# Design: Enhance Indexing Capabilities

## Architecture Changes

### 1. Glob Pattern Matching
To support exclusion patterns like `node_modules/**` or `**/*.spec.ts`, we will integrate a pattern matching library. `minimatch` is a standard choice in the Node.js ecosystem.

### 2. API Updates

#### Modified Endpoint: `POST /indexer/index`
- **Current Body:** `{ projectId: string, collectionName: string }`
- **New Body:** `{ projectId: string, collectionName: string, excludePatterns?: string[] }`
- **Behavior:** The service will fetch the repository tree as before, but filter out any files matching the `excludePatterns` before processing.

#### New Endpoint: `POST /indexer/index-files`
- **Body:** `{ projectId: string, collectionName: string, files: string[], excludePatterns?: string[] }`
- **Behavior:**
    1.  Accepts a list of specific file paths (`files`).
    2.  Filters this list against `excludePatterns` (if provided).
    3.  Fetches content only for the remaining files.
    4.  Chunks, embeds, and stores them in the vector store.
    5.  This avoids the overhead of fetching the entire repository tree.

### 3. Service Layer Refactoring (`IndexerService`)
- The core indexing logic (fetch content -> chunk -> embed -> store) should be extracted or reused to support both "index all" and "index specific" workflows.
- A helper method `shouldExclude(filePath: string, patterns: string[]): boolean` will be added.

## Data Flow

### Full Indexing with Exclusion
1.  **Request:** `POST /indexer/index` with `excludePatterns`.
2.  **GitLab Service:** Fetch full repository tree.
3.  **Indexer Service:**
    - Filter tree: Keep `.ts`/`.tsx` AND `!shouldExclude`.
    - Loop through filtered files:
        - Fetch content.
        - Chunk.
        - Embed.
        - Upsert to Vector Store.

### Selective Indexing
1.  **Request:** `POST /indexer/index-files` with `files` and `excludePatterns`.
2.  **Indexer Service:**
    - Filter input `files`: Keep `.ts`/`.tsx` (optional validation) AND `!shouldExclude`.
    - Loop through filtered files:
        - Fetch content (direct file fetch).
        - Chunk.
        - Embed.
        - Upsert to Vector Store.

## Trade-offs
- **Minimatch vs. Regex:** Glob patterns are more user-friendly than raw regex for file paths.
- **Filtering Location:** Filtering happens in the application layer, not the GitLab API (GitLab API doesn't support complex glob filtering on tree fetch). This means we still fetch the tree metadata, but save on content fetching and embedding costs.