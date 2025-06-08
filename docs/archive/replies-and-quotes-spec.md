# Replies and Quotes Implementation Spec

## Type System Redesign

### Current Issue
Currently using `type: reply | quote | microblog` which fragments post detection.

### Final Solution: Fully Prefixed System
```yaml
---
lm_type: microblog
lm_reply: "original-post.md"  # Optional: this post replies to another
lm_quote: "quoted-post.md"    # Optional: this post quotes another  
lm_created: 2025-06-06T10:30:00Z
---
```

**Examples:**
```yaml
# Simple post
lm_type: microblog
lm_created: 2025-06-06T10:30:00Z

# Reply only
lm_type: microblog  
lm_reply: "microblog-2025-06-06T09-15-00Z.md"
lm_created: 2025-06-06T10:30:00Z

# Quote only
lm_type: microblog
lm_quote: "interesting-post.md" 
lm_created: 2025-06-06T10:30:00Z

# Reply that also quotes (complex interaction)
lm_type: microblog
lm_reply: "alice-post.md"
lm_quote: "bob-post.md"
lm_created: 2025-06-06T10:30:00Z
```

**Namespacing Strategy:**
- Prefix: `lm_` (Local Microblog) 
- ALL metadata uses `lm_` prefix for collision safety
- Prevents conflicts with other plugins
- Maintains clean upgrade path if we build standalone app

## Type Field Prefixing Analysis

### Option A: Unprefixed (Current)
```yaml
type: microblog
lm_reply: "[[Post]]"
```

**Pros:**
- **Intuitive discovery**: Other users/plugins can easily find microblogs
- **Standardization potential**: Could become community convention
- **Query simplicity**: `WHERE type = "microblog"` 
- **Generic tooling**: External tools can recognize microblog content
- **Semantic clarity**: `type` feels like a universal content classifier

**Cons:**
- **Namespace collision**: Another plugin might use `type: microblog` differently
- **Ownership ambiguity**: Who defines what `microblog` means?
- **Migration complexity**: If conflicts arise, harder to change later
- **External dependency**: Other plugins might depend on our `type` usage

### Option B: Prefixed (Consistent)
```yaml
lm_type: microblog
lm_reply: "[[Post]]"
```

**Pros:**
- **Guaranteed uniqueness**: No conflicts with other plugins
- **Clear ownership**: Obviously belongs to Local Microblog plugin
- **Consistent namespace**: All metadata follows same pattern
- **Safe evolution**: Can change meaning without breaking others
- **Plugin isolation**: Complete independence from ecosystem

**Cons:**
- **Harder discovery**: External tools need to know our specific prefix
- **Less intuitive**: Not obvious what `lm_type` means
- **Query complexity**: Need to remember prefix in searches
- **Fragmentation**: Every plugin creates its own `type` system
- **Missed standardization**: Loses opportunity to establish convention

### Hybrid Option C: Dual Declaration
```yaml
type: microblog           # For ecosystem discoverability
lm_type: microblog        # For our specific logic
lm_reply: "[[Post]]"
```

**Pros:**
- **Best of both**: Discoverable + collision-safe
- **Graceful degradation**: Works even if `type` conflicts arise
- **Standardization ready**: Can drop `lm_type` if `type` becomes standard
- **Migration path**: Easy to evolve either direction

**Cons:**
- **Redundancy**: Duplicated information
- **Sync complexity**: Must keep both fields consistent
- **Larger metadata**: More YAML properties
- **Cognitive load**: Two fields to understand

### Decision: Option B (Prefixed)

**Chosen approach: Fully prefixed type system**

**Rationale:**
1. **Plugin safety priority**: Primary concern is avoiding metadata conflicts with other plugins
2. **Small user base**: Limited adoption (≤10 users) means discoverability benefits don't outweigh risks
3. **Personal use focus**: Plugin designed primarily for creator's workflow, not community standardization
4. **Data integrity**: Risk of other plugins overwriting `type` field could break core functionality

**Implementation:**
```yaml
---
lm_type: microblog
lm_reply: "original-post.md"  # Optional
lm_quote: "quoted-post.md"    # Optional  
lm_created: 2025-06-06T10:30:00Z
---
```

