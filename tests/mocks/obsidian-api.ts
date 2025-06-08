import { vi } from 'vitest';

// Mock Obsidian API types and interfaces
export interface TFile {
  name: string;
  path: string;
  basename: string;
  extension: string;
  stat: {
    ctime: number;
    mtime: number;
    size: number;
  };
  vault: any;
  parent: any;
}

export interface CachedMetadata {
  frontmatter?: Record<string, any>;
  sections: any[];
  headings: any[];
  links: any[];
  embeds: any[];
  tags: any[];
  blocks?: Record<string, any>;
}

export class Plugin {
  app: any;
  manifest: any;
  constructor(app: any, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }
  
  async onload() {}
  onunload() {}
  async loadData() { return {}; }
  async saveData(data: any) {}
  addRibbonIcon(icon: string, title: string, callback: () => void) {}
  addCommand(command: any) {}
  addSettingTab(tab: any) {}
}

export class Modal {
  app: any;
  constructor(app: any) {
    this.app = app;
  }
  
  open() {}
  close() {}
  onOpen() {}
  onClose() {}
}

export class PluginSettingTab {
  app: any;
  plugin: any;
  constructor(app: any, plugin: any) {
    this.app = app;
    this.plugin = plugin;
  }
  
  display() {}
}

export class Notice {
  constructor(message: string) {}
}

export class Setting {
  constructor(containerEl: any) {}
  setName(name: string) { return this; }
  setDesc(desc: string) { return this; }
  addText(callback: (text: any) => void) { return this; }
}

// Mock interfaces that aren't classes
export interface App {
  vault: any;
  workspace: any;
  metadataCache: any;
}

export interface Editor {}
export interface MarkdownView {}

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
export function createMockCachedMetadata(frontmatter?: Record<string, any>): CachedMetadata {
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
 * Mock Obsidian App implementation for testing
 */
export function createMockApp(): App {
  return {
    vault: {
      getMarkdownFiles: vi.fn().mockReturnValue([]),
      cachedRead: vi.fn().mockResolvedValue(''),
      create: vi.fn().mockResolvedValue(undefined),
      createFolder: vi.fn().mockResolvedValue(undefined),
      getAbstractFileByPath: vi.fn().mockReturnValue(null)
    },
    workspace: {
      getActiveFile: vi.fn().mockReturnValue(null),
      getLeaf: vi.fn().mockReturnValue({
        openFile: vi.fn().mockResolvedValue(undefined)
      })
    },
    metadataCache: {
      getFileCache: vi.fn().mockReturnValue(null)
    }
  } as App;
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