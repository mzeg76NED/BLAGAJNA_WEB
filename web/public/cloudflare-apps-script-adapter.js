(function () {
  var SESSION_KEY = 'BLAGAJNA_APP_SESSION_ID';

  function getStoredSessionId() {
    return sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || '';
  }

  function setStoredSessionId(sessionId) {
    if (sessionId) {
      sessionStorage.setItem(SESSION_KEY, sessionId);
      localStorage.setItem(SESSION_KEY, sessionId);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
    }
  }

  function unwrap(payload) {
    if (payload && payload.success === false) {
      throw new Error(payload.error || 'API poziv nije uspeo.');
    }
    if (payload && payload.data !== undefined) {
      return payload.data;
    }
    return payload;
  }

  async function apiFetch(path, options) {
    options = options || {};
    var headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    var sessionId = options.sessionId || getStoredSessionId();
    if (sessionId) {
      headers.set('X-App-Session-Id', sessionId);
    }
    var response = await fetch(path, Object.assign({}, options, { headers: headers }));
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok || payload.success === false) {
      throw new Error(payload.error || 'API poziv nije uspeo.');
    }
    return unwrap(payload);
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function sessionToUser(session) {
    return (session && session.app_user) || null;
  }

  function buildConfig(session, cashboxes) {
    var user = sessionToUser(session) || {};
    var defaultCashboxId = session.cashbox_id || user.default_cashbox_id || (cashboxes[0] && cashboxes[0].cashbox_id) || '';
    var defaultCashbox = cashboxes.filter(function (cashbox) {
      return cashbox.cashbox_id === defaultCashboxId;
    })[0] || {};
    return {
      appName: 'BLAGAJNA WEB',
      version: 'cloudflare-migration',
      appVersion: 'cloudflare-migration-0.1.0',
      environment: 'Cloudflare/Supabase migracija',
      currencies: ['RSD', 'EUR'],
      cashDenominations: {
        RSD: [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1],
        EUR: [500, 200, 100, 50, 20, 10, 5, 2, 1]
      },
      cashboxes: cashboxes,
      requestPriorities: ['NORMAL', 'URGENT', 'VERY_URGENT'],
      entityTypes: ['PAYMENT_REQUEST', 'PAYMENT_ORDER', 'CASH_EVENT', 'SHIFT', 'DAILY_CLOSING'],
      defaultCashboxId: defaultCashboxId,
      defaultCashboxName: defaultCashbox.name || defaultCashbox.cashbox_id || defaultCashboxId,
      defaultCurrency: 'RSD',
      today: todayIso()
    };
  }

  async function getCurrentSession(sessionId) {
    var session = await apiFetch('/api/auth/session', { sessionId: sessionId || getStoredSessionId() });
    if (session && session.session_id) {
      setStoredSessionId(session.session_id);
    }
    return session;
  }

  async function getBootstrap(includeDashboard, sessionId) {
    var session = await getCurrentSession(sessionId);
    var cashboxesResponse = await apiFetch('/api/cashboxes', { sessionId: session.session_id });
    var shiftsResponse = await apiFetch('/api/shifts/mine/active', { sessionId: session.session_id });
    var balanceResponse = await apiFetch('/api/reports/cashbox-balance?cashbox_id=' + encodeURIComponent(session.cashbox_id || ''), { sessionId: session.session_id });
    var cashboxes = cashboxesResponse.cashboxes || [];
    var shifts = shiftsResponse.shifts || [];
    var activeShift = shifts[0] || null;
    var data = {
      config: buildConfig(session, cashboxes),
      user: sessionToUser(session),
      activeShift: activeShift,
      canPostDirectCashEvents: Boolean(activeShift),
      dashboard: {
        balances: balanceResponse.rows || [],
        ordersWaitingPaymentCount: 0,
        requestsForApprovalCount: 0,
        missingDocumentsCount: 0,
        openShiftsCount: shifts.length,
        dailyClosingsTodayCount: 0,
        differencesCount: 0,
        reversalsTodayCount: 0
      }
    };
    if (!includeDashboard) {
      delete data.dashboard;
    }
    return data;
  }

  function unsupported(functionName) {
    throw new Error('Cloudflare migracija: funkcija još nije preneta: ' + functionName);
  }

  var handlers = {
    apiLoginAppUser: async function (credentials) {
      var data = credentials || {};
      var context = data.context || {};
      var session = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          user_code: data.user_code || data.userCode || data.code || '',
          pin: data.pin || '',
          cashbox_id: context.cashbox_id || '',
          shift_id: context.shift_id || '',
          device_label: context.device_label || ''
        })
      });
      setStoredSessionId(session.session_id || '');
      return session;
    },
    apiLogoutAppUser: async function (sessionId) {
      var session = await apiFetch('/api/auth/logout', {
        method: 'POST',
        sessionId: sessionId || getStoredSessionId()
      });
      setStoredSessionId('');
      return session;
    },
    apiGetCurrentAppSession: async function (sessionId) {
      return getCurrentSession(sessionId);
    },
    apiSwitchAppUser: async function (credentials) {
      return handlers.apiLoginAppUser(credentials);
    },
    apiGetUiBootstrap: async function (includeDashboard, sessionId) {
      return getBootstrap(includeDashboard, sessionId);
    },
    apiGetMyActiveShifts: async function (_sessionId) {
      var response = await apiFetch('/api/shifts/mine/active');
      return response.shifts || [];
    },
    apiOpenShift: async function (cashboxId, openingNote, sessionId) {
      var response = await apiFetch('/api/shifts/open', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({
          cashbox_id: cashboxId,
          opening_note: openingNote || ''
        })
      });
      return response.shift;
    },
    apiCloseActiveShift: async function (cashboxId, physicalBalance, note, sessionId) {
      var shiftsResponse = await apiFetch('/api/shifts/mine/active', { sessionId: sessionId });
      var shift = (shiftsResponse.shifts || []).filter(function (item) {
        return !cashboxId || item.cashbox_id === cashboxId;
      })[0];
      if (!shift) {
        throw new Error('Nema otvorene smene za zatvaranje.');
      }
      var closeResponse = await apiFetch('/api/shifts/close', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({
          shift_id: shift.shift_id,
          physical_balance_json: physicalBalance || {},
          note: note || ''
        })
      });
      return closeResponse.shift;
    },
    apiCalculateCashboxBalance: async function (cashboxId, currency) {
      return apiFetch('/api/cashbox-balance?cashbox_id=' + encodeURIComponent(cashboxId || '') + '&currency=' + encodeURIComponent(currency || ''), {});
    },
    apiGetActiveShiftState: async function (cashboxId) {
      var response = await apiFetch('/api/shifts/mine/active');
      var shift = (response.shifts || []).filter(function (item) {
        return !cashboxId || item.cashbox_id === cashboxId;
      })[0] || null;
      return {
        activeShift: shift,
        shift: shift,
        canPostDirectCashEvents: Boolean(shift)
      };
    },
    apiGetActiveShiftBalance: async function (cashboxId) {
      var balance = await apiFetch('/api/cashbox-balance?cashbox_id=' + encodeURIComponent(cashboxId || ''), {});
      return {
        cashbox_id: cashboxId || '',
        balanceByCurrency: balance.balanceByCurrency || {}
      };
    },
    apiListOrdersWaitingForPayment: async function () { return []; },
    apiListRequestsForApproval: async function () { return []; },
    apiListMyPaymentRequests: async function () { return []; },
    apiGetCashboxBalanceReport: async function (filters) {
      filters = filters || {};
      var query = new URLSearchParams();
      if (filters.cashbox_id) query.set('cashbox_id', filters.cashbox_id);
      if (filters.currency) query.set('currency', filters.currency);
      var response = await apiFetch('/api/reports/cashbox-balance?' + query.toString(), {});
      return response.rows || [];
    },
    apiGetCashMovementsReport: async function (filters) {
      filters = filters || {};
      var query = new URLSearchParams();
      ['cashbox_id', 'currency', 'status', 'date_from', 'date_to', 'limit'].forEach(function (field) {
        if (filters[field]) query.set(field, filters[field]);
      });
      var response = await apiFetch('/api/reports/cash-movements?' + query.toString(), {});
      return response.rows || [];
    },
    apiGetAuditLog: async function () { return []; }
  };

  function makeResponse(data) {
    return { ok: true, data: data };
  }

  function makeError(error) {
    return {
      ok: false,
      error: {
        message: error && error.message ? error.message : String(error || 'API poziv nije uspeo.')
      }
    };
  }

  function createRunner(successHandler, failureHandler) {
    var runner = {
      withSuccessHandler: function (handler) {
        return createRunner(handler, failureHandler);
      },
      withFailureHandler: function (handler) {
        return createRunner(successHandler, handler);
      }
    };
    return new Proxy(runner, {
      get: function (target, prop) {
        if (prop in target) return target[prop];
        return function () {
          var args = Array.prototype.slice.call(arguments);
          var handler = handlers[prop] || function () { return unsupported(prop); };
          Promise.resolve()
            .then(function () { return handler.apply(null, args); })
            .then(function (data) {
              if (successHandler) successHandler(makeResponse(data));
            })
            .catch(function (error) {
              if (successHandler) {
                successHandler(makeError(error));
                return;
              }
              if (failureHandler) failureHandler(error);
            });
        };
      }
    });
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = createRunner(null, null);
  window.BLAGAJNA_WEB_APP_URL = '';
})();
