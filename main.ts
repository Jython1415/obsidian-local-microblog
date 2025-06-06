import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, CachedMetadata } from 'obsidian';

interface MicroblogPost {
	file: TFile;
	created: string;
	type: 'post' | 'reply' | 'quote';
	replyTo?: string;
	quoteTo?: string;
	content: string;
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
type: microblog
created: ${new Date().toISOString()}
---

# 

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
					created: frontmatter?.created || file.stat.ctime.toString(),
					type: frontmatter?.type === 'reply' ? 'reply' : 
						  frontmatter?.type === 'quote' ? 'quote' : 'post',
					replyTo: frontmatter?.replyTo,
					quoteTo: frontmatter?.quoteTo,
					content: this.extractContentFromMarkdown(content)
				});
			}
		}

		return microblogPosts.sort((a, b) => 
			new Date(b.created).getTime() - new Date(a.created).getTime()
		);
	}

	private isMicroblogPost(metadata: CachedMetadata | null): boolean {
		return metadata?.frontmatter?.type === 'microblog' ||
			   metadata?.frontmatter?.type === 'reply' ||
			   metadata?.frontmatter?.type === 'quote';
	}

	private extractContentFromMarkdown(content: string): string {
		const lines = content.split('\n');
		let inFrontmatter = false;
		let frontmatterEnded = false;
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
				contentLines.push(line);
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
			
			const headerEl = postEl.createDiv('microblog-header');
			const dateEl = headerEl.createSpan('microblog-date');
			dateEl.setText(new Date(post.created).toLocaleString());
			
			const typeEl = headerEl.createSpan(`microblog-type microblog-${post.type}`);
			typeEl.setText(post.type);
			
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
