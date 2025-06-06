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

## Recommended Implementation Strategy

### Phase 1: Enhanced Type System
1. Update type detection logic in `main.ts:108-112`
2. Modify post creation template in `main.ts:65-72`
3. Update timeline display logic in `main.ts:175-194`

### Phase 2: Reply Commands
1. Add "Reply to Current Post" command
2. Implement reply detection in current view
3. Create reply template with `replyTo` metadata

### Phase 3: Timeline Threading
1. Modify `getMicroblogPosts()` to build thread structures
2. Update timeline display to show nested replies
3. Add visual indicators for thread relationships

### Phase 4: Timeline Actions
1. Add reply/quote buttons to timeline posts
2. Implement modal-based creation workflow
3. Add timeline refresh mechanisms

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

## Link Format Implementation

### YAML Frontmatter Limitation
**Discovery**: Obsidian does **NOT** natively support `[[]]` wikilinks in YAML frontmatter. This is a long-standing feature request but remains unimplemented.

### Chosen Solution: Hybrid Approach

**YAML Properties** (for plugin resolution):
```yaml
---
lm_type: microblog
lm_reply: "microblog-2025-06-06T10-30-00Z.md"  # File name for easy lookup
lm_quote: "some-other-post.md"
lm_created: 2025-06-06T10-30-00Z
---
```

**Content Structure** (for Obsidian integration):
```markdown
Reply to:

![[microblog-2025-06-06T10-30-00Z]]

<!-- microblog-content-start -->
My response content here...
<!-- microblog-content-end -->
```

### Benefits of This Approach
- **Plugin efficiency**: File names resolve easily to TFile objects
- **Stability**: File names change less frequently than titles
- **Human readable**: Clear what's being referenced in YAML
- **Graph integration**: `![[]]` embeds create proper backlinks
- **Context**: Embedded content shows what's being replied to/quoted
- **Native support**: Leverages Obsidian's existing embed system
- **Clean extraction**: HTML comments mark content boundaries precisely
- **Content flexibility**: Allows `---` and other markdown in post content

### Content Extraction Strategy
Plugin extracts actual post content using HTML comment markers:
```typescript
// Look for content between markers
if (line.includes('<!-- microblog-content-start -->')) {
    contentStarted = true;
    continue;
}
if (line.includes('<!-- microblog-content-end -->')) {
    break;
}
```

### Implementation Notes
- Plugin uses `lm_reply`/`lm_quote` values for thread detection
- Content embeds provide visual context and graph connectivity
- HTML comments are invisible in rendered view
- File names must be unique (already ensured by timestamp-based naming)
- Simple string matching avoids regex complexity

## Open Questions for Next Implementation Session

### 1. Content Marker Edge Cases
- What if user manually edits and removes/breaks the content markers?
- Should we have fallback extraction logic?
- What if content markers appear in code blocks or quoted text?

### 2. File Resolution Robustness
- What happens if referenced file (`lm_reply: "file.md"`) gets deleted or renamed?
- Should we validate file existence when creating replies/quotes?
- How do we handle broken references in timeline display?

### 3. Template Generation
- How does the "create reply" command know the target file's name?
- What if target file doesn't exist in microblog folder?
- Should we support replying to non-microblog files?

### 4. Timeline Threading Logic
- How do we prevent infinite loops in reply chains?
- What if `lm_reply` points to a file that also has `lm_reply` (chains)?
- Should we limit displayed nesting depth even if data allows deeper?

### 5. Quote vs Reply Semantics
- Can you reply to a quote? Quote a reply?
- Should quotes show differently than replies in timeline?
- What if a post has both `lm_reply` AND `lm_quote`?

### 6. Migration Path
- How do we update existing posts from `type: microblog` to `lm_type: microblog`?
- Should we support both formats during transition?

### 7. Content Marker Requirements
- Are content markers required for ALL posts or just replies/quotes?
- What about simple posts without references?