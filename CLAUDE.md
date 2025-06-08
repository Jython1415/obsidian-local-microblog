# Obsidian Local Microblog Plugin - Project Memory

## Development Preferences

### Code Changes
- User prefers small, focused edits to files
- User will often request specific edits to be made on their behalf
- Write clean, easy-to-read, self-documenting code

### Git Workflow
- Make atomic commits for each logical change
- **Do NOT push without explicit user confirmation**
- Follow the pattern: make changes � commit � wait for push confirmation

### Code Style
- Prioritize code readability and self-documentation
- Keep functions focused and well-named
- Maintain clear separation of concerns

## Documentation Organization

### Active Planning Documents (`/docs/`)
- `roadmap.md` - Primary development roadmap with immediate next steps and long-term vision
- `obsidian-ui-constraints.md` - Technical constraints and limitations for UI development
- `timeline-creation-ux-design.md` - Planning document for timeline creation UX features

### Completed Implementations (`/docs/archive/`)
- Organized by date: `YYYY-MM-DD-feature-description.md`
- `2025-06-07-threading-redesign-implementation.md` - Complete threading system implementation
- `2025-06-07-threading-display-design-superseded.md` - Superseded design questions
- `replies-and-quotes-spec.md` - Original foundation spec for reply system

### Documentation Workflow
- When planning major features: create detailed spec in `/docs/`
- During implementation: keep spec updated with decisions and changes
- After completion: move to `/docs/archive/` with date prefix
- Roadmap tracks current status and next priorities