/**
 * COFFEE CRAFT - 味わい診断ロジック
 *
 * 構造:
 *  - SCORING_TABLE: 各質問×選択肢の5軸スコア（JSON形式、後から差し替え可能）
 *  - Quiz UI: 1問ずつ遷移、戻る対応、localStorage保持
 *  - Matching: ユークリッド距離（二乗和）で最寄りの豆を選出
 */

// ===================================
// 採点テーブル（管理者が後で調整可能）
// 各選択肢: { acidity, sweetness, bitterness, body, aroma } (1〜5)
// ===================================
const SCORING_TABLE = {
  q1: {
    question: "好きな果物は？",
    options: [
      { label: "ベリー",   acidity: 5, sweetness: 3, bitterness: 1, body: 1, aroma: 5 },
      { label: "桃",       acidity: 4, sweetness: 5, bitterness: 1, body: 2, aroma: 5 },
      { label: "バナナ",   acidity: 2, sweetness: 5, bitterness: 2, body: 5, aroma: 3 },
      { label: "ナッツ",   acidity: 1, sweetness: 2, bitterness: 5, body: 5, aroma: 2 }
    ]
  },
  q2: {
    question: "好きなデザートは？",
    options: [
      { label: "フルーツタルト", acidity: 5, sweetness: 4, bitterness: 1, body: 2, aroma: 4 },
      { label: "プリン",         acidity: 2, sweetness: 5, bitterness: 1, body: 4, aroma: 3 },
      { label: "チョコケーキ",   acidity: 1, sweetness: 3, bitterness: 4, body: 5, aroma: 3 },
      { label: "ティラミス",     acidity: 2, sweetness: 3, bitterness: 5, body: 4, aroma: 4 }
    ]
  },
  q3: {
    question: "好きな香りは？",
    options: [
      { label: "花",       acidity: 4, sweetness: 4, bitterness: 1, body: 1, aroma: 5 },
      { label: "フルーツ", acidity: 5, sweetness: 3, bitterness: 1, body: 2, aroma: 4 },
      { label: "チョコ",   acidity: 1, sweetness: 3, bitterness: 4, body: 4, aroma: 4 },
      { label: "木",       acidity: 1, sweetness: 1, bitterness: 5, body: 5, aroma: 3 }
    ]
  },
  q4: {
    question: "集中するならどこ？",
    options: [
      { label: "明るい場所",       acidity: 5, sweetness: 3, bitterness: 1, body: 1, aroma: 4 },
      { label: "静かな場所",       acidity: 3, sweetness: 4, bitterness: 2, body: 3, aroma: 3 },
      { label: "音楽のある場所",   acidity: 2, sweetness: 3, bitterness: 3, body: 4, aroma: 4 },
      { label: "暗い落ち着いた場所", acidity: 1, sweetness: 2, bitterness: 5, body: 5, aroma: 3 }
    ]
  },
  q5: {
    question: "朝の理想は？",
    options: [
      { label: "窓を開ける爽やかな朝", acidity: 5, sweetness: 3, bitterness: 1, body: 1, aroma: 5 },
      { label: "静かな朝",             acidity: 3, sweetness: 4, bitterness: 2, body: 3, aroma: 3 },
      { label: "音楽のある朝",         acidity: 2, sweetness: 4, bitterness: 3, body: 3, aroma: 4 },
      { label: "深く考える朝",         acidity: 1, sweetness: 2, bitterness: 5, body: 5, aroma: 3 }
    ]
  },
  q6: {
    question: "コーヒーに求めるものは？",
    options: [
      { label: "リフレッシュ", acidity: 5, sweetness: 2, bitterness: 1, body: 1, aroma: 5 },
      { label: "癒し",         acidity: 3, sweetness: 5, bitterness: 1, body: 3, aroma: 4 },
      { label: "満足感",       acidity: 2, sweetness: 3, bitterness: 3, body: 5, aroma: 3 },
      { label: "覚醒",         acidity: 1, sweetness: 1, bitterness: 5, body: 5, aroma: 2 }
    ]
  }
};

const QUESTION_KEYS = Object.keys(SCORING_TABLE);
const TOTAL_QUESTIONS = QUESTION_KEYS.length;
const AXES = ['acidity', 'sweetness', 'bitterness', 'body', 'aroma'];
const AXES_JP = { acidity: '酸味', sweetness: '甘味', bitterness: '苦み', body: 'コク', aroma: '香り' };
const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const STORAGE_KEY = 'coffeecraft_diagnosis';

// ===================================
// State
// ===================================
let currentIndex = 0;
let answers = {}; // { q1: 0, q2: 2, ... } (選択肢のindex)

// ===================================
// DOM Elements
// ===================================
const quizScreen = document.getElementById('quizScreen');
const resultScreen = document.getElementById('resultScreen');
const progressFill = document.getElementById('progressFill');
const currentQEl = document.getElementById('currentQ');
const qNumber = document.getElementById('qNumber');
const qText = document.getElementById('qText');
const qOptions = document.getElementById('qOptions');
const btnBack = document.getElementById('btnBack');
const btnRetry = document.getElementById('btnRetry');

// ===================================
// Init
// ===================================
function init() {
  loadState();
  renderQuestion();
  btnBack.addEventListener('click', goBack);
  btnRetry.addEventListener('click', retry);
}

