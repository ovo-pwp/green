// ============================================================
// LingoHub - Multi-Language Learning Platform  v2.0
// ============================================================

const STORAGE_KEY = 'lingohub_progress';

// ============================================================
// State
// ============================================================
let words = [];           // All words from JSON
let filtered = [];        // Currently filtered words
let currentLang = 'zh';
let currentMode = 'flashcard';
let currentCategory = 'all';
let currentLevel = 'all';
let currentCardIndex = 0;
let quizQuestions = [];
let quizIndex = 0;
let quizCorrect = 0;
let quizAnswered = false;
let totalScore = 0;
let dailyStudied = 0;     // Words studied today
let checkinDone = false;  // Today's check-in status

// ============================================================
// DOM refs
// ============================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const flashcardView = $('#flashcardView');
const quizView = $('#quizView');
const resultView = $('#resultView');
const flashcard = $('#flashcard');
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
const categorySelect = $('#categorySelect');
const categoryCount = $('#categoryCount');
const levelSelect = $('#levelSelect');
const statsPanel = $('#statsPanel');
const checkinBtn = $('#checkinBtn');
const checkinStreak = $('#checkinStreak');
const streakText = $('#streakText');
const checkinStudied = $('#checkinStudied');

// ============================================================
// Toast
// ============================================================
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// ============================================================
// Speech Synthesis
// ============================================================
function speak(text, lang) {
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang || 'en-US';
  utter.rate = 0.85;

  // Highlight active speaker button
  const btn = lang ? $('#speakerFront') : $('#speakerQuiz');
  const allSpeakers = $$('.speaker-btn');
  allSpeakers.forEach(b => b.classList.remove('speaking'));
  if (btn) btn.classList.add('speaking');

  utter.onend = () => { if (btn) btn.classList.remove('speaking'); };
  utter.onerror = () => { if (btn) btn.classList.remove('speaking'); };

  window.speechSynthesis.speak(utter);
}

document.getElementById('speakerFront').addEventListener('click', (e) => {
  e.stopPropagation();
  if (filtered.length > 0) speak(filtered[currentCardIndex].en, 'en-US');
});

document.getElementById('speakerQuiz').addEventListener('click', (e) => {
  e.stopPropagation();
  if (quizQuestions.length > 0) speak(quizQuestions[quizIndex].wordText, 'en-US');
});

// ============================================================
// Theme
// ============================================================
function getTheme() { return localStorage.getItem('lingohub_theme') || 'dark'; }
function setTheme(t) { localStorage.setItem('lingohub_theme', t); document.body.dataset.theme = t; }

document.getElementById('themeToggle').addEventListener('click', () => {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
});

// Init theme
document.body.dataset.theme = getTheme();

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
  $$('[data-en],[data-zh]').forEach(el => {
    const text = el.dataset[lang];
    if (text !== undefined) el.textContent = text;
  });
  // Rebuild category dropdown labels
  categorySelect.querySelectorAll('option').forEach(opt => {
    const text = opt.dataset[lang];
    if (text) opt.textContent = text;
  });
  if (currentMode === 'flashcard') { updateFilteredWords(); renderCard(); }
  else if (currentMode === 'quiz') { updateFilteredWords(); generateQuiz(); renderQuizQuestion(); }
  updateUI();
}

document.getElementById('btnZh').addEventListener('click', () => switchLang('zh'));
document.getElementById('btnEn').addEventListener('click', () => switchLang('en'));

// ============================================================
// Storage
// ============================================================
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function normalizeWordsData(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const levels = ['beginner', 'intermediate', 'advanced'];
    let combined = [];
    levels.forEach((level) => {
      if (Array.isArray(raw[level])) {
        const arr = raw[level].map((w) => (w.level ? w : Object.assign({}, w, { level })));
        combined = combined.concat(arr);
      }
    });
    if (combined.length === 0) {
      Object.values(raw).forEach((v) => { if (Array.isArray(v)) combined = combined.concat(v); });
    }
    return combined;
  }
  return [];
}

function saveProgress(progress) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
  catch {}
}

// ============================================================
// Daily Tracking
// ============================================================
function getToday() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function initDailyTracking() {
  const p = loadProgress();
  const today = getToday();

  if (p.lastStudyDate !== today) {
    p.lastStudyDate = today;
    p.dailyStudied = 0;
    p.checkinDone = false;
    // Check if streak was broken
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (p.lastCheckinDate !== yesterday && p.lastCheckinDate !== today) {
      p.streak = 0;
    }
  }

  dailyStudied = p.dailyStudied || 0;
  checkinDone = p.checkinDone || false;

  if (!p.streak) p.streak = 0;
  if (!p.totalQuizAnswers) p.totalQuizAnswers = 0;
  if (!p.totalQuizCorrect) p.totalQuizCorrect = 0;

  saveProgress(p);
}

