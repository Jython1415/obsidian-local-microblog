# Threading and Display Design

## Scope
This document addresses display and UI concerns for reply threading, separate from the core reply implementation.

## Questions to Address

### Deep Threading Display
1. **Visual Nesting Limits**: At what visual depth do we switch from indentation to other indicators?
2. **Collapse/Expand**: Should deep threads be collapsible by default?
3. **Thread Navigation**: How do users navigate within very deep reply chains?
4. **Mobile Considerations**: How does deep nesting work on smaller screens?

### High Reply Volume Display  
1. **Reply Pagination**: If a post has 50+ replies, how do we paginate them?
2. **Reply Sorting**: Chronological vs threaded vs popularity-based ordering?
3. **Reply Previews**: Show full replies or truncated previews initially?
4. **Load Strategy**: Load all replies upfront or on-demand?

### Visual Design Concerns
1. **Indentation Strategy**: Fixed pixels vs percentage-based nesting?
2. **Thread Lines**: Visual connectors between parent and child posts?
3. **Context Preservation**: How to show original post context in deep threads?
4. **Thread Boundaries**: Visual separation between different conversation threads?

## Initial Thinking

### Progressive Disclosure
- First 3 levels: Full visual nesting with indentation
- Levels 4+: Switch to "in reply to..." indicators 
- Expandable thread views for deep dives

### Performance Considerations
- Virtual scrolling for threads with 20+ replies
- Lazy loading of reply content beyond viewport
- Thread summarization for very long chains

## Implementation Priority
**Phase 2**: After basic reply functionality is working
**Dependencies**: Core reply system, timeline performance optimization

## Related Documents
- `replies-and-quotes-spec.md` (core implementation)
- `timeline-performance-optimization.md` (performance concerns)