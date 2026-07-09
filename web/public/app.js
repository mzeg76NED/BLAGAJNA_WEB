const SESSION_KEY = 'BLAGAJNA_APP_SESSION_ID';

const state = {
  sessionId: sessionStorage.getItem(SESSION_KEY) || '',
  session: null,
  activeShifts: []
};

const elements = {
  appView: document.getElementById('appView'),
  cashboxList: document.getElementById('cashboxList'),
  cashboxMessage: document.getElementById('cashboxMessage'),
  closeShiftButton: document.getElementById('closeShiftButton'),
  closeShiftForm: document.getElementById('closeShiftForm'),
  closingNoteInput: document.getElementById('closingNoteInput'),
  currentCashbox: document.getElementById('currentCashbox'),
  currentUserName: document.getElementById('currentUserName'),
  currentUserRole: document.getElementById('currentUserRole'),
  healthBadge: document.getElementById('healthBadge'),
  loginButton: document.getElementById('loginButton'),
  loginForm: document.getElementById('loginForm'),
  loginMessage: document.getElementById('loginMessage'),
  loginView: document.getElementById('loginView'),
  logoutButton: document.getElementById('logoutButton'),
  openingNoteInput: document.getElementById('openingNoteInput'),
  openShiftButton: document.getElementById('openShiftButton'),
  openShiftForm: document.getElementById('openShiftForm'),
  physicalEurInput: document.getElementById('physicalEurInput'),
  physicalRsdInput: document.getElementById('physicalRsdInput'),
  pinInput: document.getElementById('pinInput'),
  refreshCashboxesButton: document.getElementById('refreshCashboxesButton'),
  refreshShiftsButton: document.getElementById('refreshShiftsButton'),
  sessionSummary: document.getElementById('sessionSummary'),
  shiftList: document.getElementById('shiftList'),
  shiftMessage: document.getElementById('shiftMessage'),
  userCodeInput: document.getElementById('userCodeInput')
};

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (state.sessionId) {
    headers.set('X-App-Session-Id', state.sessionId);
  }

  const response = await fetch(path, {
    ...options,
    headers
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || 'API poziv nije uspeo.');
  }
  return payload.data !== undefined ? payload.data : payload;
}

async function checkHealth() {
  const badge = elements.healthBadge;
  if (!badge) return;

  try {
    const data = await apiFetch('/api/health');
    badge.textContent = data.ok ? 'API OK' : 'API greška';
    badge.classList.toggle('ok', Boolean(data.ok));
    badge.classList.toggle('fail', !data.ok);
  } catch (error) {
    badge.textContent = 'API nije dostupan';
    badge.classList.add('fail');
  }
}

function setSession(session) {
  state.session = session || null;
  state.sessionId = session && session.session_id ? session.session_id : '';
  if (state.sessionId) {
    sessionStorage.setItem(SESSION_KEY, state.sessionId);
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
  renderSession();
}

function clearSession() {
  setSession(null);
}

function renderSession() {
  const active = Boolean(state.session && state.session.active);
  elements.loginView.classList.toggle('hidden', active);
  elements.appView.classList.toggle('hidden', !active);
  elements.logoutButton.classList.toggle('hidden', !active);

  if (!active) {
    elements.sessionSummary.textContent = 'Niste prijavljeni';
    elements.currentUserName.textContent = '-';
    elements.currentUserRole.textContent = '-';
    elements.currentCashbox.textContent = '-';
    elements.cashboxList.innerHTML = '';
    elements.cashboxMessage.textContent = '';
    elements.shiftList.innerHTML = '';
    elements.shiftMessage.textContent = '';
    state.activeShifts = [];
    return;
  }

  const user = state.session.app_user || {};
  elements.sessionSummary.textContent = user.full_name ? user.full_name + ' · ' + user.role : 'Prijavljeni ste';
  elements.currentUserName.textContent = user.full_name || user.user_code || '-';
  elements.currentUserRole.textContent = user.role || '-';
  elements.currentCashbox.textContent = state.session.cashbox_id || user.default_cashbox_id || '-';
}

async function restoreSession() {
  if (!state.sessionId) {
    renderSession();
    return;
  }

  try {
    const session = await apiFetch('/api/auth/session');
    if (session && session.active) {
      setSession(session);
      await loadCashboxes();
      await loadActiveShifts();
      return;
    }
  } catch (error) {
    elements.loginMessage.textContent = error.message;
  }
  clearSession();
}

async function login(event) {
  event.preventDefault();
  elements.loginMessage.textContent = '';
  elements.loginButton.disabled = true;

  try {
    const session = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        user_code: elements.userCodeInput.value,
        pin: elements.pinInput.value
      })
    });
    elements.pinInput.value = '';
    setSession(session);
    await loadCashboxes();
    await loadActiveShifts();
  } catch (error) {
    elements.loginMessage.textContent = error.message;
  } finally {
    elements.loginButton.disabled = false;
  }
}

