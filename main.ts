import { Plugin, Notice, Modal, requestUrl, PluginSettingTab, App, Setting, WorkspaceLeaf, TFile } from "obsidian";

interface XHSClipperSettings {
	defaultFolder: string;
	categories: string[]; // User-defined categories, excluding "其他"
	lastCategory: string;
	downloadMedia: boolean;
}

const DEFAULT_SETTINGS: XHSClipperSettings = {
	defaultFolder: "XHS Notes",
	categories: ["美食", "旅行", "娱乐", "知识", "工作", "情感", "个人成长", "优惠", "搞笑", "育儿"], // Removed "Others"
	lastCategory: "",
	downloadMedia: false,
};

// Pause between requests in a batch import, so a long paste doesn't hammer Xiaohongshu
const BATCH_REQUEST_DELAY_MS = 1000;

// The urls Xiaohongshu embeds in a note page carry an expiry timestamp and a signature, and
// stop resolving within about a day. Every image also has a file id that addresses it on the
// CDN directly, with no expiry, so image references are rebuilt from that instead.
const IMAGE_CDN_BASE = "https://sns-img-qc.xhscdn.com";

// Without a suffix the CDN returns the untouched original, which reaches tens of megabytes for
// a single photo. This is the same downscale Xiaohongshu's own web page requests.
const IMAGE_VARIANT_SUFFIX = "!nd_dft_wlteh_jpg_3";

export default class XHSClipperPlugin extends Plugin {
	settings: XHSClipperSettings;

	// Plugin lifecycle: Load settings and register UI/command elements
	async onload() {
		await this.loadSettings();

		// Add ribbon icon to trigger note import
		this.addRibbonIcon("book", "Import Xiaohongshu notes", () => this.runImport());

		// Add command for importing notes via command palette
		this.addCommand({
			id: "import",
			name: "Import Xiaohongshu notes",
			callback: () => this.runImport(),
		});

		// Register settings tab
		this.addSettingTab(new XHSClipperSettingTab(this.app, this));
	}

	// Load plugin settings from storage
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	// Save plugin settings to storage
	async saveSettings() {
		await this.saveData(this.settings);
	}

	// Prompt user for share text and category via modal
	async promptForShareText(): Promise<{ text: string | null; category: string; downloadMedia: boolean } | null> {
		return new Promise((resolve) => {
			const modal = new XHSInputModal(this.app, this.settings, (result) => resolve(result));
			modal.open();
		});
	}

