# Timeline-Integrated Creation UX Design

## Scope
This document addresses enhancing the timeline view with creation buttons that leverage the command-based creation system.

## Core Concept
Timeline buttons trigger the same command methods but with pre-filled parameters, maintaining the reliability of command-based creation while improving UX.

## Questions to Address

### Button Integration
1. **Button Placement**: Where do reply/quote buttons appear on each post?
2. **Button Styling**: How do buttons integrate with current post styling?
3. **Button States**: Hover, active, disabled states for different scenarios?
4. **Mobile Optimization**: Touch-friendly button sizing and placement?

### Creation Flow
1. **Parameter Passing**: How do timeline buttons pass context (target post) to commands?
2. **Modal Closure**: Should timeline close immediately or stay open during creation?
3. **Creation Feedback**: How does user know creation succeeded from timeline view?
4. **Error Handling**: What happens if creation fails from timeline button?

### New Post Creation
1. **New Post Button**: Location and styling for "Create New Post" in timeline?
2. **Quick Creation**: Option for simple text input vs full file creation?
3. **Template Selection**: Different post types or always default microblog?
4. **Timeline Refresh**: Auto-refresh timeline after new post creation?

### Technical Implementation
1. **Method Signatures**: How do command methods accept pre-filled parameters?
2. **File Naming**: How to handle auto-generated vs user-specified filenames?
3. **Metadata Population**: Automatic vs user-editable reply/quote references?
4. **Editor Integration**: Open created file in editor immediately or allow continued browsing?

## Initial Implementation Approach

### Phase 1: Basic Buttons
- Add "Reply" and "Quote" buttons to each timeline post
- Buttons call existing command methods with target post parameter
- Timeline closes, opens editor with pre-filled template

### Phase 2: Enhanced UX
- Add "New Post" button to timeline header
- Implement timeline refresh after creation
- Add creation success/failure feedback

### Phase 3: Advanced Features
- Quick text input for simple replies
- In-timeline preview of created content
- Batch operations (reply to multiple posts)

## Dependencies
- Core command-based creation system
- Enhanced command methods that accept parameters
- Timeline refresh mechanisms

## Related Documents
- `replies-and-quotes-spec.md` (core commands)
- `obsidian-ui-constraints.md` (modal limitations)