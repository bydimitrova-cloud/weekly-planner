    // Тема превключване
    function setTheme(themeName) {
      document.documentElement.setAttribute('data-theme', themeName);
      localStorage.setItem('bday_planner_theme', themeName);
      const btn = document.getElementById('themeSwitcherBtn');
      if (themeName === 'sakura') {
        btn.textContent = '🐬 Промени темата';
      } else {
        btn.textContent = '🌸 Промени темата';
      }
    }

    function toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme');
      if (current === 'sakura') {
        setTheme('sea');
      } else {
        setTheme('sakura');
      }
    }

    // Зареждане на запазената тема
    (function () {
      const savedTheme = localStorage.getItem('bday_planner_theme') || 'sakura';
      setTheme(savedTheme);
    })();

    // Цитати
    const POSITIVE_QUOTES = [
      { text: "Всяка сутрин имаме ново начало. Това, което правим днес, има най-голямо значение.", author: "Буда" },
      { text: "Успехът не е ключът към щастието. Щастието е ключът към успеха.", author: "Алберт Швайцер" },
      { text: "Малките стъпки всеки ден водят до големи промени във времето.", author: "Мъдрост за деня" },
      { text: "Позволи си да растеш със собствено темпо. Няма нужда да бързаш.", author: "Вдъхновяваща мисъл" }
    ];

    function initDailyQuote() {
      const quoteText = document.getElementById('quoteText');
      const quoteAuthor = document.getElementById('quoteAuthor');
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const diff = (now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
      const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
      let idx = dayOfYear % POSITIVE_QUOTES.length;
      quoteText.textContent = `„${POSITIVE_QUOTES[idx].text}“`;
      quoteAuthor.textContent = `- ${POSITIVE_QUOTES[idx].author}`;
    }
    initDailyQuote();

    function updateLiveClock() {
      const now = new Date();
      let dateStr = now.toLocaleDateString('bg-BG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      dateStr = dateStr.replace(/\bГ\.?$/i, 'г.');
      dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
      document.getElementById('liveDate').textContent = dateStr;
      document.getElementById('liveTime').textContent = now.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    setInterval(updateLiveClock, 1000);
    updateLiveClock();

    // Модал
    let modalCallback = null;
    const modalOverlay = document.getElementById('customModalOverlay');
    const modalText = document.getElementById('customModalText');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');

    function showConfirm(text, callback) {
      modalText.textContent = text;
      modalCallback = callback;
      modalOverlay.classList.add('active');
    }

    modalCancelBtn.addEventListener('click', () => {
      modalOverlay.classList.remove('active');
      modalCallback = null;
    });

    modalConfirmBtn.addEventListener('click', () => {
      modalOverlay.classList.remove('active');
      if (modalCallback) modalCallback();
      modalCallback = null;
    });

    // Радио
    const playBtn = document.getElementById('radioPlayBtn');
    const statusEl = document.getElementById('radioStatus');
    const radioIframe = document.getElementById('radioIframe');
    let isRadioPlaying = false;

    playBtn.addEventListener('click', () => {
      if (!isRadioPlaying) {
        radioIframe.src = "https://radiohype.gr/live/zucca";
        playBtn.textContent = '❚❚';
        statusEl.textContent = 'В ефир...';
        isRadioPlaying = true;
      } else {
        radioIframe.src = "about:blank";
        playBtn.textContent = '▶';
        statusEl.textContent = 'Спряно';
        isRadioPlaying = false;
      }
    });

    const DAYS_BG = ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота', 'Неделя'];
    const TIME_SLOTS = [];
    for (let h = 8; h <= 18; h++) {
      let hr = String(h).padStart(2, '0');
      TIME_SLOTS.push(`${hr}:00`);
      if (h < 18) TIME_SLOTS.push(`${hr}:30`);
    }

    function getMonday(d) {
      d = new Date(d);
      var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6 : 1);
      return new Date(d.setDate(diff));
    }

    let currentMonday = getMonday(new Date());

    function formatDateIso(date) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function formatDateDisplay(date) {
      return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
    }

    // ==== Supabase: облачно съхранение (вход по имейл + парола) ====
    const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    let currentUser = null;
    let appData = { tasks: {}, reminders: [], links: [], notes: '' };
    let saveTimer = null;

    function scheduleSave() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveToCloud, 500);
    }

    async function saveToCloud() {
      if (!currentUser) return;
      try {
        await sb.from('planner_data').upsert(
          { user_id: currentUser.id, data: appData },
          { onConflict: 'user_id' }
        );
      } catch (e) { console.error('Грешка при запис в облака:', e); }
    }

    async function loadFromCloud() {
      const { data, error } = await sb.from('planner_data').select('data').maybeSingle();
      if (error) { console.error('Грешка при зареждане:', error); }
      if (data && data.data) {
        appData = Object.assign({ tasks: {}, reminders: [], links: [], notes: '' }, data.data);
      } else {
        await sb.from('planner_data').insert({ user_id: currentUser.id, data: appData });
      }
    }

    function startApp() {
      document.body.classList.remove('pre-auth');
      document.getElementById('authOverlay').classList.add('hidden');
      document.getElementById('authGoToFormBtn').classList.add('hidden');
      document.getElementById('themeSwitcherBtnPreauth').classList.add('hidden');
      notesArea.value = appData.notes || '';
      renderCalendar();
      renderReminders();
      renderLinks();
    }

    const authOverlay = document.getElementById('authOverlay');
    const authFormBox = document.getElementById('authFormBox');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    const authError = document.getElementById('authError');
    const authNote = document.getElementById('authNote');

    // Малкият бутон "ВХОД" горе вдясно отваря формата за вход
    document.getElementById('authGoToFormBtn').addEventListener('click', () => {
      authOverlay.classList.remove('hidden');
      authEmail.focus();
    });

    // Назад: затваря формата (overlay-я)
    document.getElementById('authBackBtn').addEventListener('click', () => {
      authError.textContent = '';
      authNote.textContent = '';
      authOverlay.classList.add('hidden');
    });

    // Показване / скриване на паролата (иконка "око", в стил на браузъра)
    const EYE_OPEN_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
    const EYE_CLOSED_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.2A10.9 10.9 0 0 1 12 5c7 0 10.5 7 10.5 7a13.4 13.4 0 0 1-3.1 4.1M6.6 6.6C3.4 8.4 1.5 12 1.5 12s3.5 7 10.5 7a10.4 10.4 0 0 0 4.2-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
    const eyeBtn = document.getElementById('passwordEyeBtn');
    eyeBtn.innerHTML = EYE_CLOSED_SVG;
    eyeBtn.addEventListener('click', () => {
      const isHidden = authPassword.type === 'password';
      authPassword.type = isHidden ? 'text' : 'password';
      eyeBtn.innerHTML = isHidden ? EYE_OPEN_SVG : EYE_CLOSED_SVG;
      eyeBtn.classList.toggle('active', isHidden);
    });

    async function doLogin() {
      authError.textContent = '';
      authNote.textContent = '';
      const email = authEmail.value.trim();
      const password = authPassword.value;
      if (!email || !password) { authError.textContent = 'Попълни имейл и парола.'; return; }
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) authError.textContent = 'Грешка: ' + error.message;
    }

    document.getElementById('authLoginBtn').addEventListener('click', doLogin);

    // Enter в имейл или парола -> вход
    authEmail.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); doLogin(); }
    });
    authPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); doLogin(); }
    });

    document.getElementById('authSignupBtn').addEventListener('click', async () => {
      authError.textContent = '';
      authNote.textContent = '';
      const email = authEmail.value.trim();
      const password = authPassword.value;
      if (!email || !password || password.length < 6) {
        authError.textContent = 'Имейл и парола (мин. 6 символа) са задължителни.';
        return;
      }
      const { error } = await sb.auth.signUp({ email, password });
      if (error) { authError.textContent = 'Грешка: ' + error.message; return; }
      authNote.textContent = 'Готово! Провери имейла си за линк за потвърждение, после влез с бутона "Вход".';
    });

    // Забравена парола -> изпращане на линк за възстановяване
    document.getElementById('forgotPasswordLink').addEventListener('click', async (e) => {
      e.preventDefault();
      authError.textContent = '';
      authNote.textContent = '';
      const email = authEmail.value.trim();
      if (!email) { authError.textContent = 'Въведи първо имейла си, за да изпратим линк за възстановяване.'; return; }
      const { error } = await sb.auth.resetPasswordForEmail(email);
      if (error) { authError.textContent = 'Грешка: ' + error.message; return; }
      authNote.textContent = 'Изпратихме линк за смяна на паролата на ' + email + '.';
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
      if (isRadioPlaying) {
        radioIframe.src = "about:blank";
        isRadioPlaying = false;
      }
      sb.auth.signOut();
    });

    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        currentUser = session.user;
        loadFromCloud().then(startApp);
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        location.reload();
      }
    });

    (async function initAuth() {
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        currentUser = session.user;
        await loadFromCloud();
        startApp();
      }
    })();

    const startDateDisplay = document.getElementById('startDateDisplay');
    const endDateLbl = document.getElementById('endDateLbl');

    function updateDateDisplay(startDate, endDate) {
      startDateDisplay.textContent = formatDateDisplay(startDate);
      endDateLbl.textContent = formatDateDisplay(endDate);
    }

    function getDaysOfWeek(mondayDate) {
      let days = [];
      for (let i = 0; i < 7; i++) {
        let nextDay = new Date(mondayDate);
        nextDay.setDate(mondayDate.getDate() + i);
        days.push(nextDay);
      }
      return days;
    }

    function updateActiveMonthPill() {
      const pills = document.querySelectorAll('.month-pill');
      let currentMonth = currentMonday.getMonth();
      pills.forEach(pill => {
        let m = parseInt(pill.getAttribute('data-month'));
        if (m === currentMonth) pill.classList.add('active');
        else pill.classList.remove('active');
      });
    }

    function renderWeekdayColumnHtml(dayDate, dayIndex) {
      let dateKey = formatDateIso(dayDate);
      let dayTasks = appData.tasks[dateKey] || {};
      let html = `<div class="day-column"><div class="day-header"><div class="day-name">${DAYS_BG[dayIndex]}</div><div class="day-date">${formatDateDisplay(dayDate)}</div></div><div class="time-slots-list">`;

      TIME_SLOTS.forEach(time => {
        let slotTasks = dayTasks[time] || [];
        html += `<div class="time-slot-row"><div class="slot-header-info"><span>${time}</span><button class="add-inline-btn" onclick="openQuickAdd('${dateKey}', '${time}')">+</button></div>`;
        slotTasks.forEach((taskObj, tIdx) => {
          let isDone = taskObj.done ? ' completed' : '';
          html += `<div class="calendar-task-item${isDone}" id="task-${dateKey}-${time}-${tIdx}"><input type="checkbox" ${taskObj.done ? 'checked' : ''} onchange="toggleTaskDone('${dateKey}', '${time}', ${tIdx})"><span onclick="startEditTask('${dateKey}', '${time}', ${tIdx})">${escapeHtml(taskObj.text)}</span><button class="del-btn" onclick="deleteTask('${dateKey}', '${time}', ${tIdx})">✕</button></div>`;
        });
        html += `</div>`;
      });

      html += `</div><div class="day-quick-add"><select id="sel-time-${dateKey}">${TIME_SLOTS.map(t => `<option value="${t}">${t}</option>`).join('')}</select><input type="text" id="inp-task-${dateKey}" placeholder="Нова задача..." onkeydown="handleEnterKey(event, '${dateKey}')"><button onclick="addTask('${dateKey}')">+ Добави</button></div></div>`;
      return html;
    }

    function renderWeekendColumnHtml(dayDate, dayIndex) {
      let dateKey = formatDateIso(dayDate);
      let dayTasks = appData.tasks[dateKey] || {};
      let freeTasks = dayTasks['free'] || [];
      let html = `<div class="day-column"><div class="day-header"><div class="day-name">${DAYS_BG[dayIndex]}</div><div class="day-date">${formatDateDisplay(dayDate)}</div></div><div class="free-notes-box">`;

      if (freeTasks.length === 0) {
        html += `<div style="font-size:11.5px; color:var(--ink-soft); font-style:italic; padding:4px;">Няма бележки.</div>`;
      } else {
        freeTasks.forEach((taskObj, tIdx) => {
          let isDone = taskObj.done ? ' completed' : '';
          html += `<div class="free-task-item${isDone}" id="free-${dateKey}-${tIdx}"><input type="checkbox" ${taskObj.done ? 'checked' : ''} onchange="toggleFreeTaskDone('${dateKey}', ${tIdx})"><span onclick="startEditFreeTask('${dateKey}', ${tIdx})">${escapeHtml(taskObj.text)}</span><button class="del-btn" onclick="deleteFreeTask('${dateKey}', ${tIdx})">✕</button></div>`;
        });
      }

      html += `</div><div class="day-quick-add"><input type="text" id="inp-free-${dateKey}" placeholder="Бележка за уикенда..." onkeydown="handleFreeEnterKey(event, '${dateKey}')"><button onclick="addFreeTask('${dateKey}')">+ Добави</button></div></div>`;
      return html;
    }

    function renderCalendar() {
      const weekdaysContainer = document.getElementById('weekdaysGrid');
      const weekendContainer = document.getElementById('weekendGrid');
      weekdaysContainer.innerHTML = '';
      weekendContainer.innerHTML = '';

      let days = getDaysOfWeek(currentMonday);
      updateDateDisplay(currentMonday, days[6]);
      updateActiveMonthPill();

      let weekdaysHtml = '';
      for (let i = 0; i < 5; i++) weekdaysHtml += renderWeekdayColumnHtml(days[i], i);
      weekdaysContainer.innerHTML = weekdaysHtml;

      let weekendHtml = renderWeekendColumnHtml(days[5], 5) + renderWeekendColumnHtml(days[6], 6);
      weekendContainer.innerHTML = weekendHtml;
    }

    function escapeHtml(str) {
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    window.openQuickAdd = function (dateKey, time) {
      document.getElementById(`sel-time-${dateKey}`).value = time;
      document.getElementById(`inp-task-${dateKey}`).focus();
    }

    window.addTask = function (dateKey) {
      let time = document.getElementById(`sel-time-${dateKey}`).value;
      let textInp = document.getElementById(`inp-task-${dateKey}`);
      let val = textInp.value.trim();
      if (!val) return;
      if (!appData.tasks[dateKey]) appData.tasks[dateKey] = {};
      if (!appData.tasks[dateKey][time]) appData.tasks[dateKey][time] = [];
      appData.tasks[dateKey][time].push({ text: val, done: false });
      scheduleSave();
      textInp.value = '';
      renderCalendar();
    }

    window.handleEnterKey = function (e, dateKey) { if (e.key === 'Enter') addTask(dateKey); }

    window.toggleTaskDone = function (dateKey, time, idx) {
      appData.tasks[dateKey][time][idx].done = !appData.tasks[dateKey][time][idx].done;
      scheduleSave();
      renderCalendar();
    }

    window.deleteTask = function (dateKey, time, idx) {
      showConfirm("Потвърждавате ли изтриването?", () => {
        appData.tasks[dateKey][time].splice(idx, 1);
        if (appData.tasks[dateKey][time].length === 0) delete appData.tasks[dateKey][time];
        scheduleSave();
        renderCalendar();
      });
    }

    window.startEditTask = function (dateKey, time, idx) {
      let container = document.getElementById(`task-${dateKey}-${time}-${idx}`);
      let currentText = appData.tasks[dateKey][time][idx].text;
      let span = container.querySelector('span');
      let input = document.createElement('input');
      input.type = 'text';
      input.className = 'edit-input';
      input.value = currentText;
      span.replaceWith(input);
      input.focus();
      input.select();

      let commit = () => {
        let newVal = input.value.trim();
        if (newVal) appData.tasks[dateKey][time][idx].text = newVal;
        scheduleSave();
        renderCalendar();
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { renderCalendar(); }
      });
    }

    window.addFreeTask = function (dateKey) {
      let textInp = document.getElementById(`inp-free-${dateKey}`);
      let val = textInp.value.trim();
      if (!val) return;
      if (!appData.tasks[dateKey]) appData.tasks[dateKey] = {};
      if (!appData.tasks[dateKey]['free']) appData.tasks[dateKey]['free'] = [];
      appData.tasks[dateKey]['free'].push({ text: val, done: false });
      scheduleSave();
      textInp.value = '';
      renderCalendar();
    }

    window.handleFreeEnterKey = function (e, dateKey) { if (e.key === 'Enter') addFreeTask(dateKey); }

    window.toggleFreeTaskDone = function (dateKey, idx) {
      appData.tasks[dateKey]['free'][idx].done = !appData.tasks[dateKey]['free'][idx].done;
      scheduleSave();
      renderCalendar();
    }

    window.deleteFreeTask = function (dateKey, idx) {
      showConfirm("Потвърждавате ли изтриването?", () => {
        appData.tasks[dateKey]['free'].splice(idx, 1);
        scheduleSave();
        renderCalendar();
      });
    }

    window.startEditFreeTask = function (dateKey, idx) {
      let container = document.getElementById(`free-${dateKey}-${idx}`);
      let currentText = appData.tasks[dateKey]['free'][idx].text;
      let span = container.querySelector('span');
      let input = document.createElement('input');
      input.type = 'text';
      input.className = 'edit-input';
      input.value = currentText;
      span.replaceWith(input);
      input.focus();
      input.select();

      let commit = () => {
        let newVal = input.value.trim();
        if (newVal) appData.tasks[dateKey]['free'][idx].text = newVal;
        scheduleSave();
        renderCalendar();
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { renderCalendar(); }
      });
    }

    document.getElementById('prevWeekBtn').addEventListener('click', () => { currentMonday.setDate(currentMonday.getDate() - 7); renderCalendar(); });
    document.getElementById('nextWeekBtn').addEventListener('click', () => { currentMonday.setDate(currentMonday.getDate() + 7); renderCalendar(); });
    document.getElementById('currentWeekBtn').addEventListener('click', () => { currentMonday = getMonday(new Date()); renderCalendar(); });

    document.querySelectorAll('.month-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        let m = parseInt(pill.getAttribute('data-month'));
        currentMonday = getMonday(new Date(currentMonday.getFullYear(), m, 1));
        renderCalendar();
      });
    });

    // Напомняния
    function renderReminders() {
      let list = document.getElementById('remindersList');
      list.innerHTML = '';
      if (appData.reminders.length === 0) {
        list.innerHTML = '<div style="font-size:12px; color:var(--ink-soft); font-style:italic;">Няма активни напомняния.</div>';
        return;
      }
      appData.reminders.forEach((rem, idx) => {
        list.innerHTML += `<div class="reminder-item${rem.done ? ' done' : ''}" id="rem-${idx}"><input type="checkbox" ${rem.done ? 'checked' : ''} onchange="toggleReminder(${idx})"><span class="txt" onclick="startEditReminder(${idx})">${escapeHtml(rem.text)}</span><button class="del" onclick="deleteReminder(${idx})">✕</button></div>`;
      });
    }

    window.toggleReminder = function (idx) {
      appData.reminders[idx].done = !appData.reminders[idx].done;
      scheduleSave();
      renderReminders();
    }

    window.deleteReminder = function (idx) {
      showConfirm("Сигурни ли сте?", () => {
        appData.reminders.splice(idx, 1);
        scheduleSave();
        renderReminders();
      });
    }

    window.startEditReminder = function (idx) {
      let container = document.getElementById(`rem-${idx}`);
      let currentText = appData.reminders[idx].text;
      let span = container.querySelector('span.txt');
      let input = document.createElement('input');
      input.type = 'text';
      input.className = 'edit-input';
      input.value = currentText;
      span.replaceWith(input);
      input.focus();
      input.select();

      let commit = () => {
        let newVal = input.value.trim();
        if (newVal) appData.reminders[idx].text = newVal;
        scheduleSave();
        renderReminders();
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { renderReminders(); }
      });
    }

    document.getElementById('addReminderBtn').addEventListener('click', () => {
      let inp = document.getElementById('reminderText');
      if (!inp.value.trim()) return;
      appData.reminders.push({ text: inp.value.trim(), done: false });
      scheduleSave();
      inp.value = '';
      renderReminders();
    });

    // Бележки и линкове
    const notesArea = document.getElementById('notes-area');
    notesArea.addEventListener('input', () => {
      appData.notes = notesArea.value;
      scheduleSave();
    });

    function renderLinks() {
      let list = document.getElementById('linksList');
      list.innerHTML = '';
      if (appData.links.length === 0) {
        list.innerHTML = '<div style="font-size:12px; color:var(--ink-soft); font-style:italic;">Няма добавени линкове.</div>';
        return;
      }
      appData.links.forEach((lnk, idx) => {
        let displayTitle = lnk.title || lnk.url;
        list.innerHTML += `<div class="link-item"><a href="${escapeHtml(lnk.url)}" target="_blank" title="${escapeHtml(lnk.url)}">🔗 ${escapeHtml(displayTitle)}</a><button class="del" onclick="deleteLink(${idx})">✕</button></div>`;
      });
    }

    document.getElementById('addLinkBtn').addEventListener('click', () => {
      let input = document.getElementById('newLink');
      let val = input.value.trim();
      if (!val) return;
      if (!/^https?:\/\//i.test(val)) val = 'https://' + val;
      appData.links.push({ url: val, title: val.replace(/^https?:\/\//, '') });
      scheduleSave();
      input.value = '';
      renderLinks();
    });

    document.getElementById('newLink').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('addLinkBtn').click();
    });

    window.deleteLink = function (idx) {
      showConfirm("Сигурни ли сте?", () => {
        appData.links.splice(idx, 1);
        scheduleSave();
        renderLinks();
      });
    }

    // Бутон "Обратно в началото"
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) scrollTopBtn.classList.add('visible');
      else scrollTopBtn.classList.remove('visible');
    });
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
