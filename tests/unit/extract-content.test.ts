import { describe, it, expect, beforeEach } from 'vitest';
import LocalMicroblogPlugin from '../../main.ts';
import { createMockApp } from '../mocks/obsidian-api';

describe('extractContentFromMarkdown()', () => {
	let plugin: LocalMicroblogPlugin;
	let mockApp: any;

	beforeEach(() => {
		mockApp = createMockApp();
		plugin = new LocalMicroblogPlugin(mockApp, {} as any);
	});

	it('should extract content after frontmatter', () => {
		const markdown = `---
lm_type: microblog
lm_created: 2023-01-01T00:00:00Z
---

# My first post

This is the content of my post.`;

		const result = (plugin as any).extractContentFromMarkdown(markdown);
		
		expect(result).toBe('# My first post\n\nThis is the content of my post.');
	});

	it('should handle posts without frontmatter', () => {
		const markdown = `# My post

This is content without frontmatter.`;

		const result = (plugin as any).extractContentFromMarkdown(markdown);
		
		expect(result).toBe('# My post\n\nThis is content without frontmatter.');
	});

	it('should extract content between microblog-content markers', () => {
		const markdown = `---
lm_type: microblog
lm_reply: "parent.md"
---

Reply to:

![[parent]]

<!-- microblog-content-start -->
# My reply

This is my reply content.
<!-- microblog-content-end -->

Some other content that should be ignored.`;

		const result = (plugin as any).extractContentFromMarkdown(markdown);
		
		expect(result).toBe('# My reply\n\nThis is my reply content.');
	});

	it('should exclude Reply to: lines and embeds when no content markers', () => {
		const markdown = `---
lm_type: microblog
lm_reply: "parent.md"
---

Reply to:

![[parent]]

# My reply

This is my reply content.`;

		const result = (plugin as any).extractContentFromMarkdown(markdown);
		
		expect(result).toBe('# My reply\n\nThis is my reply content.');
		expect(result).not.toContain('Reply to:');
		expect(result).not.toContain('![[parent]]');
	});

	it('should handle empty content gracefully', () => {
		const markdown = `---
lm_type: microblog
---

`;

		const result = (plugin as any).extractContentFromMarkdown(markdown);
		
		expect(result).toBe('');
	});

	it('should handle content with only whitespace', () => {
		const markdown = `---
lm_type: microblog
---

   
	
   `;

		const result = (plugin as any).extractContentFromMarkdown(markdown);
		
		expect(result).toBe('');
	});

	it('should preserve markdown formatting in content', () => {
		const markdown = `---
lm_type: microblog
---

# Heading

**Bold text** and *italic text*.

- List item 1
- List item 2

> Blockquote

\`\`\`javascript
console.log('code block');
\`\`\``;

		const result = (plugin as any).extractContentFromMarkdown(markdown);
		
		expect(result).toContain('# Heading');
		expect(result).toContain('**Bold text** and *italic text*.');
		expect(result).toContain('- List item 1');
		expect(result).toContain('> Blockquote');
		expect(result).toContain('```javascript');
	});

	it('should handle malformed frontmatter', () => {
		const markdown = `---
lm_type: microblog
malformed frontmatter without closing
# My post

Content after malformed frontmatter.`;

		const result = (plugin as any).extractContentFromMarkdown(markdown);
		
		// Without closing frontmatter delimiter, everything is considered frontmatter
		// so no content is extracted
		expect(result).toBe('');
	});

	it('should handle multiple frontmatter delimiters', () => {
		const markdown = `---
lm_type: microblog
---

# First section

---

# Second section with delimiter`;

		const result = (plugin as any).extractContentFromMarkdown(markdown);
		
		expect(result).toContain('# First section');
		// The --- delimiter is skipped by the continue statement
		expect(result).not.toContain('---');
		expect(result).toContain('# Second section with delimiter');
	});

	it('should handle content markers without closing tag', () => {
		const markdown = `---
lm_type: microblog
---

<!-- microblog-content-start -->
# My content

This content has no end marker.`;

		const result = (plugin as any).extractContentFromMarkdown(markdown);
		
		expect(result).toBe('# My content\n\nThis content has no end marker.');
	});

	it('should handle nested embeds correctly', () => {
		const markdown = `---
lm_type: microblog
---

![[outer-embed]]

# Content

Some text with ![[inline-embed]] in the middle.

More content.`;

		const result = (plugin as any).extractContentFromMarkdown(markdown);
		
		// Lines containing ![[]] are filtered out completely
		expect(result).toBe('# Content\n\n\nMore content.');
		expect(result).not.toContain('![[outer-embed]]');
		expect(result).not.toContain('![[inline-embed]]');
	});

	it('should trim whitespace from final result', () => {
		const markdown = `---
lm_type: microblog
---


# My post

Content with extra whitespace.


`;

		const result = (plugin as any).extractContentFromMarkdown(markdown);
		
		expect(result).toBe('# My post\n\nContent with extra whitespace.');
		expect(result.startsWith(' ')).toBe(false);
		expect(result.endsWith(' ')).toBe(false);
	});
});