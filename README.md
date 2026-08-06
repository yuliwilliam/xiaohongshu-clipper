# Xiaohongshu Clipper for Obsidian

**Version**: 0.0.9  
**Repository**: [https://github.com/yuliwilliam/xiaohongshu-clipper](https://github.com/yuliwilliam/xiaohongshu-clipper)  
**License**: MIT

A fork of [Xiaohongshu Importer](https://github.com/bnchiang96/xiaohongshu-importer) by bnchiang96, which appears to be no longer maintained. It uses the plugin id `xiaohongshu-clipper`, so it installs alongside the marketplace build rather than over it.

**[中文版本](#chinese-readme)** (Scroll to the Chinese version)

## Network use

This plugin reads note pages directly from `xiaohongshu.com`. Importing a note fetches its public web page and parses the data Xiaohongshu embeds in it — there is no official API involved, and no request is signed or authenticated. If you enable media download, images and videos are additionally fetched from Xiaohongshu's CDN hosts. Nothing is sent anywhere else, and the plugin collects no telemetry.

If you do not enable media download, imported notes reference images on Xiaohongshu's CDN, so opening such a note asks that CDN for the images. Enable media download if you would rather your vault not talk to Xiaohongshu after the import.

Because the plugin depends on the page structure Xiaohongshu serves to anonymous visitors, imports can break without warning if that changes.

## Overview

The Xiaohongshu Clipper plugin allows you to seamlessly import notes from Xiaohongshu (小红书), a popular Chinese social media and e-commerce platform, into your Obsidian vault. With this plugin, you can extract note content, images, videos, and tags, and organize them into categorized Markdown files in your vault. Whether you’re saving travel tips, recipes, or lifestyle inspiration, this plugin makes it easy to bring your Xiaohongshu notes into Obsidian for better organization and note-taking.

The plugin supports multiple Xiaohongshu link formats, including newer `explore` URLs, which are automatically normalized to the standard item format during import.

## Features

- **Import Xiaohongshu Notes**: Import notes by pasting a share link or share text (supports both `discovery/item` and `explore` URLs), including title, content, images, videos, and tags.
- **Batch Import**: Paste several links at once. Every link found is imported, in the order it appears in the text. One failed note does not abort the rest, and a note already in the vault is skipped rather than re-imported.
- **Metadata**: Records the author, their profile link, the publish date, and the posting location in the note's frontmatter.
- **Live Photos**: A live photo keeps its motion clip, rendered as a looping muted video with the still as its poster.
- **Durable Media Links**: The image and video urls embedded in a Xiaohongshu page are signed and expire within days. Images are referenced by their CDN file id and videos by their unsigned backup url instead, so notes keep working even without downloading media.
- **Category Management**: Organize notes into user-defined categories (e.g., "Travel", "Food") or a default "Others" category.
- **Media Download**: Optionally download images and videos locally to your vault, or embed them using durable URLs.
- **Custom Folder Structure**: Save notes in a structured folder hierarchy (e.g., `XHS Notes/Travel/NoteTitle.md`).
- **User-Friendly Interface**: Use a modal to input share text, select categories, and choose media download options, or skip it entirely with the clipboard command or a `obsidian://xhs-clip` shortcut from your phone.
- **Settings Customization**: Configure the default folder, media download preference, and manage categories in the settings tab.

## Installation

This fork is not in the Obsidian Community Plugins marketplace, so install it with BRAT or by hand.

### Option 1: Install via BRAT (Recommended)

[BRAT](https://github.com/TfTHacker/obsidian42-brat) installs plugins straight from a GitHub repository and keeps them updated.

1. Install **Obsidian42 - BRAT** from the community plugins marketplace and enable it.
2. Go to **Settings > BRAT > Add beta plugin**.
3. Enter `yuliwilliam/xiaohongshu-clipper` and confirm.
4. Go to **Settings > Community Plugins**, find **Xiaohongshu Clipper**, and enable it.

### Option 2: Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/yuliwilliam/xiaohongshu-clipper/releases/latest).
2. Copy the three files into your Obsidian vault’s plugins directory:
   - On desktop: `<vault>/.obsidian/plugins/xiaohongshu-clipper/`
   - On mobile: You may need to use a file manager to copy the files to the same directory.
3. Open Obsidian and go to **Settings > Community Plugins**.
4. Ensure community plugins are enabled.
5. Under **Installed Plugins**, find **Xiaohongshu Clipper** and click the toggle to enable it.
6. The plugin is now ready to use.

## Usage

### Importing Xiaohongshu Notes

1. **Trigger the Import**:
   - Click the Xiaohongshu Clipper ribbon icon (a book icon) on the left sidebar, or
   - Use the command palette: Press `Ctrl/Cmd + P`, type "Import Xiaohongshu notes", and select the command.
2. **Enter Share Text**:
   - A modal will appear. Paste the Xiaohongshu share text or URL (e.g., "64 不叫小黄了发布了一篇小红书笔记... http://xhslink.com/a/..." or links in the `explore` format).
   - You can paste several links at once, separated by newlines, spaces, or commas. Every link found is imported into the category you pick, in the order it appears in the text. Duplicates are skipped.
3. **Select a Category**:
   - Choose a category for the note (e.g., "Travel", "Food") or select "Others" (其他).
4. **Choose Media Download Option**:
   - Check the "Download media locally for this import" box if you want to download images and videos to your vault. Leave it unchecked to embed media using their original URLs.
5. **Import the Notes**:
   - Click **Import** or press `Enter` (without Shift) to start the import process. Use `Shift + Enter` for a newline.
6. **View the Notes**:
   - The plugin creates a Markdown file per note in your vault (e.g., `XHS Notes/Travel/NoteTitle.md`).
   - A single import opens the note automatically and confirms with "Imported Xiaohongshu note as XHS Notes/Travel/NoteTitle.md".
   - A batch shows progress as it goes and finishes with a summary, such as "Imported 5 Xiaohongshu notes; 1 already in the vault; 2 failed (see console for details)". A note that fails does not stop the ones after it, and a note already in the vault is skipped before any media is fetched.

### Importing Without the Modal

Two paths skip the modal entirely. Both import into the category you last used, with the "Download media" setting from the settings tab, so there is nothing to answer.

**From the clipboard.** Run the **Import Xiaohongshu notes from clipboard** command. Obsidian does not let plugins claim a hotkey, so assign one yourself under **Settings > Hotkeys** if you want this on a keystroke. Copy a share text in the Xiaohongshu app, switch to Obsidian, press the key.

**From your phone's share sheet.** The plugin answers `obsidian://xhs-clip`, so a shortcut can hand a link over directly:

| Parameter | |
| --- | --- |
| `url` | A Xiaohongshu link. |
| `text` | A whole share message; every link in it is imported. Use this if you are passing the share text through unmodified. |
| `category` | Optional. Overrides the last used category, so you can build one shortcut per category. |

On **iOS**, in the Shortcuts app:

1. Create a new shortcut. In its details, turn on **Show in Share Sheet** and accept **Text** and **URLs**.
2. Add **URL Encode**, set it to *Encode*, with **Shortcut Input** as its input.
3. Add a **Text** action containing `obsidian://xhs-clip?text=` followed by the encoded result.
4. Add **Open URLs**, taking that text.
5. Name it something like "Clip to Obsidian".

Then in Xiaohongshu: **Share > Copy link**, or share straight into the shortcut, and Obsidian opens and imports.

On **Android**, any app that can fire a custom URL scheme from the share menu (URL Forwarder, HTTP Shortcuts, Tasker) works the same way — build `obsidian://xhs-clip?text=<url-encoded share text>`.

### Configuring the Plugin

1. Go to **Settings > Community Plugins > Xiaohongshu Clipper**.
2. **Default Folder**:
   - Set the base folder where notes will be saved (e.g., `XHS Notes`). Leave empty to save notes at the vault root.
3. **Download Media**:
   - Toggle this option to enable or disable media download by default. You can override this per import in the modal.
4. **Categories**:
   - Add, edit, remove, or reorder categories for organizing your notes. Default categories include "美食" (Food), "旅行" (Travel), etc.
   - Use the "Add category" button to create new categories, and the up/down arrows to reorder them.

## File Structure

- Notes are saved in the format: `<defaultFolder>/<category>/<noteTitle>.md`.
  - Example: `XHS Notes/Travel/My Trip to Bali.md`
- Media files (if downloaded) are saved in: `<defaultFolder>/media/`.
  - Example: `XHS Notes/media/My-Trip-to-Бали-123456789.jpg`
- Each note includes frontmatter with metadata:
  ```yaml
  ---
  title: "🐻夏天看熊吃三文鱼愿望达成！"
  source: http://xhslink.cn/o/AQX2ka4QaBc
  note_id: 6a4f3e0d000000001603c839
  author: "ingridchu"
  author_url: https://www.xiaohongshu.com/user/profile/58a7a81582ec391b58364e64
  posted: 2026-07-08 23:22
  location: "美国"
  date: 2026-08-06
  Imported At: 8/5/2026, 11:24:17 PM
  category: "旅行"
  ---
  ```
  - `note_id` is Xiaohongshu's own id for the note. It is what the plugin checks to decide a note has already been imported, so it survives you renaming the file or the author retitling the note. Removing it makes the note importable again.
  - `posted` is when the note was published, in local time. `date` and `Imported At` record when you imported it.
  - `location` is the posting location Xiaohongshu shows on the note.
  - `author`, `author_url`, `posted` and `location` are omitted when the note data does not carry them.
- The note's topics are written as Obsidian tags at the end of the file, taken from Xiaohongshu's own tag list.

## Troubleshooting

- **"No valid Xiaohongshu URL found in the text"**:
	- Ensure you’ve pasted a valid Xiaohongshu share link or text containing a URL. Both `xhslink.com` and `xhslink.cn` short links are recognized, as are `discovery/item` and `explore` URLs.
- **"Failed to import note"**:
	- Check your internet connection and ensure the URL is accessible.
	- Verify that the note is public and not restricted.
	- Share links carry an access token that expires. If a link has been sitting around for a while, copy a fresh one from the app.
- **"Note is already in the vault; skipped"**:
	- A note whose title already exists in the target category is not imported again. Delete or rename the existing note to re-import it.
- **Media not downloading**:
	- Ensure the "Download media" option is enabled in the modal or settings.
	- Check for network issues or restrictions on the media URLs.
	- A media file that fails to download falls back to its URL in the Markdown, so the note is still created.
- **Layout issues in the modal**:
	- Ensure your Obsidian theme is compatible. The plugin uses standard Obsidian styling, but custom themes may require adjustments.

## Contributing

Contributions are welcome! If you’d like to contribute to the Xiaohongshu Clipper plugin, please follow these steps:

1. Fork the repository: [https://github.com/yuliwilliam/xiaohongshu-clipper](https://github.com/yuliwilliam/xiaohongshu-clipper).
2. Clone your fork and create a new branch:
   ```bash
   git clone https://github.com/your-username/xiaohongshu-clipper.git
   git checkout -b feature/your-feature-name
   ```
3. Make your changes and test them in Obsidian.
4. Commit your changes and push to your fork:
   ```bash
   git add .
   git commit -m "Add your feature or fix"
   git push origin feature/your-feature-name
   ```
5. Open a pull request on the main repository.

## Development Setup

To develop or modify the plugin, you’ll need the following:

- **Node.js**: Version 18.x or later.
- **Yarn**: Used for dependency management.
- **Dependencies**:
	- Install dependencies with:
	  ```bash
	  yarn install
	  ```
- **Build the Plugin**:
	- Development mode (with watch):
	  ```bash
	  yarn dev
	  ```
	- Production mode (minified):
	  ```bash
	  yarn build
	  ```
- **Test the Plugin**:
	- Copy the built files (`main.js`, `manifest.json`, `styles.css`) to your Obsidian vault’s plugins directory: `<vault>/.obsidian/plugins/xiaohongshu-clipper/`.
	- Enable the plugin in Obsidian and test your changes.

## License

This plugin is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Almost all of this plugin is the work of [bnchiang96](https://github.com/bnchiang96), who wrote the original [Xiaohongshu Importer](https://github.com/bnchiang96/xiaohongshu-importer). It remains MIT licensed under their copyright.
- Thanks to the Obsidian community for their support and feedback during the plugin’s development, including the community PR fixing the XHS URL bug.
- Built with the Obsidian API and inspired by the community’s plugin guidelines.

---

# 小红书剪藏 for Obsidian <a id="chinese-readme"></a>

**版本**：0.0.9  
**代码仓库**：[https://github.com/yuliwilliam/xiaohongshu-clipper](https://github.com/yuliwilliam/xiaohongshu-clipper)  
**许可证**：MIT

本项目 fork 自 bnchiang96 的 [Xiaohongshu Importer](https://github.com/bnchiang96/xiaohongshu-importer)，原项目目前似乎已停止维护。插件 id 改为 `xiaohongshu-clipper`，因此可以与商店版并存，不会互相覆盖。

## 联网说明

本插件直接从 `xiaohongshu.com` 读取笔记页面。导入一篇笔记时，会抓取该笔记的公开网页并解析小红书内嵌在页面中的数据——不经过任何官方 API，请求也不带签名或身份认证。如果启用了媒体下载，还会额外从小红书的 CDN 抓取图片和视频。除此之外不向任何地方发送数据，插件不收集任何遥测信息。

如果不启用媒体下载，导入的笔记中引用的是小红书 CDN 上的图片，因此每次打开这类笔记都会向该 CDN 请求图片。如果你不希望导入之后知识库仍与小红书通信，请启用媒体下载。

由于依赖的是小红书返回给匿名访客的页面结构，一旦对方改动，导入可能随时失效。

## 概述

小红书剪藏插件让您可以轻松地将小红书（一个广受欢迎的中国社交媒体和电商平台）上的笔记导入到您的 Obsidian 知识库中。通过此插件，您可以提取笔记的标题、内容、图片、视频和标签，并将它们整理成分类的 Markdown 文件存储在您的知识库中。无论是保存旅行攻略、食谱还是生活灵感，这个插件都能帮助您将小红书笔记导入 Obsidian，以便更好地组织和管理。

## 功能

- **导入小红书笔记**：通过粘贴分享链接或分享文本，导入笔记，包括标题、内容、图片、视频和标签。
- **批量导入**：一次可粘贴多条链接，按其在文本中出现的顺序逐条导入。其中一条失败不会中断后面的，已存在于知识库的笔记会跳过而非重复导入。
- **元数据**：在笔记的 frontmatter 中记录作者、作者主页链接、发布时间和 IP 归属地。
- **Live Photo**：实况照片会保留动态片段，渲染为循环静音播放的视频，静帧作为封面。
- **媒体链接不过期**：小红书页面里内嵌的图片和视频 URL 都带签名，数天后失效。插件改用图片的 CDN file id、视频的无签名 backup URL 来构造引用，因此即使不下载媒体，笔记里的图片和视频也不会失效。
- **分类管理**：将笔记组织到用户自定义的分类中（例如“旅行”、“美食”），或使用默认的“其他”分类。
- **媒体下载**：可选择将图片和视频下载到本地知识库，或使用不过期的 URL 嵌入媒体。
- **自定义文件夹结构**：将笔记保存到结构化的文件夹层次中（例如 `XHS Notes/Travel/NoteTitle.md`）。
- **用户友好的界面**：通过弹窗输入分享文本、选择分类和媒体下载选项；也可以用剪贴板命令或手机上的 `obsidian://xhs-clip` 快捷指令完全跳过弹窗。
- **设置自定义**：在设置页面中配置默认文件夹、媒体下载偏好和分类管理。

## 安装

本 fork 未上架 Obsidian 社区插件市场，请通过 BRAT 或手动安装。

### 选项 1：通过 BRAT 安装（推荐）

[BRAT](https://github.com/TfTHacker/obsidian42-brat) 可以直接从 GitHub 仓库安装插件并保持更新。

1. 在社区插件市场中安装 **Obsidian42 - BRAT** 并启用。
2. 前往 **设置 > BRAT > Add beta plugin**。
3. 填入 `yuliwilliam/xiaohongshu-clipper` 并确认。
4. 前往 **设置 > 社区插件**，找到 **Xiaohongshu Clipper** 并启用。

### 选项 2：手动安装

1. 从 [最新 release](https://github.com/yuliwilliam/xiaohongshu-clipper/releases/latest) 下载 `main.js`、`manifest.json` 和 `styles.css`。
2. 将这三个文件复制到您的 Obsidian 知识库的插件目录：
	- 桌面端：`<vault>/.obsidian/plugins/xiaohongshu-clipper/`
	- 移动端：您可能需要使用文件管理器将文件复制到相同目录。
3. 打开 Obsidian，前往 **设置 > 社区插件**。
4. 确保社区插件已启用。
5. 在 **已安装的插件** 下，找到 **Xiaohongshu Clipper** 并点击开关启用。
6. 插件现已准备好使用。

## 使用方法

### 导入小红书笔记

1. **触发导入**：
	- 点击左侧边栏上的小红书剪藏图标（书本图标），或
	- 使用命令面板：按 `Ctrl/Cmd + P`，输入 "Import Xiaohongshu notes"，然后选择该命令。
2. **输入分享文本**：
	- 将弹出一个窗口。粘贴小红书分享文本或 URL（例如，“64 不叫小黄了发布了一篇小红书笔记... http://xhslink.com/a/...”）。
	- 可以一次粘贴多条链接，用换行、空格或逗号分隔。所有识别到的链接都会导入到你选择的分类下，顺序与其在文本中出现的顺序一致，重复的会自动跳过。
3. **选择分类**：
	- 为笔记选择一个分类（例如“旅行”、“美食”），或选择“其他”。
4. **选择媒体下载选项**：
	- 如果您希望将图片和视频下载到知识库中，请勾选“为此导入本地下载媒体”。如果不勾选，媒体将使用原始 URL 嵌入。
5. **导入笔记**：
	- 点击 **导入** 或按 `Enter` 键（不按 Shift）以开始导入过程。需要换行请按 `Shift + Enter`。
6. **查看笔记**：
	- 插件会为每篇笔记在知识库中创建一个 Markdown 文件（例如 `XHS Notes/Travel/NoteTitle.md`）。
	- 单条导入会自动打开该笔记，并提示 "Imported Xiaohongshu note as XHS Notes/Travel/NoteTitle.md"。
	- 批量导入会显示进度，结束时给出汇总，例如 "Imported 5 Xiaohongshu notes; 1 already in the vault; 2 failed (see console for details)"。其中一条失败不会影响后面的；已存在的笔记会在抓取媒体之前就跳过。

### 不弹窗的导入方式

有两条路径可以完全跳过弹窗。两者都导入到你上次使用的分类，并采用设置页里的「下载媒体」默认值，因此全程无需选择。

**从剪贴板导入。** 执行命令 **Import Xiaohongshu notes from clipboard**。Obsidian 不允许插件自行占用快捷键，需要的话请在 **设置 > 快捷键** 中自行绑定。在小红书 App 里复制分享文案，切回 Obsidian 按一下即可。

**从手机分享菜单导入。** 插件注册了 `obsidian://xhs-clip`，快捷指令可以把链接直接递过来：

| 参数 | |
| --- | --- |
| `url` | 一条小红书链接。 |
| `text` | 整段分享文案，其中所有链接都会被导入。原样透传分享文案时用这个。 |
| `category` | 可选。覆盖上次使用的分类，可以为每个分类各建一个快捷指令。 |

**iOS** 在「快捷指令」App 中：

1. 新建快捷指令，在详情里开启 **在共享表单中显示**，接受类型勾选 **文本** 和 **URL**。
2. 添加 **URL 编码** 操作，模式选 *编码*，输入设为 **快捷指令输入**。
3. 添加 **文本** 操作，内容为 `obsidian://xhs-clip?text=` 加上一步的编码结果。
4. 添加 **打开 URL**，输入为上一步的文本。
5. 命名为「剪藏到 Obsidian」之类。

之后在小红书里 **分享 > 复制链接**，或直接分享给该快捷指令，Obsidian 会自动打开并导入。

**Android** 上任何能从分享菜单触发自定义 URL scheme 的工具（URL Forwarder、HTTP Shortcuts、Tasker）都同理——构造 `obsidian://xhs-clip?text=<URL 编码后的分享文案>` 即可。

### 配置插件

1. 前往 **设置 > 社区插件 > Xiaohongshu Clipper**。
2. **默认文件夹**：
	- 设置笔记保存的默认基础文件夹（例如 `XHS Notes`）。留空则保存到知识库根目录。
3. **下载媒体**：
	- 切换此选项以默认启用或禁用媒体下载。您可以在弹窗中为每次导入覆盖此设置。
4. **分类**：
	- 添加、编辑、删除或重新排序用于组织笔记的分类。默认分类包括“美食”、“旅行”等。
	- 使用“添加分类”按钮创建新分类，使用上下箭头重新排序。

## 文件结构

- 笔记保存格式为：`<defaultFolder>/<category>/<noteTitle>.md`。
	- 示例：`XHS Notes/Travel/My Trip to Bali.md`
- 如果下载了媒体文件，将保存到：`<defaultFolder>/media/`。
	- 示例：`XHS Notes/media/My-Trip-to-Бали-123456789.jpg`
- 每个笔记包含带有元数据的 frontmatter：
  ```yaml
  ---
  title: "🐻夏天看熊吃三文鱼愿望达成！"
  source: http://xhslink.cn/o/AQX2ka4QaBc
  note_id: 6a4f3e0d000000001603c839
  author: "ingridchu"
  author_url: https://www.xiaohongshu.com/user/profile/58a7a81582ec391b58364e64
  posted: 2026-07-08 23:22
  location: "美国"
  date: 2026-08-06
  Imported At: 8/5/2026, 11:24:17 PM
  category: "旅行"
  ---
  ```
  - `note_id` 是小红书自己的笔记 ID。插件靠它判断某篇笔记是否已导入，因此你重命名文件、或作者改了标题都不会影响判重。删掉这一行该笔记就能重新导入。
  - `posted` 是笔记的发布时间（本地时区）；`date` 和 `Imported At` 记录的是你导入的时间。
  - `location` 是小红书在笔记上显示的 IP 归属地。
  - `author`、`author_url`、`posted`、`location` 在笔记数据中缺失时会整行省略。
- 笔记的话题会写在文件末尾作为 Obsidian 标签，取自小红书自己的话题列表。

## 故障排除

- **“文本中未找到有效的小红书 URL”**：
	- 确保您粘贴了一个有效的小红书分享链接或包含 URL 的文本。`xhslink.com` 和 `xhslink.cn` 两种短链都支持，`discovery/item` 和 `explore` 网页链接也支持。
- **“无法导入笔记”**：
	- 检查您的网络连接并确保 URL 可访问。
	- 确认笔记是公开的且未受限制。
	- 分享链接中带有会过期的访问票据。如果链接放置了一段时间，请从 App 重新复制一份。
- **提示“Note is already in the vault; skipped”**：
	- 目标分类下已存在同名笔记时不会重复导入。需要重新导入请先删除或重命名已有的笔记。
- **媒体未下载**：
	- 确保在弹窗或设置中启用了“下载媒体”选项。
	- 检查网络问题或媒体 URL 的限制。
	- 单个媒体文件下载失败时会回退为在 Markdown 中引用其 URL，笔记仍会正常创建。
- **弹窗中的布局问题**：
	- 确保您的 Obsidian 主题兼容。插件使用标准的 Obsidian 样式，但自定义主题可能需要调整。

## 贡献

欢迎贡献！如果您想为小红书剪藏插件做出贡献，请按照以下步骤操作：

1. Fork 代码仓库：[https://github.com/yuliwilliam/xiaohongshu-clipper](https://github.com/yuliwilliam/xiaohongshu-clipper)。
2. 克隆您的 fork 并创建一个新分支：
   ```bash
   git clone https://github.com/your-username/xiaohongshu-clipper.git
   git checkout -b feature/your-feature-name
   ```
3. 进行更改并在 Obsidian 中测试。
4. 提交更改并推送到您的 fork：
   ```bash
   git add .
   git commit -m "添加您的功能或修复"
   git push origin feature/your-feature-name
   ```
5. 在主仓库上打开一个拉取请求。

## 开发设置

要开发或修改插件，您需要以下内容：

- **Node.js**：版本 18.x 或更高。
- **Yarn**：用于依赖管理。
- **依赖**：
	- 使用以下命令安装依赖：
	  ```bash
	  yarn install
	  ```
- **构建插件**：
	- 开发模式（带监听）：
	  ```bash
	  yarn dev
	  ```
	- 生产模式（压缩）：
	  ```bash
	  yarn build
	  ```
- **测试插件**：
	- 将构建的文件（`main.js`、`manifest.json`、`styles.css`）复制到您的 Obsidian 知识库的插件目录：`<vault>/.obsidian/plugins/xiaohongshu-clipper/`。
	- 在 Obsidian 中启用插件并测试您的更改。

## 许可证

此插件采用 MIT 许可证。详情请见 [LICENSE](LICENSE) 文件。

## 致谢

- 本插件的绝大部分代码出自 [bnchiang96](https://github.com/bnchiang96) 之手，即原项目 [Xiaohongshu Importer](https://github.com/bnchiang96/xiaohongshu-importer)，仍以 MIT 许可证在其版权下分发。
- 感谢 Obsidian 社区在插件开发过程中提供的支持和反馈，包括修复 XHS URL 错误的社区 PR。
- 使用 Obsidian API 构建，并受到社区插件指南的启发。
