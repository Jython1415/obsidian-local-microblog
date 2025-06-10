import { describe, it, expect, beforeEach } from 'vitest';
import LocalMicroblogPlugin, { MicroblogPost } from '../../main.ts';
import { createMockApp } from '../mocks/obsidian-api';
import { generateTestPost } from '../fixtures/test-data';

describe('addAllRepliesToThread() - Recursive Thread Building', () => {
	let plugin: LocalMicroblogPlugin;
	let mockApp: any;

	beforeEach(() => {
		mockApp = createMockApp();
		plugin = new LocalMicroblogPlugin(mockApp, {} as any);
	});

	it('should add direct replies to thread in chronological order', () => {
		const parentPost = generateTestPost({ 
			filename: 'parent.md', 
			type: 'post',
			created: '2023-01-01T00:00:00Z'
		});
		
		const posts = [
			parentPost,
			generateTestPost({ 
				filename: 'reply2.md', 
				type: 'reply', 
				replyTo: 'parent.md',
				created: '2023-01-01T02:00:00Z'
			}),
			generateTestPost({ 
				filename: 'reply1.md', 
				type: 'reply', 
				replyTo: 'parent.md',
				created: '2023-01-01T01:00:00Z'
			})
		];

		const postMap = new Map<string, MicroblogPost>();
		posts.forEach(post => postMap.set(post.file.name, post));
		
		const threadedPosts: MicroblogPost[] = [parentPost];
		parentPost.threadDepth = 0;
		parentPost.threadId = 'parent.md';

		(plugin as any).addAllRepliesToThread(parentPost, postMap, threadedPosts, 1, 'parent.md');

		expect(threadedPosts).toHaveLength(3);
		
		// Check order: parent, reply1 (earlier), reply2 (later)
		expect(threadedPosts[0].file.name).toBe('parent.md');
		expect(threadedPosts[1].file.name).toBe('reply1.md');
		expect(threadedPosts[2].file.name).toBe('reply2.md');
		
		// Check thread properties
		expect(threadedPosts[1].threadDepth).toBe(1);
		expect(threadedPosts[2].threadDepth).toBe(1);
		expect(threadedPosts[1].threadId).toBe('parent.md');
		expect(threadedPosts[2].threadId).toBe('parent.md');
	});

	it('should recursively add nested replies with correct depths', () => {
		const posts = [
			generateTestPost({ 
				filename: 'root.md', 
				type: 'post',
				created: '2023-01-01T00:00:00Z'
			}),
			generateTestPost({ 
				filename: 'level1.md', 
				type: 'reply', 
				replyTo: 'root.md',
				created: '2023-01-01T01:00:00Z'
			}),
			generateTestPost({ 
				filename: 'level2.md', 
				type: 'reply', 
				replyTo: 'level1.md',
				created: '2023-01-01T02:00:00Z'
			}),
			generateTestPost({ 
				filename: 'level3.md', 
				type: 'reply', 
				replyTo: 'level2.md',
				created: '2023-01-01T03:00:00Z'
			})
		];

		const postMap = new Map<string, MicroblogPost>();
		posts.forEach(post => postMap.set(post.file.name, post));
		
		const rootPost = posts[0];
		const threadedPosts: MicroblogPost[] = [rootPost];
		rootPost.threadDepth = 0;
		rootPost.threadId = 'root.md';

		(plugin as any).addAllRepliesToThread(rootPost, postMap, threadedPosts, 1, 'root.md');

		expect(threadedPosts).toHaveLength(4);
		
		// Check the complete threaded order
		expect(threadedPosts[0].file.name).toBe('root.md');
		expect(threadedPosts[0].threadDepth).toBe(0);
		
		expect(threadedPosts[1].file.name).toBe('level1.md');
		expect(threadedPosts[1].threadDepth).toBe(1);
		
		expect(threadedPosts[2].file.name).toBe('level2.md');
		expect(threadedPosts[2].threadDepth).toBe(2);
		
		expect(threadedPosts[3].file.name).toBe('level3.md');
		expect(threadedPosts[3].threadDepth).toBe(3);
		
		// All should have the same threadId
		threadedPosts.forEach(post => {
			expect(post.threadId).toBe('root.md');
		});
	});

	it('should handle branching threads with correct depth-first order', () => {
		const posts = [
			generateTestPost({ 
				filename: 'root.md', 
				type: 'post',
				created: '2023-01-01T00:00:00Z'
			}),
			generateTestPost({ 
				filename: 'branch1.md', 
				type: 'reply', 
				replyTo: 'root.md',
				created: '2023-01-01T01:00:00Z'
			}),
			generateTestPost({ 
				filename: 'branch2.md', 
				type: 'reply', 
				replyTo: 'root.md',
				created: '2023-01-01T03:00:00Z'
			}),
			generateTestPost({ 
				filename: 'leaf1.md', 
				type: 'reply', 
				replyTo: 'branch1.md',
				created: '2023-01-01T02:00:00Z'
			}),
			generateTestPost({ 
				filename: 'leaf2.md', 
				type: 'reply', 
				replyTo: 'branch2.md',
				created: '2023-01-01T04:00:00Z'
			})
		];

		const postMap = new Map<string, MicroblogPost>();
		posts.forEach(post => postMap.set(post.file.name, post));
		
		const rootPost = posts[0];
		const threadedPosts: MicroblogPost[] = [rootPost];
		rootPost.threadDepth = 0;
		rootPost.threadId = 'root.md';

		(plugin as any).addAllRepliesToThread(rootPost, postMap, threadedPosts, 1, 'root.md');

		expect(threadedPosts).toHaveLength(5);
		
		// Check depth-first traversal order: root -> branch1 -> leaf1 -> branch2 -> leaf2
		expect(threadedPosts[0].file.name).toBe('root.md');
		expect(threadedPosts[0].threadDepth).toBe(0);
		
		expect(threadedPosts[1].file.name).toBe('branch1.md');
		expect(threadedPosts[1].threadDepth).toBe(1);
		
		expect(threadedPosts[2].file.name).toBe('leaf1.md');
		expect(threadedPosts[2].threadDepth).toBe(2);
		
		expect(threadedPosts[3].file.name).toBe('branch2.md');
		expect(threadedPosts[3].threadDepth).toBe(1);
		
		expect(threadedPosts[4].file.name).toBe('leaf2.md');
		expect(threadedPosts[4].threadDepth).toBe(2);
	});

	it('should handle posts with no replies gracefully', () => {
		const parentPost = generateTestPost({ 
			filename: 'lonely.md', 
			type: 'post' 
		});
		
		const postMap = new Map<string, MicroblogPost>();
		postMap.set('lonely.md', parentPost);
		
		const threadedPosts: MicroblogPost[] = [parentPost];
		parentPost.threadDepth = 0;
		parentPost.threadId = 'lonely.md';

		(plugin as any).addAllRepliesToThread(parentPost, postMap, threadedPosts, 1, 'lonely.md');

		// Should remain unchanged - only the original post
		expect(threadedPosts).toHaveLength(1);
		expect(threadedPosts[0].file.name).toBe('lonely.md');
	});

	it('should assign correct threadId to all nested replies', () => {
		const posts = [
			generateTestPost({ 
				filename: 'thread-root.md', 
				type: 'post' 
			}),
			generateTestPost({ 
				filename: 'reply1.md', 
				type: 'reply', 
				replyTo: 'thread-root.md' 
			}),
			generateTestPost({ 
				filename: 'reply2.md', 
				type: 'reply', 
				replyTo: 'reply1.md' 
			})
		];

		const postMap = new Map<string, MicroblogPost>();
		posts.forEach(post => postMap.set(post.file.name, post));
		
		const rootPost = posts[0];
		const threadedPosts: MicroblogPost[] = [rootPost];
		rootPost.threadDepth = 0;
		rootPost.threadId = 'thread-root.md';

		(plugin as any).addAllRepliesToThread(rootPost, postMap, threadedPosts, 1, 'thread-root.md');

		// All posts should have the same threadId
		threadedPosts.forEach(post => {
			expect(post.threadId).toBe('thread-root.md');
		});
	});

	it('should handle complex multi-level branching correctly', () => {
		const posts = [
			generateTestPost({ 
				filename: 'root.md', 
				type: 'post',
				created: '2023-01-01T00:00:00Z'
			}),
			// First branch
			generateTestPost({ 
				filename: 'branch1.md', 
				type: 'reply', 
				replyTo: 'root.md',
				created: '2023-01-01T01:00:00Z'
			}),
			generateTestPost({ 
				filename: 'branch1-sub1.md', 
				type: 'reply', 
				replyTo: 'branch1.md',
				created: '2023-01-01T02:00:00Z'
			}),
			generateTestPost({ 
				filename: 'branch1-sub2.md', 
				type: 'reply', 
				replyTo: 'branch1.md',
				created: '2023-01-01T03:00:00Z'
			}),
			// Second branch
			generateTestPost({ 
				filename: 'branch2.md', 
				type: 'reply', 
				replyTo: 'root.md',
				created: '2023-01-01T04:00:00Z'
			}),
			generateTestPost({ 
				filename: 'branch2-sub1.md', 
				type: 'reply', 
				replyTo: 'branch2.md',
				created: '2023-01-01T05:00:00Z'
			})
		];

		const postMap = new Map<string, MicroblogPost>();
		posts.forEach(post => postMap.set(post.file.name, post));
		
		const rootPost = posts[0];
		const threadedPosts: MicroblogPost[] = [rootPost];
		rootPost.threadDepth = 0;
		rootPost.threadId = 'root.md';

		(plugin as any).addAllRepliesToThread(rootPost, postMap, threadedPosts, 1, 'root.md');

		expect(threadedPosts).toHaveLength(6);
		
		// Expected order: root -> branch1 -> branch1-sub1 -> branch1-sub2 -> branch2 -> branch2-sub1
		const expectedOrder = [
			{ name: 'root.md', depth: 0 },
			{ name: 'branch1.md', depth: 1 },
			{ name: 'branch1-sub1.md', depth: 2 },
			{ name: 'branch1-sub2.md', depth: 2 },
			{ name: 'branch2.md', depth: 1 },
			{ name: 'branch2-sub1.md', depth: 2 }
		];
		
		expectedOrder.forEach((expected, index) => {
			expect(threadedPosts[index].file.name).toBe(expected.name);
			expect(threadedPosts[index].threadDepth).toBe(expected.depth);
		});
	});

	it('should maintain chronological order within each level', () => {
		const posts = [
			generateTestPost({ 
				filename: 'root.md', 
				type: 'post',
				created: '2023-01-01T00:00:00Z'
			}),
			// Replies added out of chronological order
			generateTestPost({ 
				filename: 'reply3.md', 
				type: 'reply', 
				replyTo: 'root.md',
				created: '2023-01-01T03:00:00Z'
			}),
			generateTestPost({ 
				filename: 'reply1.md', 
				type: 'reply', 
				replyTo: 'root.md',
				created: '2023-01-01T01:00:00Z'
			}),
			generateTestPost({ 
				filename: 'reply2.md', 
				type: 'reply', 
				replyTo: 'root.md',
				created: '2023-01-01T02:00:00Z'
			})
		];

		const postMap = new Map<string, MicroblogPost>();
		posts.forEach(post => postMap.set(post.file.name, post));
		
		const rootPost = posts[0];
		const threadedPosts: MicroblogPost[] = [rootPost];
		rootPost.threadDepth = 0;
		rootPost.threadId = 'root.md';

		(plugin as any).addAllRepliesToThread(rootPost, postMap, threadedPosts, 1, 'root.md');

		// Should be ordered chronologically: reply1, reply2, reply3
		expect(threadedPosts[1].file.name).toBe('reply1.md');
		expect(threadedPosts[2].file.name).toBe('reply2.md');
		expect(threadedPosts[3].file.name).toBe('reply3.md');
	});

	it('should not modify posts that are not replies to the parent', () => {
		const posts = [
			generateTestPost({ 
				filename: 'parent.md', 
				type: 'post' 
			}),
			generateTestPost({ 
				filename: 'unrelated.md', 
				type: 'reply', 
				replyTo: 'different-parent.md' 
			}),
			generateTestPost({ 
				filename: 'child.md', 
				type: 'reply', 
				replyTo: 'parent.md' 
			})
		];

		const postMap = new Map<string, MicroblogPost>();
		posts.forEach(post => postMap.set(post.file.name, post));
		
		const parentPost = posts[0];
		const threadedPosts: MicroblogPost[] = [parentPost];
		parentPost.threadDepth = 0;
		parentPost.threadId = 'parent.md';

		(plugin as any).addAllRepliesToThread(parentPost, postMap, threadedPosts, 1, 'parent.md');

		// Should only include parent and its direct child, not the unrelated post
		expect(threadedPosts).toHaveLength(2);
		expect(threadedPosts[0].file.name).toBe('parent.md');
		expect(threadedPosts[1].file.name).toBe('child.md');
		
		// Unrelated post should not have threadId or depth modified
		const unrelatedPost = postMap.get('unrelated.md');
		expect(unrelatedPost?.threadId).toBeUndefined();
		expect(unrelatedPost?.threadDepth).toBeUndefined();
	});
});