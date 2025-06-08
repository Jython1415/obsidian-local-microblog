import { describe, it, expect, beforeEach, vi } from 'vitest';
import LocalMicroblogPlugin, { MicroblogPost } from '../../main.ts';
import { createMockApp, createMockTFile, createMockCachedMetadata } from '../mocks/obsidian-api';
import { generateTestPost } from '../fixtures/test-data';

describe('getTimelinePosts() - Timeline View Data', () => {
	let plugin: LocalMicroblogPlugin;
	let mockApp: any;

	beforeEach(() => {
		mockApp = createMockApp();
		plugin = new LocalMicroblogPlugin(mockApp, {} as any);
		plugin.settings = { microblogFolder: 'Microblogs' };
	});

	it('should return empty array when no markdown files exist', async () => {
		mockApp.vault.getMarkdownFiles.mockReturnValue([]);
		
		const result = await plugin.getTimelinePosts();
		
		expect(result).toEqual([]);
	});

	it('should filter out non-microblog files', async () => {
		const regularFile = createMockTFile('regular.md');
		const microblogFile = createMockTFile('microblog-123.md');
		
		mockApp.vault.getMarkdownFiles.mockReturnValue([regularFile, microblogFile]);
		
		// Regular file without microblog metadata
		mockApp.metadataCache.getFileCache.mockImplementation((file: any) => {
			if (file.name === 'regular.md') {
				return createMockCachedMetadata({ type: 'note' });
			}
			if (file.name === 'microblog-123.md') {
				return createMockCachedMetadata({ lm_type: 'microblog', lm_created: '2023-01-01T00:00:00Z' });
			}
			return null;
		});

		mockApp.vault.cachedRead.mockResolvedValue('# Test content');
		
		const result = await plugin.getTimelinePosts();
		
		expect(result).toHaveLength(1);
		expect(result[0].file.name).toBe('microblog-123.md');
	});

	it('should correctly identify post types and build reply metadata', async () => {
		const postFile = createMockTFile('post.md');
		const replyFile = createMockTFile('reply.md');
		const quoteFile = createMockTFile('quote.md');
		
		mockApp.vault.getMarkdownFiles.mockReturnValue([postFile, replyFile, quoteFile]);
		
		mockApp.metadataCache.getFileCache.mockImplementation((file: any) => {
			if (file.name === 'post.md') {
				return createMockCachedMetadata({ lm_type: 'microblog', lm_created: '2023-01-01T00:00:00Z' });
			}
			if (file.name === 'reply.md') {
				return createMockCachedMetadata({ 
					lm_type: 'microblog', 
					lm_created: '2023-01-01T01:00:00Z',
					lm_reply: 'post.md'
				});
			}
			if (file.name === 'quote.md') {
				return createMockCachedMetadata({ 
					lm_type: 'microblog', 
					lm_created: '2023-01-01T02:00:00Z',
					lm_quote: 'post.md'
				});
			}
			return null;
		});

		mockApp.vault.cachedRead.mockResolvedValue('# Test content');
		
		const result = await plugin.getTimelinePosts();
		
		// Timeline View shows top-level posts (original post + quote)
		expect(result).toHaveLength(2);
		
		const post = result.find(p => p.file.name === 'post.md');
		const quote = result.find(p => p.file.name === 'quote.md');
		
		expect(post?.type).toBe('post');
		expect(quote?.type).toBe('quote');
		expect(post?.replyCount).toBe(1); // Only reply counts as direct reply to post
		expect(post?.directReplies).toHaveLength(1);
		
		// Verify reply metadata is built correctly
		const replyInMetadata = post?.directReplies?.find(r => r.file.name === 'reply.md');
		expect(replyInMetadata?.type).toBe('reply');
		expect(replyInMetadata?.replyTo).toBe('post.md');
		
		// Quote should be top-level, not a reply
		expect(quote?.replyTo).toBeUndefined();
		expect(quote?.quoteTo).toBe('post.md');
	});

	it('should sort posts by creation date (newest first)', async () => {
		const oldPost = createMockTFile('old.md');
		const newPost = createMockTFile('new.md');
		const middlePost = createMockTFile('middle.md');
		
		mockApp.vault.getMarkdownFiles.mockReturnValue([oldPost, newPost, middlePost]);
		
		mockApp.metadataCache.getFileCache.mockImplementation((file: any) => {
			if (file.name === 'old.md') {
				return createMockCachedMetadata({ lm_type: 'microblog', lm_created: '2023-01-01T00:00:00Z' });
			}
			if (file.name === 'middle.md') {
				return createMockCachedMetadata({ lm_type: 'microblog', lm_created: '2023-01-02T00:00:00Z' });
			}
			if (file.name === 'new.md') {
				return createMockCachedMetadata({ lm_type: 'microblog', lm_created: '2023-01-03T00:00:00Z' });
			}
			return null;
		});

		mockApp.vault.cachedRead.mockResolvedValue('# Test content');
		
		const result = await plugin.getTimelinePosts();
		
		expect(result).toHaveLength(3);
		expect(result[0].file.name).toBe('new.md');
		expect(result[1].file.name).toBe('middle.md');
		expect(result[2].file.name).toBe('old.md');
	});

	it('should handle fallback date sources', async () => {
		const fileWithLmCreated = createMockTFile('lm-created.md');
		const fileWithCreated = createMockTFile('created.md');
		const fileWithCtime = createMockTFile('ctime.md');
		
		fileWithCtime.stat.ctime = 1672531200000; // Jan 1, 2023
		
		mockApp.vault.getMarkdownFiles.mockReturnValue([fileWithLmCreated, fileWithCreated, fileWithCtime]);
		
		mockApp.metadataCache.getFileCache.mockImplementation((file: any) => {
			if (file.name === 'lm-created.md') {
				return createMockCachedMetadata({ 
					lm_type: 'microblog', 
					lm_created: '2023-01-03T00:00:00Z'
				});
			}
			if (file.name === 'created.md') {
				return createMockCachedMetadata({ 
					lm_type: 'microblog', 
					created: '2023-01-02T00:00:00Z'
				});
			}
			if (file.name === 'ctime.md') {
				return createMockCachedMetadata({ lm_type: 'microblog' });
			}
			return null;
		});

		mockApp.vault.cachedRead.mockResolvedValue('# Test content');
		
		const result = await plugin.getTimelinePosts();
		
		expect(result).toHaveLength(3);
		expect(result[0].created).toBe('2023-01-03T00:00:00Z');
		expect(result[1].created).toBe('2023-01-02T00:00:00Z');
		expect(result[2].created).toBe('1672531200000');
	});

	it('should organize posts for Timeline View (top-level only)', async () => {
		const parentPost = createMockTFile('parent.md');
		const replyPost = createMockTFile('reply.md');
		
		mockApp.vault.getMarkdownFiles.mockReturnValue([parentPost, replyPost]);
		
		mockApp.metadataCache.getFileCache.mockImplementation((file: any) => {
			if (file.name === 'parent.md') {
				return createMockCachedMetadata({ 
					lm_type: 'microblog', 
					lm_created: '2023-01-01T00:00:00Z'
				});
			}
			if (file.name === 'reply.md') {
				return createMockCachedMetadata({ 
					lm_type: 'microblog', 
					lm_created: '2023-01-01T01:00:00Z',
					lm_reply: 'parent.md'
				});
			}
			return null;
		});

		mockApp.vault.cachedRead.mockResolvedValue('# Test content');
		
		const result = await plugin.getTimelinePosts();
		
		// Timeline View should only include top-level posts
		expect(result).toHaveLength(1);
		
		const parentInResult = result.find(p => p.file.name === 'parent.md' && !p.replyTo);
		expect(parentInResult).toBeDefined();
		expect(parentInResult?.replyCount).toBe(1);
		expect(parentInResult?.directReplies).toHaveLength(1);
		expect(parentInResult?.directReplies?.[0].file.name).toBe('reply.md');
	});
});