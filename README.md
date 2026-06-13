# LingoHub - Multi-Language Learning Platform

A modern, interactive language learning platform built with vanilla HTML, CSS, and JavaScript. Features flashcard and quiz modes with a beautiful glassmorphism UI design.

## Features

- **Flashcard Mode**: Click cards to flip between word and meaning
- **Quiz Mode**: Multiple-choice questions with automatic scoring
- **Language Switching**: Toggle between Chinese and English interfaces
- **Progress Persistence**: Learning scores saved in browser localStorage
- **Modern UI**: Dark gradient background with glassmorphism effects
- **Keyboard Navigation**: Arrow keys and spacebar for flashcard mode

## Project Structure

```
lingohub/
├── index.html    # Main page
├── style.css     # Stylesheet
├── script.js     # Core logic
├── words.json    # Word bank (119 words, supports difficulty levels)
└── README.md     # Project documentation
```

## How to Use

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd lingohub
   ```

2. Open `index.html` in your browser, or serve with any static server:
   ```bash
   npx serve .
   ```

3. Start learning!

## Adding More Words

`words.json` 现在支持两种格式：扁平数组（旧格式）或按难度分组的对象（新格式）。示例如下：

旧格式（扁平数组）：
```json
[
   { "id": 1, "en": "English Word", "zh": "中文释义", "part": "word type", "category": "category" }
]
```

新格式（按难度分组）：
```json
{
   "beginner": [
      { "id": 1, "en": "English Word", "zh": "中文释义", "part": "word type", "category": "category", "level": "beginner" }
   ],
   "intermediate": [ ... ],
   "advanced": [ ... ]
}
```

每条词条建议包含 `category` 与可选的 `level` 字段（"beginner"/"intermediate"/"advanced"）。脚本会自动识别并合并两种格式。

## GitHub Pages Deployment

1. Go to repository **Settings** > **Pages**
2. Under **Source**, select **Deploy from a branch**
3. Choose branch: `main` (or `master`), folder: `/ (root)`
4. Click **Save**
5. After several seconds, your site will be available at:
   `https://<username>.github.io/<repo-name>/`

## License

MIT
