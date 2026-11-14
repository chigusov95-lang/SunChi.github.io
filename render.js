/*
 * render.js — отрисовка кадра: окружение, поле, облака-препятствия, солнце, зеркала,
 * шарик, луч и персонажи. Ничего не меняет в состоянии игры: только рисует.
 */
(function (root) {
  'use strict';

  var COLORS = {
    mirror: '#9fd8ff',
    mirrorHit: '#ffffff',
    sun: '#ffd34d',
    balloon: '#ff6b8b',
    balloonShine: '#ffd1dc',
    beam: '#fff3b0',
    beamGlow: '#ffb84d'
  };

  /**
   * Размеры и положение поля для холста W × H. Поле всегда по центру по горизонтали.
   * Широкий холст — для компьютера, высокий — для телефона.
   * Возвращает { cell, ox, oy, W, H, ground, landscape, cols }.
   */
  function layout(W, H, level) {
    var landscape = W >= H;
    var ground = Math.round(H * (landscape ? 0.883 : 0.76));
    var cell;
    if (landscape) {
      cell = Math.floor((ground - 24) / (level.rows + 0.9));
    } else {
      cell = Math.floor(Math.min(W / (level.cols + 1.8), (ground - 24) / (level.rows + 0.9)));
    }
    return {
      cell: cell,
      ox: Math.round((W - level.cols * cell) / 2),
      oy: Math.round(12 + 0.9 * cell),
      W: W, H: H, ground: ground, landscape: landscape, cols: level.cols
    };
  }

  function cellCenter(lay, x, y) {
    return {
      px: lay.ox + (x + 0.5) * lay.cell,
      py: lay.oy + (y + 0.5) * lay.cell
    };
  }

  function screenToCell(lay, level, sx, sy) {
    var cx = Math.floor((sx - lay.ox) / lay.cell);
    var cy = Math.floor((sy - lay.oy) / lay.cell);
    if (cx < 0 || cy < 0 || cx >= level.cols || cy >= level.rows) return null;
    return { x: cx, y: cy };
  }

  // Клетка за краем поля, где стоит солнце: с противоположной стороны от направления луча
  function sunCell(level) {
    var d = root.SunPhysics.DIR[level.sun.dir];
    return { x: level.sun.x - d.dx, y: level.sun.y - d.dy };
  }

  // Точки ломаной линии луча: солнце, затем центры клеток маршрута
  function beamPoints(lay, level, path) {
    var s = sunCell(level);
    var pts = [cellCenter(lay, s.x, s.y)];
    path.forEach(function (p) {
      pts.push(cellCenter(lay, p.x, p.y));
    });
    return pts;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Поле: полупрозрачная тёмная панель, чтобы луч был хорошо виден на фоне леса
  function drawBoard(ctx, lay, level) {
    var w = level.cols * lay.cell;
    var h = level.rows * lay.cell;
    roundRect(ctx, lay.ox - 6, lay.oy - 6, w + 12, h + 12, 14);
    ctx.fillStyle = 'rgba(10, 22, 40, 0.66)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    for (var x = 0; x <= level.cols; x++) {
      ctx.beginPath();
      ctx.moveTo(lay.ox + x * lay.cell, lay.oy);
      ctx.lineTo(lay.ox + x * lay.cell, lay.oy + h);
      ctx.stroke();
    }
    for (var y = 0; y <= level.rows; y++) {
      ctx.beginPath();
      ctx.moveTo(lay.ox, lay.oy + y * lay.cell);
      ctx.lineTo(lay.ox + w, lay.oy + y * lay.cell);
      ctx.stroke();
    }
  }

  // Облако-препятствие в клетке: лёгкое покачивание
  function drawCloudCell(ctx, lay, x, y, t) {
    var c = cellCenter(lay, x, y);
    var u = lay.cell;
    var bob = Math.sin(t * 1.3 + x * 0.9 + y * 0.5) * u * 0.03;
    var puffs = [[-0.22, 0.08, 0.26], [0.04, -0.08, 0.3], [0.26, 0.08, 0.24], [0.0, 0.14, 0.26]];
    ctx.save();
    ctx.translate(c.px, c.py + bob);
    ctx.fillStyle = '#b9d3e0';
    puffs.forEach(function (p) {
      ctx.beginPath(); ctx.arc(p[0] * u, (p[1] + 0.07) * u, p[2] * u, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#ffffff';
    puffs.forEach(function (p) {
      ctx.beginPath(); ctx.arc(p[0] * u, p[1] * u, p[2] * u, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  function drawSun(ctx, lay, level, time) {
    var s = sunCell(level);
    var c = cellCenter(lay, s.x, s.y);
    var pulse = 1 + Math.sin(time * 2) * 0.05;
    var r = lay.cell * 0.28 * pulse;
    var g = ctx.createRadialGradient(c.px, c.py, r * 0.2, c.px, c.py, r * 2.4);
    g.addColorStop(0, 'rgba(255, 211, 77, 0.9)');
    g.addColorStop(1, 'rgba(255, 211, 77, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.px, c.py, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 220, 100, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (var i = 0; i < 12; i++) {
      var a = (Math.PI * 2 * i) / 12 + time * 0.3;
      ctx.beginPath();
      ctx.moveTo(c.px + Math.cos(a) * r * 1.25, c.py + Math.sin(a) * r * 1.25);
      ctx.lineTo(c.px + Math.cos(a) * r * 1.65, c.py + Math.sin(a) * r * 1.65);
      ctx.stroke();
    }
    ctx.fillStyle = COLORS.sun;
    ctx.beginPath();
    ctx.arc(c.px, c.py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Воздушный шарик с лёгким покачиванием
  function drawBalloon(ctx, lay, level, time) {
    var c = cellCenter(lay, level.balloon.x, level.balloon.y);
    var bob = Math.sin(time * 2.5) * lay.cell * 0.06;
    var cx = c.px;
    var cy = c.py + bob - lay.cell * 0.08;
    var r = lay.cell * 0.32;

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy + r);
    ctx.quadraticCurveTo(cx + 4, cy + r + lay.cell * 0.2, cx, cy + r + lay.cell * 0.36);
    ctx.stroke();

    ctx.fillStyle = COLORS.balloon;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.9, r, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.balloonShine;
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.3, cy - r * 0.35, r * 0.18, r * 0.28, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Зеркало: линия «/» или «\»; плитка под ним; подсветка, если луч попал; рамка, если выбрано
  function drawMirror(ctx, lay, x, y, type, lit, selected, time) {
    var inset = lay.cell * 0.18;
    var x0 = lay.ox + x * lay.cell;
    var y0 = lay.oy + y * lay.cell;

    ctx.fillStyle = 'rgba(159, 216, 255, 0.07)';
    roundRect(ctx, x0 + 3, y0 + 3, lay.cell - 6, lay.cell - 6, 6);
    ctx.fill();

    if (selected) {
      var pulse = 0.6 + Math.sin(time * 4) * 0.25;
      ctx.fillStyle = 'rgba(255, 211, 77, 0.14)';
      roundRect(ctx, x0 + 3, y0 + 3, lay.cell - 6, lay.cell - 6, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 211, 77, ' + pulse.toFixed(2) + ')';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    var a, b;
    if (type === '/') {
      a = { px: x0 + inset, py: y0 + lay.cell - inset };
      b = { px: x0 + lay.cell - inset, py: y0 + inset };
    } else {
      a = { px: x0 + inset, py: y0 + inset };
      b = { px: x0 + lay.cell - inset, py: y0 + lay.cell - inset };
    }
    if (lit) {
      ctx.shadowColor = COLORS.beamGlow;
      ctx.shadowBlur = 16;
    }
    ctx.strokeStyle = lit ? COLORS.mirrorHit : COLORS.mirror;
    ctx.lineWidth = Math.max(4, lay.cell * 0.075);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.px, a.py);
    ctx.lineTo(b.px, b.py);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Луч до позиции progress (0..1) вдоль ломаной линии, с мягким свечением
  function drawBeam(ctx, pts, progress) {
    if (pts.length < 2 || progress <= 0) return;
    var segs = pts.length - 1;
    var pos = progress * segs;
    var full = Math.floor(pos);
    var frac = pos - full;

    var drawn = pts.slice(0, full + 1);
    if (full < segs) {
      var p0 = pts[full];
      var p1 = pts[full + 1];
      drawn.push({
        px: p0.px + (p1.px - p0.px) * frac,
        py: p0.py + (p1.py - p0.py) * frac
      });
    }

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = COLORS.beamGlow;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 12;
    ctx.shadowColor = COLORS.beamGlow;
    ctx.shadowBlur = 20;
    strokePolyline(ctx, drawn);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = COLORS.beam;
    ctx.lineWidth = 3;
    strokePolyline(ctx, drawn);
    ctx.shadowBlur = 0;
  }

  function strokePolyline(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].px, pts[0].py);
    for (var i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].px, pts[i].py);
    }
    ctx.stroke();
  }

  // Частицы и вспышка при лопании шарика
  function drawEffects(ctx, effects) {
    if (effects.flash > 0) {
      ctx.fillStyle = 'rgba(255, 243, 176, ' + (effects.flash * 0.35).toFixed(3) + ')';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    effects.particles.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  /**
   * Полная отрисовка кадра.
   * frame = { level, lay, mirrors, selectedKey, popped, time (сек), beamPath, beamProgress,
   *           litCells, celebrate, effects }
   */
  function drawFrame(ctx, frame) {
    var lay = frame.lay;
    var level = frame.level;
    var t = frame.time;

    root.SunEnv.drawBack(ctx, t);
    root.SunCast.drawAll(ctx, t, root.SunEnv.gust(t), frame.celebrate, lay);

    drawBoard(ctx, lay, level);
    drawSun(ctx, lay, level, t);
    if (!frame.popped) drawBalloon(ctx, lay, level, t);

    (level.walls || []).forEach(function (w) { drawCloudCell(ctx, lay, w.x, w.y, t); });

    level.mirrors.forEach(function (m) {
      var k = m.x + ',' + m.y;
      drawMirror(ctx, lay, m.x, m.y, frame.mirrors[k],
        frame.litCells && frame.litCells[k], frame.selectedKey === k, t);
    });

    if (frame.beamPath) {
      drawBeam(ctx, beamPoints(lay, level, frame.beamPath), frame.beamProgress);
    }

    root.SunEnv.drawFront(ctx, t);
    drawEffects(ctx, frame.effects);
  }

  root.SunRender = {
    layout: layout,
    cellCenter: cellCenter,
    screenToCell: screenToCell,
    beamPoints: beamPoints,
    drawFrame: drawFrame
  };
})(typeof window !== 'undefined' ? window : this);
