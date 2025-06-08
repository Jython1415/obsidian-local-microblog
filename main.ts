import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, CachedMetadata } from 'obsidian';

interface MicroblogPost {
	file: TFile;
	created: string;
	type: 'post' | 'reply' | 'quote';
	replyTo?: string;
	quoteTo?: string;
	content: string;
	replyCount?: number;
	directReplies?: MicroblogPost[];
	hasErrors?: boolean;
	threadDepth?: number;
	isOverflowIndicator?: boolean;
	hiddenCount?: number;
	threadId?: string;
}

interface LocalMicroblogSettings {
	microblogFolder: string;
}

const DEFAULT_SETTINGS: LocalMicroblogSettings = {
	microblogFolder: 'Microblogs'
}

export default class LocalMicroblogPlugin extends Plugin {
	settings: LocalMicroblogSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('message-circle', 'Local Microblog', () => {
			new MicroblogTimelineModal(this.app, this).open();
		});

		this.addCommand({
			id: 'create-microblog-post',
			name: 'Create microblog post',
			callback: () => {
				this.createMicroblogPost();
			}
		});

		this.addCommand({
			id: 'open-microblog-timeline',
			name: 'Open microblog timeline',
			callback: () => {
				new MicroblogTimelineModal(this.app, this).open();
			}
		});

		this.addCommand({
			id: 'create-reply-to-current',
			name: 'Create reply to current post',
			callback: () => {
				this.createReplyToCurrentPost();
			}
		});

