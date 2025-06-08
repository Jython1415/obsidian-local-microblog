import { describe, it, expect, beforeEach } from 'vitest';
import LocalMicroblogPlugin, { MicroblogPost } from '../../main.ts';
import { createMockApp, createMockTFile } from '../mocks/obsidian-api';
import { generateTestPost } from '../fixtures/test-data';

describe('organizeForTimeline() - Timeline View Organization', () => {
	let plugin: LocalMicroblogPlugin;
	let mockApp: any;

	beforeEach(() => {
		mockApp = createMockApp();
		plugin = new LocalMicroblogPlugin(mockApp, {} as any);
	});

	it('should organize top-level posts correctly', () => {
		const posts: MicroblogPost[] = [
			generateTestPost({ filename: 'post1.md', type: 'post' }),
			generateTestPost({ filename: 'post2.md', type: 'post' })
		];

		const result = (plugin as any).organizeForTimeline(posts);

		expect(result).toHaveLength(2);
		expect(result[0].file.name).toBe('post1.md');
		expect(result[1].file.name).toBe('post2.md');
	});

	it('should organize simple reply threads', () => {
		const posts: MicroblogPost[] = [
			generateTestPost({ filename: 'parent.md', type: 'post' }),
			generateTestPost({ filename: 'reply.md', type: 'reply', replyTo: 'parent.md' })
		];

		const result = (plugin as any).organizeForTimeline(posts);

		const parent = result.find(p => p.file.name === 'parent.md');

		expect(parent).toBeDefined();
		expect(parent?.replyCount).toBe(1);
		expect(parent?.directReplies).toHaveLength(1);
		expect(parent?.directReplies?.[0].file.name).toBe('reply.md');
		
		// Timeline View only shows top-level posts
		expect(result).toHaveLength(1);
		expect(result[0].file.name).toBe('parent.md');
	});

	it('should handle multiple direct replies', () => {
		const posts: MicroblogPost[] = [
			generateTestPost({ filename: 'parent.md', type: 'post' }),
			generateTestPost({ filename: 'reply1.md', type: 'reply', replyTo: 'parent.md' }),
			generateTestPost({ filename: 'reply2.md', type: 'reply', replyTo: 'parent.md' }),
			generateTestPost({ filename: 'reply3.md', type: 'reply', replyTo: 'parent.md' })
		];

		const result = (plugin as any).organizeForTimeline(posts);

		const parent = result.find(p => p.file.name === 'parent.md');

		expect(parent?.replyCount).toBe(3);
		expect(parent?.directReplies).toHaveLength(3);

		// Timeline View only shows top-level posts
		expect(result).toHaveLength(1);
		expect(result[0].file.name).toBe('parent.md');
	});


	it('should detect and handle self-references', () => {
		const posts: MicroblogPost[] = [
			generateTestPost({ filename: 'self-ref.md', type: 'reply', replyTo: 'self-ref.md' })
		];

		const result = (plugin as any).organizeForTimeline(posts);

		const post = result.find(p => p.file.name === 'self-ref.md');
		expect(post?.replyTo).toBeUndefined();
		expect(post?.hasErrors).toBe(true);
		
		// Timeline View shows promoted post as top-level
		expect(result).toHaveLength(1);
		expect(result[0].file.name).toBe('self-ref.md');
	});

	it('should detect and handle circular references', () => {
		const posts: MicroblogPost[] = [
			generateTestPost({ filename: 'post1.md', type: 'reply', replyTo: 'post2.md' }),
			generateTestPost({ filename: 'post2.md', type: 'reply', replyTo: 'post3.md' }),
			generateTestPost({ filename: 'post3.md', type: 'reply', replyTo: 'post1.md' })
		];

		const result = (plugin as any).organizeForTimeline(posts);

		// At least one post should be detected and promoted to top-level
		const errorPosts = result.filter(p => p.hasErrors);
		expect(errorPosts.length).toBeGreaterThan(0);

		// Timeline View shows promoted posts as top-level (at least the detected ones)
		expect(result.length).toBeGreaterThanOrEqual(1);
		result.forEach(post => {
			if (post.hasErrors) {
				expect(post.replyTo).toBeUndefined();
			}
		});
	});

	it('should handle orphaned replies', () => {
		const posts: MicroblogPost[] = [
			generateTestPost({ filename: 'orphan.md', type: 'reply', replyTo: 'nonexistent.md' })
		];

		const result = (plugin as any).organizeForTimeline(posts);

		const orphan = result.find(p => p.file.name === 'orphan.md');
		expect(orphan?.replyTo).toBeUndefined();
		expect(orphan?.hasErrors).toBe(true);
		
		// Timeline View shows promoted orphan as top-level
		expect(result).toHaveLength(1);
		expect(result[0].file.name).toBe('orphan.md');
	});

	it('should sort direct replies chronologically', () => {
		const posts: MicroblogPost[] = [
			generateTestPost({ 
				filename: 'parent.md', 
				type: 'post',
				created: '2023-01-01T00:00:00Z'
			}),
			generateTestPost({ 
				filename: 'reply3.md', 
				type: 'reply', 
				replyTo: 'parent.md',
				created: '2023-01-01T03:00:00Z'
			}),
			generateTestPost({ 
				filename: 'reply1.md', 
				type: 'reply', 
				replyTo: 'parent.md',
				created: '2023-01-01T01:00:00Z'
			}),
			generateTestPost({ 
				filename: 'reply2.md', 
				type: 'reply', 
				replyTo: 'parent.md',
				created: '2023-01-01T02:00:00Z'
			})
		];

		const result = (plugin as any).organizeForTimeline(posts);

		const parent = result.find(p => p.file.name === 'parent.md');
		expect(parent?.directReplies).toHaveLength(3);
		expect(parent?.directReplies?.[0].file.name).toBe('reply1.md');
		expect(parent?.directReplies?.[1].file.name).toBe('reply2.md');
		expect(parent?.directReplies?.[2].file.name).toBe('reply3.md');
	});

	it('should handle complex thread structures', () => {
		const posts: MicroblogPost[] = [
			generateTestPost({ filename: 'root.md', type: 'post' }),
			generateTestPost({ filename: 'branch1.md', type: 'reply', replyTo: 'root.md' }),
			generateTestPost({ filename: 'branch2.md', type: 'reply', replyTo: 'root.md' }),
			generateTestPost({ filename: 'leaf1.md', type: 'reply', replyTo: 'branch1.md' }),
			generateTestPost({ filename: 'leaf2.md', type: 'reply', replyTo: 'branch1.md' }),
			generateTestPost({ filename: 'leaf3.md', type: 'reply', replyTo: 'branch2.md' })
		];

		const result = (plugin as any).organizeForTimeline(posts);

		const root = result.find(p => p.file.name === 'root.md');

		// Timeline View correctly builds reply metadata for all direct replies
		expect(root?.replyCount).toBe(2);

		// Verify that the root post correctly identifies all its direct replies
		expect(root?.directReplies).toHaveLength(2);
		expect(root?.directReplies?.map(r => r.file.name)).toContain('branch1.md');
		expect(root?.directReplies?.map(r => r.file.name)).toContain('branch2.md');

		// Timeline View only shows top-level posts
		expect(result).toHaveLength(1);
		expect(result[0].file.name).toBe('root.md');
	});

	it('should build nested reply metadata correctly', () => {
		const posts: MicroblogPost[] = [
			generateTestPost({ filename: 'level0.md', type: 'post' }),
			generateTestPost({ filename: 'level1.md', type: 'reply', replyTo: 'level0.md' }),
			generateTestPost({ filename: 'level2.md', type: 'reply', replyTo: 'level1.md' })
		];

		const result = (plugin as any).organizeForTimeline(posts);

		const level0 = result.find(p => p.file.name === 'level0.md');

		// Timeline View builds reply metadata correctly
		expect(level0?.replyCount).toBe(1);
		expect(level0?.directReplies).toHaveLength(1);
		expect(level0?.directReplies?.[0].file.name).toBe('level1.md');
		
		// Nested reply metadata is built correctly
		const level1Reply = level0?.directReplies?.[0];
		expect(level1Reply?.replyCount).toBe(1);
		expect(level1Reply?.directReplies).toHaveLength(1);
		expect(level1Reply?.directReplies?.[0].file.name).toBe('level2.md');

		// Timeline View only shows top-level posts
		expect(result).toHaveLength(1);
		expect(result[0].file.name).toBe('level0.md');
	});
});