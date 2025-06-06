# Obsidian Plugin UI Constraints

## Modal Limitations

**What Modals Can Do:**
- ✅ Display custom HTML/CSS content
- ✅ Handle button clicks and basic interactions
- ✅ Create forms with text inputs, dropdowns
- ✅ Show formatted content (HTML rendering)
- ✅ Scroll long content

**What Modals Cannot Do:**
- ❌ Rich text editing (no built-in editor)
- ❌ Complex state management across modal close/open
- ❌ Native drag & drop interactions
- ❌ Real-time collaborative editing
- ❌ Advanced layout systems (flexbox works, but limited)

## Plugin UI Options

### 1. Modals (Current Approach)
- **Best for:** Quick views, simple forms, read-heavy interfaces
- **Limited by:** No rich editing, state doesn't persist

### 2. Sidebar Views
- **Best for:** Persistent interfaces, complex state
- **Limited by:** Fixed sidebar real estate

### 3. Status Bar
- **Best for:** Quick actions, indicators
- **Limited by:** Very limited space

### 4. Commands + Native Editing
- **Best for:** Content creation, leveraging Obsidian's strengths
- **Limited by:** Less fluid UX

## Specific Constraints for Microblog Timeline

### Timeline Display (Modal)
**Feasible:**
- Scrollable post list
- Basic HTML rendering
- Action buttons (open, reply, quote)
- Simple threading display

**Challenging:**
- In-line editing of posts
- Complex threading UI (deep nesting)
- Real-time updates while modal open
- Rich text preview

### Content Creation
**Feasible Options:**
1. **Command-based creation** → Opens new file in editor
2. **Simple text input** → Basic text in modal
3. **Template-based** → Pre-filled files

**Infeasible:**
- WYSIWYG editing within modal
- Live markdown preview while typing

## Recommended Architecture

```
Timeline Modal: Read & Navigate
    ↓ (buttons trigger)
Commands: Create & Edit
    ↓ (creates/opens)
Native Editor: Rich Content
    ↓ (saves back to)
File System: Single Source of Truth
```

**Key insight:** Embrace Obsidian's native strengths (file editing) rather than fighting against modal limitations.

## Data Integrity Constraints

**Must Preserve:**
- File names and locations (once created)
- YAML frontmatter structure
- Markdown content format
- Link integrity

**Can Safely Modify:**
- File content (via Obsidian API)
- Metadata values
- Create new files in specified folders

This means the plugin can be later replaced by a standalone app that reads the same file structure without breaking anything.