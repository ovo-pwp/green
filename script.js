// ============================================================
// LingoHub - Multi-Language Learning Platform
// ============================================================

const STORAGE_KEY = 'lingohub_progress';

// ============================================================
// State
// ============================================================
let words = [];
let currentLang = 'zh';
let currentMode = 'flashcard';
let currentCardIndex = 0;
let quizQuestions = [];
let quizIndex = 0;
let quizCorrect = 0;
let quizAnswered = false;
let totalScore = 0;

// ============================================================
// DOM refs
// ============================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const flashcardView = $('#flashcardView');
const quizView = $('#quizView');
const resultView = $('#resultView');
const flashcard = $('#flashcard');
const cardInner = $('#cardInner');
const cardWord = $('#cardWord');
const cardMeaning = $('#cardMeaning');
const cardPart = $('#cardPart');
const flashcardProgress = $('#flashcardProgress');
const flashcardProgressText = $('#flashcardProgressText');
const prevBtn = $('#prevCard');
const nextBtn = $('#nextCard');
const quizWord = $('#quizWord');
const quizOptions = $('#quizOptions');
const quizQuestionNum = $('#quizQuestionNum');
const quizScore = $('#quizScore');
const quizNextBtn = $('#quizNextBtn');
const scoreText = $('#scoreText');
const resultScore = $('#resultScore');
const resultMessage = $('#resultMessage');
const resultIcon = $('#resultIcon');
const resultTitle = $('#resultTitle');

// ============================================================
// i18n helpers
// ============================================================
function t(el, key, ...args) {
  const val = el.dataset[key];
  if (!val) return '';
  if (args.length === 0) return val;
  return val.replace(/\{(\d+)\}/g, (_, i) => args[parseInt(i)] ?? '');
}

function switchLang(lang) {
  currentLang = lang;
  $$('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  // Update all data-* texts
  $$('[data-en],[data-zh]').forEach(el => {
    const text = el.dataset[lang];
    if (text !== undefined) el.textContent = text;
  });
  // Re-render current view
  if (currentMode === 'flashcard') renderCard();
  else if (currentMode === 'quiz') renderQuizQuestion();
  updateFlashcardUI();
  updateQuizUI();
}

// ============================================================
// Storage
// ============================================================
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveProgress(progress) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch {}
}

function getLearnedCount() {
  const p = loadProgress();
  return p.learned ? p.learned.length : 0;
}

function markLearned(wordId) {
  const p = loadProgress();
  if (!p.learned) p.learned = [];
  if (!p.learned.includes(wordId)) p.learned.push(wordId);
  if (!p.score) p.score = 0;
  p.score += 1;
  totalScore = p.score;
  saveProgress(p);
  updateScore();
}

function addQuizScore() {
  const p = loadProgress();
  if (!p.score) p.score = 0;
  p.score += 1;
  totalScore = p.score;
  saveProgress(p);
  updateScore();
}

function updateScore() {
  scoreText.textContent = t(scoreText, currentLang, totalScore);
}

// ============================================================
// Flashcard
// ============================================================
function updateFlashcardUI() {
  const total = words.length;
  flashcardProgress.style.width = total > 0 ? `${((currentCardIndex + 1) / total) * 100}%` : '0%';
  flashcardProgressText.textContent = t(flashcardProgressText, currentLang, currentCardIndex + 1, total);
  prevBtn.disabled = currentCardIndex === 0;
  nextBtn.disabled = currentCardIndex >= total - 1;
}

function renderCard() {
  if (words.length === 0) return;
  const w = words[currentCardIndex];
  flashcard.classList.remove('flipped');
  cardWord.textContent = currentLang === 'zh' ? w.en : w.zh;
  cardMeaning.textContent = currentLang === 'zh' ? w.zh : w.en;
  cardPart.textContent = w.part || '';
  updateFlashcardUI();
  // Mark as learned on view
  markLearned(w.id);
}

function prevCard() {
  if (currentCardIndex > 0) {
    currentCardIndex--;
    renderCard();
  }
}

function nextCard() {
  if (currentCardIndex < words.length - 1) {
    currentCardIndex++;
    renderCard();
  }
}

flashcard.addEventListener('click', () => {
  flashcard.classList.toggle('flipped');
});

prevBtn.addEventListener('click', prevCard);
nextBtn.addEventListener('click', nextCard);

// Keyboard nav
document.addEventListener('keydown', (e) => {
  if (currentMode !== 'flashcard') return;
  if (e.key === 'ArrowLeft') prevCard();
  if (e.key === 'ArrowRight') nextCard();
  if (e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault();
    flashcard.classList.toggle('flipped');
  }
});