		this.addSettingTab(new LocalMicroblogSettingTab(this.app, this));
	}

	onunload() {

	}

	async createMicroblogPost() {
		const folderPath = this.settings.microblogFolder;
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		
		if (!folder) {
			await this.app.vault.createFolder(folderPath);
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const fileName = `microblog-${timestamp}.md`;
		const filePath = `${folderPath}/${fileName}`;

		const content = `---
lm_type: microblog
lm_created: ${new Date().toISOString()}
---

# 

`;

		await this.app.vault.create(filePath, content);
		const file = this.app.vault.getAbstractFileByPath(filePath) as TFile;
		if (file) {
			await this.app.workspace.getLeaf().openFile(file);
		}
	}

	async createReplyToCurrentPost() {
		const activeFile = this.app.workspace.getActiveFile();
		
		if (!activeFile) {
			new Notice('No active file to reply to');
			return;
		}

		const metadata = this.app.metadataCache.getFileCache(activeFile);
		if (!this.isMicroblogPost(metadata)) {
			new Notice('Current file is not a microblog post');
			return;
		}

		// Chronological constraint: only allow replies to past posts
		const originalPostCreated = metadata?.frontmatter?.lm_created || metadata?.frontmatter?.created || activeFile.stat.ctime;
		const originalPostDate = new Date(originalPostCreated);
		const currentTime = new Date();
		
		if (originalPostDate > currentTime) {
			new Notice('Cannot reply to a post created in the future');
			return;
		}

		const folderPath = this.settings.microblogFolder;
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		
		if (!folder) {
			await this.app.vault.createFolder(folderPath);
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const fileName = `microblog-${timestamp}.md`;
		const filePath = `${folderPath}/${fileName}`;

		const content = `---
lm_type: microblog
lm_reply: "${activeFile.name}"
lm_created: ${new Date().toISOString()}
---

Reply to:

![[${activeFile.name.replace('.md', '')}]]

<!-- microblog-content-start -->
# 

<!-- microblog-content-end -->
`;

		await this.app.vault.create(filePath, content);
		const file = this.app.vault.getAbstractFileByPath(filePath) as TFile;
		if (file) {
			await this.app.workspace.getLeaf().openFile(file);
		}
	}

	async getMicroblogPosts(): Promise<MicroblogPost[]> {
		const files = this.app.vault.getMarkdownFiles();
		const microblogPosts: MicroblogPost[] = [];

		for (const file of files) {
			const metadata = this.app.metadataCache.getFileCache(file);
			if (this.isMicroblogPost(metadata)) {
				const content = await this.app.vault.cachedRead(file);
				const frontmatter = metadata?.frontmatter;
				
				microblogPosts.push({
					file,
					created: frontmatter?.lm_created || frontmatter?.created || file.stat.ctime.toString(),
					type: frontmatter?.lm_reply ? 'reply' : 
						  frontmatter?.lm_quote ? 'quote' : 'post',
					replyTo: frontmatter?.lm_reply,
					quoteTo: frontmatter?.lm_quote,
					content: this.extractContentFromMarkdown(content)
				});
			}
		}

		const sortedPosts = microblogPosts.sort((a, b) => 
			new Date(b.created).getTime() - new Date(a.created).getTime()
		);

		return this.organizeIntoThreads(sortedPosts);
	}

	async getMicroblogPostsWithoutLimits(): Promise<MicroblogPost[]> {
		const files = this.app.vault.getMarkdownFiles();
		const microblogPosts: MicroblogPost[] = [];

		for (const file of files) {
			const metadata = this.app.metadataCache.getFileCache(file);
			if (this.isMicroblogPost(metadata)) {
				const content = await this.app.vault.cachedRead(file);
				const frontmatter = metadata?.frontmatter;
				
				microblogPosts.push({
					file,
					created: frontmatter?.lm_created || frontmatter?.created || file.stat.ctime.toString(),
					type: frontmatter?.lm_reply ? 'reply' : 
						  frontmatter?.lm_quote ? 'quote' : 'post',
					replyTo: frontmatter?.lm_reply,
					quoteTo: frontmatter?.lm_quote,
					content: this.extractContentFromMarkdown(content)
				});
			}
		}

		const sortedPosts = microblogPosts.sort((a, b) => 
			new Date(b.created).getTime() - new Date(a.created).getTime()
		);

		return this.organizeIntoThreadsWithoutLimits(sortedPosts);
	}

	private organizeIntoThreads(posts: MicroblogPost[]): MicroblogPost[] {
		const postMap = new Map<string, MicroblogPost>();
		const threadedPosts: MicroblogPost[] = [];
		const processedPosts = new Set<string>();
		
		// First pass: build post map and detect orphaned/problematic posts
		const problematicPosts: MicroblogPost[] = [];
		for (const post of posts) {
			postMap.set(post.file.name, post);
			
			// Check for circular references and self-replies
			if (post.replyTo === post.file.name) {
				// Self-reply: treat as top-level post
				post.replyTo = undefined;
				post.hasErrors = true;
			} else if (post.replyTo && this.detectCircularReference(post, posts)) {
				// Circular reference: promote to top-level
				post.replyTo = undefined;
				post.hasErrors = true;
				problematicPosts.push(post);
			}
		}
		
		// Second pass: check for orphaned replies and build reply tree
		for (const post of posts) {
			if (post.replyTo && !postMap.has(post.replyTo)) {
				// Orphaned reply: promote to top-level
				post.replyTo = undefined;
				post.hasErrors = true;
				problematicPosts.push(post);
			}
		}
		
		// Third pass: build complete reply tree structure
		for (const post of posts) {
			post.directReplies = [];
			post.replyCount = 0;
		}
		
		for (const post of posts) {
			if (post.replyTo && postMap.has(post.replyTo)) {
				const parent = postMap.get(post.replyTo)!;
				parent.directReplies!.push(post);
			}
		}
		
		// Sort direct replies chronologically and calculate reply counts
		for (const post of posts) {
			if (post.directReplies) {
				post.directReplies.sort((a, b) => 
					new Date(a.created).getTime() - new Date(b.created).getTime()
				);
				post.replyCount = post.directReplies.length;
			}
		}
		
		// Fourth pass: collect top-level posts (including error-promoted ones)
		for (const post of posts) {
			if (!post.replyTo) {
				const threadId = post.file.name;
				post.threadDepth = 0;
				post.threadId = threadId;
				threadedPosts.push(post);
				this.addRepliesToThreadWithLimits(post, postMap, threadedPosts, 1, threadId);
			}
		}
		
		return threadedPosts;
	}
	
	private addRepliesToThreadWithLimits(parentPost: MicroblogPost, postMap: Map<string, MicroblogPost>, threadedPosts: MicroblogPost[], depth: number, threadId: string) {
		const allReplies = this.getAllRepliesInChain(parentPost, postMap);
		
		if (allReplies.length === 0) return;
		
		const maxVisibleDepth = 3;
		
		if (allReplies.length <= maxVisibleDepth) {
			// Show all replies normally
			for (const reply of allReplies) {
				reply.threadDepth = depth + allReplies.indexOf(reply);
				reply.threadId = threadId;
				threadedPosts.push(reply);
			}
		} else {
			// Show first reply, overflow indicator, then last 2 replies
			const firstReply = allReplies[0];
			const lastTwoReplies = allReplies.slice(-2);
			const hiddenCount = allReplies.length - 3;
			
			// Add first reply
			firstReply.threadDepth = depth;
			firstReply.threadId = threadId;
			threadedPosts.push(firstReply);
			
			// Add overflow indicator
			const overflowIndicator: MicroblogPost = {
				file: parentPost.file, // Dummy file reference
				created: '',
				type: 'post',
				content: '',
				threadDepth: depth + 1,
				isOverflowIndicator: true,
				hiddenCount: hiddenCount,
				threadId: threadId
			};
			threadedPosts.push(overflowIndicator);
			
			// Add last two replies
			lastTwoReplies.forEach((reply, index) => {
				reply.threadDepth = depth + 2 + index;
				reply.threadId = threadId;
				threadedPosts.push(reply);
			});
		}
	}
	
	private getAllRepliesInChain(parentPost: MicroblogPost, postMap: Map<string, MicroblogPost>): MicroblogPost[] {
		// This method is now deprecated in favor of the directReplies structure
		// but keeping for backward compatibility during transition
		if (parentPost.directReplies && parentPost.directReplies.length > 0) {
			// Return only the first reply chain for legacy overflow logic
			const chain: MicroblogPost[] = [];
			let currentPost = parentPost.directReplies[0];
			
			while (currentPost) {
				chain.push(currentPost);
				if (currentPost.directReplies && currentPost.directReplies.length > 0) {
					currentPost = currentPost.directReplies[0];
				} else {
					break;
				}
			}
			
			return chain;
		}
		
		return [];
	}

	private detectCircularReference(post: MicroblogPost, allPosts: MicroblogPost[]): boolean {
		const visited = new Set<string>();
		let currentPostName = post.replyTo;
		
		while (currentPostName) {
			if (visited.has(currentPostName)) {
				return true; // Circular reference detected
			}
			
			if (currentPostName === post.file.name) {
				return true; // Self-reference detected
			}
			
			visited.add(currentPostName);
			
			// Find the parent post
			const parentPost = allPosts.find(p => p.file.name === currentPostName);
			if (!parentPost) {
				break; // Parent not found, chain ends
			}
			
			currentPostName = parentPost.replyTo;
		}
		
		return false;
	}

	private organizeIntoThreadsWithoutLimits(posts: MicroblogPost[]): MicroblogPost[] {
		const postMap = new Map<string, MicroblogPost>();
		const threadedPosts: MicroblogPost[] = [];
		
		// First pass: build post map and detect orphaned/problematic posts
		const problematicPosts: MicroblogPost[] = [];
		for (const post of posts) {
			postMap.set(post.file.name, post);
			
			// Check for circular references and self-replies
			if (post.replyTo === post.file.name) {
				// Self-reply: treat as top-level post
				post.replyTo = undefined;
				post.hasErrors = true;
			} else if (post.replyTo && this.detectCircularReference(post, posts)) {
				// Circular reference: promote to top-level
				post.replyTo = undefined;
				post.hasErrors = true;
				problematicPosts.push(post);
			}
		}
		
		// Second pass: check for orphaned replies and build reply tree
		for (const post of posts) {
			if (post.replyTo && !postMap.has(post.replyTo)) {
				// Orphaned reply: promote to top-level
				post.replyTo = undefined;
				post.hasErrors = true;
				problematicPosts.push(post);
			}
		}
		
		// Third pass: build complete reply tree structure
		for (const post of posts) {
			post.directReplies = [];
			post.replyCount = 0;
		}
		
		for (const post of posts) {
			if (post.replyTo && postMap.has(post.replyTo)) {
				const parent = postMap.get(post.replyTo)!;
				parent.directReplies!.push(post);
			}
		}
		
		// Sort direct replies chronologically and calculate reply counts
		for (const post of posts) {
			if (post.directReplies) {
				post.directReplies.sort((a, b) => 
					new Date(a.created).getTime() - new Date(b.created).getTime()
				);
				post.replyCount = post.directReplies.length;
			}
		}
		
		// Fourth pass: collect top-level posts and add all their replies
		for (const post of posts) {
			if (!post.replyTo) {
				const threadId = post.file.name;
				post.threadDepth = 0;
				post.threadId = threadId;
				threadedPosts.push(post);
				this.addAllRepliesToThread(post, postMap, threadedPosts, 1, threadId);
			}
		}
		
		return threadedPosts;
	}
	
	private addAllRepliesToThread(parentPost: MicroblogPost, postMap: Map<string, MicroblogPost>, threadedPosts: MicroblogPost[], depth: number, threadId: string) {
		const replies = Array.from(postMap.values())
			.filter(post => post.replyTo === parentPost.file.name)
			.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
		
		for (const reply of replies) {
			reply.threadDepth = depth;
			reply.threadId = threadId;
			threadedPosts.push(reply);
			this.addAllRepliesToThread(reply, postMap, threadedPosts, depth + 1, threadId);
		}
	}

	private isMicroblogPost(metadata: CachedMetadata | null): boolean {
		return metadata?.frontmatter?.lm_type === 'microblog';
	}

	private extractContentFromMarkdown(content: string): string {
		const lines = content.split('\n');
		let inFrontmatter = false;
		let frontmatterEnded = false;
		let contentStarted = false;
		const contentLines: string[] = [];

		for (const line of lines) {
			if (line.trim() === '---') {
				if (!inFrontmatter) {
					inFrontmatter = true;
				} else {
					frontmatterEnded = true;
					inFrontmatter = false;
				}
				continue;
			}

			if (frontmatterEnded || (!inFrontmatter && !line.trim().startsWith('---'))) {
				if (line.includes('<!-- microblog-content-start -->')) {
					contentStarted = true;
					continue;
				}
				if (line.includes('<!-- microblog-content-end -->')) {
					break;
				}
				if (contentStarted) {
					contentLines.push(line);
				} else if (!line.includes('![[') && !line.includes('Reply to:')) {
					contentLines.push(line);
				}
			}
		}

		return contentLines.join('\n').trim();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class MicroblogTimelineModal extends Modal {
	plugin: LocalMicroblogPlugin;

	constructor(app: App, plugin: LocalMicroblogPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		this.displayTimeline();
	}

	async displayTimeline() {
		const {contentEl} = this;
		contentEl.empty();
		
		contentEl.createEl('h2', {text: 'Microblog Timeline'});
		
		const posts = await this.plugin.getMicroblogPosts();
		
		if (posts.length === 0) {
			contentEl.createEl('p', {text: 'No microblog posts found. Create your first post!'});
			return;
		}

		const timelineContainer = contentEl.createDiv('microblog-timeline');
		
		for (const post of posts) {
			if (post.isOverflowIndicator) {
				// Render overflow indicator
				const overflowEl = timelineContainer.createDiv('microblog-overflow');
				
				if (post.threadDepth && post.threadDepth > 0) {
					overflowEl.style.marginLeft = `${post.threadDepth * 20}px`;
					overflowEl.style.paddingLeft = '10px';
				}
				
				const indicatorEl = overflowEl.createEl('button', {
					text: `${post.hiddenCount} more in thread`,
					cls: 'microblog-expand-button'
				});
				
				indicatorEl.onclick = () => {
					if (post.threadId) {
						this.expandThread(post.threadId, timelineContainer);
					}
				};
				
				continue;
			}
			
			const postEl = timelineContainer.createDiv('microblog-post');
			
			if (post.threadDepth && post.threadDepth > 0) {
				postEl.style.marginLeft = `${post.threadDepth * 20}px`;
				postEl.style.borderLeft = '2px solid #444';
				postEl.style.paddingLeft = '10px';
			}
			
			const headerEl = postEl.createDiv('microblog-header');
			const dateEl = headerEl.createSpan('microblog-date');
			dateEl.setText(new Date(post.created).toLocaleString());
			
			const typeEl = headerEl.createSpan(`microblog-type microblog-${post.type}`);
			if (post.type === 'reply' && post.replyTo) {
				// Check if the replied-to post exists in our posts collection
				const replyToExists = posts.some(p => p.file.name === post.replyTo);
				if (!replyToExists) {
					typeEl.setText('reply to [missing post]');
				} else {
					typeEl.setText(post.type);
				}
			} else {
				typeEl.setText(post.type);
			}
			
			const contentEl = postEl.createDiv('microblog-content');
			contentEl.innerHTML = this.renderMarkdown(post.content);
			
			const actionsEl = postEl.createDiv('microblog-actions');
			const openBtn = actionsEl.createEl('button', {text: 'Open'});
			openBtn.onclick = () => {
				this.app.workspace.getLeaf().openFile(post.file);
				this.close();
			};
		}
	}

	private async expandThread(threadId: string, timelineContainer: HTMLElement) {
		// For now, simply rebuild the timeline without limits
		// TODO: Add more sophisticated state management for per-thread expansion
		const {contentEl} = this;
		contentEl.empty();
		
		contentEl.createEl('h2', {text: 'Microblog Timeline'});
		
		const posts = await this.plugin.getMicroblogPostsWithoutLimits();
		
		if (posts.length === 0) {
			contentEl.createEl('p', {text: 'No microblog posts found. Create your first post!'});
			return;
		}

		const newTimelineContainer = contentEl.createDiv('microblog-timeline');
		
		for (const post of posts) {
			const postEl = newTimelineContainer.createDiv('microblog-post');
			
			if (post.threadDepth && post.threadDepth > 0) {
				postEl.style.marginLeft = `${post.threadDepth * 20}px`;
				postEl.style.borderLeft = '2px solid #444';
				postEl.style.paddingLeft = '10px';
			}
			
			const headerEl = postEl.createDiv('microblog-header');
			const dateEl = headerEl.createSpan('microblog-date');
			dateEl.setText(new Date(post.created).toLocaleString());
			
			const typeEl = headerEl.createSpan(`microblog-type microblog-${post.type}`);
			if (post.type === 'reply' && post.replyTo) {
				const replyToExists = posts.some(p => p.file.name === post.replyTo);
				if (!replyToExists) {
					typeEl.setText('reply to [missing post]');
				} else {
					typeEl.setText(post.type);
				}
			} else {
				typeEl.setText(post.type);
			}
			
			const contentEl = postEl.createDiv('microblog-content');
			contentEl.innerHTML = this.renderMarkdown(post.content);
			
			const actionsEl = postEl.createDiv('microblog-actions');
			const openBtn = actionsEl.createEl('button', {text: 'Open'});
			openBtn.onclick = () => {
				this.app.workspace.getLeaf().openFile(post.file);
				this.close();
			};
		}
	}

	private renderMarkdown(content: string): string {
		return content
			.replace(/^# (.+)$/gm, '<h1>$1</h1>')
			.replace(/^## (.+)$/gm, '<h2>$1</h2>')
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.+?)\*/g, '<em>$1</em>')
			.replace(/\n/g, '<br>');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class LocalMicroblogSettingTab extends PluginSettingTab {
	plugin: LocalMicroblogPlugin;

	constructor(app: App, plugin: LocalMicroblogPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Local Microblog Settings'});

		new Setting(containerEl)
			.setName('Microblog folder')
			.setDesc('Folder where microblog posts will be stored')
			.addText(text => text
				.setPlaceholder('Microblogs')
				.setValue(this.plugin.settings.microblogFolder)
				.onChange(async (value) => {
					this.plugin.settings.microblogFolder = value;
					await this.plugin.saveSettings();
				}));
	}
}
