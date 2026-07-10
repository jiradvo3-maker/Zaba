// Herní jádro - žába, silnice, auta, kolize, kreslení
const COLS = 9;
const ROWS = 10; // 0=cíl, 1-2 silnice, 3 tráva, 4-5 silnice, 6 tráva, 7-8 silnice, 9=start
const ROW_TYPES = ['goal', 'road', 'road', 'grass', 'road', 'road', 'grass', 'road', 'road', 'start'];
const HOP_DURATION = 130; // ms

const LEVELS = [
  { time: 60, speedMult: 1.00, spawnMult: 1.00, label: 'Level 1' },
  { time: 55, speedMult: 1.25, spawnMult: 1.15, label: 'Level 2' },
  { time: 50, speedMult: 1.55, spawnMult: 1.30, label: 'Level 3' },
  { time: 45, speedMult: 1.90, spawnMult: 1.50, label: 'Level 4' },
  { time: 40, speedMult: 2.30, spawnMult: 1.70, label: 'Level 5' },
];

const CAR_PALETTE = [
  { body: '#e04b4b', dark: '#9c2c2c' },
  { body: '#4b8be0', dark: '#2c5a9c' },
  { body: '#e0c04b', dark: '#9c8a2c' },
  { body: '#8f4be0', dark: '#5a2c9c' },
  { body: '#4be0a0', dark: '#2c9c6f' },
  { body: '#e0824b', dark: '#9c522c' },
  { body: '#c4c4c4', dark: '#7a7a7a' },
];

function rowStartsRight(rowIndex) {
  // alternace směru jízdy podle řádku
  return rowIndex % 2 === 0;
}

class Car {
  constructor(x, y, w, h, speed, dir, palette) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.speed = speed; this.dir = dir; // dir: 1 = doprava, -1 = doleva
    this.palette = palette;
  }
  get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

class Game {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cb = callbacks || {};
    this.state = 'idle'; // idle | playing | paused | frozen
    this.lives = 3;
    this.score = 0;
    this.level = 1;
    this.cellSize = 40;
    this.lanes = [];
    this.frog = { col: Math.floor(COLS / 2), row: ROWS - 1, px: 0, py: 0, targetPx: 0, targetPy: 0, animStart: 0, animating: false, dir: 'up', squash: 0 };
    this.timeLeft = 60;
    this.levelTime = 60;
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  resize() {
    const wrap = this.canvas.parentElement;
    const maxW = wrap.clientWidth - 4;
    const maxH = wrap.clientHeight - 4;
    const aspect = COLS / ROWS;
    let w = maxW, h = w / aspect;
    if (h > maxH) { h = maxH; w = h * aspect; }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cellSize = w / COLS;
    this.viewW = w;
    this.viewH = h;
    this._placeFrogPixels(true);
  }

  _colToPx(col) { return col * this.cellSize + this.cellSize / 2; }
  _rowToPx(row) { return row * this.cellSize + this.cellSize / 2; }

  _placeFrogPixels(instant) {
    const f = this.frog;
    f.targetPx = this._colToPx(f.col);
    f.targetPy = this._rowToPx(f.row);
    if (instant) { f.px = f.targetPx; f.py = f.targetPy; }
  }

  startNewRun() {
    this.lives = 3;
    this.score = 0;
    this.level = 1;
    this._emitScore();
    this._emitLives();
    this.startLevel(1);
  }

  startLevel(n) {
    this.level = n;
    const cfg = LEVELS[n - 1];
    this.levelTime = cfg.time;
    this.timeLeft = cfg.time;
    this._buildLanes(cfg);
    this._resetFrog();
    this.state = 'playing';
    if (this.cb.onLevelChange) this.cb.onLevelChange(n, LEVELS.length);
    this._emitTime();
  }

  restartLevel() { this.startLevel(this.level); }

