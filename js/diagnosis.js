/* ===================================
   COFFEE CRAFT - 時間帯別コーヒー診断
   =================================== */

(function () {
  'use strict';

  // ========== 定数 ==========
  var STORAGE_KEY = 'coffeecraft_diagnosis';
  var AXES = ['aroma', 'sweetness', 'acidity', 'bitterness', 'body'];
  var AXES_JP = { aroma: '香り', sweetness: '甘味', acidity: '酸味', bitterness: '苦み', body: 'コク' };
  var SLOTS = ['morning', 'day', 'night'];
  var SLOT_LABELS = { morning: 'MORNING', day: 'DAY', night: 'NIGHT' };
  var FRESHNESS_PRIMARY_DAYS = 30;
  var FRESHNESS_FALLBACK_DAYS = 60;
  var MIN_STOCK_GRAMS = 150;

  // ========== 質問定義（仕様通り） ==========
  var QUIZ_QUESTIONS = [
    {
      key: 'q1',
      slot: 'morning',
      question: '朝のコーヒーは、どんな始まりにしたいですか？',
      options: [
        { label: 'ゆっくりと、一日を始めたい',           target: { aroma: 4, sweetness: 4, acidity: 2, bitterness: 1, body: 3 } },
        { label: 'すっと気持ちを切り替えて動き出したい', target: { aroma: 3, sweetness: 2, acidity: 5, bitterness: 2, body: 2 } },
        { label: '頭の中をクリアにして始めたい',         target: { aroma: 3, sweetness: 2, acidity: 4, bitterness: 2, body: 1 } },
        { label: '気分を整えながら始めたい',             target: { aroma: 4, sweetness: 3, acidity: 3, bitterness: 1, body: 3 } }
      ]
    },
    {
      key: 'q2',
      slot: 'day',
      question: '日中のコーヒーは、どんな時間に寄り添ってほしいですか？',
      options: [
        { label: '集中して取り組む時間に',             target: { aroma: 2, sweetness: 1, acidity: 2, bitterness: 5, body: 3 } },
        { label: '今の状態を保ちながら進めたい時間に', target: { aroma: 2, sweetness: 2, acidity: 2, bitterness: 2, body: 2 } },
        { label: '気持ちを切り替えたい時間に',         target: { aroma: 3, sweetness: 2, acidity: 4, bitterness: 2, body: 1 } },
        { label: '落ち着いて向き合いたい時間に',       target: { aroma: 3, sweetness: 3, acidity: 2, bitterness: 3, body: 4 } }
      ]
    },
    {
      key: 'q3',
      slot: 'night',
      question: '夜のコーヒーは、どんな時間にしたいですか？',
      options: [
        { label: '一日をほどきながら、ゆっくり過ごしたい', target: { aroma: 5, sweetness: 5, acidity: 1, bitterness: 1, body: 4 } },
        { label: '自分の時間を楽しみたい',                 target: { aroma: 5, sweetness: 4, acidity: 2, bitterness: 1, body: 3 } },
        { label: '気持ちを落ち着けたい',                   target: { aroma: 4, sweetness: 4, acidity: 1, bitterness: 1, body: 5 } },
        { label: 'もう少しだけ、静かに続けたい',           target: { aroma: 3, sweetness: 2, acidity: 2, bitterness: 3, body: 2 } }
      ]
    },
    {
      key: 'q4',
      slot: null,
      skippable: true,
      question: 'コーヒーを選ぶとき、どちらを大切にしますか？',
      options: [
        { label: '香りを楽しみたい',             weights: { aroma: 1.3, sweetness: 1, acidity: 1, bitterness: 1, body: 1 } },
        { label: 'すっきりと飲みたい',           weights: { aroma: 1, sweetness: 1, acidity: 1, bitterness: 1.3, body: 1.3 } },
        { label: 'しっかりとした味わいが好き',   weights: { aroma: 1, sweetness: 1, acidity: 1, bitterness: 1.3, body: 1.3 } },
        { label: 'バランスの取れた味わいが好き', weights: { aroma: 1, sweetness: 1, acidity: 1, bitterness: 1, body: 1 } }
      ]
    }
  ];

  var DEFAULT_WEIGHTS = { aroma: 1, sweetness: 1, acidity: 1, bitterness: 1, body: 1 };

  // ========== 純粋関数群（DOM依存なし） ==========

  function buildTargetProfiles(answers) {
    var profiles = {};
    for (var i = 0; i < 3; i++) {
      var q = QUIZ_QUESTIONS[i];
      var idx = answers[q.key];
      if (idx !== undefined && idx !== null) {
        var t = q.options[idx].target;
        profiles[q.slot] = { aroma: t.aroma, sweetness: t.sweetness, acidity: t.acidity, bitterness: t.bitterness, body: t.body };
      }
    }
    return profiles;
  }

  function getWeights(q4Answer) {
    if (q4Answer === null || q4Answer === undefined) {
      return { aroma: 1, sweetness: 1, acidity: 1, bitterness: 1, body: 1 };
    }
    var w = QUIZ_QUESTIONS[3].options[q4Answer].weights;
    return { aroma: w.aroma, sweetness: w.sweetness, acidity: w.acidity, bitterness: w.bitterness, body: w.body };
  }

  function filterBeans(beans, constraints) {
    var minStock = constraints.minStock;
    var maxAgeDays = constraints.maxAgeDays;
    var refTime = constraints.referenceDate.getTime();
    var dayMs = 86400000;
    return beans.filter(function (bean) {
      if (bean.stockGrams < minStock) return false;
      var roastTime = new Date(bean.roastDate).getTime();
      var ageDays = Math.floor((refTime - roastTime) / dayMs);
      return ageDays >= 0 && ageDays <= maxAgeDays;
    });
  }

  function computeDistance(bean, target, weights) {
    var distance = 0;
    for (var i = 0; i < AXES.length; i++) {
      var axis = AXES[i];
      distance += weights[axis] * Math.abs(bean[axis] - target[axis]);
    }
    return distance;
  }

  function pickBestBean(candidates, target, weights) {
    if (candidates.length === 0) return null;
    var bestBean = null;
    var bestDist = Infinity;
    for (var i = 0; i < candidates.length; i++) {
      var d = computeDistance(candidates[i], target, weights);
      if (d < bestDist) {
        bestDist = d;
        bestBean = candidates[i];
      }
    }
    return bestBean;
  }

  function generateCopy(slot, target, bean) {
    var sorted = AXES.slice().sort(function (a, b) { return target[b] - target[a]; });
    var top1Jp = AXES_JP[sorted[0]];
    var top2Jp = AXES_JP[sorted[1]];

    var slotDesc = {
      morning: { context: '朝の時間', suggest: '最初の一杯は、香りをひと呼吸してから。' },
      day:     { context: '日中のひととき', suggest: '気分に合わせて、温度を変えても楽しめます。' },
      night:   { context: '夜のくつろぎ', suggest: 'お気に入りの器で、ゆっくりとお楽しみください。' }
    };

    return {
      line1: slotDesc[slot].context + 'に向いた味わいです。',
      line2: top1Jp + 'と' + top2Jp + 'が特徴的なタイプ。',
      line3: slotDesc[slot].suggest
    };
  }

  function computeResults(answers, beans, now) {
    var profiles = buildTargetProfiles(answers);
    var weights = getWeights(answers.q4);

    var candidates = filterBeans(beans, { minStock: MIN_STOCK_GRAMS, maxAgeDays: FRESHNESS_PRIMARY_DAYS, referenceDate: now });
    if (candidates.length === 0) {
      candidates = filterBeans(beans, { minStock: MIN_STOCK_GRAMS, maxAgeDays: FRESHNESS_FALLBACK_DAYS, referenceDate: now });
    }
    if (candidates.length === 0) return null;

    var results = {};
    for (var i = 0; i < SLOTS.length; i++) {
      var slot = SLOTS[i];
      var target = profiles[slot];
      var bean = pickBestBean(candidates, target, weights);
      var copy = generateCopy(slot, target, bean);
      results[slot] = { bean: bean, target: target, copy: copy };
    }
    return results;
  }

  // テスト用にグローバル公開
  window._diagnosis = {
    buildTargetProfiles: buildTargetProfiles,
    getWeights: getWeights,
    filterBeans: filterBeans,
    computeDistance: computeDistance,
    pickBestBean: pickBestBean,
    generateCopy: generateCopy,
    computeResults: computeResults
  };

  // ========== UI制御 ==========

  var currentStep = -1;
  var answers = {};

  var startScreen, quizScreen, resultScreen;
  var btnStart, btnBack, btnSkip, btnRetry;
  var progressBar, progressFill, currentQEl;
  var qNumber, qText, qOptions, questionCard;
  var resultCards;

  function cacheDom() {
    startScreen  = document.getElementById('startScreen');
    quizScreen   = document.getElementById('quizScreen');
    resultScreen = document.getElementById('resultScreen');
    btnStart     = document.getElementById('btnStart');
    btnBack      = document.getElementById('btnBack');
    btnSkip      = document.getElementById('btnSkip');
    btnRetry     = document.getElementById('btnRetry');
    progressBar  = document.getElementById('progressBar');
    progressFill = document.getElementById('progressFill');
    currentQEl   = document.getElementById('currentQ');
    qNumber      = document.getElementById('qNumber');
    qText        = document.getElementById('qText');
    qOptions     = document.getElementById('qOptions');
    questionCard = document.getElementById('questionCard');
    resultCards  = document.getElementById('resultCards');
  }

  function showScreen(name) {
    startScreen.style.display  = name === 'start'  ? '' : 'none';
    quizScreen.style.display   = name === 'quiz'   ? '' : 'none';
    resultScreen.style.display = name === 'result'  ? '' : 'none';
  }

  function updateProgress(step) {
    if (step >= 0 && step < 3) {
      progressBar.style.display = '';
      var pct = ((step + 1) / 3) * 100;
      progressFill.style.width = pct + '%';
      currentQEl.textContent = (step + 1) + ' / 3';
    } else {
      progressBar.style.display = 'none';
    }
  }

  function renderQuestion(step) {
    var q = QUIZ_QUESTIONS[step];
    showScreen('quiz');
    updateProgress(step);

    qNumber.textContent = 'Q' + (step + 1);
    qText.textContent = q.question;
    qOptions.innerHTML = '';

    var labels = ['A', 'B', 'C', 'D'];
    for (var i = 0; i < q.options.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'dx-option';
      if (answers[q.key] === i) btn.classList.add('is-selected');
      btn.innerHTML = '<span class="dx-option__label">' + labels[i] + '</span>' +
                      '<span class="dx-option__text">' + q.options[i].label + '</span>';
      btn.addEventListener('click', (function (idx) {
        return function () { selectOption(idx); };
      })(i));
      qOptions.appendChild(btn);
    }

    btnBack.disabled = (step === 0);
    btnSkip.style.display = q.skippable ? '' : 'none';

    questionCard.classList.remove('dx-card--enter');
    void questionCard.offsetWidth;
    questionCard.classList.add('dx-card--enter');
  }

  function selectOption(idx) {
    var q = QUIZ_QUESTIONS[currentStep];
    answers[q.key] = idx;
    saveState();

    var btns = qOptions.querySelectorAll('.dx-option');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('is-selected', i === idx);
    }

    setTimeout(advance, 300);
  }

  function advance() {
    if (currentStep < 3) {
      currentStep++;
      renderQuestion(currentStep);
      saveState();
    } else {
      showResult();
    }
  }

  function goBack() {
    if (currentStep > 0) {
      currentStep--;
      renderQuestion(currentStep);
      saveState();
    } else if (currentStep === 0) {
      currentStep = -1;
      showScreen('start');
      saveState();
    }
  }

  function skipQ4() {
    answers.q4 = null;
    saveState();
    showResult();
  }

  function showResult() {
    var results = computeResults(answers, COFFEE_BEANS_DB, new Date());

    resultCards.innerHTML = '';
    if (!results) {
      resultCards.innerHTML = '<p class="dx-result__empty">現在おすすめできる豆がありません。<br>時期をあらためてお試しください。</p>';
    } else {
      for (var i = 0; i < SLOTS.length; i++) {
        resultCards.appendChild(buildResultCard(SLOTS[i], results[SLOTS[i]]));
      }
    }

    showScreen('result');
    clearState();
  }

  function buildResultCard(slot, data) {
    var card = document.createElement('div');
    card.className = 'dx-slot-card';
    card.setAttribute('data-slot', slot);

    var html = '<p class="dx-slot-card__label">' + SLOT_LABELS[slot] + '</p>';
    html += '<h3 class="dx-slot-card__bean-name">' + data.bean.roasterName + ' ' + data.bean.beanName + '</h3>';

    html += '<div class="dx-slot-card__chart">';
    for (var j = 0; j < AXES.length; j++) {
      var axis = AXES[j];
      var pct = (data.bean[axis] / 5) * 100;
      html += '<div class="dx-chart-row">';
      html += '<span class="dx-chart-row__label">' + AXES_JP[axis] + '</span>';
      html += '<div class="dx-chart-row__bar"><div class="dx-chart-row__fill" style="width:' + pct + '%"></div></div>';
      html += '</div>';
    }
    html += '</div>';

    html += '<div class="dx-slot-card__copy">';
    html += '<p>' + data.copy.line1 + '</p>';
    html += '<p>' + data.copy.line2 + '</p>';
    html += '<p>' + data.copy.line3 + '</p>';
    html += '</div>';

    card.innerHTML = html;
    return card;
  }

  function retry() {
    currentStep = -1;
    answers = {};
    clearState();
    showScreen('start');
  }

  // ========== localStorage ==========

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentStep: currentStep, answers: answers })); } catch (e) {}
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var state = JSON.parse(raw);
      if (state.currentIndex !== undefined || state.currentStep === undefined) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }
      currentStep = state.currentStep;
      answers = state.answers || {};
      return true;
    } catch (e) { return false; }
  }

  function clearState() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  // ========== 初期化 ==========

  function init() {
    cacheDom();
    if (!startScreen) return;

    btnStart.addEventListener('click', function () {
      currentStep = 0;
      renderQuestion(0);
      saveState();
    });
    btnBack.addEventListener('click', goBack);
    btnSkip.addEventListener('click', skipQ4);
    btnRetry.addEventListener('click', retry);

    var restored = loadState();
    if (restored && currentStep >= 0 && currentStep <= 3) {
      renderQuestion(currentStep);
    } else {
      showScreen('start');
    }
  }

  document.addEventListener('DOMContentLoaded', init);

})();