**Benefits:**
- All microblog content has `lm_type: microblog` for safe detection
- Relationships are independent and combinable  
- Clear semantic meaning: reply = response, quote = reference
- Complete namespace isolation prevents metadata conflicts

## Reply Implementation Approaches

### Approach 1: Command-Based Creation
**From Current Post View:**
- Command: "Create reply to current post"
- Detects current file, creates new reply with `replyTo` link
- Opens new reply file for editing

**Feasibility:** ✅ High - Obsidian API supports current file detection

### Approach 2: Timeline View Creation
**From Timeline Modal:**
- Add "Reply" button to each post in timeline
- Create reply in-modal or via new file
- Return to timeline after creation

**Feasibility:** ⚠️ Medium - Requires modal state management and file creation workflow

### Approach 3: Hybrid Approach
- Timeline view for browsing/reading
- Commands for creation (reply, quote, new post)
- Timeline refreshes to show new content

## Timeline View as Primary Interface

### Current Capabilities
- ✅ Display all posts chronologically
- ✅ Open individual posts
- ✅ Basic modal interaction

### Required Enhancements for Primary Interface
1. **In-Timeline Creation**
   - New post form within timeline
   - Reply/quote forms attached to posts
   - Real-time timeline updates

2. **Thread Display**
   - Nest replies under original posts
   - Show reply chains
   - Collapse/expand threads

3. **Quick Actions**
   - Like/favorite posts (metadata-based)
   - Quick edit capabilities
   - Delete confirmation

### Technical Feasibility Assessment

**High Feasibility:**
- ✅ Reply detection and nesting in timeline
- ✅ Command-based post creation
- ✅ File watching for timeline updates

**Medium Feasibility:**
- ⚠️ In-modal editing (complex state management)
- ⚠️ Real-time timeline refresh (performance considerations)
- ⚠️ Rich text editing in modal

**Low Feasibility:**
- ❌ Full WYSIWYG editing in timeline
- ❌ Advanced threading UI (limited by Obsidian modal constraints)

## Incremental Implementation Strategy

### Phase 1: Type System Foundation (Minimal Viable Change)
**Goal:** Safe namespacing without breaking existing functionality
1. Update type detection logic: `type: microblog` → `lm_type: microblog`
2. Modify post creation template to use `lm_type`
3. Update timeline display logic to detect `lm_type`
**Test Criteria:** Timeline still works, post creation unchanged, no regressions

### Phase 2: Basic Reply Metadata (Add Data, No UI Changes)
**Goal:** Enable reply creation without changing timeline display
1. Add `lm_reply` field to post creation template
2. Create "Reply to Current Post" command that:
   - Detects current microblog file
   - Creates new post with `lm_reply: "original-filename.md"`
   - Opens new file for editing
3. Timeline ignores reply metadata (displays all posts normally)
**Test Criteria:** Reply files created with correct metadata, timeline unaffected

### Phase 3: Thread Detection & Display (Make Replies Meaningful)
**Goal:** Visual thread structure in timeline with content context
1. Modify timeline to group posts by thread relationships
2. Simple visual nesting: indent replies under original posts
3. Add reply content structure with embedded context:
   ```markdown
   Reply to:
   
   ![[original-post]]
   
   <!-- microblog-content-start -->
   My response content here...
   <!-- microblog-content-end -->
   ```
4. Implement content extraction using HTML comment markers
5. Handle missing references with "Reply to [missing post]" fallback
6. No depth limits or overflow handling yet
**Test Criteria:** Threads display correctly with context, content extraction works, no broken references crash timeline

### Phase 4: Thread Polish (Handle Edge Cases)
**Goal:** Clean display for complex thread structures
1. Add depth limits: maximum 3 posts visible per thread
2. Add overflow indicators: "X more in thread" with expand functionality
3. Implement chronological constraint (replies only to past posts)
**Test Criteria:** Complex threads display cleanly, no performance issues

### Phase 5: Quote Support (Parallel Feature)
**Goal:** Quote functionality alongside existing reply system
1. Add `lm_quote` metadata field
2. Create "Quote Current Post" command
3. Timeline shows quoted content inline or with indicators
**Test Criteria:** Quotes work independently and alongside replies

