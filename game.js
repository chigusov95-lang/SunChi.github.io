/*
 * game.js — уровни, состояние, управление (мышь, касания, клавиатура), игровой цикл.
 *
 * Состояния: ready (можно вращать зеркала), running (луч летит),
 *            completed (шарик лопнул), blocked (промах, можно изменить зеркало).
 *
 * Управление:
 *   клик / касание зеркала — выбрать и повернуть на 90°
 *   стрелки ← / →          — повернуть выбранное зеркало
 *   стрелки ↑ / ↓          — выбрать другое зеркало
 *   пробел / Enter         — запустить луч (после победы — следующий уровень)
 *   R                      — начать уровень заново
 *   на телефоне — кнопки под полем
 */
(function () {
  'use strict';

  var P = window.SunPhysics;
  var R = window.SunRender;
  var A = window.SunAnim;
  var E = window.SunEnv;
  var LEVELS = window.SunLevels;

  var canvas = document.getElementById('board');
  var ctx = canvas.getContext('2d');
  var statusEl = document.getElementById('status');
  var levelLabel = document.getElementById('levelLabel');
  var runBtn = document.getElementById('runBtn');
  var resetBtn = document.getElementById('resetBtn');
  var rotBtn = document.getElementById('rotBtn');
  var selPrevBtn = document.getElementById('selPrev');
  var selNextBtn = document.getElementById('selNext');
  var prevLevelBtn = document.getElementById('prevLevel');
  var nextLevelBtn = document.getElementById('nextLevel');

  var levelIndex = 0;
  var level = LEVELS[0];
  var lay;
  var W = 1200;
  var H = 720;

  var state = 'ready';
  var mirrors = {};      // текущие положения зеркал
  var mirrorKeys = [];   // ключи зеркал для выбора
  var selected = 0;      // индекс выбранного зеркала
  var lastTrace = null;  // результат расчёта луча
  var litCells = {};     // зеркала, в которые попал луч

  // Прогресс: индекс самого дальнего открытого уровня (хранится в браузере)
  var STORAGE_KEY = 'sunchi.unlocked';
  var WIN_DELAY = 2200;   // пауза перед переходом на следующий уровень, мс
  var FAIL_DELAY = 1600;  // пауза перед автоматическим перезапуском, мс
  var timer = null;
  var unlocked = readProgress();

  function readProgress() {
    try {
      var v = parseInt(window.localStorage.getItem(STORAGE_KEY), 10);
      if (v >= 0 && v < LEVELS.length) return v;
    } catch (e) { /* хранилище может быть недоступно — играем без сохранения */ }
    return 0;
  }

  function saveProgress() {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(unlocked));
    } catch (e) { /* без сохранения */ }
  }

  // Кнопки уровней: назад — всегда, вперёд — только к уже открытым уровням
  function updateNav() {
    prevLevelBtn.disabled = levelIndex === 0;
    nextLevelBtn.disabled = levelIndex >= LEVELS.length - 1 || levelIndex >= unlocked;
  }

  function setStatus(text) {
    statusEl.textContent = text;
    fitCanvas();
  }

  function canEdit() {
    return state === 'ready';
  }

  function setState(s) {
    state = s;
    var editable = canEdit();
    runBtn.disabled = s === 'running' || s === 'blocked';
    rotBtn.disabled = !editable;
    selPrevBtn.disabled = !editable || mirrorKeys.length < 2;
    selNextBtn.disabled = !editable || mirrorKeys.length < 2;
    if (s === 'completed') {
      runBtn.textContent = levelIndex < LEVELS.length - 1 ? 'Следующий уровень ▶' : 'Начать сначала';
    } else {
      runBtn.textContent = 'Запустить луч';
    }
  }

  /* ---------- Размер холста: широкий для компьютера, высокий для телефона ---------- */

  function fitCanvas() {
    var wrap = canvas.parentElement;
    var availW = wrap.clientWidth;
    var reserved = 0;
    Array.prototype.forEach.call(wrap.children, function (el) {
      if (el !== canvas) reserved += el.offsetHeight + 8;
    });
    var availH = Math.max(260, window.innerHeight - reserved - 24);
    var scale = Math.min(availW / W, availH / H);
    scale = Math.max(scale, 0.25);
    canvas.style.width = Math.floor(W * scale) + 'px';
    canvas.style.height = Math.floor(H * scale) + 'px';
  }

  function applyLayout() {
    var wide = window.innerWidth >= window.innerHeight * 0.95;
    var nw = wide ? 1200 : 720;
    var nh = wide ? 720 : 1000;
    if (canvas.width !== nw || canvas.height !== nh) {
      canvas.width = nw;
      canvas.height = nh;
    }
    W = nw;
    H = nh;
    lay = R.layout(W, H, level);
    E.setSize(W, H, lay.ground);
    fitCanvas();
  }

  /* ---------- Уровни ---------- */

  // message — необязательный текст статуса (например, после автоматического перезапуска)
  function loadLevel(i, message) {
    clearTimeout(timer);
    // нельзя открыть уровень, который ещё не пройден предыдущий
    levelIndex = Math.max(0, Math.min(LEVELS.length - 1, unlocked, i));
    level = LEVELS[levelIndex];
    levelLabel.textContent = 'Уровень ' + (levelIndex + 1) + ' / ' + LEVELS.length;
    updateNav();

    mirrors = {};
    mirrorKeys = [];
    level.mirrors.forEach(function (m) {
      var k = m.x + ',' + m.y;
      mirrors[k] = m.start;
      mirrorKeys.push(k);
    });
    selected = 0;
    lastTrace = null;
    litCells = {};
    A.reset();
    applyLayout();
    setState('ready');
    setStatus(message || (levelIndex === 0
      ? 'Поверните зеркало (касание или ← →) и запустите луч, чтобы лопнуть шарик.'
      : 'Облака луч не пропускают — обойдите их зеркалами.'));
  }

  // Возврат текущего уровня к исходному состоянию
  function resetLevel() {
    loadLevel(levelIndex);
  }

  // Поворот выбранного зеркала на 90 градусов: «/» <-> «\»
  function rotateSelected() {
    if (!canEdit() || !mirrorKeys.length) return;
    var k = mirrorKeys[selected];
    mirrors[k] = mirrors[k] === '/' ? '\\' : '/';
    lastTrace = null;
    litCells = {};
    A.reset();
    setState('ready');
    setStatus('Зеркало повернуто. Запустите луч.');
  }

  function selectMirror(step) {
    if (!canEdit() || mirrorKeys.length < 2) return;
    selected = (selected + step + mirrorKeys.length) % mirrorKeys.length;
  }

  function runBeam() {
    if (!canEdit()) return;

    // Сначала считаем маршрут полностью (physics.js), потом только проигрываем его
    lastTrace = P.traceBeam(level, mirrors);

    litCells = {};
    lastTrace.path.forEach(function (p) {
      var k = p.x + ',' + p.y;
      if (mirrors[k]) litCells[k] = true;
    });

    setState('running');
    setStatus('Луч летит…');
    A.playBeam(lastTrace.path, onBeamDone);
  }

  // Главная кнопка: запустить луч или перейти дальше после победы
  function primaryAction() {
    if (state === 'completed') {
      loadLevel(levelIndex < LEVELS.length - 1 ? levelIndex + 1 : 0);
    } else {
      runBeam();
    }
  }

  // Вызывается, когда анимация луча закончилась
  function onBeamDone() {
    if (lastTrace.result === 'hit') {
      // Победа: открываем следующий уровень и переходим на него автоматически
      setState('completed');
      var c = R.cellCenter(lay, level.balloon.x, level.balloon.y);
      A.burst(c.px, c.py);
      if (levelIndex < LEVELS.length - 1) {
        if (unlocked < levelIndex + 1) {
          unlocked = levelIndex + 1;
          saveProgress();
        }
        updateNav();
        setStatus('Шарик лопнул! Переходим на следующий уровень…');
        timer = setTimeout(function () { loadLevel(levelIndex + 1); }, WIN_DELAY);
      } else {
        setStatus('Шарик лопнул! Все ' + LEVELS.length + ' уровней пройдены!');
      }
    } else {
      // Неудача: уровень автоматически начинается заново
      var why = lastTrace.result === 'loop' ? 'Луч зациклился.'
        : lastTrace.reason === 'cloud' ? 'Луч упёрся в облако.'
        : 'Луч ушёл за край поля.';
      setState('blocked');
      setStatus(why + ' Начинаем уровень заново…');
      timer = setTimeout(function () {
        loadLevel(levelIndex, 'Уровень начат заново. Попробуйте ещё раз!');
      }, FAIL_DELAY);
    }
  }

  /* ---------- Ввод ---------- */

  // Касание или клик по полю: выбрать и повернуть зеркало
  canvas.addEventListener('click', function (ev) {
    if (!canEdit()) return;
    var rect = canvas.getBoundingClientRect();
    var sx = (ev.clientX - rect.left) * (canvas.width / rect.width);
    var sy = (ev.clientY - rect.top) * (canvas.height / rect.height);
    var cell = R.screenToCell(lay, level, sx, sy);
    if (!cell) return;
    var idx = mirrorKeys.indexOf(cell.x + ',' + cell.y);
    if (idx < 0) return;
    selected = idx;
    rotateSelected();
  });

  document.addEventListener('keydown', function (ev) {
    var onButton = ev.target && ev.target.tagName === 'BUTTON';
    switch (ev.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
        ev.preventDefault();
        rotateSelected();
        break;
      case 'ArrowUp':
        ev.preventDefault();
        selectMirror(-1);
        break;
      case 'ArrowDown':
        ev.preventDefault();
        selectMirror(1);
        break;
      case ' ':
      case 'Enter':
        if (onButton) return;   // у кнопки своё действие по пробелу и Enter
        ev.preventDefault();
        primaryAction();
        break;
      case 'r':
      case 'R':
      case 'к':
      case 'К':
        resetLevel();
        break;
    }
  });

  function bind(btn, fn) {
    btn.addEventListener('click', function () {
      fn();
      btn.blur();
    });
  }
  bind(runBtn, primaryAction);
  bind(resetBtn, resetLevel);
  bind(rotBtn, rotateSelected);
  bind(selPrevBtn, function () { selectMirror(-1); });
  bind(selNextBtn, function () { selectMirror(1); });
  bind(prevLevelBtn, function () { loadLevel(levelIndex - 1); });
  bind(nextLevelBtn, function () { loadLevel(levelIndex + 1); });

  // Поворот экрана и изменение размера окна
  var resizeQueued = false;
  function onResize() {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(function () {
      resizeQueued = false;
      applyLayout();
    });
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  /* ---------- Игровой цикл ---------- */

  function frame(now) {
    A.update(now);
    var beam = A.getBeam();

    R.drawFrame(ctx, {
      level: level,
      lay: lay,
      mirrors: mirrors,
      selectedKey: canEdit() ? mirrorKeys[selected] : null,
      popped: state === 'completed',
      celebrate: state === 'completed',
      time: now / 1000,
      beamPath: lastTrace ? lastTrace.path : null,
      beamProgress: beam ? beam.progress : (lastTrace ? 1 : 0),
      litCells: litCells,
      effects: A.getEffects()
    });

    requestAnimationFrame(frame);
  }

  // Продолжаем с самого дальнего открытого уровня
  loadLevel(unlocked);
  requestAnimationFrame(frame);
})();
