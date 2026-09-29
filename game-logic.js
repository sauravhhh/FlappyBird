/* Flappy Bird core logic — pure functions, no DOM. Fixed-timestep (60fps) simulation.
   Used by index.html and headless-tested in Node. */
(function (root) {
  'use strict';

  var DEFAULTS = {
    width: 400, height: 600,
    gravity: 0.42, flapV: -7.6, maxFall: 11,
    birdX: 110, birdR: 14,
    pipeW: 72, pipeGap: 155, pipeSpeed: 2.6, pipeSpacing: 230,
    groundH: 90
  };

  function createGame(opts, rng) {
    var o = {};
    for (var k in DEFAULTS) o[k] = DEFAULTS[k];
    if (opts) for (var k2 in opts) o[k2] = opts[k2];
    var state = {
      o: o,
      birdY: o.height / 2 - 60, vy: 0,
      pipes: [], // {x, gapY, scored}
      frame: 0, score: 0,
      status: 'ready', // ready | playing | dead
      rng: rng || Math.random,
      events: { scored: false, hit: false }
    };
    return state;
  }

  function reset(state) {
    var o = state.o;
    state.birdY = o.height / 2 - 60;
    state.vy = 0;
    state.pipes = [];
    state.frame = 0;
    state.score = 0;
    state.status = 'ready';
    state.events = { scored: false, hit: false };
  }

  function start(state) {
    if (state.status === 'ready') { state.status = 'playing'; flap(state); }
  }

  function flap(state) {
    if (state.status !== 'playing') return;
    state.vy = state.o.flapV;
  }

  function spawnPipe(state) {
    var o = state.o;
    var margin = 70;
    var minY = margin + o.pipeGap / 2;
    var maxY = o.height - o.groundH - margin - o.pipeGap / 2;
    var gapY = minY + state.rng() * (maxY - minY);
    state.pipes.push({ x: o.width + 10, gapY: gapY, scored: false });
  }

  function circleRect(cx, cy, r, rx, ry, rw, rh) {
    var nx = Math.max(rx, Math.min(cx, rx + rw));
    var ny = Math.max(ry, Math.min(cy, ry + rh));
    var dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  // Advances one 60fps frame. Returns 'playing' | 'scored' | 'dead'.
  function update(state) {
    var o = state.o;
    state.events.scored = false;
    state.events.hit = false;
    if (state.status !== 'playing') return state.status;

    state.frame++;
    // physics
    state.vy = Math.min(state.vy + o.gravity, o.maxFall);
    state.birdY += state.vy;

    // spawn pipes
    var last = state.pipes[state.pipes.length - 1];
    if (!last || last.x < o.width - o.pipeSpacing) spawnPipe(state);

    // move pipes, score, collide
    var result = 'playing';
    for (var i = state.pipes.length - 1; i >= 0; i--) {
      var p = state.pipes[i];
      p.x -= o.pipeSpeed;
      if (p.x + o.pipeW < -10) { state.pipes.splice(i, 1); continue; }

      if (!p.scored && p.x + o.pipeW < o.birdX - o.birdR) {
        p.scored = true;
        state.score++;
        state.events.scored = true;
        result = 'scored';
      }

      var gapTop = p.gapY - o.pipeGap / 2;
      var gapBot = p.gapY + o.pipeGap / 2;
      var hitTop = circleRect(o.birdX, state.birdY, o.birdR, p.x, -50, o.pipeW, gapTop + 50);
      var hitBot = circleRect(o.birdX, state.birdY, o.birdR, p.x, gapBot, o.pipeW, o.height);
      if (hitTop || hitBot) {
        state.status = 'dead';
        state.events.hit = true;
        return 'dead';
      }
    }

    // ceiling + ground
    if (state.birdY - o.birdR < 0) { state.birdY = o.birdR; state.vy = 0; }
    if (state.birdY + o.birdR >= o.height - o.groundH) {
      state.birdY = o.height - o.groundH - o.birdR;
      state.status = 'dead';
      state.events.hit = true;
      return 'dead';
    }
    return result;
  }

  function medalFor(score) {
    if (score >= 40) return 'platinum';
    if (score >= 30) return 'gold';
    if (score >= 20) return 'silver';
    if (score >= 10) return 'bronze';
    return null;
  }

  var api = {
    DEFAULTS: DEFAULTS, createGame: createGame, reset: reset,
    start: start, flap: flap, update: update, medalFor: medalFor
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FlappyLogic = api;
})(typeof window !== 'undefined' ? window : global);
