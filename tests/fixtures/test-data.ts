import { createMockTFile, createMockCachedMetadata } from '../mocks/obsidian-api';
import type { MicroblogPost } from '../../main.ts';

/**
 * Test data generators for microblog posts
 */

/**
 * Generate a test MicroblogPost with the given options
 */
export function generateTestPost(options: {
  filename: string;
  type?: 'post' | 'reply' | 'quote';
  created?: string;
  replyTo?: string;
  quoteTo?: string;
  content?: string;
}): MicroblogPost {
  const {
    filename,
    type = 'post',
    created = new Date('2024-01-01T10:00:00.000Z').toISOString(),
    replyTo,
    quoteTo,
    content = '# Test content'
  } = options;

  const file = createMockTFile(filename);

  return {
    file,
    created,
    type,
    replyTo,
    quoteTo,
    content
  };
}

export function createTestPost(options: {
  filename: string;
  content: string;
  created?: string;
  type?: 'post' | 'reply' | 'quote';
  replyTo?: string;
  quoteTo?: string;
}): { file: any, metadata: any, content: string } {
  const {
    filename,
    content,
    created = new Date('2024-01-01T10:00:00.000Z').toISOString(),
    type = 'post',
    replyTo,
    quoteTo
  } = options;

  const frontmatter: Record<string, any> = {
    lm_type: 'microblog',
    lm_created: created
  };

  if (replyTo) frontmatter.lm_reply = replyTo;
  if (quoteTo) frontmatter.lm_quote = quoteTo;

  const file = createMockTFile(filename);
  const metadata = createMockCachedMetadata(frontmatter);

  return { file, metadata, content };
}

export function createSimpleThreadData(): { posts: any[], fileContents: Map<string, string> } {
  const posts = [];
  const fileContents = new Map<string, string>();

  // Create a simple thread: post1 -> reply1 -> reply2
  const post1 = createTestPost({
    filename: 'post1.md',
    content: '# Original post content',
    created: '2024-01-01T10:00:00.000Z'
  });
  
  const reply1 = createTestPost({
    filename: 'reply1.md',
    content: '# First reply content',
    created: '2024-01-01T11:00:00.000Z',
    type: 'reply',
    replyTo: 'post1.md'
  });

  const reply2 = createTestPost({
    filename: 'reply2.md',
    content: '# Second reply content',
    created: '2024-01-01T12:00:00.000Z',
    type: 'reply',
    replyTo: 'reply1.md'
  });

  posts.push(post1, reply1, reply2);
  fileContents.set('post1.md', createFullMarkdownContent(post1));
  fileContents.set('reply1.md', createFullMarkdownContent(reply1));
  fileContents.set('reply2.md', createFullMarkdownContent(reply2));

  return { posts, fileContents };
}

export function createCircularReferenceData(): { posts: any[], fileContents: Map<string, string> } {
  const posts = [];
  const fileContents = new Map<string, string>();

  // Create circular reference: post1 -> reply1 -> reply2 -> post1
  const post1 = createTestPost({
    filename: 'post1.md',
    content: '# Original post content',
    created: '2024-01-01T10:00:00.000Z',
    type: 'reply',
    replyTo: 'reply2.md' // This creates the circular reference
  });
  
  const reply1 = createTestPost({
    filename: 'reply1.md',
    content: '# First reply content',
    created: '2024-01-01T11:00:00.000Z',
    type: 'reply',
    replyTo: 'post1.md'
  });

  const reply2 = createTestPost({
    filename: 'reply2.md',
    content: '# Second reply content',
    created: '2024-01-01T12:00:00.000Z',
    type: 'reply',
    replyTo: 'reply1.md'
  });

  posts.push(post1, reply1, reply2);
  fileContents.set('post1.md', createFullMarkdownContent(post1));
  fileContents.set('reply1.md', createFullMarkdownContent(reply1));
  fileContents.set('reply2.md', createFullMarkdownContent(reply2));

  return { posts, fileContents };
}

export function createOrphanedReplyData(): { posts: any[], fileContents: Map<string, string> } {
  const posts = [];
  const fileContents = new Map<string, string>();

  // Create orphaned reply (parent doesn't exist)
  const orphanedReply = createTestPost({
    filename: 'orphaned.md',
    content: '# Orphaned reply content',
    created: '2024-01-01T10:00:00.000Z',
    type: 'reply',
    replyTo: 'nonexistent.md' // Parent doesn't exist
  });

  posts.push(orphanedReply);
  fileContents.set('orphaned.md', createFullMarkdownContent(orphanedReply));

  return { posts, fileContents };
}

export function createComplexThreadData(): { posts: any[], fileContents: Map<string, string> } {
  const posts = [];
  const fileContents = new Map<string, string>();

  // Create complex thread structure
  const rootPost = createTestPost({
    filename: 'root.md',
    content: '# Root post with multiple replies',
    created: '2024-01-01T10:00:00.000Z'
  });

  const reply1 = createTestPost({
    filename: 'reply1.md',
    content: '# First reply to root',
    created: '2024-01-01T11:00:00.000Z',
    type: 'reply',
    replyTo: 'root.md'
  });

  const reply2 = createTestPost({
    filename: 'reply2.md',
    content: '# Second reply to root',
    created: '2024-01-01T12:00:00.000Z',
    type: 'reply',
    replyTo: 'root.md'
  });

  const nestedReply = createTestPost({
    filename: 'nested.md',
    content: '# Nested reply to first reply',
    created: '2024-01-01T13:00:00.000Z',
    type: 'reply',
    replyTo: 'reply1.md'
  });

  posts.push(rootPost, reply1, reply2, nestedReply);
  fileContents.set('root.md', createFullMarkdownContent(rootPost));
  fileContents.set('reply1.md', createFullMarkdownContent(reply1));
  fileContents.set('reply2.md', createFullMarkdownContent(reply2));
  fileContents.set('nested.md', createFullMarkdownContent(nestedReply));

  return { posts, fileContents };
}

/**
 * Helper to create full markdown content from test data
 */
function createFullMarkdownContent(testPost: { metadata: any, content: string }): string {
  const frontmatter = testPost.metadata.frontmatter;
  const fmLines = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? `"${value}"` : value}`)
    .join('\n');

  return `---\n${fmLines}\n---\n\n${testPost.content}\n`;
}