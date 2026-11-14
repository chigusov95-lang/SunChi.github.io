/*
 * animation.js — проигрывание уже рассчитанного луча, частицы и вспышка.
 * Не влияет на результат: маршрут приходит из physics.js готовым.
 */
(function (root) {
  'use strict';

  var MS_PER_CELL = 55;      // скорость движения луча
  var MIN_BEAM_MS = 300;
  var MAX_BEAM_MS = 3500;    // длинные маршруты не должны тянуться слишком долго

  var beam = null;           // { path, duration, startTime, progress, done, onDone }
  var particles = [];
  var flash = 0;
  var lastNow = null;

  function reset() {
    beam = null;
    particles = [];
    flash = 0;
  }

  // Запустить проигрывание маршрута; onDone вызывается по окончании
  function playBeam(path, onDone) {
    beam = {
      path: path,
      duration: Math.min(MAX_BEAM_MS, Math.max(MIN_BEAM_MS, path.length * MS_PER_CELL)),
      startTime: null,
      progress: 0,
      done: false,
      onDone: onDone
    };
  }

  // Вспышка и частицы в точке (px, py) — лопание шарика
  function burst(px, py) {
    flash = 1;
    var colors = ['#ff6b8b', '#ffd1dc', '#ffd34d', '#fff3b0'];
    for (var i = 0; i < 24; i++) {
      var angle = (Math.PI * 2 * i) / 24 + Math.random() * 0.3;
      var speed = 80 + Math.random() * 160;
      particles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color: colors[i % colors.length],
        life: 1
      });
    }
  }

  // Вызывать каждый кадр с временем requestAnimationFrame (мс)
  function update(now) {
    var dt = lastNow === null ? 0 : (now - lastNow) / 1000;
    lastNow = now;

    if (beam && !beam.done) {
      if (beam.startTime === null) beam.startTime = now;
      beam.progress = Math.min(1, (now - beam.startTime) / beam.duration);
      if (beam.progress >= 1) {
        beam.done = true;
        if (beam.onDone) beam.onDone();
      }
    }

    flash = Math.max(0, flash - dt * 1.5);
    particles.forEach(function (p) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;          // лёгкая гравитация
      p.life -= dt * 1.2;
    });
    particles = particles.filter(function (p) { return p.life > 0; });
  }

  function getBeam() {
    return beam;
  }

  function getEffects() {
    return { flash: flash, particles: particles };
  }

  var api = {
    reset: reset,
    playBeam: playBeam,
    burst: burst,
    update: update,
    getBeam: getBeam,
    getEffects: getEffects
  };

  root.SunAnim = api;
})(typeof window !== 'undefined' ? window : this);
