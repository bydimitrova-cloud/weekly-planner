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
    for (let h = 7; h <= 20; h++) {
      let hr = String(h).padStart(2, '0');
      TIME_SLOTS.push(`${hr}:00`);
      if (h < 20) TIME_SLOTS.push(`${hr}:30`);
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
    let appData = { tasks: {}, reminders: [], links: [], notes: '', notebook: [], dayTypes: {} };
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
        appData = Object.assign({ tasks: {}, reminders: [], links: [], notes: '', notebook: [], dayTypes: {} }, data.data);
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
      renderNotebook();
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
      const { error } = await sb.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: 'https://bydimitrova-cloud.github.io/weekly-planner/' }
      });
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
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://bydimitrova-cloud.github.io/weekly-planner/'
      });
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
      if (event === 'PASSWORD_RECOVERY') {
        // Потребителят е дошъл от линк "Забравена парола" -> показваме форма за нова парола
        authOverlay.classList.remove('hidden');
        authFormBox.classList.add('hidden');
        document.getElementById('recoveryFormBox').classList.remove('hidden');
        document.getElementById('authGoToFormBtn').classList.add('hidden');
        document.getElementById('themeSwitcherBtnPreauth').classList.add('hidden');
      } else if (event === 'SIGNED_IN') {
        currentUser = session.user;
        loadFromCloud().then(startApp);
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        location.reload();
      }
    });

    // Форма за нова парола (след линк "Забравена парола")
    const recoveryPassword = document.getElementById('recoveryPassword');
    const recoveryError = document.getElementById('recoveryError');
    const recoveryNote = document.getElementById('recoveryNote');

    const RECOVERY_EYE_OPEN = EYE_OPEN_SVG;
    const RECOVERY_EYE_CLOSED = EYE_CLOSED_SVG;
    const recoveryEyeBtn = document.getElementById('recoveryEyeBtn');
    recoveryEyeBtn.innerHTML = RECOVERY_EYE_CLOSED;
    recoveryEyeBtn.addEventListener('click', () => {
      const isHidden = recoveryPassword.type === 'password';
      recoveryPassword.type = isHidden ? 'text' : 'password';
      recoveryEyeBtn.innerHTML = isHidden ? RECOVERY_EYE_OPEN : RECOVERY_EYE_CLOSED;
      recoveryEyeBtn.classList.toggle('active', isHidden);
    });

    async function submitNewPassword() {
      recoveryError.textContent = '';
      recoveryNote.textContent = '';
      const newPass = recoveryPassword.value;
      if (!newPass || newPass.length < 6) {
        recoveryError.textContent = 'Паролата трябва да е поне 6 символа.';
        return;
      }
      const { error } = await sb.auth.updateUser({ password: newPass });
      if (error) { recoveryError.textContent = 'Грешка: ' + error.message; return; }
      recoveryNote.textContent = 'Паролата е сменена успешно! Влизаш автоматично...';
      setTimeout(() => location.reload(), 1200);
    }

    document.getElementById('recoverySubmitBtn').addEventListener('click', submitNewPassword);
    recoveryPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submitNewPassword(); }
    });

    // Ако линкът е за възстановяване на парола (type=recovery в hash-а),
    // не стартираме автоматично приложението - изчакваме onAuthStateChange('PASSWORD_RECOVERY')
    const isRecoveryLink = /type=recovery/.test(window.location.hash);

    (async function initAuth() {
      if (isRecoveryLink) return;
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
      // Месецът се определя по четвъртъка от седмицата (ISO правило),
      // а не по понеделника, който често е в предишния месец.
      let thursday = new Date(currentMonday);
      thursday.setDate(currentMonday.getDate() + 3);
      let currentMonth = thursday.getMonth();
      pills.forEach(pill => {
        let m = parseInt(pill.getAttribute('data-month'));
        if (m === currentMonth) pill.classList.add('active');
        else pill.classList.remove('active');
      });
    }

    // Тип на деня (работен / неработен). Делничните дни са работни по подразбиране,
    // а съботата и неделята са неработни по подразбиране — освен ако потребителят не ги смени.
    const DAY_TYPE_OPTIONS = [
      { value: 'work', label: 'Работен ден' },
      { value: 'off', label: 'Неработен ден' }
    ];

    function renderDayTypeSelect(dateKey, dayType) {
      let opts = DAY_TYPE_OPTIONS.map(o => `<option value="${o.value}"${dayType === o.value ? ' selected' : ''}>${o.label}</option>`).join('');
      return `<select class="day-type-select" onclick="event.stopPropagation()" onchange="setDayType('${dateKey}', this.value, this)">${opts}</select>`;
    }

    window.setDayType = function (dateKey, type, selectEl) {
      if (!appData.dayTypes) appData.dayTypes = {};
      appData.dayTypes[dateKey] = type;
      scheduleSave();
      // Запазваме позицията на скрола, за да не "скача" страницата
      // при повторното изчертаване на календара.
      if (selectEl) selectEl.blur();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      renderCalendar();
      window.scrollTo(scrollX, scrollY);
    }

    function renderWeekdayColumnHtml(dayDate, dayIndex) {
      let dateKey = formatDateIso(dayDate);
      let dayTasks = appData.tasks[dateKey] || {};
      let dayType = (appData.dayTypes && appData.dayTypes[dateKey]) || 'work';
      let html = `<div class="day-column${dayType === 'off' ? ' day-type-off' : ''}"><div class="day-header"><div class="day-name">${DAYS_BG[dayIndex]}</div><div class="day-date">${formatDateDisplay(dayDate)}</div>${renderDayTypeSelect(dateKey, dayType)}</div><div class="time-slots-list">`;

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
      let dayType = (appData.dayTypes && appData.dayTypes[dateKey]) || 'off';
      let html = `<div class="day-column${dayType === 'off' ? ' day-type-off' : ''}"><div class="day-header"><div class="day-name">${DAYS_BG[dayIndex]}</div><div class="day-date">${formatDateDisplay(dayDate)}</div>${renderDayTypeSelect(dateKey, dayType)}</div><div class="free-notes-box">`;

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
        // Използваме годината на четвъртъка от текущата седмица (важи за седмици около 1 януари)
        let thu = new Date(currentMonday); thu.setDate(currentMonday.getDate() + 3);
        let monday = getMonday(new Date(thu.getFullYear(), m, 1));
        // Ако четвъртъкът на седмицата на 1-во число е в предишния месец,
        // вземаме следващата седмица, за да се маркира кликнатият месец.
        let check = new Date(monday); check.setDate(monday.getDate() + 3);
        if (check.getMonth() !== m) monday.setDate(monday.getDate() + 7);
        currentMonday = monday;
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

    // === Тефтерче (лични разнородни записи с търсене по ключова дума) ===
    function genNotebookId() {
      return 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    }

    let notebookOpenIds = new Set();
    let notebookEditingId = null;

    function notebookMatches(entry, q) {
      if (!q) return true;
      q = q.toLowerCase();
      return (entry.title || '').toLowerCase().includes(q) || (entry.content || '').toLowerCase().includes(q);
    }

    function renderNotebook() {
      const list = document.getElementById('notebookList');
      const q = document.getElementById('notebookSearch').value.trim();
      list.innerHTML = '';

      if (!appData.notebook) appData.notebook = [];

      if (appData.notebook.length === 0) {
        list.innerHTML = '<div class="notebook-empty">Няма записи. Добави първия си запис с бутона по-горе — рецепта, парола, данни за лекар или каквото ти хрумне.</div>';
        return;
      }

      const filtered = appData.notebook.filter(e => notebookMatches(e, q));
      if (filtered.length === 0) {
        list.innerHTML = '<div class="notebook-empty">Няма резултати за тази търсене.</div>';
        return;
      }

      filtered.forEach(entry => {
        const isEditing = notebookEditingId === entry.id;

        if (isEditing) {
          list.innerHTML += `
            <div class="notebook-item open editing" id="nb-${entry.id}">
              <input type="text" class="notebook-edit-title" id="nbEditTitle-${entry.id}" value="${escapeHtml(entry.title || '')}" placeholder="Заглавие / ключова дума">
              <textarea class="notebook-edit-content" id="nbEditContent-${entry.id}" placeholder="Съдържание...">${escapeHtml(entry.content || '')}</textarea>
              <div class="notebook-item-btns">
                <button onclick="saveNotebookEdit('${entry.id}')">✔ Запази</button>
                <button class="btn-cancel-inline" onclick="cancelNotebookEdit()">Отказ</button>
              </div>
            </div>`;
          return;
        }

        const isOpen = notebookOpenIds.has(entry.id);
        let preview = (entry.content || '').split('\n')[0];
        if (preview.length > 80) preview = preview.slice(0, 80) + '…';

        list.innerHTML += `
          <div class="notebook-item${isOpen ? ' open' : ''}" id="nb-${entry.id}">
            <div class="notebook-item-head" onclick="toggleNotebookItem('${entry.id}')">
              <span class="notebook-item-title">${escapeHtml(entry.title || '(без заглавие)')}</span>
              <span class="notebook-item-caret">${isOpen ? '▲' : '▼'}</span>
            </div>
            ${!isOpen ? `<div class="notebook-item-preview">${escapeHtml(preview)}</div>` : ''}
            ${isOpen ? `
              <div class="notebook-item-body">${escapeHtml(entry.content || '')}</div>
              <div class="notebook-item-btns">
                <button onclick="startEditNotebook('${entry.id}')">✎ Редактирай</button>
                <button onclick="deleteNotebookEntry('${entry.id}')">✕ Изтрий</button>
              </div>` : ''}
          </div>`;
      });
    }

    window.toggleNotebookItem = function (id) {
      if (notebookEditingId === id) return;
      if (notebookOpenIds.has(id)) notebookOpenIds.delete(id);
      else notebookOpenIds.add(id);
      renderNotebook();
    }

    window.startEditNotebook = function (id) {
      notebookEditingId = id;
      renderNotebook();
    }

    window.cancelNotebookEdit = function () {
      notebookEditingId = null;
      renderNotebook();
    }

    window.saveNotebookEdit = function (id) {
      const titleInp = document.getElementById(`nbEditTitle-${id}`);
      const contentInp = document.getElementById(`nbEditContent-${id}`);
      const entry = appData.notebook.find(e => e.id === id);
      if (entry) {
        entry.title = titleInp.value.trim();
        entry.content = contentInp.value.trim();
        scheduleSave();
      }
      notebookEditingId = null;
      notebookOpenIds.add(id);
      renderNotebook();
    }

    window.deleteNotebookEntry = function (id) {
      showConfirm("Сигурни ли сте, че искате да изтриете този запис?", () => {
        appData.notebook = appData.notebook.filter(e => e.id !== id);
        notebookOpenIds.delete(id);
        scheduleSave();
        renderNotebook();
      });
    }

    const notebookAddBtn = document.getElementById('notebookAddBtn');
    const notebookAddForm = document.getElementById('notebookAddForm');
    const notebookTitleInput = document.getElementById('notebookTitleInput');
    const notebookContentInput = document.getElementById('notebookContentInput');

    notebookAddBtn.addEventListener('click', () => {
      notebookAddForm.classList.toggle('hidden');
      if (!notebookAddForm.classList.contains('hidden')) notebookTitleInput.focus();
    });

    document.getElementById('notebookSaveBtn').addEventListener('click', () => {
      const title = notebookTitleInput.value.trim();
      const content = notebookContentInput.value.trim();
      if (!title && !content) return;
      if (!appData.notebook) appData.notebook = [];
      appData.notebook.unshift({ id: genNotebookId(), title, content });
      scheduleSave();
      notebookTitleInput.value = '';
      notebookContentInput.value = '';
      notebookAddForm.classList.add('hidden');
      renderNotebook();
    });

    document.getElementById('notebookCancelBtn').addEventListener('click', () => {
      notebookTitleInput.value = '';
      notebookContentInput.value = '';
      notebookAddForm.classList.add('hidden');
    });

    document.getElementById('notebookSearch').addEventListener('input', renderNotebook);

    // Отваряне / затваряне на тефтерчето (корица <-> съдържание)
    const notebookCover = document.getElementById('notebookCover');
    const notebookOpenView = document.getElementById('notebookOpenView');

    document.getElementById('notebookOpenBtn').addEventListener('click', () => {
      notebookCover.classList.add('hidden');
      notebookOpenView.classList.remove('hidden');
      renderNotebook();
      document.getElementById('notebookSearch').focus();
    });

    document.getElementById('notebookCloseBtn').addEventListener('click', () => {
      notebookOpenView.classList.add('hidden');
      notebookCover.classList.remove('hidden');
      notebookAddForm.classList.add('hidden');
      notebookTitleInput.value = '';
      notebookContentInput.value = '';
      notebookEditingId = null;
    });

    // Бутон "Обратно в началото"
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) scrollTopBtn.classList.add('visible');
      else scrollTopBtn.classList.remove('visible');
    });
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
