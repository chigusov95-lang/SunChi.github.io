/*
 * physics.js — расчёт маршрута луча (без анимации и без отрисовки).
 *
 * traceBeam() возвращает полный маршрут луча и итог:
 *   'hit'     — луч попал в шарик
 *   'blocked' — луч вышел за границы поля (reason: 'edge') или упёрся в облако (reason: 'cloud')
 *   'loop'    — луч зациклился (повторилось состояние «клетка + направление»)
 */
(function (root) {
  'use strict';

  // Смещения клеток для каждого направления (ось Y направлена вниз, как на экране)
  var DIR = {
    right: { dx: 1, dy: 0 },
    left:  { dx: -1, dy: 0 },
    up:    { dx: 0, dy: -1 },
    down:  { dx: 0, dy: 1 }
  };

  // Таблица отражения: направление до зеркала -> направление после
  var MIRROR_TABLE = {
    '/':  { right: 'up',   up: 'right', left: 'down', down: 'left' },
    '\\': { right: 'down', down: 'right', left: 'up',  up: 'left' }
  };

  function key(x, y) {
    return x + ',' + y;
  }

  /**
   * level        — объект из levels.js (cols, rows, sun, balloon, walls — облака)
   * mirrorTypes  — текущие положения зеркал: { 'x,y': '/' или '\\' }
   * Возвращает { result, reason, path: [{x, y, dir}] }
   * где path — клетки, через которые проходит луч, и направление выхода из каждой.
   */
  function traceBeam(level, mirrorTypes) {
    var walls = {};
    (level.walls || []).forEach(function (w) { walls[key(w.x, w.y)] = true; });

    var x = level.sun.x;
    var y = level.sun.y;
    var dir = level.sun.dir;
    var path = [];
    var visited = {};

    // Страховка: максимум шагов, даже если логика цикла даст сбой
    var maxSteps = level.cols * level.rows * 4 + 4;

    for (var step = 0; step < maxSteps; step++) {
      // 1. Шарик в текущей клетке — попадание
      if (level.balloon.x === x && level.balloon.y === y) {
        path.push({ x: x, y: y, dir: dir });
        return { result: 'hit', reason: null, path: path };
      }

      // 2. Зеркало в текущей клетке — меняем направление по таблице
      var k = key(x, y);
      if (mirrorTypes[k]) {
        dir = MIRROR_TABLE[mirrorTypes[k]][dir];
      }

      // 3. Проверка зацикливания по состоянию «клетка + направление»
      var stateKey = k + '|' + dir;
      if (visited[stateKey]) {
        return { result: 'loop', reason: null, path: path };
      }
      visited[stateKey] = true;
      path.push({ x: x, y: y, dir: dir });

      // 4. Переход в следующую клетку
      var nx = x + DIR[dir].dx;
      var ny = y + DIR[dir].dy;

      // 5. Граница поля или облако — луч не достиг цели
      if (nx < 0 || ny < 0 || nx >= level.cols || ny >= level.rows) {
        return { result: 'blocked', reason: 'edge', path: path };
      }
      if (walls[key(nx, ny)]) {
        return { result: 'blocked', reason: 'cloud', path: path };
      }

      x = nx;
      y = ny;
    }

    return { result: 'loop', reason: null, path: path };
  }

  var api = { DIR: DIR, MIRROR_TABLE: MIRROR_TABLE, traceBeam: traceBeam };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;          // для тестов и генератора уровней в Node
  }
  root.SunPhysics = api;           // для браузера
})(typeof window !== 'undefined' ? window : this);
