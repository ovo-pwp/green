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
├── words.json    # Word bank (8 words, easily expandable)
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

Edit `words.json` to add new entries. Each entry requires:

```json
{ "id": number, "en": "English Word", "zh": "中文释义", "part": "word type (optional)" }
```

## GitHub Pages Deployment

1. Go to repository **Settings** > **Pages**
2. Under **Source**, select **Deploy from a branch**
3. Choose branch: `main` (or `master`), folder: `/ (root)`
4. Click **Save**
5. After several seconds, your site will be available at:
   `https://<username>.github.io/<repo-name>/`

## License

MIT
