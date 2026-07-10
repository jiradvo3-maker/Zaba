(function () {
  const MAX_LIVES = 3;
  const screens = document.querySelectorAll('.screen');
  const canvas = document.getElementById('game-canvas');
  const fireworksCanvas = document.getElementById('fireworks-canvas');
  const fireworks = new Fireworks(fireworksCanvas);

  let lastWarnSecond = null;
  let pendingScore = 0;
  let pendingContext = null; // 'gameover' | 'win'

  function showScreen(id) {
    screens.forEach(s => s.classList.toggle('active', s.id === id));
  }

  function showOverlay(id) { document.getElementById(id).classList.remove('hidden'); }
  function hideOverlay(id) { document.getElementById(id).classList.add('hidden'); }
  function hideAllOverlays() {
    document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
  }

  function renderLives(lives) {
    const el = document.getElementById('hud-lives');
    let html = '';
    for (let i = 0; i < MAX_LIVES; i++) html += i < lives ? '❤️' : '🖤';
    el.innerHTML = html;
  }

  function renderLeaderboard() {
    const list = window.leaderboard.getAll();
    const el = document.getElementById('leaderboard-list');
    el.innerHTML = '';
    if (list.length === 0) {
      el.innerHTML = '<li class="empty">Zatím žádné výsledky. Buď první!</li>';
      return;
    }
    const medalClass = ['gold', 'silver', 'bronze'];
    list.forEach((entry, i) => {
      const li = document.createElement('li');
      if (medalClass[i]) li.classList.add(medalClass[i]);
      const date = entry.date ? new Date(entry.date).toLocaleDateString('cs-CZ') : '';
      li.innerHTML = `<span class="rank">${i + 1}.</span><span class="name">${escapeHtml(entry.name)}</span><span class="score">${entry.score}</span>`;
      li.title = date;
      el.appendChild(li);
    });
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  let bannerTimeout = null;
  function showLevelBanner(text) {
    const el = document.getElementById('level-banner');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(bannerTimeout);
    bannerTimeout = setTimeout(() => el.classList.remove('show'), 1300);
  }

  // ===================== GAME SETUP =====================
  const game = new Game(canvas, {
    onScoreChange: (score) => { document.getElementById('hud-score').textContent = `Skóre: ${score}`; },
    onLivesChange: (lives) => renderLives(lives),
    onLevelChange: (level, total) => {
      document.getElementById('hud-level').textContent = `Level ${level}/${total}`;
      showLevelBanner(`Level ${level}`);
      lastWarnSecond = null;
    },
    onTimeChange: (fraction, seconds) => {
      const bar = document.getElementById('timer-bar');
      bar.style.width = `${Math.max(0, fraction * 100)}%`;
      bar.classList.toggle('low', fraction < 0.2);
      const secInt = Math.ceil(seconds);
      if (secInt <= 10 && secInt >= 1 && secInt !== lastWarnSecond) {
        lastWarnSecond = secInt;
        window.audioManager.timeWarning();
      }
    },
    onJump: () => window.audioManager.jump(),
    onSplat: () => window.audioManager.hit(),
    onHitLife: (lives, reason) => {
      if (reason === 'time') window.audioManager.splash();
    },
    onLevelComplete: (level, remaining, bonus, total) => {
      window.audioManager.levelComplete();
      document.getElementById('levelcomplete-time').textContent = `Zbývající čas: ${remaining.toFixed(1)} s`;
      document.getElementById('levelcomplete-bonus').textContent = `Bonus: +${bonus} bodů (Skóre: ${total})`;
      showOverlay('overlay-levelcomplete');
    },
    onGameOver: (score) => {
      window.audioManager.stopMusic();
      window.audioManager.gameOver();
      handleRunEnd(score, 'gameover');
    },
    onWin: (score) => {
      window.audioManager.stopMusic();
      window.audioManager.victoryFanfare();
      fireworks.start();
      handleRunEnd(score, 'win');
    },
  });

  window.__zabaDebug = { game, fireworks };

  function handleRunEnd(score, context) {
    pendingScore = score;
    pendingContext = context;
    if (window.leaderboard.qualifies(score)) {
      document.getElementById('name-input').value = '';
      showOverlay('overlay-nameentry');
    } else {
      showEndOverlay(context, score);
    }
  }

  function showEndOverlay(context, score) {
    if (context === 'win') {
      document.getElementById('win-score').textContent = `Celkové skóre: ${score}`;
      showOverlay('overlay-win');
    } else {
      document.getElementById('gameover-score').textContent = `Celkové skóre: ${score}`;
      showOverlay('overlay-gameover');
    }
  }

  // ===================== MAIN LOOP =====================
  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(now - lastTime, 50);
    lastTime = now;
    if (document.getElementById('screen-game').classList.contains('active')) {
      game.update(dt);
      game.draw();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ===================== NAVIGACE MENU =====================
  document.getElementById('btn-play').addEventListener('click', () => {
    window.audioManager.click();
    showScreen('screen-game');
    hideAllOverlays();
    game.resize();
    game.startNewRun();
    window.audioManager.startMusic();
  });

  document.getElementById('btn-leaderboard').addEventListener('click', () => {
    window.audioManager.click();
    renderLeaderboard();
    showScreen('screen-leaderboard');
  });
  document.getElementById('btn-leaderboard-back').addEventListener('click', () => {
    window.audioManager.click();
    showScreen('screen-menu');
  });

  document.getElementById('btn-howto').addEventListener('click', () => {
    window.audioManager.click();
    showScreen('screen-howto');
  });
  document.getElementById('btn-howto-back').addEventListener('click', () => {
    window.audioManager.click();
    showScreen('screen-menu');
  });

  const soundBtn = document.getElementById('btn-sound-toggle');
  function refreshSoundLabel() {
    soundBtn.textContent = window.audioManager.enabled ? '🔊 Zvuk zapnut' : '🔇 Zvuk vypnut';
  }
  refreshSoundLabel();
  soundBtn.addEventListener('click', () => {
    window.audioManager.setEnabled(!window.audioManager.enabled);
    refreshSoundLabel();
    if (window.audioManager.enabled) window.audioManager.click();
  });

  function goToMenu() {
    game.state = 'idle';
    window.audioManager.stopMusic();
    fireworks.stop();
    hideAllOverlays();
    showScreen('screen-menu');
  }

  // ===================== PAUZA =====================
  document.getElementById('btn-pause').addEventListener('click', () => {
    if (game.state !== 'playing') return;
    game.pause();
    showOverlay('overlay-pause');
  });
  document.getElementById('btn-resume').addEventListener('click', () => {
    hideOverlay('overlay-pause');
    game.resume();
  });
  document.getElementById('btn-restart-level').addEventListener('click', () => {
    hideOverlay('overlay-pause');
    game.restartLevel();
  });
  document.getElementById('btn-quit-menu').addEventListener('click', goToMenu);

  // ===================== LEVEL COMPLETE =====================
  document.getElementById('btn-next-level').addEventListener('click', () => {
    hideOverlay('overlay-levelcomplete');
    game.advanceLevel();
  });

  // ===================== JMÉNO DO ŽEBŘÍČKU =====================
  document.getElementById('btn-save-name').addEventListener('click', saveName);
  document.getElementById('name-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveName();
  });
  function saveName() {
    const input = document.getElementById('name-input');
    const name = input.value.trim() || 'Hráč';
    window.leaderboard.add(name, pendingScore);
    hideOverlay('overlay-nameentry');
    showEndOverlay(pendingContext, pendingScore);
  }

  // ===================== KONEC HRY / VÝHRA =====================
  document.getElementById('btn-gameover-continue').addEventListener('click', () => {
    hideOverlay('overlay-gameover');
    goToMenu();
  });
  document.getElementById('btn-win-continue').addEventListener('click', () => {
    hideOverlay('overlay-win');
    fireworks.stop();
    goToMenu();
  });

  // ===================== OVLÁDÁNÍ =====================
  document.querySelectorAll('.dpad-btn').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      game.move(btn.dataset.dir);
    });
  });

  window.addEventListener('keydown', (e) => {
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    if (map[e.key] && document.getElementById('screen-game').classList.contains('active')) {
      e.preventDefault();
      game.move(map[e.key]);
    } else if (e.key === 'Escape' && game.state === 'playing') {
      game.pause();
      showOverlay('overlay-pause');
    }
  });

  // Gesta tahem prstu po ploše hry
  const canvasWrap = document.getElementById('canvas-wrap');
  let touchStart = null;
  canvasWrap.addEventListener('pointerdown', (e) => {
    touchStart = { x: e.clientX, y: e.clientY };
  });
  canvasWrap.addEventListener('pointerup', (e) => {
    if (!touchStart) return;
    const dx = e.clientX - touchStart.x;
    const dy = e.clientY - touchStart.y;
    touchStart = null;
    const threshold = 24;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      game.move(dx > 0 ? 'right' : 'left');
    } else {
      game.move(dy > 0 ? 'down' : 'up');
    }
  });

  // Prevence scrollování/zoomu na mobilu
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  showScreen('screen-menu');
})();