// ===================================
// LocalStorage
// ===================================
function saveState() {
  const state = { currentIndex, answers };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const state = JSON.parse(saved);
      currentIndex = state.currentIndex || 0;
      answers = state.answers || {};
      if (currentIndex >= TOTAL_QUESTIONS) {
        currentIndex = 0;
        answers = {};
      }
    }
  } catch (e) {
    currentIndex = 0;
    answers = {};
  }
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

// ===================================
// Render Question
// ===================================
function renderQuestion() {
  const key = QUESTION_KEYS[currentIndex];
  const q = SCORING_TABLE[key];

  // Progress
  progressFill.style.width = ((currentIndex + 1) / TOTAL_QUESTIONS * 100) + '%';
  currentQEl.textContent = currentIndex + 1;

  // Question
  qNumber.textContent = 'Q' + (currentIndex + 1);
  qText.textContent = q.question;

  // Options
  qOptions.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'dx-option';
    if (answers[key] === i) {
      btn.classList.add('is-selected');
    }
    btn.innerHTML = `
      <span class="dx-option__label">${OPTION_LABELS[i]}</span>
      <span>${opt.label}</span>
    `;
    btn.addEventListener('click', () => selectOption(key, i));
    qOptions.appendChild(btn);
  });

  // Back button
  btnBack.disabled = currentIndex === 0;

  // Animation
  const card = document.getElementById('questionCard');
  card.style.animation = 'none';
  card.offsetHeight; // reflow
  card.style.animation = 'fadeInUp 0.35s ease';

  saveState();
}

// ===================================
// Select Option
// ===================================
function selectOption(key, index) {
  answers[key] = index;

  // Visual feedback
  const buttons = qOptions.querySelectorAll('.dx-option');
  buttons.forEach((btn, i) => {
    btn.classList.toggle('is-selected', i === index);
  });

  // Auto-advance after short delay
  setTimeout(() => {
    if (currentIndex < TOTAL_QUESTIONS - 1) {
      currentIndex++;
      renderQuestion();
    } else {
      showResult();
    }
  }, 300);
}

// ===================================
// Navigation
// ===================================
function goBack() {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
  }
}

function retry() {
  currentIndex = 0;
  answers = {};
  clearState();
  resultScreen.style.display = 'none';
  quizScreen.style.display = '';
  renderQuestion();
}

// ===================================
// Calculate Score
// ===================================
function calculateScore() {
  const totals = { acidity: 0, sweetness: 0, bitterness: 0, body: 0, aroma: 0 };

  QUESTION_KEYS.forEach(key => {
    const choiceIndex = answers[key];
    if (choiceIndex !== undefined) {
      const scores = SCORING_TABLE[key].options[choiceIndex];
      AXES.forEach(axis => {
        totals[axis] += scores[axis];
      });
    }
  });

  // 合計 ÷ 6（質問数で割る）
  const avgScores = {};
  AXES.forEach(axis => {
    avgScores[axis] = totals[axis] / TOTAL_QUESTIONS;
  });

  return avgScores;
}

// ===================================
// Match Beans (Euclidean distance squared)
// ===================================
function matchBeans(userScores, topN) {
  topN = topN || 3;

  const results = COFFEE_BEANS_DB.map(bean => {
    let distance = 0;
    AXES.forEach(axis => {
      const diff = userScores[axis] - bean[axis];
      distance += diff * diff;
    });
    return { bean, distance };
  });

  results.sort((a, b) => a.distance - b.distance);
  return results.slice(0, topN);
}

// ===================================
// Show Result
// ===================================
function showResult() {
  const userScores = calculateScore();
  const top3 = matchBeans(userScores, 3);

  // Switch screens
  quizScreen.style.display = 'none';
  resultScreen.style.display = '';

  // Best match
  const best = top3[0].bean;
  document.getElementById('resultCountry').textContent = best.country;
  document.getElementById('resultName').textContent = best.name;
  document.getElementById('resultRoast').textContent = '推奨焙煎度：' + best.roast;

  // Taste chart (display order: aroma, sweetness, acidity, bitterness, body)
  const displayOrder = ['aroma', 'sweetness', 'acidity', 'bitterness', 'body'];
  const chartEl = document.getElementById('resultChart');
  chartEl.innerHTML = '';
  displayOrder.forEach(axis => {
    const rounded = Math.round(userScores[axis]);
    const pct = (userScores[axis] / 5 * 100);
    const row = document.createElement('div');
    row.className = 'dx-chart-row';
    row.innerHTML = `
      <span class="dx-chart-row__label">${AXES_JP[axis]}</span>
      <div class="dx-chart-row__bar-wrap">
        <div class="dx-chart-row__bar" style="width: 0%"></div>
      </div>
      <span class="dx-chart-row__value">${rounded}</span>
    `;
    chartEl.appendChild(row);

    // Animate bar
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        row.querySelector('.dx-chart-row__bar').style.width = pct + '%';
      });
    });
  });

  // Runners up
  const runnersList = document.getElementById('runnersList');
  runnersList.innerHTML = '';
  top3.slice(1).forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'dx-runner';
    div.innerHTML = `
      <span class="dx-runner__rank">${i + 2}位</span>
      <span class="dx-runner__name">${item.bean.name}</span>
      <span class="dx-runner__country">${item.bean.country}</span>
    `;
    runnersList.appendChild(div);
  });

  clearState();

  // Scroll to top
  window.scrollTo(0, 0);
}

// ===================================
// Start
// ===================================
document.addEventListener('DOMContentLoaded', init);
