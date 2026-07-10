// Jednoduchý částicový systém ohňostroje pro vítěznou obrazovku
class Fireworks {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.rockets = [];
    this.running = false;
    this.lastSpawn = 0;
    this.spawnInterval = 700;
    this._resize = this._resize.bind(this);
    this._loop = this._loop.bind(this);
    window.addEventListener('resize', this._resize);
    this._resize();
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._resize();
    this.lastTime = performance.now();
    requestAnimationFrame(this._loop);
  }

  stop() {
    this.running = false;
    this.particles = [];
    this.rockets = [];
  }

  _spawnRocket() {
    const x = this.w * (0.15 + Math.random() * 0.7);
    const targetY = this.h * (0.15 + Math.random() * 0.35);
    const hue = Math.floor(Math.random() * 360);
    this.rockets.push({ x, y: this.h, targetY, hue, speed: 5 + Math.random() * 2 });
    if (window.audioManager) window.audioManager.fireworkBurst();
  }

  _explode(x, y, hue) {
    const count = 40 + Math.floor(Math.random() * 30);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
      const speed = 1.5 + Math.random() * 3.5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.008 + Math.random() * 0.012,
        hue: hue + (Math.random() * 40 - 20),
        size: 2 + Math.random() * 2,
      });
    }
  }

  _loop(now) {
    if (!this.running) return;
    const dt = Math.min(now - this.lastTime, 50);
    this.lastTime = now;
    const ctx = this.ctx;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(5,10,8,0.22)';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = 'lighter';

    if (now - this.lastSpawn > this.spawnInterval) {
      this.lastSpawn = now;
      this._spawnRocket();
      this.spawnInterval = 500 + Math.random() * 700;
    }

    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.y -= r.speed * (dt / 16);
      ctx.beginPath();
      ctx.fillStyle = `hsl(${r.hue}, 100%, 70%)`;
      ctx.arc(r.x, r.y, 3, 0, Math.PI * 2);
      ctx.fill();
      if (r.y <= r.targetY) {
        this._explode(r.x, r.y, r.hue);
        this.rockets.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.vy += 0.04 * (dt / 16);
      p.life -= p.decay * (dt / 16);
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, 100%, ${55 + p.life * 20}%, ${p.life})`;
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';

    requestAnimationFrame(this._loop);
  }
}

window.Fireworks = Fireworks;
