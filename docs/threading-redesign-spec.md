# Threading Redesign Specification

## Overview

This document outlines the redesigned threading system for the Obsidian Local Microblog plugin, based on lessons learned from the initial implementation. The new design focuses on a clean two-view system that handles branching conversations naturally.

## Problem with Current Implementation

The current Phase 4 implementation has significant UX issues:
- Only shows one reply chain per thread (A → B → C → D → E)
- Branching conversations are hidden (A → F → G invisible until expand)
- Overflow indicators are misleading
- Users cannot discover all conversations

## New Two-View Design

### 1. Timeline View (Default)
**Purpose:** Scannable overview of all top-level posts

**Display:**
- Show only top-level posts (posts without `lm_reply`)
- Each post shows reply count: "3 replies"
- Clean, minimal layout
- Click post → switch to Post View

**Example:**
```
[Post A] "This is a test post" [3 replies]
[Post X] "Another standalone post" [0 replies]
[Post Y] "Different conversation" [1 reply]
```

### 2. Post View (Context-Aware)
**Purpose:** Show focused post with full context and immediate replies

**Behavior depends on post type:**

**For Top-Level Posts:**
- Show the post at top
- Show all direct replies below
- Each reply shows its own reply count

**For Reply Posts:**
- Show thread context above (A → B → **C**)
- Show focused post (highlighted/emphasized)
- Show direct replies to focused post below

**Example - Focus on top-level Post A:**
```
[Post A] "This is a test post"
  ↳ [Reply B] "First response" [2 replies]
  ↳ [Reply F] "Different response" [1 reply]
```

**Example - Focus on reply Post C:**
```
[Post A] "This is a test post"
  ↳ [Reply B] "First response"
    ↳ [**Reply C**] "Nested response" ← FOCUSED
      ↳ [Reply D] "Response to C" [0 replies]
```

## Data Structure Changes

### MicroblogPost Interface Extensions
```typescript
interface MicroblogPost {
  // ... existing fields
  replyCount?: number;          // Count of direct replies only
  directReplies?: MicroblogPost[]; // Array of immediate children
  hasErrors?: boolean;          // Indicates data issues (orphaned, circular, etc.)
}
```

### Thread Organization Logic
- Calculate reply counts during organization (direct children only)
- Build complete reply trees capturing ALL branches
- Track all direct children per post
- Robust error handling: promote problematic replies to top-level posts
- Detect and break circular references
- Handle orphaned replies and malformed data gracefully

## Navigation Model

### Timeline → Post View
- Click any post in timeline → show Post View for that post
- Replace timeline content (not separate modal)
- Back button → return to Timeline View

### Post View Navigation
- Click any reply → switch Post View focus to that reply
- Shows new context chain and replies
- Navigation stack maintains history for complex back/forward scenarios
- Full context chains displayed (no depth limits)
- Chronological ordering for replies at same level

## Implementation Phases

### Phase 4A: Data Structure Redesign
**Goal:** Fix thread organization to capture all branches + robust error handling

**Core Changes:**
1. Modify `organizeIntoThreads()` to collect ALL direct replies (not just first)
2. Add `replyCount` calculation (direct children only)
3. Build complete reply tree structure
4. Remove compression/overflow logic
5. Update `MicroblogPost` interface with `replyCount` and `directReplies[]`

**Error Handling (treat as top-level posts):**
- Orphaned replies (missing parent file)
- Circular references (detect cycles, break at first repetition)
- Self-replies (ignore reply metadata)
- Malformed `lm_reply` values
- Add optional error indicators for later user notification

**Test Criteria:** All reply branches captured, no crashes on malformed data

### Phase 4B: Timeline View Simplification
**Goal:** Clean timeline showing only top-level posts with reply counts

**Implementation:**
1. Filter to posts without `lm_reply` (plus error-promoted posts)
2. Display reply counts: "0 replies", "5 replies", "99+ replies" (cap at 99+)
3. Add click handlers for Post View navigation
4. Remove nested display logic
5. Add refresh button for later real-time updates

**Test Criteria:** Clean list, accurate counts, all conversations accessible

### Phase 4C: Post View Implementation
**Goal:** Context-aware post view with full navigation

**Implementation:**
1. Replace timeline content (not separate modal)
2. Show full context chain above focused post (no depth limits)
3. Visual focus indicators for current post
4. Show all direct replies below, chronologically sorted
5. Navigation between posts with back button to timeline
6. Handle missing context (child becomes top-level)

**Test Criteria:** All conversations discoverable, clear visual hierarchy

### Phase 4D: State Management & Navigation
**Goal:** Track view state and navigation during modal session

**Implementation:**
1. Track current view mode (Timeline vs Post View)
2. Maintain navigation stack for back button functionality
3. Store focused post ID when in Post View
4. Handle navigation loops with proper stack management
5. Reset state when modal closes (no persistence between sessions)

**Test Criteria:** Smooth navigation, proper back button behavior

### Phase 5: Polish and Optimization
**Goal:** Visual refinement and user experience

**Priority Items:**
1. Add visual highlighting for focused posts
2. Polish visual design (inspired by Bluesky focus patterns)
3. Error status indicators for malformed data

**Deferred Items:**
- Keyboard navigation
- Performance optimization for large datasets
- Auto-scroll to focused post
- Memory management optimization (regenerate each time for now)

## Technical Benefits

**Simplified Logic:**
- No compression algorithms
- Clear parent-child relationships
- Natural tree traversal

**Better Performance:**
- Timeline loads minimal data
- Post View renders on-demand
- Scales with visible items

**Improved UX:**
- All conversations discoverable
- Context provided when needed
- Intuitive navigation patterns

**Maintainable Code:**
- Clear separation of concerns
- Two distinct rendering modes
- Straightforward state management

## Migration Strategy

**Backward Compatibility:**
- No changes to file format or metadata
- Existing posts work without modification
- Can revert to old display logic if needed

**Testing Approach:**
- Test with complex branching scenarios (A→B→C and A→F→G)
- Verify all conversations are discoverable and navigable
- Test error handling: orphaned replies, circular references, malformed data
- Performance testing with large numbers of posts (deferred)
- UX testing for navigation intuitiveness and visual hierarchy

**Reply Count Display Rules:**
- "0 replies" for posts with no responses
- "5 replies" for normal counts
- "99+ replies" for counts ≥100

**Error Recovery Strategy:**
- Promote problematic replies to top-level posts
- Graceful degradation vs. crashes
- Optional error indicators for future user notification