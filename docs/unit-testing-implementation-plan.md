# Unit Testing Implementation Plan

## Overview

This document outlines the implementation plan for adding unit tests to the Obsidian Local Microblog plugin. The focus is on testing core business logic while keeping the testing framework simple and lightweight.

## Testing Framework Choice

**Recommended: Vitest**
- Modern, fast testing framework built on Vite
- Excellent TypeScript support out of the box
- Similar API to Jest but faster and more modern
- Good mocking capabilities for Obsidian API
- Minimal configuration required

**Alternative: Jest**
- More established, larger ecosystem
- Requires more configuration for TypeScript
- Heavier setup but more comprehensive mocking tools

## Key Areas to Test

### 1. Post Data Processing Logic (High Priority)

**File: `main.ts` lines 154-211**
- `getMicroblogPosts()` and `getMicroblogPostsWithoutLimits()`
- Post filtering and validation logic
- Date parsing and sorting

**File: `main.ts` lines 461-500**
- `isMicroblogPost()` - frontmatter validation
- `extractContentFromMarkdown()` - content parsing logic

### 2. Threading and Organization Logic (High Priority)

**File: `main.ts` lines 223-287**
- `organizeForTimeline()` - Timeline View organization
- `organizeCompleteThreads()` - Post View organization with full threading
- Error detection and handling (circular references, orphaned posts)

**File: `main.ts` lines 291-316**
- `detectCircularReference()` - circular reference detection
- Self-reply detection

### 3. Reply Chain Processing (Medium Priority)

**File: `main.ts` lines 392-403**
- `addAllRepliesToThread()` - complete thread building for Post View

### 4. Content Processing (Medium Priority)

**File: `main.ts` lines 405-444**
- `isMicroblogPost()` - frontmatter validation
- `extractContentFromMarkdown()` - content parsing logic
- Frontmatter handling

### 5. Post Creation Logic (Lower Priority)

**File: `main.ts` lines 68-152**
- `createMicroblogPost()` - file creation logic
- `createReplyToCurrentPost()` - reply creation with validation
- Timestamp generation and formatting

## Test Structure

```
tests/
├── unit/
│   ├── post-processing.test.ts
│   ├── threading.test.ts
│   ├── content-extraction.test.ts
│   └── post-creation.test.ts
├── fixtures/
│   ├── sample-posts/
│   └── test-data.ts
└── mocks/
    └── obsidian-api.ts
```

## Implementation Steps

### Phase 1: Foundation Setup
1. Install and configure Vitest
2. Create test directory structure
3. Set up Obsidian API mocks
4. Create sample test data fixtures

### Phase 2: Core Logic Tests
1. Test post data processing and filtering
2. Test content extraction logic
3. Test microblog post validation

### Phase 3: Threading Logic Tests
1. Test Timeline View organization (`organizeForTimeline()`)
2. Test Post View threading (`organizeCompleteThreads()`)
3. Test circular reference detection
4. Test orphaned post handling
5. Test error promotion to top-level posts
6. **Make private methods public for testing**

### Phase 4: Integration-Style Tests
1. Test complete post processing pipeline
2. Test edge cases and error conditions

## Testing Approach

### Mocking Strategy (Hybrid Approach)
- **Minimal mocking**: Create real `TFile` and `CachedMetadata` objects with test data
- **Mock only file operations**: `app.vault.cachedRead()` and file system interactions
- **Real data structures**: Use actual Obsidian interfaces to avoid assumptions about API behavior
- **Focus on business logic**: Test threading algorithms and content processing with real object structures

### Test Data (Programmatically Generated)
- Generate `TFile` and `CachedMetadata` objects programmatically in tests
- Create various threading scenarios: simple chains, complex trees, circular references
- Include edge cases: orphaned replies, malformed frontmatter, missing files
- Use consistent timestamps for deterministic testing
- Build test data generators for different post types (post, reply, quote)

### Test Isolation
- Each test should be independent and not rely on external state
- Use beforeEach/afterEach for cleanup
- Mock file system operations

## Package.json Updates

```json
{
  "scripts": {
    "test": "vitest --run",
    "test:coverage": "vitest --run --coverage"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0"
  }
}
```

## Configuration Files

### `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['tests/**', 'node_modules/**']
    }
  }
});
```

## Success Criteria

### Minimum Viable Testing
1. Core threading logic covered with tests
2. Content extraction logic tested
3. Error detection logic validated
4. CI/CD integration (if applicable)

### Extended Testing Goals
1. Comprehensive coverage of complex threading algorithms
2. Regression test suite for known issues

## Timeline Estimate

- **Phase 1 (Setup)**: 2-3 hours
- **Phase 2 (Core Logic)**: 4-5 hours  
- **Phase 3 (Threading)**: 6-8 hours
- **Phase 4 (Integration)**: 2-3 hours

**Total**: 14-19 hours of development time

## Benefits

1. **Regression Prevention**: Catch breaking changes during development
2. **Refactoring Confidence**: Safe to modify threading logic
3. **Documentation**: Tests serve as living documentation
4. **Bug Prevention**: Catch edge cases early
5. **Development Speed**: Faster iteration on complex logic

## Implementation Notes

- **Function refactoring**: Break down large methods like `organizeIntoThreads()` into smaller, focused functions
- **Access modifiers**: Change private methods to public for direct testing access
- **Error handling**: Current error promotion strategy will change - defer comprehensive error testing
- **Focus areas**: Prioritize complex threading algorithms and content parsing logic
- **UI testing**: Modal and DOM manipulation testing deferred to manual testing