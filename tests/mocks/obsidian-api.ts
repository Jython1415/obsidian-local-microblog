import { TFile, CachedMetadata } from 'obsidian';

/**
 * Mock TFile implementation for testing
 */
export function createMockTFile(name: string, path?: string): TFile {
  const mockFile = {
    name,
    path: path || name,
    basename: name.replace('.md', ''),
    extension: 'md',
    stat: {
      ctime: new Date('2024-01-01').getTime(),
      mtime: new Date('2024-01-01').getTime(),
      size: 1000
    },
    vault: null as any,
    parent: null as any
  } as TFile;

  return mockFile;
}

/**
 * Mock CachedMetadata implementation for testing
 */
export function createMockMetadata(frontmatter?: Record<string, any>): CachedMetadata {
  return {
    frontmatter: frontmatter || {},
    sections: [],
    headings: [],
    links: [],
    embeds: [],
    tags: [],
    blocks: {}
  } as CachedMetadata;
}

/**
 * Mock Obsidian App.vault.cachedRead for testing
 */
export function createMockVaultRead(fileContentMap: Map<string, string>) {
  return {
    cachedRead: async (file: TFile): Promise<string> => {
      const content = fileContentMap.get(file.name);
      if (content === undefined) {
        throw new Error(`File not found: ${file.name}`);
      }
      return content;
    }
  };
}