async function logout() {
  elements.logoutButton.disabled = true;
  try {
    if (state.sessionId) {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    }
  } catch (error) {
    elements.loginMessage.textContent = error.message;
  } finally {
    elements.logoutButton.disabled = false;
    clearSession();
  }
}

function renderCashboxes(cashboxes) {
  const list = elements.cashboxList;
  list.innerHTML = '';
  cashboxes.forEach((cashbox) => {
    const item = document.createElement('li');
    const title = document.createElement('strong');
    const meta = document.createElement('span');
    title.textContent = cashbox.name || cashbox.cashbox_id;
    meta.textContent = [cashbox.cashbox_id, cashbox.location].filter(Boolean).join(' · ');
    item.append(title, meta);
    list.appendChild(item);
  });
}

async function loadCashboxes() {
  elements.cashboxMessage.textContent = '';
  elements.refreshCashboxesButton.disabled = true;
  try {
    const data = await apiFetch('/api/cashboxes');
    renderCashboxes(data.cashboxes || []);
    elements.cashboxMessage.textContent = data.count ? '' : 'Nema dostupnih blagajni.';
  } catch (error) {
    elements.cashboxMessage.textContent = error.message;
  } finally {
    elements.refreshCashboxesButton.disabled = false;
  }
}

function renderShifts(shifts) {
  const list = elements.shiftList;
  state.activeShifts = shifts || [];
  list.innerHTML = '';
  shifts.forEach((shift) => {
    const item = document.createElement('li');
    const title = document.createElement('strong');
    const meta = document.createElement('span');
    title.textContent = shift.shift_id || 'Aktivna smena';
    meta.textContent = [shift.cashbox_id, shift.opened_at].filter(Boolean).join(' · ');
    item.append(title, meta);
    list.appendChild(item);
  });
}

async function loadActiveShifts() {
  elements.shiftMessage.textContent = '';
  elements.refreshShiftsButton.disabled = true;
  try {
    const data = await apiFetch('/api/shifts/mine/active');
    renderShifts(data.shifts || []);
    elements.shiftMessage.textContent = data.count ? '' : 'Nema otvorenih smena.';
  } catch (error) {
    elements.shiftMessage.textContent = error.message;
  } finally {
    elements.refreshShiftsButton.disabled = false;
  }
}

async function openShift(event) {
  event.preventDefault();
  elements.shiftMessage.textContent = '';
  elements.openShiftButton.disabled = true;
  try {
    await apiFetch('/api/shifts/open', {
      method: 'POST',
      body: JSON.stringify({
        cashbox_id: state.session ? state.session.cashbox_id : '',
        opening_note: elements.openingNoteInput.value
      })
    });
    elements.openingNoteInput.value = '';
    await restoreSession();
    await loadActiveShifts();
  } catch (error) {
    elements.shiftMessage.textContent = error.message;
  } finally {
    elements.openShiftButton.disabled = false;
  }
}

async function closeShift(event) {
  event.preventDefault();
  elements.shiftMessage.textContent = '';
  const activeShift = state.activeShifts[0];
  if (!activeShift || !activeShift.shift_id) {
    elements.shiftMessage.textContent = 'Nema otvorene smene za zatvaranje.';
    return;
  }

  elements.closeShiftButton.disabled = true;
  try {
    await apiFetch('/api/shifts/close', {
      method: 'POST',
      body: JSON.stringify({
        shift_id: activeShift.shift_id,
        physical_balance_json: {
          RSD: Number(elements.physicalRsdInput.value || 0),
          EUR: Number(elements.physicalEurInput.value || 0)
        },
        note: elements.closingNoteInput.value
      })
    });
    elements.closingNoteInput.value = '';
    await restoreSession();
    await loadActiveShifts();
  } catch (error) {
    elements.shiftMessage.textContent = error.message;
  } finally {
    elements.closeShiftButton.disabled = false;
  }
}

elements.loginForm.addEventListener('submit', login);
elements.closeShiftForm.addEventListener('submit', closeShift);
elements.logoutButton.addEventListener('click', logout);
elements.openShiftForm.addEventListener('submit', openShift);
elements.refreshCashboxesButton.addEventListener('click', loadCashboxes);
elements.refreshShiftsButton.addEventListener('click', loadActiveShifts);

checkHealth();
restoreSession();
