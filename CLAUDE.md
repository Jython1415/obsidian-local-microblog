# Obsidian Local Microblog Plugin - Project Memory

## Development Preferences

### Code Changes
- User prefers small, focused edits to files
- User will often request specific edits to be made on their behalf
- Write clean, easy-to-read, self-documenting code

### Git Workflow
- Make atomic commits for each logical change
- Clean up git repository by committing work in atomic commits after doing a chunk of work
- **Do NOT push without explicit user confirmation**
- Follow the pattern: make changes � commit � wait for push confirmation

### Code Style
- Prioritize code readability and self-documentation
- Keep functions focused and well-named
- Maintain clear separation of concerns

## Documentation Organization

### Active Planning Documents (`/docs/`)
- `roadmap.md` - Primary development roadmap with immediate next steps and long-term vision

### Completed Implementations (`/docs/archive/`)
- Organized by date: `YYYY-MM-DD-feature-description.md`

### Documentation Workflow
- When planning major features: create detailed spec in `/docs/`
- During implementation: keep spec updated with decisions and changes
- After completion: move to `/docs/archive/` with date prefix
- Roadmap tracks next priorities

## Testing Setup Notes
- TypeScript interface exports are essential for test file imports  
- Manual testing refers to UI/UX functionality verification, not build checks