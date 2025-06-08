import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, CachedMetadata } from 'obsidian';

export interface MicroblogPost {
	file: TFile;
	created: string;
	type: 'post' | 'reply' | 'quote';
	replyTo?: string;
	quoteTo?: string;
	content: string;
	replyCount?: number;
	directReplies?: MicroblogPost[];
	hasErrors?: boolean;
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
			new MicroblogModal(this.app, this).open();
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
				new MicroblogModal(this.app, this).open();
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

	/**
	 * Gets microblog posts formatted for Timeline View display.
	 * Returns only top-level posts with reply count metadata.
	 * For complete thread data, use getCompleteThreadData().
	 */
	async getTimelinePosts(): Promise<MicroblogPost[]> {
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

		return this.organizeForTimeline(sortedPosts);
	}

	/**
	 * Gets complete microblog thread data for Post View display.
	 * Returns all posts with full threading relationships.
	 * For Timeline View, use getTimelinePosts().
	 */
	async getCompleteThreadData(): Promise<MicroblogPost[]> {
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

		return this.organizeCompleteThreads(sortedPosts);
	}

	/**
	 * Organizes posts for Timeline View display.
	 * Adds reply metadata to top-level posts but does not create threaded display.
	 * Timeline View shows only top-level posts with reply counts.
	 */
	private organizeForTimeline(posts: MicroblogPost[]): MicroblogPost[] {
		const postMap = new Map<string, MicroblogPost>();
		const timelinePosts: MicroblogPost[] = [];
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
				timelinePosts.push(post);
			}
		}
		
		return timelinePosts;
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

	/**
	 * Organizes posts for complete thread display in Post View.
	 * Creates full threading relationships for detailed thread navigation.
	 * For Timeline View, use organizeForTimeline().
	 */
	private organizeCompleteThreads(posts: MicroblogPost[]): MicroblogPost[] {
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

class MicroblogModal extends Modal {
	plugin: LocalMicroblogPlugin;
	private currentView: 'timeline' | 'post' = 'timeline';
	private focusedPost: MicroblogPost | null = null;
	private timelinePosts: MicroblogPost[] = [];
	private completeThreadData: MicroblogPost[] = [];
	private navigationStack: MicroblogPost[] = [];

	constructor(app: App, plugin: LocalMicroblogPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		this.loadAndDisplayCurrentView();
	}

	private async loadAndDisplayCurrentView() {
		this.timelinePosts = await this.plugin.getTimelinePosts();
		this.completeThreadData = await this.plugin.getCompleteThreadData();
		
		if (this.currentView === 'timeline') {
			this.displayTimeline();
		} else if (this.currentView === 'post' && this.focusedPost) {
			this.displayPostView(this.focusedPost);
		}
	}

	async displayTimeline() {
		const {contentEl} = this;
		contentEl.empty();
		this.currentView = 'timeline';
		this.focusedPost = null;
		this.navigationStack = [];
		
		contentEl.createEl('h2', {text: 'Microblog Timeline'});
		
		// Filter to top-level posts only (including error-promoted posts)
		const topLevelPosts = this.timelinePosts.filter(post => !post.replyTo);
		
		if (topLevelPosts.length === 0) {
			contentEl.createEl('p', {text: 'No microblog posts found. Create your first post!'});
			return;
		}

		const timelineContainer = contentEl.createDiv('microblog-timeline');
		
		for (const post of topLevelPosts) {
			const postEl = timelineContainer.createDiv('microblog-post');
			
			const headerEl = postEl.createDiv('microblog-header');
			const dateEl = headerEl.createSpan('microblog-date');
			dateEl.setText(new Date(post.created).toLocaleString());
			
			const typeEl = headerEl.createSpan(`microblog-type microblog-${post.type}`);
			typeEl.setText(post.type);
			
			// Add error indicator if post has errors
			if (post.hasErrors) {
				const errorEl = headerEl.createSpan('microblog-error');
				errorEl.setText(' [data issue]');
				errorEl.style.color = '#ff6b6b';
				errorEl.style.fontSize = '0.8em';
			}
			
			const contentEl = postEl.createDiv('microblog-content');
			contentEl.innerHTML = this.renderMarkdown(post.content);
			
			// Display reply count
			const replyCountEl = postEl.createDiv('microblog-reply-count');
			const replyCount = post.replyCount || 0;
			let replyText = '';
			if (replyCount === 0) {
				replyText = '0 replies';
			} else if (replyCount >= 100) {
				replyText = '99+ replies';
			} else {
				replyText = `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`;
			}
			replyCountEl.setText(replyText);
			replyCountEl.style.color = '#666';
			replyCountEl.style.fontSize = '0.9em';
			replyCountEl.style.marginTop = '8px';
			
			const actionsEl = postEl.createDiv('microblog-actions');
			const viewBtn = actionsEl.createEl('button', {text: 'View Thread'});
			viewBtn.onclick = () => {
				this.displayPostView(post);
			};
			
			const openBtn = actionsEl.createEl('button', {text: 'Open File'});
			openBtn.onclick = () => {
				this.app.workspace.getLeaf().openFile(post.file);
				this.close();
			};
		}
	}

	private displayPostView(focusedPost: MicroblogPost) {
		const {contentEl} = this;
		contentEl.empty();
		this.currentView = 'post';
		
		// Add current focused post to navigation stack if it's different
		if (this.focusedPost && this.focusedPost.file.name !== focusedPost.file.name) {
			this.navigationStack.push(this.focusedPost);
		}
		
		this.focusedPost = focusedPost;
		
		// Header with navigation buttons
		const headerEl = contentEl.createDiv('post-view-header');
		const navEl = headerEl.createDiv('navigation-buttons');
		
		// Back button (either to previous post or timeline)
		if (this.navigationStack.length > 0) {
			const backBtn = navEl.createEl('button', {text: '← Back'});
			backBtn.onclick = () => {
				const previousPost = this.navigationStack.pop()!;
				this.focusedPost = previousPost;
				this.displayPostView(previousPost);
			};
			backBtn.style.marginRight = '8px';
		}
		
		const timelineBtn = navEl.createEl('button', {text: '← Back to Timeline'});
		timelineBtn.onclick = () => {
			this.displayTimeline();
		};
		
		navEl.style.marginBottom = '16px';
		
		const titleEl = contentEl.createEl('h2', {text: 'Post View'});
		
		// Show context chain if this is a reply
		if (focusedPost.replyTo) {
			this.displayContextChain(focusedPost, contentEl);
		}
		
		// Display the focused post
		this.displayFocusedPost(focusedPost, contentEl);
		
		// Display direct replies
		this.displayDirectReplies(focusedPost, contentEl);
	}
	
	private displayContextChain(focusedPost: MicroblogPost, containerEl: HTMLElement) {
		const contextEl = containerEl.createDiv('context-chain');
		contextEl.createEl('h3', {text: 'Thread Context'});
		
		const chain = this.buildContextChain(focusedPost);
		
		if (chain.length === 0) {
			const noContextEl = contextEl.createDiv('no-context');
			noContextEl.setText('No context available (this may be an orphaned reply)');
			noContextEl.style.color = '#666';
			noContextEl.style.fontStyle = 'italic';
			return;
		}
		
		for (let i = 0; i < chain.length; i++) {
			const post = chain[i];
			const isLast = i === chain.length - 1;
			
			const contextPostEl = contextEl.createDiv('context-post');
			if (!isLast) {
				contextPostEl.style.opacity = '0.7';
			}
			
			const headerEl = contextPostEl.createDiv('microblog-header');
			const dateEl = headerEl.createSpan('microblog-date');
			dateEl.setText(new Date(post.created).toLocaleString());
			
			const typeEl = headerEl.createSpan(`microblog-type microblog-${post.type}`);
			typeEl.setText(post.type);
			
			if (post.hasErrors) {
				const errorEl = headerEl.createSpan('microblog-error');
				errorEl.setText(' [data issue]');
				errorEl.style.color = '#ff6b6b';
				errorEl.style.fontSize = '0.8em';
			}
			
			const contentEl = contextPostEl.createDiv('microblog-content');
			contentEl.innerHTML = this.renderMarkdown(post.content);
			
			// Add visual connector except for last item
			if (!isLast) {
				const connectorEl = contextEl.createDiv('context-connector');
				connectorEl.setText('↳ replies to');
				connectorEl.style.margin = '8px 0';
				connectorEl.style.color = '#666';
				connectorEl.style.fontSize = '0.9em';
			}
		}
	}
	
	private buildContextChain(post: MicroblogPost): MicroblogPost[] {
		const chain: MicroblogPost[] = [];
		let currentPost = post;
		const visited = new Set<string>(); // Prevent infinite loops
		
		// Build chain going backwards to root, but don't include the focused post itself
		while (currentPost.replyTo) {
			if (visited.has(currentPost.file.name)) {
				break; // Circular reference detected, stop here
			}
			visited.add(currentPost.file.name);
			
			const parentPost = this.completeThreadData.find(p => p.file.name === currentPost.replyTo);
			if (!parentPost) {
				break; // Orphaned post, chain ends
			}
			chain.unshift(parentPost);
			currentPost = parentPost;
		}
		
		return chain;
	}
	
	private displayFocusedPost(post: MicroblogPost, containerEl: HTMLElement) {
		const focusedEl = containerEl.createDiv('focused-post');
		focusedEl.createEl('h3', {text: 'Focused Post'});
		
		const postEl = focusedEl.createDiv('microblog-post focused');
		postEl.style.border = '2px solid #007acc';
		postEl.style.backgroundColor = '#f8f9fa';
		postEl.style.color = '#333';
		postEl.style.padding = '12px';
		
		const headerEl = postEl.createDiv('microblog-header');
		const dateEl = headerEl.createSpan('microblog-date');
		dateEl.setText(new Date(post.created).toLocaleString());
		
		const typeEl = headerEl.createSpan(`microblog-type microblog-${post.type}`);
		typeEl.setText(post.type);
		
		if (post.hasErrors) {
			const errorEl = headerEl.createSpan('microblog-error');
			errorEl.setText(' [data issue]');
			errorEl.style.color = '#ff6b6b';
			errorEl.style.fontSize = '0.8em';
		}
		
		const contentEl = postEl.createDiv('microblog-content');
		contentEl.innerHTML = this.renderMarkdown(post.content);
		
		const actionsEl = postEl.createDiv('microblog-actions');
		const openBtn = actionsEl.createEl('button', {text: 'Open File'});
		openBtn.onclick = () => {
			this.app.workspace.getLeaf().openFile(post.file);
			this.close();
		};
	}
	
	private displayDirectReplies(post: MicroblogPost, containerEl: HTMLElement) {
		const repliesEl = containerEl.createDiv('direct-replies');
		
		const replyCount = post.replyCount || 0;
		if (replyCount === 0) {
			repliesEl.createEl('h3', {text: 'No Replies'});
			return;
		}
		
		repliesEl.createEl('h3', {text: `Direct Replies (${replyCount})`});
		
		const replies = post.directReplies || [];
		
		for (const reply of replies) {
			const replyEl = repliesEl.createDiv('microblog-post reply');
			replyEl.style.marginLeft = '20px';
			replyEl.style.borderLeft = '2px solid #ccc';
			replyEl.style.paddingLeft = '12px';
			
			const headerEl = replyEl.createDiv('microblog-header');
			const dateEl = headerEl.createSpan('microblog-date');
			dateEl.setText(new Date(reply.created).toLocaleString());
			
			const typeEl = headerEl.createSpan(`microblog-type microblog-${reply.type}`);
			typeEl.setText(reply.type);
			
			if (reply.hasErrors) {
				const errorEl = headerEl.createSpan('microblog-error');
				errorEl.setText(' [data issue]');
				errorEl.style.color = '#ff6b6b';
				errorEl.style.fontSize = '0.8em';
			}
			
			const contentEl = replyEl.createDiv('microblog-content');
			contentEl.innerHTML = this.renderMarkdown(reply.content);
			
			// Show reply count for this reply
			const replyCountEl = replyEl.createDiv('microblog-reply-count');
			const nestedReplyCount = reply.replyCount || 0;
			let replyText = '';
			if (nestedReplyCount === 0) {
				replyText = '0 replies';
			} else if (nestedReplyCount >= 100) {
				replyText = '99+ replies';
			} else {
				replyText = `${nestedReplyCount} ${nestedReplyCount === 1 ? 'reply' : 'replies'}`;
			}
			replyCountEl.setText(replyText);
			replyCountEl.style.color = '#666';
			replyCountEl.style.fontSize = '0.9em';
			replyCountEl.style.marginTop = '8px';
			
			const actionsEl = replyEl.createDiv('microblog-actions');
			const viewBtn = actionsEl.createEl('button', {text: 'View Thread'});
			viewBtn.onclick = () => {
				this.displayPostView(reply);
			};
			
			const openBtn = actionsEl.createEl('button', {text: 'Open File'});
			openBtn.onclick = () => {
				this.app.workspace.getLeaf().openFile(reply.file);
				this.close();
			};
		}
	}

	private async expandThread(threadId: string, timelineContainer: HTMLElement) {
		// This method is deprecated in Phase 4B - no more thread expansion in timeline
		// Will be replaced with Post View navigation in Phase 4C
		new Notice('Thread expansion will be replaced with Post View navigation in next update');
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