	// Extract every Xiaohongshu URL from share text, in the order they appear
	extractURLs(shareText: string): string[] {
		const patterns = [
			// Mobile share links. The app hands out both xhslink.com and xhslink.cn, with a
			// one- or two-letter path segment (/a/, /o/) that is not always present.
			/https?:\/\/xhslink\.(?:com|cn)\/(?:[a-zA-Z]{1,2}\/)?[a-zA-Z0-9]+/g,
			// Desktop/web links (both discovery/item and explore formats)
			/https:\/\/www\.xiaohongshu\.com\/(?:discovery\/item|explore)\/[a-zA-Z0-9]+(?:\?[^\s,，]*)?/g,
		];

		const matches: { index: number; url: string }[] = [];
		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(shareText)) !== null) {
				// Normalize explore URLs to discovery/item format
				matches.push({ index: match.index, url: match[0].replace("/explore/", "/discovery/item/") });
			}
		}

		// Import in reading order rather than grouping by link type
		matches.sort((a, b) => a.index - b.index);

		const urls: string[] = [];
		const seen = new Set<string>();
		for (const { url } of matches) {
			if (!seen.has(url)) {
				seen.add(url);
				urls.push(url);
			}
		}
		return urls;
	}

	// Sanitize title for media filenames, removing emojis and special characters
	sanitizeFilename(title: string): string {
		// Keep only alphanumeric, Chinese characters, spaces, and safe symbols (-, _)
		let sanitized = title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s-_]/g, "").trim();
		sanitized = sanitized.replace(/\s+/g, "-");
		sanitized = sanitized.length > 0 ? sanitized : "Untitled";
		return sanitized.substring(0, 50); // Limit to 50 chars
	}

	// Download media file and save to vault
	async downloadMediaFile(url: string, folderPath: string, filename: string): Promise<string> {
		try {
			const response = await fetch(url);
			if (!response.ok) throw new Error(`HTTP error ${response.status}`);
			const blob = await response.blob();
			const arrayBuffer = await blob.arrayBuffer();
			const filePath = `${folderPath}/${filename}`;
			await this.app.vault.adapter.writeBinary(filePath, arrayBuffer);
			return filename; // Return filename for Markdown reference
		} catch (error) {
			console.log(`Failed to download media from ${url}: ${error.message}`);
			new Notice(`Failed to download media: ${error.message}`);
			return url; // Fallback to original URL
		}
	}

	// Prompt for share text and import every note it links to
	async runImport() {
		const input = await this.promptForShareText();
		if (!input || !input.text) return;

		const urls = this.extractURLs(input.text);
		if (urls.length === 0) {
			new Notice("No valid Xiaohongshu URL found in the text.");
			return;
		}

		await this.importXHSNotes(urls, input.category, input.downloadMedia);
	}

	// Import notes one at a time, then report the batch as a whole
	async importXHSNotes(urls: string[], category: string, downloadMedia: boolean) {
		const imported: TFile[] = [];
		const skipped: string[] = [];
		const failures: { url: string; message: string }[] = [];

		// Read once for the whole batch. importXHSNote adds to it as notes are created, so a
		// paste holding both the short and the long link to one note only imports it once.
		const knownNoteIds = this.existingNoteIds();

		for (let i = 0; i < urls.length; i++) {
			if (urls.length > 1) {
				new Notice(`Importing note ${i + 1} of ${urls.length}...`);
			}

			try {
				const file = await this.importXHSNote(urls[i], category, downloadMedia, knownNoteIds);
				if (file) {
					imported.push(file);
				} else {
					skipped.push(urls[i]);
				}
			} catch (error) {
				console.log(`Failed to import note from ${urls[i]}: ${error.message}`);
				failures.push({ url: urls[i], message: error.message });
			}

			if (i < urls.length - 1) {
				await sleep(BATCH_REQUEST_DELAY_MS);
			}
		}

		if (imported.length > 0) {
			// Only take over the workspace for a single import; a batch would open a tab per note
			if (urls.length === 1) {
				await this.app.workspace.getLeaf(true).openFile(imported[0]);
			}

			// Update last used category
			this.settings.lastCategory = category;
			await this.saveSettings();
		}

		this.reportImportResult(imported, skipped, failures);
	}

	// Summarize a batch in one notice, keeping the outcome legible for a single import
	reportImportResult(imported: TFile[], skipped: string[], failures: { url: string; message: string }[]) {
		if (imported.length === 0 && skipped.length === 0 && failures.length === 1) {
			new Notice(`Failed to import note: ${failures[0].message}`);
			return;
		}
		if (imported.length === 0 && skipped.length === 1 && failures.length === 0) {
			new Notice("Note is already in the vault; skipped.");
			return;
		}

		const parts: string[] = [];
		if (imported.length === 1) {
			parts.push(`Imported Xiaohongshu note as ${imported[0].path}`);
		} else if (imported.length > 1) {
			parts.push(`Imported ${imported.length} Xiaohongshu notes`);
		}
		if (skipped.length > 0) {
			parts.push(`${skipped.length} already in the vault`);
		}
		if (failures.length > 0) {
			parts.push(`${failures.length} failed (see console for details)`);
		}
		new Notice(`${parts.join("; ")}.`);
	}

	// Main function to import a single Xiaohongshu note. Returns null when the note is
	// already in the vault.
	async importXHSNote(url: string, category: string, downloadMedia: boolean, knownNoteIds: Set<string>): Promise<TFile | null> {
		const response = await requestUrl({ url });
		const html = response.text;

		// Xiaohongshu's own id identifies the note regardless of what it is filed as here
		const noteId = this.extractNoteId(html);
		if (noteId && knownNoteIds.has(noteId)) {
			return null;
		}

		// Extract note details
		const title = this.extractTitle(html);
		const videoUrl = this.extractVideoUrl(html);
		const images = this.extractImages(html);
		const content = this.extractContent(html);
		const isVideo = this.isVideoNote(html);
		const author = this.extractAuthor(html);
		const postedAt = this.extractPostedAt(html);
		const location = this.extractLocation(html);

		// Build frontmatter and initial Markdown. Author and posted date are omitted rather
		// than left blank when the note data does not carry them.
		const noteDate = new Date().toISOString().split("T")[0];
		const importedAt = new Date().toLocaleString();
		const frontmatter = [`title: ${this.yamlString(title)}`, `source: ${url}`];
		if (noteId) {
			frontmatter.push(`note_id: ${noteId}`);
		}
		if (author) {
			frontmatter.push(`author: ${this.yamlString(author.name)}`);
			if (author.url) {
				frontmatter.push(`author_url: ${author.url}`);
			}
		}
		if (postedAt) {
			frontmatter.push(`posted: ${postedAt}`);
		}
		if (location) {
			frontmatter.push(`location: ${this.yamlString(location)}`);
		}
		frontmatter.push(`date: ${noteDate}`);
		frontmatter.push(`Imported At: ${importedAt}`);
		frontmatter.push(`category: ${this.yamlString(category)}`);

		let markdown = `---\n${frontmatter.join("\n")}\n---\n# ${title}\n\n`;

		// Define folder structure
		const baseFolder = this.settings.defaultFolder || "";
		const mediaFolder = `${baseFolder}/media`;
		const categoryFolder = category || "Uncategorized";
		const folderPath = baseFolder ? `${baseFolder}/${categoryFolder}` : categoryFolder;

		// Sanitize title for note filename (less strict)
		let safeTitle = title.replace(/[/\\?%*:|"<>]/g, "-").trim();
		safeTitle = safeTitle.length > 0 ? safeTitle : "Untitled";
		safeTitle = safeTitle.substring(0, 50);
		const filename = isVideo ? `[V]${safeTitle}` : safeTitle;
		const filePath = `${folderPath}/${filename}.md`;

		// Leave an already imported note alone. Checked before any media is fetched, so
		// re-importing a batch costs one page request per note and nothing else.
		if (await this.app.vault.adapter.exists(filePath)) {
			return null;
		}

		// Stricter sanitization for media filenames
		const mediaSafeTitle = this.sanitizeFilename(title);

		// Create folders if they don’t exist
		if (!await this.app.vault.adapter.exists(folderPath)) {
			await this.app.vault.createFolder(folderPath);
		}
		if (downloadMedia && !await this.app.vault.adapter.exists(mediaFolder)) {
			await this.app.vault.createFolder(mediaFolder);
		}

		// Handle video notes
		if (isVideo) {
			if (videoUrl) {
				let finalVideoUrl = videoUrl;
				if (downloadMedia) {
					const videoFilename = `${mediaSafeTitle}-${Date.now()}.mp4`;
					const downloadedFilename = await this.downloadMediaFile(videoUrl, mediaFolder, videoFilename);
					finalVideoUrl = downloadedFilename.startsWith("http") ? downloadedFilename : `../media/${downloadedFilename}`;
				}
				markdown += `<video controls src="${finalVideoUrl}" width="100%"></video>\n\n`;
			} else if (images.length > 0) {
				let finalImageUrl = images[0];
				if (downloadMedia) {
					const imageFilename = `${mediaSafeTitle}-0-${Date.now()}.jpg`; // Use index 0 to match later logic
					const downloadedFilename = await this.downloadMediaFile(images[0], mediaFolder, imageFilename);
					finalImageUrl = downloadedFilename.startsWith("http") ? downloadedFilename : `../media/${downloadedFilename}`;
				}
				markdown += `[![Cover Image](${finalImageUrl})](${url})\n\n`;
				new Notice("Video URL not found; using cover image as fallback.");
			}
			const cleanContent = content.replace(/#\S+/g, "").trim();
			markdown += `${cleanContent.split("\n").join("\n")}\n\n`;

			const tags = this.extractTags(html, content);
			if (tags.length > 0) {
				markdown += "```\n";
				markdown += tags.map((tag) => `#${tag}`).join(" ") + "\n";
				markdown += "```\n";
			}
		}
		// Handle non-video notes
		else {
			let downloadedImages: string[] = [];
			if (images.length > 0) {
				if (downloadMedia) {
					// Download all images, including the first one (which will be used as the cover)
					for (let i = 0; i < images.length; i++) {
						const imageFilename = `${mediaSafeTitle}-${i}-${Date.now()}.jpg`;
						const downloadedFilename = await this.downloadMediaFile(images[i], mediaFolder, imageFilename);
						const finalImageUrl = downloadedFilename.startsWith("http") ? downloadedFilename : `../media/${downloadedFilename}`;
						downloadedImages.push(finalImageUrl);
					}
				} else {
					downloadedImages = images;
				}

				// Use the first downloaded image as the cover image (no separate download for cover)
				markdown += `![Cover Image](${downloadedImages[0]})\n\n`;
			}

			const cleanContent = content.replace(/#[^#\s]*(?:\s+#[^#\s]*)*\s*/g, "").trim();
			markdown += `${cleanContent.split("\n").join("\n")}\n\n`;

			const tags = this.extractTags(html, content);
			if (tags.length > 0) {
				markdown += "```\n";
				markdown += tags.map((tag) => `#${tag}`).join(" ") + "\n";
				markdown += "```\n\n";
			}

			if (images.length > 0) {
				// Add all images (including the first one, which is already used as the cover)
				const imageMarkdown = downloadedImages.map((url) => `![Image](${url})`).join("\n");
				markdown += `${imageMarkdown}\n`;
			}
		}

		// Create the note; opening it is left to the caller
		const file = await this.app.vault.create(filePath, markdown);
		if (noteId) {
			knownNoteIds.add(noteId);
		}
		return file;
	}

	// Note titles and nicknames routinely contain colons, quotes and leading emoji, any of
	// which breaks an unquoted frontmatter value and takes the whole block with it.
	yamlString(value: string): string {
		const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\s+/g, " ").trim();
		return `"${escaped}"`;
	}

	// Parse the note payload Xiaohongshu embeds in the page
	noteData(html: string): any | null {
		const stateMatch = html.match(/window\.__INITIAL_STATE__=(.*?)<\/script>/s);
		if (!stateMatch) return null;

		try {
			const state = JSON.parse(stateMatch[1].trim().replace(/undefined/g, "null"));
			const noteId = Object.keys(state.note.noteDetailMap)[0];
			return state.note.noteDetailMap[noteId].note;
		} catch (e) {
			console.log(`Failed to parse note data: ${e.message}`);
			return null;
		}
	}

	// Extract Xiaohongshu's own id for the note, which survives the author editing the title
	extractNoteId(html: string): string | null {
		const note = this.noteData(html);
		if (!note || typeof note.noteId !== "string" || note.noteId.length === 0) return null;

		return note.noteId;
	}

	// Collect the note ids already recorded in the vault, so the same note is not imported
	// twice under a title the author has since changed
	existingNoteIds(): Set<string> {
		const ids = new Set<string>();
		for (const file of this.app.vault.getMarkdownFiles()) {
			const cache = this.app.metadataCache.getFileCache(file);
			const id = cache && cache.frontmatter ? cache.frontmatter.note_id : null;
			if (typeof id === "string" && id.length > 0) ids.add(id);
		}
		return ids;
	}

	// Extract the posting location Xiaohongshu shows on the note
	extractLocation(html: string): string | null {
		const note = this.noteData(html);
		if (!note || typeof note.ipLocation !== "string" || note.ipLocation.length === 0) return null;

		return note.ipLocation;
	}

	// Extract the author's nickname and profile link
	extractAuthor(html: string): { name: string; url: string } | null {
		const note = this.noteData(html);
		if (!note || !note.user || !note.user.nickname) return null;

		return {
			name: note.user.nickname,
			url: note.user.userId ? `https://www.xiaohongshu.com/user/profile/${note.user.userId}` : "",
		};
	}

	// Extract when the note was published, as a local date and time
	extractPostedAt(html: string): string | null {
		const note = this.noteData(html);
		if (!note || typeof note.time !== "number") return null;

		const posted = new Date(note.time);
		const pad = (value: number) => (value < 10 ? `0${value}` : `${value}`);
		const date = `${posted.getFullYear()}-${pad(posted.getMonth() + 1)}-${pad(posted.getDate())}`;
		return `${date} ${pad(posted.getHours())}:${pad(posted.getMinutes())}`;
	}

	// Extract note title, preferring the note payload over the page title tag, which carries a
	// " - 小红书" suffix and is truncated for long titles
	extractTitle(html: string): string {
		const note = this.noteData(html);
		if (note && typeof note.title === "string" && note.title.trim().length > 0) {
			return note.title.trim();
		}

		const match = html.match(/<title>(.*?)<\/title>/);
		return match ? match[1].replace(" - 小红书", "") : "Untitled Xiaohongshu Note";
	}

	// Build a non-expiring reference to an image, falling back to the signed url when the
	// note data carries no file id
	imageUrl(image: any): string {
		if (typeof image.fileId === "string" && image.fileId.length > 0) {
			return `${IMAGE_CDN_BASE}/${image.fileId}${IMAGE_VARIANT_SUFFIX}`;
		}
		return image.urlDefault || "";
	}

	// Extract image URLs from note data
	extractImages(html: string): string[] {
		const stateMatch = html.match(/window\.__INITIAL_STATE__=(.*?)<\/script>/s);
		if (!stateMatch) return [];

		try {
			const jsonStr = stateMatch[1].trim();
			const cleanedJson = jsonStr.replace(/undefined/g, "null");
			const state = JSON.parse(cleanedJson);
			const noteId = Object.keys(state.note.noteDetailMap)[0];
			const imageList = state.note.noteDetailMap[noteId].note.imageList || [];
			return imageList
				.map((img: any) => this.imageUrl(img))
				.filter((url: string) => url && url.startsWith("http"));
		} catch (e) {
			console.log(`Failed to parse images: ${e.message}`);
			return [];
		}
	}

	// Pick a playback url for one encoding of a stream. masterUrl carries a signature that
	// expires within days, while the backup urls address the same file unsigned, so prefer
	// those and keep masterUrl only as a fallback.
	streamUrl(encoding: any): string | null {
		const backups = Array.isArray(encoding.backupUrls) ? encoding.backupUrls : [];
		for (const backup of backups) {
			if (typeof backup === "string" && backup.length > 0) return backup;
		}
		return encoding.masterUrl || null;
	}

	// Extract video URL from note data, h264 first for the widest playback support
	extractVideoUrl(html: string): string | null {
		const note = this.noteData(html);
		if (!note || !note.video || !note.video.media || !note.video.media.stream) return null;

		const stream = note.video.media.stream;
		for (const codec of ["h264", "h265", "h266", "av1"]) {
			const encodings = stream[codec];
			if (!Array.isArray(encodings)) continue;

			for (const encoding of encodings) {
				const url = this.streamUrl(encoding);
				if (url) return url;
			}
		}
		return null;
	}

	// Extract note content from HTML or JSON
	extractContent(html: string): string {
		const divMatch = html.match(/<div id="detail-desc" class="desc">([\s\S]*?)<\/div>/);
		if (divMatch) {
			return divMatch[1]
				.replace(/<[^>]+>/g, "")
				.replace(/\[话题\]/g, "")
				.replace(/\[[^\]]+\]/g, "")
				.trim() || "Content not found";
		}

		const stateMatch = html.match(/window\.__INITIAL_STATE__=(.*?)<\/script>/s);
		if (stateMatch) {
			try {
				const jsonStr = stateMatch[1].trim();
				const cleanedJson = jsonStr.replace(/undefined/g, "null");
				const state = JSON.parse(cleanedJson);
				const noteId = Object.keys(state.note.noteDetailMap)[0];
				const desc = state.note.noteDetailMap[noteId].note.desc || "";
				return desc
					.replace(/\[话题\]/g, "")
					.replace(/\[[^\]]+\]/g, "")
					.trim() || "Content not found";
			} catch (e) {
				console.log(`Failed to parse content from JSON: ${e.message}`);
			}
		}
		return "Content not found";
	}

	// Determine if the note is a video note
	isVideoNote(html: string): boolean {
		const stateMatch = html.match(/window\.__INITIAL_STATE__=(.*?)<\/script>/s);
		if (!stateMatch) return false;

		try {
			const jsonStr = stateMatch[1].trim();
			const cleanedJson = jsonStr.replace(/undefined/g, "null");
			const state = JSON.parse(cleanedJson);
			const noteId = Object.keys(state.note.noteDetailMap)[0];
			const noteType = state.note.noteDetailMap[noteId].note.type;
			return noteType === "video";
		} catch (e) {
			console.log(`Failed to determine note type: ${e.message}`);
			return false;
		}
	}

	// Extract tags, preferring the structured list. Reading them back out of the description
	// yields "熊#", because Xiaohongshu writes topics as "#熊[话题]#" and only the leading
	// marker is stripped.
	extractTags(html: string, content: string): string[] {
		const note = this.noteData(html);
		const tagList = note && note.tagList ? note.tagList : [];
		const names = tagList
			.map((tag: any) => (typeof tag.name === "string" ? tag.name.trim() : ""))
			.filter((name: string) => name.length > 0);
		if (names.length > 0) return names;

		const tagMatches = content.match(/#\S+/g) || [];
		return tagMatches.map((tag) => tag.replace(/#/g, "").trim()).filter((tag) => tag.length > 0);
	}

	// Plugin lifecycle: Cleanup on unload (currently empty)
	onunload() {}
}

class XHSClipperSettingTab extends PluginSettingTab {
	plugin: XHSClipperPlugin;

	constructor(app: App, plugin: XHSClipperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Default folder setting
		new Setting(containerEl)
			.setName("Default folder")
			.setDesc("Base folder where category subfolders will be created (e.g., 'XHS Notes'). Leave empty for vault root.")
			.addText((text) =>
				text
					.setPlaceholder("XHS Notes")
					.setValue(this.plugin.settings.defaultFolder)
					.onChange(async (value) => {
						this.plugin.settings.defaultFolder = value.trim();
						await this.plugin.saveSettings();
					})
			);

		// Download media toggle
		new Setting(containerEl)
			.setName("Download media")
			.setDesc("Default setting: if enabled, images and videos will be downloaded locally to 'XHS Notes/media/'. Can be overridden per import.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.downloadMedia)
					.onChange(async (value) => {
						this.plugin.settings.downloadMedia = value;
						await this.plugin.saveSettings();
					})
			);

		// Category management
		new Setting(containerEl)
			.setName("Categories")
			.setHeading();

		containerEl.createEl("p", { text: "Add, edit, or remove categories for organizing notes. Use Up/Down to reorder." });

		this.plugin.settings.categories.forEach((category, index) => {
			const setting = new Setting(containerEl)
				.setName(`Category ${index + 1}`)
				.addText((text) =>
					text
						.setValue(category)
						.onChange(async (value) => {
							this.plugin.settings.categories[index] = value.trim();
							await this.plugin.saveSettings();
						})
				);

			setting.addButton((button) =>
				button
					.setIcon("arrow-up")
					.setTooltip("Move up")
					.setDisabled(index === 0)
					.onClick(async () => {
						if (index > 0) {
							[this.plugin.settings.categories[index], this.plugin.settings.categories[index - 1]] =
								[this.plugin.settings.categories[index - 1], this.plugin.settings.categories[index]];
							await this.plugin.saveSettings();
							this.display();
						}
					})
			);

			setting.addButton((button) =>
				button
					.setIcon("arrow-down")
					.setTooltip("Move down")
					.setDisabled(index === this.plugin.settings.categories.length - 1)
					.onClick(async () => {
						if (index < this.plugin.settings.categories.length - 1) {
							[this.plugin.settings.categories[index], this.plugin.settings.categories[index + 1]] =
								[this.plugin.settings.categories[index + 1], this.plugin.settings.categories[index]];
							await this.plugin.saveSettings();
							this.display();
						}
					})
			);

			setting.addButton((button) =>
				button
					.setButtonText("Remove")
					.onClick(async () => {
						this.plugin.settings.categories.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					})
			);
		});

		new Setting(containerEl)
			.addButton((button) =>
				button
					.setButtonText("Add category")
					.onClick(async () => {
						this.plugin.settings.categories.push("New Category");
						await this.plugin.saveSettings();
						this.display();
					})
			);
	}
}

// Modal for user input during import
class XHSInputModal extends Modal {
	result: { text: string | null; category: string; downloadMedia: boolean } | null = null;
	onSubmit: (result: { text: string | null; category: string; downloadMedia: boolean } | null) => void;
	settings: XHSClipperSettings;
	selectedCategory: string;
	downloadMedia: boolean;

	constructor(app: App, settings: XHSClipperSettings, onSubmit: (result: { text: string | null; category: string; downloadMedia: boolean } | null) => void) {
		super(app);
		this.settings = settings;
		this.onSubmit = onSubmit;
		this.selectedCategory = this.settings.lastCategory && this.settings.categories.includes(this.settings.lastCategory)
			? this.settings.lastCategory
			: this.settings.categories[0] || "其他";
		this.downloadMedia = this.settings.downloadMedia;
	}

	onOpen() {
		const { contentEl } = this;
		// Apply CSS class to modal content
		contentEl.addClass("xhs-modal-content");

		contentEl.createEl("h2", { text: "Import Xiaohongshu notes" });

		// Share text input
		const textRow = contentEl.createEl("div", { cls: "xhs-modal-row" });
		textRow.createEl("p", { text: "Paste one or more share links below. Every link found is imported into the selected category." });
		const input = textRow.createEl("textarea", {
			cls: "xhs-modal-textarea",
			attr: { placeholder: "e.g., 64 不叫小黄了发布了一篇小红书笔记..." },
		});

		// Category selection
		const categoryRow = contentEl.createEl("div", { cls: "xhs-modal-row" });
		categoryRow.createEl("p", { text: "Select a category:" });
		const chipContainer = categoryRow.createEl("div", { cls: "xhs-chip-container" });

		// Helper function to update chip styles
		const updateChipStyles = () => {
			chipContainer.querySelectorAll("button").forEach((btn) => {
				if (btn.textContent === this.selectedCategory) {
					btn.classList.add("xhs-chip--selected");
				} else {
					btn.classList.remove("xhs-chip--selected");
				}
			});
		};

		// Add user-defined categories
		this.settings.categories.forEach((category) => {
			const chip = chipContainer.createEl("button", {
				text: category,
				cls: "xhs-chip",
			});
			if (category === this.selectedCategory) {
				chip.classList.add("xhs-chip--selected");
			}

			chip.addEventListener("click", () => {
				this.selectedCategory = category;
				updateChipStyles();
			});
		});

		// Add hardcoded "其他" category
		const otherChip = chipContainer.createEl("button", {
			text: "其他",
			cls: "xhs-chip",
		});
		if ("其他" === this.selectedCategory) {
			otherChip.classList.add("xhs-chip--selected");
		}

		otherChip.addEventListener("click", () => {
			this.selectedCategory = "其他";
			updateChipStyles();
		});

		// Download media option
		const downloadRow = contentEl.createEl("div", { cls: ["xhs-modal-row", "xhs-download-row"] });
		const downloadWrapper = downloadRow.createEl("div", { cls: "xhs-download-wrapper" });
		const checkboxId = "download-media-checkbox";
		const checkbox = downloadWrapper.createEl("input", { attr: { type: "checkbox", id: checkboxId } });
		checkbox.checked = this.downloadMedia;
		checkbox.addEventListener("change", () => {
			this.downloadMedia = checkbox.checked;
		});
		const label = downloadWrapper.createEl("label", {
			text: "Download media locally for this import",
			cls: "xhs-download-label",
			attr: { for: checkboxId },
		});

		// Submit button
		const buttonRow = contentEl.createEl("div", { cls: ["xhs-modal-row", "xhs-button-row"] });
		const submitButton = buttonRow.createEl("button", {
			text: "Import",
			cls: "xhs-submit-button",
		});

		submitButton.addEventListener("click", () => {
			this.result = { text: input.value.trim(), category: this.selectedCategory, downloadMedia: this.downloadMedia };
			this.close();
		});

		input.addEventListener("keypress", (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				this.result = { text: input.value.trim(), category: this.selectedCategory, downloadMedia: this.downloadMedia };
				this.close();
			}
		});
	}

	onClose() {
		this.onSubmit(this.result);
	}
}
