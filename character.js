/*
 * character.js — персонажи рядом с полем: мальчик, мужчина и женщина в стиле самурая,
 * белая пушистая собака и серая кошка. Всё нарисовано кодом на Canvas (мультяшная стилизация).
 * Анимация: дыхание, моргание, ветер колышет одежду и волосы, хвосты виляют.
 * При победе все радуются: подпрыгивают, люди поднимают руки.
 */
(function (root) {
  'use strict';

  function poly(ctx, pts, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function ellipse(ctx, x, y, rx, ry, fill) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  /* ---------- Люди ---------- */

  var STYLES = {
    boy: {
      kind: 'boy', phase: 0, bodyW: 1, sleeveLen: 1, faceW: 25,
      skin: '#f2c9a3', skinShade: '#c99a74', hair: '#9a7448', hairDark: '#5d4429',
      kimono: '#1f2d52', edge: '#0f1830', hakama: '#8a8d96', hakamaShade: '#6c6f78', obi: '#a83232',
      sword: true, watch: true
    },
    man: {
      kind: 'man', phase: 1.3, bodyW: 1.12, sleeveLen: 1, faceW: 26,
      skin: '#e8b98f', skinShade: '#b98a64', hair: '#2b2420', hairDark: '#14100e',
      kimono: '#6b2a2a', edge: '#3a1414', hakama: '#3d4354', hakamaShade: '#2b303d', obi: '#d9b44a',
      sword: true, watch: false
    },
    woman: {
      kind: 'woman', phase: 2.1, bodyW: 1, sleeveLen: 1.25, faceW: 23,
      skin: '#f5d3b8', skinShade: '#c9a184', hair: '#2b2420', hairDark: '#14100e',
      kimono: '#d9708f', edge: '#a04561', hakama: '#e58ea8', hakamaShade: '#b8607c', obi: '#2f8f9d',
      sword: false, watch: false
    }
  };

  // Рукав: dir = -1 слева, +1 справа; a — угол подъёма руки
  function sleeve(ctx, c, dir, a, withWatch) {
    var L = c.sleeveLen;
    ctx.save();
    ctx.translate(dir * 31 * c.bodyW, -126);
    ctx.rotate(-dir * a);
    poly(ctx, [[0, -2], [dir * 12, 0], [dir * 30, 16 * L], [dir * 34, 50 * L], [dir * 6, 52 * L], [dir * -2, 30 * L]],
      c.kimono, c.edge);
    ctx.strokeStyle = '#eef1f8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(dir * 6, 52 * L);
    ctx.lineTo(dir * 34, 50 * L);
    ctx.stroke();
    ellipse(ctx, dir * 20, 58 * L, 7, 7, c.skin);
    if (withWatch) {
      ctx.fillStyle = '#2c4fd4';
      ctx.strokeStyle = '#16286b';
      ctx.lineWidth = 1;
      ctx.fillRect(dir * 20 - 7, 50 * L, 14, 6);
      ctx.strokeRect(dir * 20 - 7, 50 * L, 14, 6);
    }
    ctx.restore();
  }

  function person(ctx, c, x, footY, s, t0, wind, celebrate) {
    var t = t0 + c.phase;
    var bw = c.bodyW;
    var woman = c.kind === 'woman';
    var breathe = 1 + Math.sin(t * 2.1) * 0.012;
    var jump = celebrate ? -Math.abs(Math.sin(t * 6)) * 14 : 0;
    var armAngle = celebrate ? 2.1 + Math.sin(t * 9) * 0.2 : 0.04;
    var fw = c.faceW;

    ctx.save();
    ctx.translate(x, footY);
    ctx.scale(s, s);

    // Тень на земле
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 44 * bw, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(0, jump);

    // Длинные волосы женщины сзади
    if (woman) {
      var sh = wind * 4;
      ctx.fillStyle = c.hair;
      ctx.beginPath();
      ctx.moveTo(-26, -165);
      ctx.bezierCurveTo(-36, -140, -32, -118, -22 + sh, -104);
      ctx.lineTo(22 + sh, -104);
      ctx.bezierCurveTo(32, -118, 36, -140, 26, -165);
      ctx.closePath();
      ctx.fill();
    }

    // Хакама (мужчина, мальчик) или длинный подол кимоно (женщина)
    var hem = wind * 3 + Math.sin(t * 1.5) * 0.8;
    var skirtW = woman ? 34 : 42;
    poly(ctx, [[-31 * bw, -86], [31 * bw, -86], [skirtW * bw + hem, -10], [-skirtW * bw + hem * 0.5, -10]],
      c.hakama, c.hakamaShade);
    ctx.strokeStyle = c.hakamaShade;
    ctx.lineWidth = 1.5;
    if (!woman) {
      [-14, 0, 14].forEach(function (px) {
        ctx.beginPath();
        ctx.moveTo(px * 0.7, -80);
        ctx.lineTo(px * 2.2 + hem * 0.6, -12);
        ctx.stroke();
      });
    } else {
      ctx.fillStyle = '#fbe3ea';       // цветочки на подоле
      [[-14, -40], [10, -30], [-4, -58], [18, -52], [-20, -22]].forEach(function (p) {
        ctx.beginPath(); ctx.arc(p[0] + hem * 0.3, p[1], 3, 0, Math.PI * 2); ctx.fill();
      });
    }
    ctx.fillStyle = c.hakamaShade;
    ctx.fillRect(-skirtW * bw + hem * 0.5, -17, 2 * skirtW * bw, 7);
    ellipse(ctx, -16, -4, 15, 6, '#2a1f1a');
    ellipse(ctx, 16, -4, 15, 6, '#2a1f1a');

    // Торс (кимоно) — дышит
    ctx.save();
    ctx.translate(0, -84);
    ctx.scale(1, breathe);
    ctx.translate(0, 84);
    poly(ctx, [[-30 * bw, -132], [30 * bw, -132], [33 * bw, -84], [-33 * bw, -84]], c.kimono, c.edge);
    ctx.strokeStyle = '#eef1f8';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-11, -134); ctx.lineTo(0, -100);
    ctx.moveTo(11, -134); ctx.lineTo(0, -100);
    ctx.stroke();
    ctx.restore();

    // Пояс оби (у женщины шире, с бантом)
    if (woman) {
      ctx.fillStyle = c.obi;
      ctx.fillRect(-33, -100, 66, 18);
      poly(ctx, [[-33, -94], [-54, -106], [-52, -80], [-33, -88]], c.obi, '#1d6470');
      poly(ctx, [[-33, -91], [-50, -74], [-40, -70], [-30, -84]], '#1d6470');
    } else {
      ctx.fillStyle = c.obi;
      ctx.fillRect(-33 * bw, -94, 66 * bw, 12);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(-33 * bw, -84, 66 * bw, 2);
    }

    // Катана в ножнах
    if (c.sword) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#2b1d18';
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(30 * bw, -90); ctx.lineTo(60 * bw, -38); ctx.stroke();
      ctx.strokeStyle = '#d9d2b8';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(30 * bw, -90); ctx.lineTo(24 * bw, -104); ctx.stroke();
      ctx.save();
      ctx.translate(30 * bw, -90);
      ctx.rotate(0.5);
      ellipse(ctx, 0, 0, 6, 3.5, '#c9a227');
      ctx.restore();
    }

    // Рукава
    var flutter = Math.sin(t * 1.7) * 0.02 + wind * 0.04;
    sleeve(ctx, c, -1, armAngle + flutter, false);
    sleeve(ctx, c, 1, armAngle - flutter, c.watch);

    // Шея
    ctx.fillStyle = c.skinShade;
    ctx.fillRect(-6, -140, 12, 12);

    // Голова слегка покачивается
    ctx.save();
    ctx.translate(0, -136);
    ctx.rotate(Math.sin(t * 0.8) * 0.025);
    ctx.translate(0, 136);

    // Пучок на макушке (у мальчика и мужчины)
    if (!woman) {
      ctx.fillStyle = c.hair;
      ctx.strokeStyle = c.hairDark;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, -196, c.kind === 'man' ? 10 : 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#a83232';
      ctx.fillRect(-6, -190, 12, 3);
    }

    // Уши и лицо
    ctx.fillStyle = c.skin;
    ctx.strokeStyle = c.skinShade;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(-fw, -156, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(fw, -156, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -158, fw, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // Щёки
    ctx.fillStyle = woman ? 'rgba(240,120,130,0.3)' : 'rgba(240,140,120,0.25)';
    ctx.beginPath(); ctx.arc(-16, -148, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(16, -148, 5, 0, Math.PI * 2); ctx.fill();

    // Глаза с морганием
    var blink = ((t + 1) % 4.3) < 0.14 ? 0.1 : 1;
    var ey = woman ? 4.6 : 4;
    ctx.fillStyle = '#2b1b14';
    ctx.beginPath(); ctx.ellipse(-9, -156, 3, ey * blink, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(9, -156, 3, ey * blink, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = c.kind === 'man' ? '#14100e' : '#6b4a2b';
    ctx.lineWidth = c.kind === 'man' ? 3 : 2;
    ctx.beginPath(); ctx.moveTo(-14, -165); ctx.lineTo(-5, -166); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, -166); ctx.lineTo(14, -165); ctx.stroke();
    if (woman) {          // ресницы
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#2b1b14';
      ctx.beginPath(); ctx.moveTo(-12, -158); ctx.lineTo(-15, -161); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, -158); ctx.lineTo(15, -161); ctx.stroke();
    }
    // Рот и усы
    ctx.strokeStyle = woman ? '#c4455a' : '#9b5a45';
    ctx.lineWidth = woman ? 2.8 : 2;
    ctx.beginPath(); ctx.moveTo(-5, -143); ctx.quadraticCurveTo(0, -140, 5, -143); ctx.stroke();
    if (c.kind === 'man') {
      ctx.strokeStyle = c.hairDark;
      ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(-10, -146); ctx.quadraticCurveTo(0, -150, 10, -146); ctx.stroke();
    }

    // Волосы: шапка и чёлка
    ctx.fillStyle = c.hair;
    ctx.strokeStyle = c.hairDark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -163, fw + 2, 31, 0, Math.PI, 2 * Math.PI);
    ctx.lineTo(fw + 2, -160);
    ctx.lineTo(20, -161);
    ctx.lineTo(10, -168);
    ctx.lineTo(0, -161);
    ctx.lineTo(-10, -169);
    ctx.lineTo(-20, -162);
    ctx.lineTo(-fw - 2, -163);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = woman ? '#5a4a42' : (c.kind === 'man' ? '#4a4038' : '#b8935f');
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -163, 20, Math.PI * 1.15, Math.PI * 1.55); ctx.stroke();

    if (woman) {
      // Хвост волос, развевающийся на ветру, красная лента и цветок-заколка
      ctx.strokeStyle = c.hair;
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(14, -188);
      ctx.bezierCurveTo(34 + wind * 8, -192, 46 + wind * 14, -172 + Math.sin(t * 3) * 6,
        54 + wind * 20, -140 + Math.sin(t * 3.4) * 8);
      ctx.stroke();
      ellipse(ctx, 14, -188, 5, 5, '#d63a3a');
      for (var i = 0; i < 5; i++) {
        var a = (Math.PI * 2 * i) / 5;
        ellipse(ctx, -17 + Math.cos(a) * 5, -184 + Math.sin(a) * 5, 4, 4, '#ff8fb0');
      }
      ellipse(ctx, -17, -184, 3, 3, '#ffd34d');
    } else if (c.kind === 'boy') {
      // Прядь на ветру
      ctx.strokeStyle = c.hair;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(26, -170);
      ctx.quadraticCurveTo(36 + wind * 10, -168 + Math.sin(t * 3) * 3, 42 + wind * 14, -158 + Math.sin(t * 3.4) * 4);
      ctx.stroke();

      // Повязка хатимаки с красным кругом
      ctx.strokeStyle = '#f3f3f6';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-26, -175);
      ctx.quadraticCurveTo(0, -171, 26, -175);
      ctx.stroke();
      ellipse(ctx, 0, -173, 3.4, 3.4, '#d63a3a');
      ctx.lineWidth = 5;
      [0, 1].forEach(function (k) {
        var ph = t * 5 + k * 1.6;
        ctx.beginPath();
        ctx.moveTo(24, -175 + k * 3);
        ctx.bezierCurveTo(40 + wind * 10, -176 + Math.sin(ph) * 4 + k * 4,
          54 + wind * 18, -170 + Math.sin(ph + 1) * 6 + k * 6,
          68 + wind * 24, -160 + Math.sin(ph + 2) * 8 + k * 8);
        ctx.stroke();
      });
    }
    ctx.restore(); // голова

    ctx.restore();
  }

  /* ---------- Белая пушистая собака (сидит лицом к нам) ---------- */

  function dog(ctx, x, footY, s, t0, celebrate) {
    var t = t0 + 3.1;
    var hop = celebrate ? -Math.abs(Math.sin(t * 7)) * 12 : 0;
    var breathe = 1 + Math.sin(t * 3) * 0.02;
    var WHITE = '#fbfbfb';
    var LINE = '#c4ccd4';

    // пушистые «облачка»: сначала контур, потом заливка — получается единый силуэт
    function fluff(parts) {
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 3;
      parts.forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], p[2], 0, Math.PI * 2); ctx.stroke(); });
      ctx.fillStyle = WHITE;
      parts.forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], p[2], 0, Math.PI * 2); ctx.fill(); });
    }

    ctx.save();
    ctx.translate(x, footY);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(0, 2, 30, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, hop);

    // хвост выглядывает сбоку и виляет
    ctx.save();
    ctx.translate(26, -10);
    ctx.rotate(0.3 + Math.sin(t * (celebrate ? 14 : 5)) * 0.4);
    fluff([[0, 0, 6], [5, -7, 6.5], [8, -15, 6.5]]);
    ctx.restore();

    // бёдра сидящей собаки и тело (дышит)
    fluff([[-17, -12, 12], [17, -12, 12]]);
    ctx.save();
    ctx.translate(0, -10);
    ctx.scale(1, breathe);
    ctx.translate(0, 10);
    fluff([[0, -26, 17], [-8, -20, 13], [8, -20, 13], [0, -34, 14]]);
    ctx.restore();

    // передние лапы
    ctx.fillStyle = WHITE;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.5;
    [-7, 7].forEach(function (lx) {
      ctx.beginPath(); ctx.ellipse(lx, -12, 5, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(lx, -2, 6, 3.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });

    // красный ошейник
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-11, -46); ctx.quadraticCurveTo(0, -41, 11, -46); ctx.stroke();

    // голова с пушистыми ушами
    fluff([[-18, -54, 7], [18, -54, 7], [0, -58, 16], [-11, -52, 9], [11, -52, 9], [0, -69, 10]]);

    // мордочка: глаза с морганием, нос, рот, язычок
    var blink = (t % 4.6) < 0.14 ? 0.1 : 1;
    ctx.fillStyle = '#1b1b1b';
    ctx.beginPath(); ctx.ellipse(-6, -59, 2.3, 2.6 * blink, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, -59, 2.3, 2.6 * blink, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -52.5, 3.8, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1b1b1b';
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(0, -47); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5, -46.5); ctx.quadraticCurveTo(0, -44, 0, -47);
    ctx.quadraticCurveTo(0, -44, 5, -46.5);
    ctx.stroke();
    if (Math.sin(t * 8) > 0.2 || celebrate) {
      ctx.fillStyle = '#ff8fa3';
      ctx.beginPath(); ctx.ellipse(0, -43, 2.8, 3.6, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- Серая кошка ---------- */

  function cat(ctx, x, footY, s, t0, celebrate) {
    var t = t0 + 5.2;
    var hop = celebrate ? -Math.abs(Math.sin(t * 6)) * 8 : 0;
    var FUR = '#8e949d';
    var LINE = '#5e646d';
    var blink = (t % 5) < 0.15 ? 0.1 : 1;

    ctx.save();
    ctx.translate(x, footY);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(0, 2, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, hop);

    // хвост покачивается
    var tw = Math.sin(t * (celebrate ? 8 : 2)) * 8;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(14, -6);
    ctx.bezierCurveTo(36, -4, 38 + tw * 0.4, -30, 24 + tw, -42);
    ctx.stroke();
    ctx.strokeStyle = FUR;
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(14, -6);
    ctx.bezierCurveTo(36, -4, 38 + tw * 0.4, -30, 24 + tw, -42);
    ctx.stroke();

    // тело и грудка
    ctx.fillStyle = FUR;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, -18, 17, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ellipse(ctx, 0, -14, 9, 13, '#bcc1c8');
    ctx.strokeStyle = LINE;      // полоски на боках
    ctx.lineWidth = 2;
    [-8, -16, -24].forEach(function (yy) {
      ctx.beginPath(); ctx.moveTo(-17, yy); ctx.lineTo(-11, yy + 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(17, yy); ctx.lineTo(11, yy + 2); ctx.stroke();
    });
    ellipse(ctx, -7, -3, 5, 3.5, '#bcc1c8');
    ellipse(ctx, 7, -3, 5, 3.5, '#bcc1c8');

    // уши (правое иногда подёргивается)
    var twitch = (t % 6) < 0.2 ? Math.sin(t * 60) * 0.12 : 0;
    ctx.fillStyle = FUR;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.5;
    poly(ctx, [[-14, -52], [-12, -69], [-3, -58]], FUR, LINE);
    ctx.save();
    ctx.translate(8, -56);
    ctx.rotate(twitch);
    ctx.translate(-8, 56);
    poly(ctx, [[14, -52], [12, -69], [3, -58]], FUR, LINE);
    ctx.restore();
    poly(ctx, [[-12, -55], [-11, -65], [-6, -58]], '#e7a3b0');
    poly(ctx, [[12, -55], [11, -65], [6, -58]], '#e7a3b0');

    // голова
    ctx.fillStyle = FUR;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -46, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    [-4, 0, 4].forEach(function (dx) {
      ctx.beginPath(); ctx.moveTo(dx, -61); ctx.lineTo(dx * 0.8, -55); ctx.stroke();
    });

    // глаза, нос, усы
    ctx.fillStyle = '#a8d85f';
    ctx.beginPath(); ctx.ellipse(-6, -47, 3.4, 3.8 * blink, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, -47, 3.4, 3.8 * blink, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1b1b';
    ctx.beginPath(); ctx.ellipse(-6, -47, 1.1, 3 * blink, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, -47, 1.1, 3 * blink, 0, 0, Math.PI * 2); ctx.fill();
    poly(ctx, [[-2, -42], [2, -42], [0, -39]], '#e7a3b0');
    ctx.strokeStyle = '#3a3f46';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, -39); ctx.quadraticCurveTo(-3, -36, -6, -38); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -39); ctx.quadraticCurveTo(3, -36, 6, -38); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1;
    [[-1, -2], [0, 0], [1, 2]].forEach(function (k) {
      ctx.beginPath(); ctx.moveTo(-9, -40 + k[1]); ctx.lineTo(-24, -42 + k[1] * 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(9, -40 + k[1]); ctx.lineTo(24, -42 + k[1] * 3); ctx.stroke();
    });
    ctx.restore();
  }

  /**
   * Вся компания рядом с полем. Размеры уменьшены вдвое, чтобы не отвлекать от игры.
   * dx — смещение от центра группы, row — ряд (0 — люди, 1 — питомцы впереди), s — масштаб.
   * Широкий холст: группа справа от поля. Высокий холст (телефон): под полем по центру, крупнее.
   */
  var CAST = [
    { kind: 'man',   dx: -100, row: 0, s: 0.44 },
    { kind: 'woman', dx: -50,  row: 0, s: 0.41 },
    { kind: 'boy',   dx: 0,    row: 0, s: 0.375 },
    { kind: 'dog',   dx: 52,   row: 1, s: 0.55 },
    { kind: 'cat',   dx: 100,  row: 1, s: 0.55 }
  ];

  // lay — раскладка из render.js: { landscape, W, ground, ox, cols, cell }
  function drawAll(ctx, t, wind, celebrate, lay) {
    var cx, mult, rowY0, rowY1;
    if (lay.landscape) {
      cx = (lay.ox + lay.cols * lay.cell + lay.W) / 2;
      mult = 1;
      rowY0 = lay.ground + 52;
      rowY1 = lay.ground + 68;
    } else {
      cx = lay.W / 2;
      mult = 1.9;
      rowY0 = lay.ground + 120;
      rowY1 = lay.ground + 165;
    }
    CAST.forEach(function (m) {
      var px = cx + m.dx * mult;
      var py = m.row ? rowY1 : rowY0;
      var sc = m.s * mult;
      if (m.kind === 'dog') dog(ctx, px, py, sc, t, celebrate);
      else if (m.kind === 'cat') cat(ctx, px, py, sc, t, celebrate);
      else person(ctx, STYLES[m.kind], px, py, sc, t, wind, celebrate);
    });
  }

  root.SunCast = { drawAll: drawAll };
})(typeof window !== 'undefined' ? window : this);
