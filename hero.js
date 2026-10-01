// Анимирано заглавие: буквите се проявяват една по една от размазано състояние,
// стоят малко и после се "разтопяват", преди да дойде следващата дума
(function () {
  const hero = document.getElementById('introHero');
  const target = document.getElementById('introWord');
  if (!hero || !target) return;
  const video = hero.querySelector('video');

  // Думите, които се сменят след "дни, които ..."
  const WORDS = ['зареждат', 'радват', 'помним',];

  // --- Настройки (може да се променят) ---
  const STAGGER = 45;          // ms между буквите при появяване
  const DURATION = 500;        // ms за проявяване на една буква
  const HOLD = 3500;           // ms, през които думата стои изцяло видима
  const DISSOLVE = 700;        // ms за "разтопяване" на една буква
  const DISSOLVE_STAGGER = 30; // ms между буквите при разтопяване
  const GRADIENT_COLORS = ['#eca8d6', '#a78bfa', '#67e8f9', '#fbbf24', '#eca8d6'];

  // Настройки за хора с изключени анимации (само меко проявяване / избледняване)
  const SOFT_IN = 1100;        // ms за проявяване на една буква
  const SOFT_OUT = 900;        // ms за избледняване на една буква
  const SOFT_STAGGER = 40;     // ms между буквите при проявяване
  const SOFT_OUT_STAGGER = 20; // ms между буквите при избледняване

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let wordIndex = 0;
  let frames = [];
  let timers = [];

  function clearAll() {
    frames.forEach(cancelAnimationFrame);
    timers.forEach(clearTimeout);
    frames = [];
    timers = [];
  }

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

  // Появяване на дума
  function showWord(word) {
    clearAll();

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

    // Намалено движение: само меко проявяване, буква след буква (без размазване и движение)
    if (reduceMotion) {
      spans.forEach((s, i) => {
        s.style.filter = 'none';
        s.style.transition = `opacity ${SOFT_IN}ms ease-in-out ${i * SOFT_STAGGER}ms, color 0.4s ease`;
      });
      timers.push(setTimeout(() => {
        spans.forEach(s => { s.style.opacity = '1'; });
      }, 30));
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
  }

  // "Разтопяване" на текущата дума: избледнява, размазва се и леко потъва надолу
  function dissolveWord(done) {
    clearAll();
    const spans = Array.from(target.children);

    if (spans.length === 0) {
      done();
      return;
    }

    // Намалено движение: само меко избледняване
    if (reduceMotion) {
      spans.forEach((s, i) => {
        s.style.transition = `opacity ${SOFT_OUT}ms ease-in-out ${i * SOFT_OUT_STAGGER}ms`;
        s.style.opacity = '0';
      });
      timers.push(setTimeout(done, SOFT_OUT + SOFT_OUT_STAGGER * (spans.length - 1) + 100));
      return;
    }

    spans.forEach((s, i) => {
      timers.push(setTimeout(() => {
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / DISSOLVE, 1);
          const e = p * p; // започва бавно, завършва по-бързо
          s.style.opacity = String(1 - e);
          s.style.filter = `blur(${14 * e}px)`;
          s.style.transform = `translateY(${8 * e}px)`;
          if (p < 1) frames.push(requestAnimationFrame(tick));
        };
        frames.push(requestAnimationFrame(tick));
      }, i * DISSOLVE_STAGGER));
    });

    timers.push(setTimeout(done, DISSOLVE_STAGGER * (spans.length - 1) + DISSOLVE + 50));
  }

  function isHidden() {
    return document.hidden || getComputedStyle(hero).display === 'none';
  }

  // Следващата дума идва само ако началната страница се вижда
  function tryNext() {
    if (isHidden()) {
      if (video) video.pause(); // спира видеото след вход, за да не харчи батерия
      timers.push(setTimeout(tryNext, 500));
      return;
    }
    if (video && video.paused) video.play().catch(() => { });
    dissolveWord(() => {
      wordIndex = (wordIndex + 1) % WORDS.length;
      cycle();
    });
  }

  function cycle() {
    showWord(WORDS[wordIndex]);
    const len = WORDS[wordIndex].length;
    const appearTime = reduceMotion
      ? SOFT_STAGGER * len + SOFT_IN
      : STAGGER * len + DURATION;
    timers.push(setTimeout(tryNext, appearTime + HOLD));
  }

  cycle();
})();
