import { describe, it, expect, beforeEach } from 'vitest';
import LocalMicroblogPlugin, { MicroblogPost } from '../../main.ts';
import { createMockApp } from '../mocks/obsidian-api';
import { generateTestPost } from '../fixtures/test-data';

describe('organizeCompleteThreads() - Post View Threading', () => {
	let plugin: LocalMicroblogPlugin;
	let mockApp: any;

	beforeEach(() => {
		mockApp = createMockApp();
		plugin = new LocalMicroblogPlugin(mockApp, {} as any);
	});

	it('should organize standalone posts as top-level with threadDepth 0', () => {
		const posts: MicroblogPost[] = [
			generateTestPost({ filename: 'post1.md', type: 'post' }),
			generateTestPost({ filename: 'post2.md', type: 'post' })
		];

		const result = (plugin as any).organizeCompleteThreads(posts);

		expect(result).toHaveLength(2);
		
		const post1 = result.find(p => p.file.name === 'post1.md');
		const post2 = result.find(p => p.file.name === 'post2.md');
		
		expect(post1?.threadDepth).toBe(0);
		expect(post2?.threadDepth).toBe(0);
		expect(post1?.threadId).toBe('post1.md');
		expect(post2?.threadId).toBe('post2.md');
	});

	it('should organize simple reply threads with correct depth and order', () => {
		const posts: MicroblogPost[] = [
			generateTestPost({ 
				filename: 'parent.md', 
				type: 'post',
				created: '2023-01-01T00:00:00Z'
			}),
			generateTestPost({ 
				filename: 'reply.md', 
				type: 'reply', 
				replyTo: 'parent.md',
				created: '2023-01-01T01:00:00Z'
			})
		];

		const result = (plugin as any).organizeCompleteThreads(posts);

		expect(result).toHaveLength(2);
		
		// Posts should be in thread order: parent first, then reply
		expect(result[0].file.name).toBe('parent.md');
		expect(result[1].file.name).toBe('reply.md');
		
		// Check thread properties
		expect(result[0].threadDepth).toBe(0);
		expect(result[1].threadDepth).toBe(1);
		expect(result[0].threadId).toBe('parent.md');
		expect(result[1].threadId).toBe('parent.md');
	});

	it('should organize complex nested threads with correct depths', () => {
		const posts: MicroblogPost[] = [
			generateTestPost({ 
				filename: 'root.md', 
				type: 'post',
				created: '2023-01-01T00:00:00Z'
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
				replyTo: 'reply1.md',
				created: '2023-01-01T02:00:00Z'
			}),
			generateTestPost({ 
				filename: 'reply3.md', 
				type: 'reply', 
				replyTo: 'reply2.md',
				created: '2023-01-01T03:00:00Z'
			})
		];

		const result = (plugin as any).organizeCompleteThreads(posts);

		expect(result).toHaveLength(4);
		
		// Check thread order and depths
		expect(result[0].file.name).toBe('root.md');
		expect(result[0].threadDepth).toBe(0);
		
		expect(result[1].file.name).toBe('reply1.md');
		expect(result[1].threadDepth).toBe(1);
		
		expect(result[2].file.name).toBe('reply2.md');
		expect(result[2].threadDepth).toBe(2);
		
		expect(result[3].file.name).toBe('reply3.md');
		expect(result[3].threadDepth).toBe(3);
		
		// All should share the same threadId
		expect(result[0].threadId).toBe('root.md');
		expect(result[1].threadId).toBe('root.md');
		expect(result[2].threadId).toBe('root.md');
		expect(result[3].threadId).toBe('root.md');
	});

	it('should organize branching threads with correct depth and chronological order', () => {
		const posts: MicroblogPost[] = [
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
				created: '2023-01-01T02:00:00Z'
			}),
			generateTestPost({ 
				filename: 'leaf1.md', 
				type: 'reply', 
				replyTo: 'branch1.md',
				created: '2023-01-01T03:00:00Z'
			}),
			generateTestPost({ 
				filename: 'leaf2.md', 
				type: 'reply', 
				replyTo: 'branch2.md',
				created: '2023-01-01T04:00:00Z'
			})
		];

		const result = (plugin as any).organizeCompleteThreads(posts);

		expect(result).toHaveLength(5);
		
		// Check the order: root, branch1, leaf1, branch2, leaf2
		expect(result[0].file.name).toBe('root.md');
		expect(result[0].threadDepth).toBe(0);
		
		expect(result[1].file.name).toBe('branch1.md');
		expect(result[1].threadDepth).toBe(1);
		
		expect(result[2].file.name).toBe('leaf1.md');
		expect(result[2].threadDepth).toBe(2);
		
		expect(result[3].file.name).toBe('branch2.md');
		expect(result[3].threadDepth).toBe(1);
		
		expect(result[4].file.name).toBe('leaf2.md');
		expect(result[4].threadDepth).toBe(2);
		
		// All should share the same threadId
		result.forEach(post => {
			expect(post.threadId).toBe('root.md');
		});
	});

	it('should handle multiple separate threads correctly', () => {
		const posts: MicroblogPost[] = [
			// Thread 1
			generateTestPost({ 
				filename: 'thread1.md', 
				type: 'post',
				created: '2023-01-01T00:00:00Z'
			}),
			generateTestPost({ 
				filename: 'thread1-reply.md', 
				type: 'reply', 
				replyTo: 'thread1.md',
				created: '2023-01-01T01:00:00Z'
			}),
			// Thread 2
			generateTestPost({ 
				filename: 'thread2.md', 
				type: 'post',
				created: '2023-01-01T02:00:00Z'
			}),
			generateTestPost({ 
				filename: 'thread2-reply.md', 
				type: 'reply', 
				replyTo: 'thread2.md',
				created: '2023-01-01T03:00:00Z'
			})
		];

		const result = (plugin as any).organizeCompleteThreads(posts);

		expect(result).toHaveLength(4);
		
		// Find thread 1 posts
		const thread1Posts = result.filter(p => p.threadId === 'thread1.md');
		expect(thread1Posts).toHaveLength(2);
		expect(thread1Posts[0].file.name).toBe('thread1.md');
		expect(thread1Posts[1].file.name).toBe('thread1-reply.md');
		
		// Find thread 2 posts
		const thread2Posts = result.filter(p => p.threadId === 'thread2.md');
		expect(thread2Posts).toHaveLength(2);
		expect(thread2Posts[0].file.name).toBe('thread2.md');
		expect(thread2Posts[1].file.name).toBe('thread2-reply.md');
	});

	it('should detect and promote self-referencing posts', () => {
		const posts: MicroblogPost[] = [
			generateTestPost({ 
				filename: 'self-ref.md', 
				type: 'reply', 
				replyTo: 'self-ref.md' 
			})
		];

		const result = (plugin as any).organizeCompleteThreads(posts);

		const post = result.find(p => p.file.name === 'self-ref.md');
		expect(post?.replyTo).toBeUndefined();
		expect(post?.hasErrors).toBe(true);
		expect(post?.threadDepth).toBe(0);
		expect(post?.threadId).toBe('self-ref.md');
	});

	it('should detect and promote circular references', () => {
		const posts: MicroblogPost[] = [
			generateTestPost({ 
				filename: 'post1.md', 
				type: 'reply', 
				replyTo: 'post2.md' 
			}),
			generateTestPost({ 
				filename: 'post2.md', 
				type: 'reply', 
				replyTo: 'post3.md' 
			}),
			generateTestPost({ 
				filename: 'post3.md', 
				type: 'reply', 
				replyTo: 'post1.md' 
			})
		];

		const result = (plugin as any).organizeCompleteThreads(posts);

		// At least one post should be detected and promoted to top-level
		const errorPosts = result.filter(p => p.hasErrors && p.threadDepth === 0);
		expect(errorPosts.length).toBeGreaterThan(0);
		
		// Error posts should have their replyTo cleared
		errorPosts.forEach(post => {
			expect(post.replyTo).toBeUndefined();
		});
	});

	it('should detect and promote orphaned replies', () => {
		const posts: MicroblogPost[] = [
			generateTestPost({ 
				filename: 'orphan.md', 
				type: 'reply', 
				replyTo: 'nonexistent.md' 
			})
		];

		const result = (plugin as any).organizeCompleteThreads(posts);

		const orphan = result.find(p => p.file.name === 'orphan.md');
		expect(orphan?.replyTo).toBeUndefined();
		expect(orphan?.hasErrors).toBe(true);
		expect(orphan?.threadDepth).toBe(0);
		expect(orphan?.threadId).toBe('orphan.md');
	});

	it('should build complete reply metadata correctly', () => {
		const posts: MicroblogPost[] = [
			generateTestPost({ 
				filename: 'parent.md', 
				type: 'post',
				created: '2023-01-01T00:00:00Z'
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

		const result = (plugin as any).organizeCompleteThreads(posts);

		const parent = result.find(p => p.file.name === 'parent.md');
		
		expect(parent?.replyCount).toBe(2);
		expect(parent?.directReplies).toHaveLength(2);
		expect(parent?.directReplies?.[0].file.name).toBe('reply1.md');
		expect(parent?.directReplies?.[1].file.name).toBe('reply2.md');
		
		// Direct replies should be sorted chronologically
		const reply1Time = new Date(parent?.directReplies?.[0].created || 0).getTime();
		const reply2Time = new Date(parent?.directReplies?.[1].created || 0).getTime();
		expect(reply1Time).toBeLessThan(reply2Time);
	});

	it('should sort replies chronologically within each level', () => {
		const posts: MicroblogPost[] = [
			generateTestPost({ 
				filename: 'root.md', 
				type: 'post',
				created: '2023-01-01T00:00:00Z'
			}),
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

		const result = (plugin as any).organizeCompleteThreads(posts);

		// Check chronological order in the threaded result
		expect(result[1].file.name).toBe('reply1.md'); // First reply chronologically
		expect(result[2].file.name).toBe('reply2.md'); // Second reply chronologically  
		expect(result[3].file.name).toBe('reply3.md'); // Third reply chronologically
	});

	it('should handle empty posts array', () => {
		const posts: MicroblogPost[] = [];

		const result = (plugin as any).organizeCompleteThreads(posts);

		expect(result).toEqual([]);
	});

	it('should preserve post properties during threading', () => {
		const posts: MicroblogPost[] = [
			generateTestPost({ 
				filename: 'parent.md', 
				type: 'post',
				content: '# Parent content',
				created: '2023-01-01T00:00:00Z'
			}),
			generateTestPost({ 
				filename: 'reply.md', 
				type: 'reply', 
				replyTo: 'parent.md',
				content: '# Reply content',
				created: '2023-01-01T01:00:00Z'
			})
		];

		const result = (plugin as any).organizeCompleteThreads(posts);

		const parent = result.find(p => p.file.name === 'parent.md');
		const reply = result.find(p => p.file.name === 'reply.md');
		
		expect(parent?.content).toBe('# Parent content');
		expect(parent?.type).toBe('post');
		expect(reply?.content).toBe('# Reply content');
		expect(reply?.type).toBe('reply');
		expect(reply?.replyTo).toBe('parent.md');
	});
});