### Removed from Initial Scope
- Hybrid content structure with HTML comments (too complex)
- Timeline-based creation workflow (focus on commands first)
- Rich embed integration (can be added later)
- Complex interaction displays (start simple)

## Command Invocation from Timeline

**Answer: Yes, absolutely feasible.**

Commands in Obsidian are just wrappers around plugin methods:
```typescript
// Current command registration
this.addCommand({
    id: 'create-microblog-post',
    callback: () => this.createMicroblogPost() // Just calls the method
});

// Can be called directly from timeline
const replyBtn = actionsEl.createEl('button', {text: 'Reply'});
replyBtn.onclick = () => {
    this.plugin.createReplyTo(post.file); // Direct method call
    this.close();
};
```

**Key insight:** Commands are UI shortcuts to plugin methods. Timeline can call the same methods directly.

## Link Format for Phase 2

### YAML Frontmatter Approach
**Discovery**: Obsidian does **NOT** natively support `[[]]` wikilinks in YAML frontmatter. This is a long-standing feature request but remains unimplemented.

**Solution**: Use simple filename strings in YAML:
```yaml
---
lm_type: microblog
lm_reply: "microblog-2025-06-06T10-30-00Z.md"  # File name for easy lookup
lm_quote: "some-other-post.md"  # Added in Phase 5
lm_created: 2025-06-06T10-30-00Z
---
```

### Benefits
- **Plugin efficiency**: File names resolve easily to TFile objects
- **Stability**: File names change less frequently than titles
- **Human readable**: Clear what's being referenced in YAML
- **File names are unique**: Already ensured by timestamp-based naming

## Implementation Decisions (Resolved)

### 1. Missing Reference Handling
**Decision:** Display "missing link" indicators (graceful degradation)
- If `lm_reply` file is deleted/renamed: Show as "Reply to [missing post]"
- If `lm_quote` file is missing: Show as "Quoting [missing post]"
- Timeline continues to function with broken references

### 2. Scope Limitations
**Decision:** Microblog-to-microblog interactions only
- Replies only target microblog posts (`lm_type: microblog`)
- Quotes only reference microblog posts
- No support for non-microblog file interactions

### 3. Loop Prevention
**Decision:** Chronological constraint prevents loops
- Can only reply to posts created in the past
- Natural ordering prevents circular references
- No additional loop detection needed

### 4. Complex Interaction Display
**Decision:** Simple independent display (complex cases deferred)
- **Post with reply + quote:** Show both relationships independently in timeline
- **Complex contextual navigation:** Deferred to future phases
- **Initial approach:** Keep reply and quote displays separate and simple

### 5. Migration Strategy
**Decision:** Hard cutover, no backward compatibility
- Switch all posts from `type: microblog` to `lm_type: microblog`
- No transition period or dual format support
- Clean break for rapid iteration phase

### 6. Content Extraction Fallback (Phase 3)
**Decision:** Display full post minus frontmatter when markers missing
- Primary: Extract between `<!-- microblog-content-start/end -->`
- Fallback: Show entire content after frontmatter
- Graceful degradation for manually edited posts
- **Note:** Implemented alongside Phase 3 thread display

### 7. Thread Display Depth Limits
**Decision:** Maximum 3 posts visible per thread
- **Structure:** Original → [X more hidden] → Last 2 posts
- **Overflow indicator:** "3 more in thread" with click-to-expand
- **Navigation:** Click indicator to view full thread

### 8. Creation Workflow
**Decision:** Command-based creation from post view
- Timeline for navigation/reading only (this sprint)
- Commands available when viewing individual posts:
  - "Create reply to current post"
  - "Create quote of current post"
- No timeline-based creation in initial implementation
- No content pre-population required

### 9. File Naming
**Decision:** Standard timestamp-based naming for all posts
- No special naming convention for replies vs regular posts
- Uniqueness ensured by timestamp: `microblog-2025-06-06T10-30-00Z.md`
- Reply/quote relationship indicated only in metadata, not filename