  _buildLanes(cfg) {
    this.lanes = [];
    for (let row = 0; row < ROWS; row++) {
      if (ROW_TYPES[row] !== 'road') continue;
      const dir = rowStartsRight(row) ? 1 : -1;
      const baseSpeed = (0.55 + row * 0.045) * this.cellSize * cfg.speedMult;
      const spawnInterval = Math.max(650, (1900 - row * 60) / cfg.spawnMult);
      this.lanes.push({
        row, dir, speed: baseSpeed,
        spawnInterval, timeSinceSpawn: Math.random() * spawnInterval,
        cars: [],
      });
    }
  }

  _resetFrog() {
    const f = this.frog;
    f.col = Math.floor(COLS / 2);
    f.row = ROWS - 1;
    f.animating = false;
    f.dir = 'up';
    f.squash = 0;
    this._placeFrogPixels(true);
  }

  pause() { if (this.state === 'playing') this.state = 'paused'; }
  resume() { if (this.state === 'paused') this.state = 'playing'; }

  move(dir) {
    if (this.state !== 'playing' || this.frog.animating) return;
    const f = this.frog;
    let { col, row } = f;
    if (dir === 'up') row -= 1;
    else if (dir === 'down') row += 1;
    else if (dir === 'left') col -= 1;
    else if (dir === 'right') col += 1;
    if (col < 0 || col >= COLS || row < 0 || row > ROWS - 1) return;
    f.col = col; f.row = row; f.dir = dir;
    f.animating = true;
    f.animStart = performance.now();
    f.fromPx = f.px; f.fromPy = f.py;
    this._placeFrogPixels(false);
    if (this.cb.onJump) this.cb.onJump();
  }

  _emitScore() { if (this.cb.onScoreChange) this.cb.onScoreChange(this.score); }
  _emitLives() { if (this.cb.onLivesChange) this.cb.onLivesChange(this.lives); }
  _emitTime() { if (this.cb.onTimeChange) this.cb.onTimeChange(this.timeLeft / this.levelTime, this.timeLeft); }

  _loseLife(reason) {
    if (this.state !== 'playing') return;
    this.lives -= 1;
    this._emitLives();
    if (this.cb.onHitLife) this.cb.onHitLife(this.lives, reason);
    if (this.lives <= 0) {
      this.state = 'frozen';
      if (this.cb.onGameOver) this.cb.onGameOver(this.score);
      return;
    }
    this.timeLeft = this.levelTime;
    this._resetFrog();
    for (const lane of this.lanes) lane.cars = [];
    this._emitTime();
  }

  _reachGoal() {
    if (this.state !== 'playing') return;
    this.state = 'frozen';
    const bonus = Math.round(this.timeLeft * 10);
    this.score += bonus;
    this._emitScore();
    if (this.level >= LEVELS.length) {
      if (this.cb.onWin) this.cb.onWin(this.score);
    } else {
      if (this.cb.onLevelComplete) this.cb.onLevelComplete(this.level, this.timeLeft, bonus, this.score);
    }
  }

  advanceLevel() {
    this.startLevel(this.level + 1);
  }

  update(dt) {
    if (this.state !== 'playing') return;
    // Časovač
    this.timeLeft -= dt / 1000;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this._emitTime();
      this._loseLife('time');
      return;
    }
    this._emitTime();

    // Animace skoku žáby
    const f = this.frog;
    if (f.animating) {
      const t = Math.min(1, (performance.now() - f.animStart) / HOP_DURATION);
      f.px = f.fromPx + (f.targetPx - f.fromPx) * t;
      f.py = f.fromPy + (f.targetPy - f.fromPy) * t;
      f.squash = Math.sin(t * Math.PI);
      if (t >= 1) {
        f.animating = false;
        f.px = f.targetPx; f.py = f.targetPy;
        f.squash = 0;
        this._afterLand();
      }
    }

