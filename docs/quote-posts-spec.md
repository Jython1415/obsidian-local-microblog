# Quote Posts Implementation Specification

## Overview
Quote posts allow users to reference and display content from other posts within their own posts. This enables sharing and commenting on previous content while maintaining clear attribution and context.

## Data Structure

### Frontmatter Schema
Quote posts use the following frontmatter structure:
```yaml
---
lm_type: microblog
lm_quote: "filename.md"
lm_created: 2024-01-01T12:00:00.000Z
---

Optional content commenting on the quoted post...
```

### MicroblogPost Interface
The existing interface already supports quotes:
```typescript
interface MicroblogPost {
    type: 'post' | 'reply' | 'quote';
    quoteTo?: string;           // Referenced filename
    // ... other fields
}
```

## Command Implementation

### 1. Create Quote Post Command
- **Command Name**: "Microblog: Create quote post"
- **Trigger**: From any microblog file via command palette
- **Behavior**: 
  - Creates new microblog file with `lm_quote` referencing current file
  - Sets `lm_type: microblog` and current timestamp
  - Opens new file for editing

### 2. Add Quote to Existing Post Command
- **Command Name**: "Microblog: Add quote to post"
- **Trigger**: From command palette (only works on existing microblog posts)
- **Behavior**:
  - Validates current file is already a microblog post
  - Opens quote picker modal showing all microblog posts except current post
  - User selects post to quote via "Quote this post" button
  - Adds `lm_quote: "selected-file.md"` to current file's frontmatter

## Display Logic

### Quote Content Rendering
- **Location**: Quoted content appears inline below main post content
- **Structure**: Main content → Quoted content (styled as nested post)
- **Content Length**: Always display full quoted content (no truncation)
- **Styling**: Match Bluesky styling patterns for quoted content hierarchy
  - *Note: Implementation should request Bluesky reference from user for styling details*

### Quote Resolution
- **Success**: Display full content of quoted post
- **Failure**: Show "post not found" placeholder when quoted file is missing/moved
- **Depth**: Only show direct quotes (no transitive quote display)

### Quote Interaction
- **Clickable**: Quoted content is clickable and navigates to original post
- **Navigation**: Follows existing modal navigation patterns

## User Interface Integration

### Quote Picker Modal
- **Reuses Timeline Display**: Shows posts using same rendering logic as timeline view
- **Modal Size**: Same size and scrolling behavior as main microblog modal
- **Search Functionality**: Fuzzy find search that filters posts by content
- **Post Selection**: All microblog posts except current post (includes replies)
- **Action Button**: "Quote this post" button replaces timeline action buttons
- **Post Format**: Date, type badge, content preview, and quote button

### Timeline View
- Quote posts appear as top-level posts with embedded quoted content
- Visual indicators show post type (similar to reply indicators)
- Quote count displayed next to reply count

### Thread View (Post Detail)
- Quote posts display within thread context
- "Quoted by" section shows posts that quote the current post (thread view only)
- Quoted content maintains visual hierarchy within post display

### Navigation
- **Quote Content Clicking**: Navigates to original post and adds to navigation stack
- **Modal Navigation**: Supports back navigation after clicking quoted content

### Visual Indicators
- Quote count: Visual indicator next to reply count
- Quote type: Visual distinction for quote posts in lists
- Quoted content: Nested styling to show attribution

## Technical Implementation

### Quote Counting
- Track number of posts that quote each post
- Similar to existing reply count logic
- Display in post metadata

### Reverse Quote Lookup
- "Quoted by" functionality to show posts quoting current post
- Only displayed in thread view
- Similar to direct replies display logic

### Error Handling
- Graceful handling of missing quoted posts
- Maintain post structure when quote resolution fails
- No validation for quote loops (single-user scenario)
- **Multiple Quote Handling**: Replace existing quote when adding new quote to post

### Command Context
- **File-Based Commands**: Quote commands operate on microblog files directly (not from modal)
- **Modal Integration**: Reserved for future development sprint

### File Creation Standards
- **Naming Convention**: `microblog-{ISO-timestamp-with-dashes}.md`
- **Location**: Uses Obsidian's default new file location
- **Template**: Standard microblog frontmatter with `lm_quote` field

### Performance Considerations
- Resolve quoted content fresh on each display (no caching)
- Leverage existing post loading and organization logic
- Reuse timeline rendering logic for quote picker modal

## Command Palette Integration
Quote commands will be grouped with existing microblog commands:
- "Microblog: Create new post"
- "Microblog: Create reply to current post"
- **"Microblog: Create quote post"** (new)
- **"Microblog: Add quote to post"** (new)

## Implementation Dependencies
- Existing post organization and display logic
- Current modal navigation system
- Fuzzy finder component for post selection
- Frontmatter parsing and updating utilities

## Success Criteria
1. Users can create quote posts from any microblog file
2. Users can add quotes to existing posts via fuzzy finder
3. Quoted content displays inline with proper styling
4. Quote counts and reverse lookups work correctly
5. Navigation between quoted and quoting posts functions smoothly
6. Error states handle missing quoted posts gracefully