// Správa tabulky nejlepších výsledků (Top 10) v localStorage
class Leaderboard {
  constructor(key = 'zaba_leaderboard', maxEntries = 10) {
    this.key = key;
    this.maxEntries = maxEntries;
  }

  getAll() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr;
    } catch (e) {
      return [];
    }
  }

  // Vrátí true, pokud dané skóre patří do TOP N (i při plné tabulce)
  qualifies(score) {
    const list = this.getAll();
    if (list.length < this.maxEntries) return score > 0;
    const lowest = list[list.length - 1].score;
    return score > lowest;
  }

  add(name, score) {
    const list = this.getAll();
    list.push({ name: (name || 'Hráč').slice(0, 14), score, date: new Date().toISOString() });
    list.sort((a, b) => b.score - a.score);
    const trimmed = list.slice(0, this.maxEntries);
    localStorage.setItem(this.key, JSON.stringify(trimmed));
    return trimmed;
  }
}

window.leaderboard = new Leaderboard();
