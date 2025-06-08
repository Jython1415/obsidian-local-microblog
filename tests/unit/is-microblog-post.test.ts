import { describe, it, expect, beforeEach } from 'vitest';
import LocalMicroblogPlugin from '../../main.ts';
import { createMockApp, createMockCachedMetadata } from '../mocks/obsidian-api';

describe('isMicroblogPost()', () => {
	let plugin: LocalMicroblogPlugin;
	let mockApp: any;

	beforeEach(() => {
		mockApp = createMockApp();
		plugin = new LocalMicroblogPlugin(mockApp, {} as any);
	});

	it('should return true for valid microblog posts', () => {
		const metadata = createMockCachedMetadata({ lm_type: 'microblog' });
		
		// Access private method using array notation
		const result = (plugin as any).isMicroblogPost(metadata);
		
		expect(result).toBe(true);
	});

	it('should return false for posts without lm_type', () => {
		const metadata = createMockCachedMetadata({ title: 'Regular Note' });
		
		const result = (plugin as any).isMicroblogPost(metadata);
		
		expect(result).toBe(false);
	});

	it('should return false for posts with wrong lm_type', () => {
		const metadata = createMockCachedMetadata({ lm_type: 'note' });
		
		const result = (plugin as any).isMicroblogPost(metadata);
		
		expect(result).toBe(false);
	});

	it('should return false for posts with empty lm_type', () => {
		const metadata = createMockCachedMetadata({ lm_type: '' });
		
		const result = (plugin as any).isMicroblogPost(metadata);
		
		expect(result).toBe(false);
	});

	it('should return false for null metadata', () => {
		const result = (plugin as any).isMicroblogPost(null);
		
		expect(result).toBe(false);
	});

	it('should return false for undefined metadata', () => {
		const result = (plugin as any).isMicroblogPost(undefined);
		
		expect(result).toBe(false);
	});

	it('should return false for metadata without frontmatter', () => {
		const metadata = {
			sections: [],
			headings: [],
			links: [],
			embeds: [],
			tags: []
		};
		
		const result = (plugin as any).isMicroblogPost(metadata);
		
		expect(result).toBe(false);
	});

	it('should return false for metadata with null frontmatter', () => {
		const metadata = {
			frontmatter: null,
			sections: [],
			headings: [],
			links: [],
			embeds: [],
			tags: []
		};
		
		const result = (plugin as any).isMicroblogPost(metadata);
		
		expect(result).toBe(false);
	});

	it('should be case sensitive for lm_type value', () => {
		const metadataUppercase = createMockCachedMetadata({ lm_type: 'MICROBLOG' });
		const metadataCapitalized = createMockCachedMetadata({ lm_type: 'Microblog' });
		const metadataMixed = createMockCachedMetadata({ lm_type: 'MicroBlog' });
		
		expect((plugin as any).isMicroblogPost(metadataUppercase)).toBe(false);
		expect((plugin as any).isMicroblogPost(metadataCapitalized)).toBe(false);
		expect((plugin as any).isMicroblogPost(metadataMixed)).toBe(false);
	});

	it('should ignore other frontmatter properties', () => {
		const metadata = createMockCachedMetadata({ 
			lm_type: 'microblog',
			title: 'My Post',
			created: '2023-01-01',
			tags: ['test', 'microblog'],
			author: 'Test User'
		});
		
		const result = (plugin as any).isMicroblogPost(metadata);
		
		expect(result).toBe(true);
	});
});