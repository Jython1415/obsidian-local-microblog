# Obsidian Local Microblog Plugin

## Project Overview

A personal microblogging plugin for Obsidian that creates a local, private social media experience within your vault. Think Bluesky/Twitter-style interactions but completely self-contained and personal.

### Core Goals
- **Custom Timeline View**: Display microblog posts in chronological feed
- **Enhanced Embed Rendering**: Custom styling when microblog posts are embedded (`![[]]`) 
- **Social Features**: Quotes, replies, threading system
- **Local-First**: No external services, completely private
- **Seamless Integration**: Works naturally with existing Obsidian workflows

### Project Status
- ✅ Repository created from official Obsidian template
- 🔄 Currently in planning/research phase
- 📋 Next: Implement basic post identification and timeline view

## Technical Architecture

### Post Identification Strategy
**YAML Properties** (preferred over tags for better API support):
```yaml
---
microblog: true
created: 2025-05-29T10:30:00
reply-to: "[[2025-05-28 My Original Post]]"
quote-of: "[[2025-05-27 Something Interesting]]"
---
```

### Implementation Phases

#### Phase 1: Foundation
1. **Post Identification**: YAML property detection (`microblog: true`)
2. **Timeline View**: Custom view showing chronological microblog posts
3. **Creation Helper**: Command to create new microblog posts with proper properties
4. **Basic Styling**: Simple card-style layout for timeline

#### Phase 2: Social Features  
1. **Threading System**: `reply-to` and `quote-of` properties
2. **Enhanced Timeline**: Filtering, search, thread visualization
3. **Conversation Views**: Visual thread organization

#### Phase 3: Polish
1. **Custom Embed Rendering**: Override `![[]]` display for microblog posts
2. **Advanced UI**: Better animations, responsive design
3. **Cross-References**: Deep integration with Obsidian's backlink system

### Technical Stack
- **Language**: TypeScript
- **APIs**: Obsidian Plugin API
- **Key Components**:
  - Properties API for post metadata
  - Custom Views API for timeline
  - MarkdownPostProcessor for embed rendering
  - Commands API for post creation

## Development Workflow

### Build Commands
```bash
# Development with hot reload
npm run dev

# Production build
npm run build

# Version bump (updates manifest.json and versions.json)
npm run version
```

### Development Environment
- Repository location: `/Users/Joshua/Documents/obsidian-main-vault/.obsidian/plugins/obsidian-local-microblog`
- Main plugin file: `main.ts`
- Vault location: `/Users/Joshua/Documents/obsidian-main-vault/`

### Plugin Installation for Testing
1. Run `npm run build` to compile
2. Restart Obsidian or reload plugins
3. Enable "Local Microblog" in Community Plugins settings

## Code Style & Conventions

### General Principles
- **Clean, readable code**: Prefer clarity over cleverness
- **Type safety**: Use TypeScript strictly, avoid `any`
- **Modular design**: Separate concerns into focused classes
- **Obsidian conventions**: Follow existing plugin patterns

### Naming Conventions
- **Classes**: PascalCase (`MicroblogTimelineView`)
- **Functions**: camelCase (`createMicroblogPost`)
- **Constants**: UPPER\_SNAKE\_CASE (`DEFAULT_SETTINGS`)
- **Files**: kebab-case (`microblog-timeline.ts`)

### Code Organization
```
main.ts              # Plugin entry point
styles.css           # Plugin styles
```

## Research Context

### Existing Plugin Inspiration
- **Status.lol Plugin**: Microblogging with Daily Notes integration
- **Journals Plugin**: Timeline views with calendar navigation - excellent UI reference
- **Easy Timeline**: Simple chronological rendering
- **Multiple Timeline Plugins**: Various approaches to chronological views

## Troubleshooting

## Claude Code Integration Notes

### Code Quality Standards
- Keep functions under 20 lines when possible
- Use descriptive variable names, avoid magic numbers/strings
- Add inline comments for complex logic
- Follow TypeScript best practices strictly

## Next Actions

### Immediate Priorities
1. **Update Plugin Metadata**: Rename from "sample-plugin" to "local-microblog"
2. **Basic Post Detection**: Implement function to identify microblog posts via properties
3. **Simple Timeline View**: Create custom view listing microblog posts chronologically
4. **Creation Command**: Add command to create new microblog post with proper YAML

### Research Tasks  
- Study Journals plugin UI patterns for timeline inspiration
- Investigate MarkdownPostProcessor limitations for embed customization
- Analyze Properties API edge cases and error handling

---

**Last Updated**: 2025-05-29  
**Claude Session**: Obsidian Local Microblog Plugin Development