function recordStudy(wordId) {
  const p = loadProgress();
  if (!p.learned) p.learned = [];
  if (!p.learned.includes(wordId)) p.learned.push(wordId);
  if (!p.score) p.score = 0;
  p.score += 1;
  totalScore = p.score;

  const today = getToday();
  if (p.lastStudyDate !== today) {
    p.lastStudyDate = today;
    p.dailyStudied = 0;
    p.checkinDone = false;
  }
  p.dailyStudied = (p.dailyStudied || 0) + 1;
  dailyStudied = p.dailyStudied;
  checkinDone = p.checkinDone || false;

  saveProgress(p);
  updateScore();
  updateCheckinUI();
}

function addQuizScore() {
  const p = loadProgress();
  if (!p.score) p.score = 0;
  p.score += 1;
  totalScore = p.score;

  if (!p.totalQuizAnswers) p.totalQuizAnswers = 0;
  if (!p.totalQuizCorrect) p.totalQuizCorrect = 0;
  p.totalQuizAnswers += 1;
  p.totalQuizCorrect += 1;

  const today = getToday();
  if (p.lastStudyDate !== today) {
    p.lastStudyDate = today;
    p.dailyStudied = 0;
    p.checkinDone = false;
  }
  p.dailyStudied = (p.dailyStudied || 0) + 1;
  dailyStudied = p.dailyStudied;
  checkinDone = p.checkinDone || false;

  saveProgress(p);
  updateScore();
  updateCheckinUI();
}

function addWrongAnswer() {
  const p = loadProgress();
  if (!p.totalQuizAnswers) p.totalQuizAnswers = 0;
  p.totalQuizAnswers += 1;
  saveProgress(p);
}

// ============================================================
// Check-in
// ============================================================
function doCheckin() {
  if (checkinDone) return;
  const p = loadProgress();
  const today = getToday();

  p.checkinDone = true;
  checkinDone = true;

  // Update streak
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (p.lastCheckinDate === yesterday) {
    p.streak = (p.streak || 0) + 1;
  } else if (p.lastCheckinDate !== today) {
    p.streak = 1;
  }
  p.lastCheckinDate = today;

  saveProgress(p);
  updateCheckinUI();
  showToast(currentLang === 'zh'
    ? `打卡成功！连续 ${p.streak} 天`
    : `Checked in! ${p.streak}-day streak`);
}

function updateCheckinUI() {
  const p = loadProgress();
  const streak = p.streak || 0;

  streakText.textContent = t(streakText, currentLang, streak);
  checkinStudied.textContent = t(checkinStudied, currentLang, dailyStudied);

  if (checkinDone) {
    checkinBtn.disabled = true;
    checkinBtn.classList.add('checked-in');
    checkinBtn.querySelector('span').textContent = currentLang === 'zh' ? '已打卡' : 'Done';
  } else if (dailyStudied >= 5) {
    checkinBtn.disabled = false;
    checkinBtn.classList.remove('checked-in');
    checkinBtn.querySelector('span').textContent = currentLang === 'zh' ? '打卡' : 'Check In';
  } else {
    checkinBtn.disabled = true;
    checkinBtn.classList.remove('checked-in');
    checkinBtn.querySelector('span').textContent = currentLang === 'zh' ? '打卡' : 'Check In';
  }
}

checkinBtn.addEventListener('click', doCheckin);

// ============================================================
// Stats Panel
// ============================================================
function updateStats() {
  const p = loadProgress();
  const total = filtered.length;
  const mastered = p.learned ? [...new Set(p.learned.filter(id => filtered.some(w => w.id === id)))].length : 0;
  const totalAns = p.totalQuizAnswers || 0;
  const totalCor = p.totalQuizCorrect || 0;
  const accuracy = totalAns > 0 ? Math.round((totalCor / totalAns) * 100) + '%' : '--';

  $('#statTotal').textContent = total;
  $('#statMastered').textContent = mastered;
  $('#statAccuracy').textContent = accuracy;
}

function toggleStats() {
  statsPanel.classList.toggle('hidden');
  if (!statsPanel.classList.contains('hidden')) updateStats();
}

$('#statsTrigger').addEventListener('click', toggleStats);
$('#statsClose').addEventListener('click', () => statsPanel.classList.add('hidden'));

// ============================================================
// Category Filter
// ============================================================
function updateFilteredWords() {
  let base = Array.isArray(words) ? [...words] : [];
  if (currentCategory !== 'all') {
    base = base.filter((w) => w.category === currentCategory);
  }
  if (currentLevel !== 'all') {
    base = base.filter((w) => (w.level || '').toString() === currentLevel);
  }
  filtered = base;
  categoryCount.textContent = t(categoryCount, currentLang, filtered.length);
}

