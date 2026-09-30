// Анимирано заглавие: буквите се проявяват една по една от размазано състояние
(function () {
  const hero = document.getElementById('introHero');
  const target = document.getElementById('introWord');
  if (!hero || !target) return;

  // Думите, които се сменят след "дни, които ..."
  const WORDS = ['вдъхновяват', 'зареждат', 'радват', 'се сбъдват'];
  const STAGGER = 45;       // ms между буквите
  const DURATION = 500;     // ms за проявяване на една буква
  const CHANGE_EVERY = 2500; // ms между смяната на думите
  const GRADIENT_COLORS = ['#eca8d6', '#a78bfa', '#67e8f9', '#fbbf24', '#eca8d6'];

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let wordIndex = 0;
  let frames = [];
  let timers = [];

  function hex2rgb(hex) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16)
    ];
  }

  // Цвят от градиента според позицията на буквата
  function gradientColor(i, total) {
    const pos = (i / Math.max(total - 1, 1)) * (GRADIENT_COLORS.length - 1);
    const lower = Math.floor(pos);
    const upper = Math.min(lower + 1, GRADIENT_COLORS.length - 1);
    const t = pos - lower;
    const [r1, g1, b1] = hex2rgb(GRADIENT_COLORS[lower]);
    const [r2, g2, b2] = hex2rgb(GRADIENT_COLORS[upper]);
    return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
  }

  function showWord(word) {
    frames.forEach(cancelAnimationFrame);
    timers.forEach(clearTimeout);
    frames = [];
    timers = [];

    const letters = Array.from(word);
    target.textContent = '';

    const spans = letters.map((ch, i) => {
      const s = document.createElement('span');
      s.className = 'intro-letter';
      s.textContent = ch === ' ' ? '\u00A0' : ch;
      s.style.opacity = '0';
      s.style.filter = 'blur(20px)';
      s.style.color = gradientColor(i, letters.length);
      target.appendChild(s);
      return s;
    });

    if (reduceMotion) {
      spans.forEach(s => {
        s.style.opacity = '1';
        s.style.filter = 'none';
        s.style.color = '#fff';
      });
      return;
    }

    spans.forEach((s, i) => {
      timers.push(setTimeout(() => {
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / DURATION, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          s.style.opacity = String(eased);
          s.style.filter = `blur(${20 * (1 - eased)}px)`;
          if (p < 1) frames.push(requestAnimationFrame(tick));
          else s.style.filter = 'none';
        };
        frames.push(requestAnimationFrame(tick));
      }, i * STAGGER));
    });

    // След като всички букви са се проявили, градиентът става бял
    timers.push(setTimeout(() => {
      spans.forEach(s => { s.style.color = '#fff'; });
    }, STAGGER * letters.length + DURATION + 200));
  }

  showWord(WORDS[wordIndex]);

  setInterval(() => {
    // Не сменяме думата, ако началната страница е скрита (след вход / отворена форма)
    if (document.hidden || getComputedStyle(hero).display === 'none') return;
    wordIndex = (wordIndex + 1) % WORDS.length;
    showWord(WORDS[wordIndex]);
  }, CHANGE_EVERY);
})();
