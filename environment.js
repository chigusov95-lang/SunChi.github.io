/*
 * environment.js — фон игры: небо, горы, облака, лес, деревья, трава.
 * Всё рисуется кодом на Canvas. Ветер: деревья, кусты и трава покачиваются,
 * облака плывут, по небу идут лёгкие полосы ветра.
 *
 * Размер холста задаётся через setSize(): есть широкий (компьютер) и высокий (телефон) вид.
 * Рисуем в «проектных» координатах (земля на y = DG) и масштабируем на весь холст.
 */
(function (root) {
  'use strict';

  var W = 1200;
  var H = 720;
  var GROUND = 636;            // линия травы на холсте (в пикселях)

  var S = 1;                   // масштаб проектных координат
  var DG = 556;                // линия травы в проектных координатах
  var DW = 1049;               // ширина и высота холста в проектных координатах
  var DH = 629;
  var KX = 1;                  // множители для расстановки объектов по ширине и высоте
  var KY = 1;

  var bg = null;
  var blades = [];

  // Детерминированный генератор случайных чисел: лес всегда выглядит одинаково
  function makeRng(seed) {
    var s = seed;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  // Сила ветра 0.1..1: порывы то нарастают, то стихают
  function gust(t) {
    return 0.55 + 0.45 * Math.sin(t * 0.6) * Math.sin(t * 0.23 + 1);
  }

  // Покачивание объекта по ветру (с положительным смещением вправо)
  function sway(t, phase) {
    var g = gust(t);
    return Math.sin(t * 1.3 + phase) * (0.35 + 0.5 * g) + g * 0.6;
  }

  function polygon(g, pts, fill) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  }

  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }

  /* ---------- Размер холста ---------- */

  function setSize(w, h, ground) {
    if (bg && w === W && h === H && ground === GROUND) return;
    W = w;
    H = h;
    GROUND = ground;
    S = Math.min(GROUND / 556, W / 700);
    DG = GROUND / S;
    DW = W / S;
    DH = H / S;
    KX = DW / 1049;
    KY = DG / 556;
    bg = null;
    buildBlades();
  }

  /* ---------- Статичный слой: небо, горы, дальний лес, земля ---------- */

  function buildBackground() {
    var c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    var g = c.getContext('2d');
    g.scale(S, S);

    var kx = DW / 960;       // растягиваем горы по ширине
    var off = DG - 556;      // и сдвигаем вниз к линии земли
    function mp(pts) {
      return pts.map(function (p) { return [p[0] * kx, p[1] + off]; });
    }

    var sky = g.createLinearGradient(0, 0, 0, DG);
    sky.addColorStop(0, '#3a9bc2');
    sky.addColorStop(0.7, '#8fd0e2');
    sky.addColorStop(1, '#bfe6ec');
    g.fillStyle = sky;
    g.fillRect(0, 0, DW, DH);

    // Дальние горы со снежными шапками
    polygon(g, mp([[0, 420], [90, 340], [170, 390], [290, 290], [400, 380], [520, 320], [640, 395],
      [760, 305], [860, 370], [960, 330], [960, 556], [0, 556]]), '#a9d6df');
    [[90, 340], [290, 290], [520, 320], [760, 305]].forEach(function (p) {
      var x = p[0] * kx;
      var y = p[1] + off;
      polygon(g, [[x, y], [x + 24, y + 28], [x + 11, y + 24], [x, y + 36],
        [x - 12, y + 24], [x - 26, y + 30]], '#eaf7f8');
    });

    // Ближние горы
    polygon(g, mp([[0, 455], [120, 405], [240, 448], [350, 398], [470, 452], [600, 412], [720, 456],
      [840, 408], [960, 448], [960, 556], [0, 556]]), '#8bc4d1');

    // Дымка у горизонта
    var haze = g.createLinearGradient(0, 400 + off, 0, DG);
    haze.addColorStop(0, 'rgba(230,245,246,0)');
    haze.addColorStop(1, 'rgba(230,245,246,0.55)');
    g.fillStyle = haze;
    g.fillRect(0, 400 + off, DW, DG - 400 - off);

    // Дальняя полоса маленьких сосен
    var rnd = makeRng(11);
    for (var x = -10; x < DW + 20; x += 26) {
      var h = 44 + rnd() * 40;
      polygon(g, [[x, DG], [x + 14, DG - h], [x + 28, DG]], '#5fa5b3');
      polygon(g, [[x + 12, DG], [x + 26, DG - h * 0.8], [x + 40, DG]], '#4b8fa0');
    }

    // Земля: светлая трава, полоса земли, нижняя трава
    var gr = g.createLinearGradient(0, DG, 0, DH);
    gr.addColorStop(0, '#a6d64a');
    gr.addColorStop(0.25, '#8fc23d');
    gr.addColorStop(1, '#6c9e2e');
    g.fillStyle = gr;
    g.fillRect(0, DG, DW, DH - DG);
    g.fillStyle = '#b0793a';
    g.fillRect(0, DG + 16, DW, 7);
    g.fillStyle = '#8c5a28';
    g.fillRect(0, DG + 21, DW, 3);

    return c;
  }

  /* ---------- Облака ---------- */

  var clouds = [
    { x: 80, y: 70, s: 1.0, v: 9 },
    { x: 340, y: 34, s: 0.8, v: 6 },
    { x: 580, y: 120, s: 1.15, v: 11 },
    { x: 820, y: 58, s: 0.9, v: 7 },
    { x: 200, y: 190, s: 0.65, v: 5 },
    { x: 960, y: 150, s: 0.75, v: 8 }
  ];

  function drawCloud(ctx, x, y, s) {
    var puffs = [[0, 0, 34], [38, -16, 42], [82, -6, 36], [118, 6, 28], [-32, 8, 26], [56, 10, 34]];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = '#c4e2ec';      // нижняя тень
    puffs.forEach(function (p) { circle(ctx, p[0], p[1] + 9, p[2]); ctx.fill(); });
    ctx.fillStyle = '#ffffff';
    puffs.forEach(function (p) { circle(ctx, p[0], p[1], p[2]); ctx.fill(); });
    ctx.restore();
  }

  function drawClouds(ctx, t) {
    clouds.forEach(function (c) {
      var x = ((c.x * KX + t * c.v + 200) % (DW + 400)) - 200;
      drawCloud(ctx, x, c.y * KY, c.s);
    });
  }

  /* ---------- Деревья и кусты ---------- */

  // Сосна: ярусы-треугольники, вершина качается по ветру
  function pine(ctx, x, base, h, t, ph) {
    var sw = sway(t, ph);
    ctx.save();
    ctx.translate(x, base);
    ctx.transform(1, 0, -sw * 0.05, 1, 0, 0);
    ctx.fillStyle = '#6a4430';
    ctx.fillRect(-4, -h * 0.14, 8, h * 0.14);
    var n = 5;
    var w0 = h * 0.4;
    for (var i = 0; i < n; i++) {
      var yb = -h * 0.1 - i * (h * 0.8 / n);
      var th = h * 0.34;
      var w = w0 * (1 - i / (n + 0.6));
      ctx.beginPath();
      ctx.moveTo(-w, yb);
      ctx.lineTo(0, yb - th);
      ctx.lineTo(w, yb);
      ctx.closePath();
      ctx.fillStyle = '#2f6f80';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-w, yb);
      ctx.lineTo(0, yb - th);
      ctx.lineTo(0, yb);
      ctx.closePath();
      ctx.fillStyle = '#3f8b9b';
      ctx.fill();
    }
    ctx.restore();
  }

  // Большое лиственное дерево с красноватым стволом, как на референсе
  function roundTree(ctx, x, base, sc, t, ph) {
    var sw = sway(t, ph);
    var topX = sw * 6;
    ctx.save();
    ctx.translate(x, base);
    ctx.scale(sc, sc);

    ctx.fillStyle = '#a24f3d';
    ctx.strokeStyle = '#6a2d24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-17, 0);
    ctx.bezierCurveTo(-12, -60, -10 + topX * 0.4, -110, topX - 9, -160);
    ctx.lineTo(topX + 9, -160);
    ctx.bezierCurveTo(10 + topX * 0.4, -110, 12, -60, 17, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    var blobs = [[-48, -172, 42], [46, -176, 44], [0, -214, 50], [-6, -168, 50], [70, -150, 26], [-72, -146, 26]];
    blobs.forEach(function (b, i) {
      var bx = b[0] + topX * 1.1 + Math.sin(t * 2 + i + ph) * 1.5;
      circle(ctx, bx, b[1], b[2]);
      ctx.fillStyle = '#5b8a2b';
      ctx.fill();
      ctx.strokeStyle = '#3d6320';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });
    blobs.forEach(function (b, i) {
      var bx = b[0] + topX * 1.1 + Math.sin(t * 2 + i + ph) * 1.5;
      circle(ctx, bx - 8, b[1] - 10, b[2] * 0.62);
      ctx.fillStyle = '#86b73a';
      ctx.fill();
      circle(ctx, bx - 14, b[1] - 18, b[2] * 0.28);
      ctx.fillStyle = '#a9d452';
      ctx.fill();
    });
    ctx.restore();
  }

  function bush(ctx, x, y, s, t, ph) {
    var sw = sway(t, ph) * 1.5;
    var parts = [[-20, 0, 18], [0, -8, 22], [22, 0, 18], [-6, 6, 16], [12, 6, 16]];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    parts.forEach(function (p, i) {
      circle(ctx, p[0] + sw * (i === 1 ? 1 : 0.6), p[1], p[2]);
      ctx.fillStyle = '#6e9e2c';
      ctx.fill();
      ctx.strokeStyle = '#4a7a1e';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    parts.forEach(function (p, i) {
      circle(ctx, p[0] - 4 + sw * (i === 1 ? 1 : 0.6), p[1] - 6, p[2] * 0.55);
      ctx.fillStyle = '#9bc943';
      ctx.fill();
    });
    ctx.fillStyle = '#f0a030';       // маленькие цветочки
    circle(ctx, -14 + sw * 0.6, -4, 2.2); ctx.fill();
    circle(ctx, 18 + sw * 0.6, 2, 2.2); ctx.fill();
    ctx.restore();
  }

  /* ---------- Трава у линии земли и полосы ветра ---------- */

  function buildBlades() {
    blades = [];
    var rnd = makeRng(7);
    for (var x = 0; x < DW; x += 9) {
      blades.push({ x: x + rnd() * 6, y: DG + 17, h: 9 + rnd() * 9, ph: rnd() * 6.28,
        c: rnd() > 0.5 ? '#5f9626' : '#9fcf3f' });
    }
  }

  function drawBlade(ctx, b, t) {
    var sw = sway(t, b.ph + b.x * 0.02);
    ctx.beginPath();
    ctx.moveTo(b.x - 2, b.y);
    ctx.quadraticCurveTo(b.x + sw * b.h * 0.2, b.y - b.h * 0.6, b.x + sw * b.h * 0.55, b.y - b.h);
    ctx.quadraticCurveTo(b.x + 2 + sw * b.h * 0.25, b.y - b.h * 0.5, b.x + 2, b.y);
    ctx.closePath();
    ctx.fillStyle = b.c;
    ctx.fill();
  }

  function drawWindStreaks(ctx, t) {
    var g = gust(t);
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    for (var i = 0; i < 6; i++) {
      var x = ((t * (70 + i * 14) + i * 190) % (DW + 240)) - 120;
      var y = (150 + i * 62) * KY + Math.sin(t + i) * 8;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.22 * g).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + 30, y - 12, x + 60, y + 12, x + 100, y);
      ctx.stroke();
    }
  }

  /* ---------- Публичные функции ---------- */

  // Всё, что находится позади игрового поля
  function drawBack(ctx, t) {
    if (!bg) bg = buildBackground();
    ctx.drawImage(bg, 0, 0);

    ctx.save();
    ctx.scale(S, S);
    drawClouds(ctx, t);

    pine(ctx, 140 * KX, DG + 6, 170, t, 0.3);
    pine(ctx, 214 * KX, DG + 6, 120, t, 1.1);
    pine(ctx, 700 * KX, DG + 6, 140, t, 2.0);
    pine(ctx, 760 * KX, DG + 6, 185, t, 0.7);

    bush(ctx, 300 * KX, DG + 14, 1.0, t, 0.2);
    bush(ctx, 440 * KX, DG + 14, 0.8, t, 1.4);
    bush(ctx, 560 * KX, DG + 14, 1.1, t, 2.2);
    bush(ctx, 690 * KX, DG + 14, 0.9, t, 3.1);

    roundTree(ctx, 62, DG + 8, 0.95, t, 0.0);
    roundTree(ctx, DW - 58, DG + 8, 0.9, t, 1.7);

    bush(ctx, 20, DG + 14, 1.0, t, 0.9);
    bush(ctx, 160 * KX, DG + 14, 0.9, t, 2.5);
    bush(ctx, 850 * KX, DG + 14, 1.0, t, 0.5);
    bush(ctx, 950 * KX, DG + 14, 0.85, t, 1.9);

    // Трава у линии земли (переднего плана с травой больше нет)
    blades.forEach(function (b) { drawBlade(ctx, b, t); });
    ctx.restore();
  }

  // Полосы ветра поверх всего
  function drawFront(ctx, t) {
    ctx.save();
    ctx.scale(S, S);
    drawWindStreaks(ctx, t);
    ctx.restore();
  }

  setSize(W, H, GROUND);

  root.SunEnv = {
    setSize: setSize,
    gust: gust,
    drawBack: drawBack,
    drawFront: drawFront
  };
})(typeof window !== 'undefined' ? window : this);