categorySelect.addEventListener('change', () => {
  currentCategory = categorySelect.value;
  updateFilteredWords();
  currentCardIndex = 0;
  if (currentMode === 'flashcard') renderCard();
  else if (currentMode === 'quiz') { generateQuiz(); renderQuizQuestion(); }
  updateStats();
});

levelSelect && levelSelect.addEventListener('change', () => {
  currentLevel = levelSelect.value;
  updateFilteredWords();
  currentCardIndex = 0;
  if (currentMode === 'flashcard') renderCard();
  else if (currentMode === 'quiz') { generateQuiz(); renderQuizQuestion(); }
  updateStats();
});

// ============================================================
// Score
// ============================================================
function updateScore() {
  scoreText.textContent = t(scoreText, currentLang, totalScore);
}

function updateUI() {
  updateScore();
  updateCheckinUI();
  updateStats();
}

// ============================================================
// Flashcard
// ============================================================
function updateFlashcardUI() {
  const total = filtered.length;
  if (total === 0) {
    flashcardProgress.style.width = '0%';
    flashcardProgressText.textContent = currentLang === 'zh' ? '暂无单词' : 'No words';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }
  flashcardProgress.style.width = `${((currentCardIndex + 1) / total) * 100}%`;
  flashcardProgressText.textContent = t(flashcardProgressText, currentLang, currentCardIndex + 1, total);
  prevBtn.disabled = currentCardIndex === 0;
  nextBtn.disabled = currentCardIndex >= total - 1;
}

function renderCard() {
  if (filtered.length === 0) { updateFlashcardUI(); return; }
  if (currentCardIndex >= filtered.length) currentCardIndex = 0;
  const w = filtered[currentCardIndex];
  flashcard.classList.remove('flipped');
  cardWord.textContent = currentLang === 'zh' ? w.en : w.zh;
  cardMeaning.textContent = currentLang === 'zh' ? w.zh : w.en;
  cardPart.textContent = w.part || '';
  updateFlashcardUI();
  recordStudy(w.id);
}

function prevCard() { if (currentCardIndex > 0) { currentCardIndex--; renderCard(); } }
function nextCard() { if (currentCardIndex < filtered.length - 1) { currentCardIndex++; renderCard(); } }

flashcard.addEventListener('click', () => flashcard.classList.toggle('flipped'));
prevBtn.addEventListener('click', prevCard);
nextBtn.addEventListener('click', nextCard);

document.addEventListener('keydown', (e) => {
  if (currentMode !== 'flashcard') return;
  if (e.key === 'ArrowLeft') prevCard();
  if (e.key === 'ArrowRight') nextCard();
  if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); flashcard.classList.toggle('flipped'); }
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
  if (filtered.length === 0) { quizQuestions = []; return; }
  quizQuestions = filtered.map((w) => {
    const others = filtered.filter(x => x.id !== w.id);
    const pool = others.length >= 3 ? shuffle(others).slice(0, 3) : shuffle([...others, ...filtered.filter(x => x.id !== w.id && !others.includes(x))]).slice(0, 3);
    const distractors = pool.map(x => currentLang === 'zh' ? x.zh : x.en);
    const correct = currentLang === 'zh' ? w.zh : w.en;
    const options = shuffle([...distractors, correct]);
    return { word: w, wordText: currentLang === 'zh' ? w.en : w.zh, correct, options };
  });
  quizQuestions = shuffle(quizQuestions);
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
  if (quizQuestions.length === 0) {
    quizWord.textContent = '--';
    quizOptions.innerHTML = '';
    updateQuizUI();
    return;
  }
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
  // Reset next button text
  quizNextBtn.querySelector('span').textContent = currentLang === 'zh' ? '下一题' : 'Next Question';
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
    addWrongAnswer();
  }

  updateQuizUI();

  if (quizIndex >= quizQuestions.length - 1) {
    quizNextBtn.querySelector('span').textContent = currentLang === 'zh' ? '查看结果' : 'Show Results';
  }
}

function nextQuiz() {
  if (!quizAnswered) return;
  if (quizIndex >= quizQuestions.length - 1) { showResult(); return; }
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
  updateStats();
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
    currentCardIndex = 0;
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
// Init
// ============================================================
async function init() {
  try {
    const resp = await fetch('words.json');
    const raw = await resp.json();
    words = normalizeWordsData(raw);
  } catch (e) {
    console.error('Failed to load words.json', e);
    words = [];
  }

  const p = loadProgress();
  totalScore = p.score || 0;
  initDailyTracking();

  updateFilteredWords();
  updateScore();
  updateCheckinUI();
  switchMode('flashcard');
}

init();