// ============================================================
// Quiz
// ============================================================
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateQuiz() {
  quizQuestions = words.map((w) => {
    // Pick 3 random wrong answers
    const others = words.filter(x => x.id !== w.id);
    const distractors = shuffle(others).slice(0, 3).map(x => currentLang === 'zh' ? x.zh : x.en);
    const correct = currentLang === 'zh' ? w.zh : w.en;
    const options = shuffle([...distractors, correct]);
    return { word: w, wordText: currentLang === 'zh' ? w.en : w.zh, correct, options };
  });
  quizIndex = 0;
  quizCorrect = 0;
  quizAnswered = false;
}

function updateQuizUI() {
  quizQuestionNum.textContent = t(quizQuestionNum, currentLang, quizIndex + 1, quizQuestions.length);
  quizScore.textContent = t(quizScore, currentLang, quizCorrect, quizIndex);
  quizNextBtn.disabled = !quizAnswered;
}

function renderQuizQuestion() {
  if (quizQuestions.length === 0) return;
  const q = quizQuestions[quizIndex];
  quizWord.textContent = q.wordText;
  quizOptions.innerHTML = '';
  quizAnswered = false;

  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleQuizAnswer(btn, opt, q.correct));
    quizOptions.appendChild(btn);
  });

  updateQuizUI();
}

function handleQuizAnswer(btn, selected, correct) {
  if (quizAnswered) return;
  quizAnswered = true;

  const allBtns = quizOptions.querySelectorAll('.quiz-option');
  allBtns.forEach(b => {
    b.classList.add('disabled');
    if (b.textContent === correct) b.classList.add('correct');
  });

  if (selected === correct) {
    quizCorrect++;
    addQuizScore();
    btn.classList.add('correct');
  } else {
    btn.classList.add('wrong');
  }

  updateQuizUI();

  if (quizIndex >= quizQuestions.length - 1) {
    quizNextBtn.innerHTML = '<span data-en="Show Results" data-zh="查看结果">查看结果</span>';
  }
}

function nextQuiz() {
  if (!quizAnswered) return;

  if (quizIndex >= quizQuestions.length - 1) {
    showResult();
    return;
  }

  quizIndex++;
  renderQuizQuestion();
}

function showResult() {
  flashcardView.classList.add('hidden');
  quizView.classList.add('hidden');
  resultView.classList.remove('hidden');

  resultScore.textContent = `${quizCorrect} / ${quizQuestions.length}`;
  resultMessage.textContent = t(resultMessage, currentLang, quizCorrect, quizQuestions.length);

  const ratio = quizCorrect / quizQuestions.length;
  if (ratio === 1) {
    resultIcon.textContent = '🏆';
    resultTitle.textContent = currentLang === 'zh' ? '完美！' : 'Perfect!';
  } else if (ratio >= 0.7) {
    resultIcon.textContent = '🎉';
    resultTitle.textContent = currentLang === 'zh' ? '太棒了！' : 'Great Job!';
  } else if (ratio >= 0.4) {
    resultIcon.textContent = '💪';
    resultTitle.textContent = currentLang === 'zh' ? '继续努力！' : 'Keep Going!';
  } else {
    resultIcon.textContent = '📚';
    resultTitle.textContent = currentLang === 'zh' ? '多多练习！' : 'Practice More!';
  }
}

function restartQuiz() {
  generateQuiz();
  resultView.classList.add('hidden');
  quizView.classList.remove('hidden');
  renderQuizQuestion();
}

quizNextBtn.addEventListener('click', nextQuiz);
$('#restartQuiz').addEventListener('click', restartQuiz);

// ============================================================
// Mode switching
// ============================================================
function switchMode(mode) {
  currentMode = mode;
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === mode));

  flashcardView.classList.add('hidden');
  quizView.classList.add('hidden');
  resultView.classList.add('hidden');

  if (mode === 'flashcard') {
    flashcardView.classList.remove('hidden');
    renderCard();
  } else if (mode === 'quiz') {
    generateQuiz();
    quizView.classList.remove('hidden');
    renderQuizQuestion();
  }
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => switchMode(tab.dataset.tab));
});

// ============================================================
// Language switch
// ============================================================
$('#btnZh').addEventListener('click', () => switchLang('zh'));
$('#btnEn').addEventListener('click', () => switchLang('en'));

// ============================================================
// Init
// ============================================================
async function init() {
  try {
    const resp = await fetch('words.json');
    words = await resp.json();
  } catch (e) {
    console.error('Failed to load words.json', e);
    words = [];
  }

  const p = loadProgress();
  totalScore = p.score || 0;
  updateScore();
  switchMode('flashcard');
}

init();