import { describe, it, expect, beforeEach } from 'vitest';
import LocalMicroblogPlugin, { MicroblogPost } from '../../main.ts';
import { createMockApp } from '../mocks/obsidian-api';
import { generateTestPost } from '../fixtures/test-data';

describe('detectCircularReference()', () => {
	let plugin: LocalMicroblogPlugin;
	let mockApp: any;

	beforeEach(() => {
		mockApp = createMockApp();
		plugin = new LocalMicroblogPlugin(mockApp, {} as any);
	});

	it('should return false for posts without replies', () => {
		const post = generateTestPost({ filename: 'standalone.md', type: 'post' });
		const allPosts = [post];

		const result = (plugin as any).detectCircularReference(post, allPosts);

		expect(result).toBe(false);
	});

	it('should return false for valid linear reply chains', () => {
		const post1 = generateTestPost({ filename: 'post1.md', type: 'post' });
		const post2 = generateTestPost({ filename: 'post2.md', type: 'reply', replyTo: 'post1.md' });
		const post3 = generateTestPost({ filename: 'post3.md', type: 'reply', replyTo: 'post2.md' });
		const allPosts = [post1, post2, post3];

		const result = (plugin as any).detectCircularReference(post3, allPosts);

		expect(result).toBe(false);
	});

	it('should detect direct self-reference', () => {
		const post = generateTestPost({ filename: 'self.md', type: 'reply', replyTo: 'self.md' });
		const allPosts = [post];

		const result = (plugin as any).detectCircularReference(post, allPosts);

		expect(result).toBe(true);
	});

	it('should detect simple two-post circular reference', () => {
		const post1 = generateTestPost({ filename: 'post1.md', type: 'reply', replyTo: 'post2.md' });
		const post2 = generateTestPost({ filename: 'post2.md', type: 'reply', replyTo: 'post1.md' });
		const allPosts = [post1, post2];

		const result1 = (plugin as any).detectCircularReference(post1, allPosts);
		const result2 = (plugin as any).detectCircularReference(post2, allPosts);

		expect(result1).toBe(true);
		expect(result2).toBe(true);
	});

	it('should detect complex multi-post circular reference', () => {
		const post1 = generateTestPost({ filename: 'post1.md', type: 'reply', replyTo: 'post2.md' });
		const post2 = generateTestPost({ filename: 'post2.md', type: 'reply', replyTo: 'post3.md' });
		const post3 = generateTestPost({ filename: 'post3.md', type: 'reply', replyTo: 'post4.md' });
		const post4 = generateTestPost({ filename: 'post4.md', type: 'reply', replyTo: 'post1.md' });
		const allPosts = [post1, post2, post3, post4];

		const result1 = (plugin as any).detectCircularReference(post1, allPosts);
		const result2 = (plugin as any).detectCircularReference(post2, allPosts);
		const result3 = (plugin as any).detectCircularReference(post3, allPosts);
		const result4 = (plugin as any).detectCircularReference(post4, allPosts);

		expect(result1).toBe(true);
		expect(result2).toBe(true);
		expect(result3).toBe(true);
		expect(result4).toBe(true);
	});

	it('should handle orphaned replies gracefully', () => {
		const post = generateTestPost({ filename: 'orphan.md', type: 'reply', replyTo: 'missing.md' });
		const allPosts = [post];

		const result = (plugin as any).detectCircularReference(post, allPosts);

		expect(result).toBe(false);
	});

	it('should handle chains with orphaned parents', () => {
		const post1 = generateTestPost({ filename: 'post1.md', type: 'reply', replyTo: 'missing.md' });
		const post2 = generateTestPost({ filename: 'post2.md', type: 'reply', replyTo: 'post1.md' });
		const allPosts = [post1, post2];

		const result = (plugin as any).detectCircularReference(post2, allPosts);

		expect(result).toBe(false);
	});

	it('should detect circular reference in long chain', () => {
		const post1 = generateTestPost({ filename: 'post1.md', type: 'reply', replyTo: 'post5.md' }); // Creates the cycle
		const post2 = generateTestPost({ filename: 'post2.md', type: 'reply', replyTo: 'post1.md' });
		const post3 = generateTestPost({ filename: 'post3.md', type: 'reply', replyTo: 'post2.md' });
		const post4 = generateTestPost({ filename: 'post4.md', type: 'reply', replyTo: 'post3.md' });
		const post5 = generateTestPost({ filename: 'post5.md', type: 'reply', replyTo: 'post4.md' });
		const allPosts = [post1, post2, post3, post4, post5];

		const result = (plugin as any).detectCircularReference(post5, allPosts);

		expect(result).toBe(true);
	});

	it('should not detect false positives in branching replies', () => {
		const root = generateTestPost({ filename: 'root.md', type: 'post' });
		const branch1 = generateTestPost({ filename: 'branch1.md', type: 'reply', replyTo: 'root.md' });
		const branch2 = generateTestPost({ filename: 'branch2.md', type: 'reply', replyTo: 'root.md' });
		const leaf1 = generateTestPost({ filename: 'leaf1.md', type: 'reply', replyTo: 'branch1.md' });
		const leaf2 = generateTestPost({ filename: 'leaf2.md', type: 'reply', replyTo: 'branch2.md' });
		const allPosts = [root, branch1, branch2, leaf1, leaf2];

		const result1 = (plugin as any).detectCircularReference(leaf1, allPosts);
		const result2 = (plugin as any).detectCircularReference(leaf2, allPosts);

		expect(result1).toBe(false);
		expect(result2).toBe(false);
	});

	it('should handle mixed circular and non-circular references', () => {
		const validRoot = generateTestPost({ filename: 'valid-root.md', type: 'post' });
		const validReply = generateTestPost({ filename: 'valid-reply.md', type: 'reply', replyTo: 'valid-root.md' });
		const circular1 = generateTestPost({ filename: 'circular1.md', type: 'reply', replyTo: 'circular2.md' });
		const circular2 = generateTestPost({ filename: 'circular2.md', type: 'reply', replyTo: 'circular1.md' });
		const allPosts = [validRoot, validReply, circular1, circular2];

		const validResult = (plugin as any).detectCircularReference(validReply, allPosts);
		const circularResult1 = (plugin as any).detectCircularReference(circular1, allPosts);
		const circularResult2 = (plugin as any).detectCircularReference(circular2, allPosts);

		expect(validResult).toBe(false);
		expect(circularResult1).toBe(true);
		expect(circularResult2).toBe(true);
	});

	it('should handle empty allPosts array', () => {
		const post = generateTestPost({ filename: 'lone.md', type: 'reply', replyTo: 'parent.md' });
		const allPosts: MicroblogPost[] = [];

		const result = (plugin as any).detectCircularReference(post, allPosts);

		expect(result).toBe(false);
	});

	it('should handle post with undefined replyTo', () => {
		const post = generateTestPost({ filename: 'no-reply.md', type: 'post' });
		post.replyTo = undefined;
		const allPosts = [post];

		const result = (plugin as any).detectCircularReference(post, allPosts);

		expect(result).toBe(false);
	});

	it('should handle post with null replyTo', () => {
		const post = generateTestPost({ filename: 'null-reply.md', type: 'post' });
		post.replyTo = null as any;
		const allPosts = [post];

		const result = (plugin as any).detectCircularReference(post, allPosts);

		expect(result).toBe(false);
	});
});