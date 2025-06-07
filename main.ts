import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, CachedMetadata } from 'obsidian';

interface MicroblogPost {
	file: TFile;
	created: string;
	type: 'post' | 'reply' | 'quote';
	replyTo?: string;
	quoteTo?: string;
	content: string;
	threadDepth?: number;
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

	private organizeIntoThreads(posts: MicroblogPost[]): MicroblogPost[] {
		const postMap = new Map<string, MicroblogPost>();
		const threadedPosts: MicroblogPost[] = [];
		
		posts.forEach(post => postMap.set(post.file.name, post));
		
		for (const post of posts) {
			if (!post.replyTo) {
				post.threadDepth = 0;
				threadedPosts.push(post);
				this.addRepliesToThread(post, postMap, threadedPosts, 1);
			}
		}
		
		return threadedPosts;
	}
	
	private addRepliesToThread(parentPost: MicroblogPost, postMap: Map<string, MicroblogPost>, threadedPosts: MicroblogPost[], depth: number) {
		const replies = Array.from(postMap.values())
			.filter(post => post.replyTo === parentPost.file.name)
			.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
		
		for (const reply of replies) {
			reply.threadDepth = depth;
			threadedPosts.push(reply);
			this.addRepliesToThread(reply, postMap, threadedPosts, depth + 1);
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
				const replyToFile = this.plugin.app.vault.getAbstractFileByPath(post.replyTo);
				if (!replyToFile) {
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