    // Pohyb aut
    const cw = this.cellSize;
    for (const lane of this.lanes) {
      lane.timeSinceSpawn += dt;
      if (lane.timeSinceSpawn >= lane.spawnInterval) {
        lane.timeSinceSpawn = 0;
        const palette = CAR_PALETTE[Math.floor(Math.random() * CAR_PALETTE.length)];
        const w = cw * (1.3 + Math.random() * 0.3);
        const h = cw * 0.62;
        const y = this._rowToPx(lane.row) - h / 2;
        const x = lane.dir === 1 ? -w - 10 : this.viewW + 10;
        lane.cars.push(new Car(x, y, w, h, lane.speed, lane.dir, palette));
      }
      for (const car of lane.cars) {
        car.x += car.dir * car.speed * (dt / 1000);
      }
      lane.cars = lane.cars.filter(c => c.x > -c.w - 40 && c.x < this.viewW + 40);
    }

    this._checkCollisions();
  }

  _afterLand() {
    const type = ROW_TYPES[this.frog.row];
    if (type === 'goal') this._reachGoal();
  }

  _checkCollisions() {
    const type = ROW_TYPES[this.frog.row];
    if (type !== 'road') return;
    const f = this.frog;
    const size = this.cellSize * 0.62;
    const fr = { x: f.px - size / 2, y: f.py - size / 2, w: size, h: size };
    const lane = this.lanes.find(l => l.row === f.row);
    if (!lane) return;
    for (const car of lane.cars) {
      const pad = car.w * 0.12;
      const cr = { x: car.x + pad, y: car.y, w: car.w - pad * 2, h: car.h };
      if (fr.x < cr.x + cr.w && fr.x + fr.w > cr.x && fr.y < cr.y + cr.h && fr.y + fr.h > cr.y) {
        if (this.cb.onSplat) this.cb.onSplat(f.px, f.py);
        this._loseLife('car');
        return;
      }
    }
  }

  // ===================== KRESLENÍ =====================
  draw() {
    const ctx = this.ctx;
    const cw = this.cellSize;
    ctx.clearRect(0, 0, this.viewW, this.viewH);

    for (let row = 0; row < ROWS; row++) {
      this._drawRow(ctx, row, cw);
    }

    // auta
    for (const lane of this.lanes) {
      for (const car of lane.cars) this._drawCar(ctx, car);
    }

    this._drawFrog(ctx);
  }

  _drawRow(ctx, row, cw) {
    const y = row * cw;
    const type = ROW_TYPES[row];
    if (type === 'road') {
      const grad = ctx.createLinearGradient(0, y, 0, y + cw);
      grad.addColorStop(0, '#3a3a3f');
      grad.addColorStop(1, '#2b2b30');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, this.viewW, cw);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = Math.max(2, cw * 0.06);
      ctx.setLineDash([cw * 0.35, cw * 0.28]);
      ctx.beginPath();
      ctx.moveTo(0, y + cw / 2);
      ctx.lineTo(this.viewW, y + cw / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (type === 'grass' || type === 'start' || type === 'goal') {
      const grad = ctx.createLinearGradient(0, y, 0, y + cw);
      if (type === 'goal') {
        grad.addColorStop(0, '#3f9e52');
        grad.addColorStop(1, '#2e7d3d');
      } else if (type === 'start') {
        grad.addColorStop(0, '#4caf5f');
        grad.addColorStop(1, '#357a3f');
      } else {
        grad.addColorStop(0, '#469a54');
        grad.addColorStop(1, '#2f7539');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, this.viewW, cw);
      // texturní trsy trávy (deterministicky podle pozice, aby netřepetalo)
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      const seedBase = row * 97;
      for (let i = 0; i < COLS * 3; i++) {
        const px = (Math.sin(seedBase + i * 12.9898) * 43758.5453) % 1;
        const py = (Math.sin(seedBase + i * 78.233) * 12543.234) % 1;
        const tx = Math.abs(px) * this.viewW;
        const ty = y + cw * 0.25 + Math.abs(py) * cw * 0.6;
        ctx.beginPath();
        ctx.ellipse(tx, ty, cw * 0.09, cw * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (type === 'goal') {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (let c = 0; c < COLS; c++) {
          const cx = c * cw + cw / 2;
          const cy = y + cw / 2;
          this._drawFlower(ctx, cx, cy, cw * 0.14);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(0, y + cw - 1);
        ctx.lineTo(this.viewW, y + cw - 1);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  _drawFlower(ctx, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(255,240,150,0.9)';
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.4, r * 0.25, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#e0a83c';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawCar(ctx, car) {
    const { x, y, w, h, dir, palette } = car;
    ctx.save();
    const r = h * 0.28;
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, palette.body);
    grad.addColorStop(1, palette.dark);
    ctx.fillStyle = grad;
    this._roundRect(ctx, x, y, w, h, r);
    ctx.fill();
    // kabina
    ctx.fillStyle = 'rgba(180,225,255,0.75)';
    const cabW = w * 0.4;
    const cabX = dir === 1 ? x + w * 0.32 : x + w * 0.28;
    this._roundRect(ctx, cabX, y + h * 0.12, cabW, h * 0.5, h * 0.15);
    ctx.fill();
    // světla
    ctx.fillStyle = '#fff7c2';
    const lightX = dir === 1 ? x + w - h * 0.18 : x + h * 0.02;
    ctx.beginPath(); ctx.ellipse(lightX, y + h * 0.22, h * 0.1, h * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(lightX, y + h * 0.78, h * 0.1, h * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    // kola
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(x + w * 0.22, y + h, h * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w * 0.78, y + h, h * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  _drawFrog(ctx) {
    const f = this.frog;
    const cw = this.cellSize;
    const size = cw * 0.72 * (1 - f.squash * 0.18);
    const stretch = 1 + f.squash * 0.22;
    let rot = 0;
    if (f.dir === 'up') rot = 0;
    else if (f.dir === 'down') rot = Math.PI;
    else if (f.dir === 'left') rot = -Math.PI / 2;
    else if (f.dir === 'right') rot = Math.PI / 2;

    ctx.save();
    ctx.translate(f.px, f.py - f.squash * cw * 0.22);
    ctx.rotate(rot);
    ctx.scale(1, stretch);

    // stín
    ctx.save();
    ctx.rotate(-rot);
    ctx.scale(1, 1 / stretch);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, cw * 0.28 + f.squash * cw * 0.15, size * 0.38, size * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // zadní nohy
    ctx.fillStyle = '#3f9142';
    const legSpread = size * (0.42 + f.squash * 0.25);
    ctx.beginPath(); ctx.ellipse(-legSpread, size * 0.18, size * 0.22, size * 0.14, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(legSpread, size * 0.18, size * 0.22, size * 0.14, -0.4, 0, Math.PI * 2); ctx.fill();
    // přední nohy
    ctx.beginPath(); ctx.ellipse(-legSpread * 0.65, -size * 0.28, size * 0.16, size * 0.11, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(legSpread * 0.65, -size * 0.28, size * 0.16, size * 0.11, -0.3, 0, Math.PI * 2); ctx.fill();

    // tělo
    const bodyGrad = ctx.createRadialGradient(-size * 0.15, -size * 0.15, size * 0.1, 0, 0, size * 0.55);
    bodyGrad.addColorStop(0, '#8ee06a');
    bodyGrad.addColorStop(1, '#4caf50');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.42, size * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // skvrny
    ctx.fillStyle = 'rgba(60,120,60,0.35)';
    ctx.beginPath(); ctx.ellipse(-size * 0.15, size * 0.12, size * 0.09, size * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(size * 0.18, size * 0.05, size * 0.08, size * 0.05, 0, 0, Math.PI * 2); ctx.fill();

    // oči
    const eyeY = -size * 0.32;
    const eyeX = size * 0.2;
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#eafce0';
      ctx.beginPath(); ctx.arc(s * eyeX, eyeY, size * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#16321a';
      ctx.beginPath(); ctx.arc(s * eyeX, eyeY - size * 0.02, size * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(s * eyeX + size * 0.02, eyeY - size * 0.05, size * 0.025, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  }
}

window.Game = Game;
window.GAME_CONST = { COLS, ROWS, ROW_TYPES, LEVELS };
