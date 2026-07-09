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
    apiOpenShiftWithOpeningCount: async function (data, sessionId) {
      data = data || {};
      var response = await apiFetch('/api/shifts/open', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({
          cashbox_id: data.cashbox_id || '',
          opening_note: data.opening_note || data.note || ''
        })
      });
      return {
        shift: response.shift,
        counts: [],
        countSkipped: true
      };
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
    apiCloseShiftWithClosingCount: async function (data, sessionId) {
      data = data || {};
      var physical = {};
      if (data.currency && data.counted_cash_total !== undefined) {
        physical[data.currency] = Number(data.counted_cash_total || 0);
      } else if (data.physical_balance_json) {
        physical = data.physical_balance_json;
      }
      return handlers.apiCloseActiveShift(data.cashbox_id || '', physical, data.note || '', sessionId);
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
    apiListOrdersWaitingForPayment: async function () {
      var response = await apiFetch('/api/payment-orders/waiting', {});
      return response.orders || [];
    },
    apiListPendingPaymentOrderOutflows: async function (filters) {
      filters = filters || {};
      var query = new URLSearchParams();
      if (filters.cashbox_id) query.set('cashbox_id', filters.cashbox_id);
      if (filters.currency) query.set('currency', filters.currency);
      var response = await apiFetch('/api/payment-orders/pending-outflows?' + query.toString(), {});
      return response.pending || response.rows || [];
    },
    apiSendPaymentOrderToCashier: async function (orderId, sessionId) {
      return apiFetch('/api/payment-orders/send-to-cashier', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ order_id: orderId })
      });
    },
    apiRejectPaymentOrderByCashier: async function (orderId, reason, sessionId) {
      return apiFetch('/api/payment-orders/reject', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({
          order_id: orderId,
          reason: reason || ''
        })
      });
    },
    apiExecutePendingPaymentOrderOutflow: async function (pendingPaymentId, paymentData, sessionId) {
      return apiFetch('/api/payment-orders/execute-pending', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({
          pending_payment_id: pendingPaymentId,
          payment_data: paymentData || {}
        })
      });
    },
    apiExecutePaymentOrder: async function (orderId, paymentData, sessionId) {
      var pending = await handlers.apiSendPaymentOrderToCashier(orderId, sessionId);
      return handlers.apiExecutePendingPaymentOrderOutflow(
        pending.pendingPayment && pending.pendingPayment.event_id,
        paymentData || {},
        sessionId
      );
    },
    apiCreateCashInflow: async function (data, sessionId) {
      return apiFetch('/api/cash-events/inflow', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify(data || {})
      });
    },
    apiCreateTreasuryHandover: async function (data, sessionId) {
      return apiFetch('/api/cash-events/treasury-handover', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify(data || {})
      });
    },
    apiCreateCashOutflow: async function (data, sessionId) {
      return apiFetch('/api/cash-events/outflow', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify(data || {})
      });
    },
    apiCreatePaymentRequest: async function (data, sessionId) {
      return apiFetch('/api/payment-requests/create', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify(data || {})
      });
    },
    apiSubmitPaymentRequest: async function (requestId, sessionId) {
      return apiFetch('/api/payment-requests/submit', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ request_id: requestId })
      });
    },
    apiUpdatePaymentRequest: async function (requestId, data, sessionId) {
      return apiFetch('/api/payment-requests/update', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ request_id: requestId, data: data || {} })
      });
    },
    apiListMyPaymentRequests: async function (sessionId) {
      var response = await apiFetch('/api/payment-requests/list-mine', { sessionId: sessionId });
      return response.requests || [];
    },
    apiListRequestsForApproval: async function (sessionId) {
      var response = await apiFetch('/api/payment-requests/list-for-approval', { sessionId: sessionId });
      return response.requests || [];
    },
    apiListPaymentRequests: async function (filters, sessionId) {
      filters = filters || {};
      var query = new URLSearchParams();
      ['status', 'currency', 'preferred_cashbox_id', 'cashbox_id', 'approval_path', 'linked_order_id'].forEach(function (field) {
        if (filters[field]) query.set(field, filters[field]);
      });
      var response = await apiFetch('/api/payment-requests/list?' + query.toString(), { sessionId: sessionId });
      return response.requests || [];
    },
    apiApprovePaymentRequest: async function (requestId, sessionId) {
      return apiFetch('/api/payment-requests/approve', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ request_id: requestId })
      });
    },
    apiRejectPaymentRequest: async function (requestId, reason, sessionId) {
      return apiFetch('/api/payment-requests/reject', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ request_id: requestId, reason: reason || '' })
      });
    },
    apiReturnPaymentRequestForCorrection: async function (requestId, note, sessionId) {
      return apiFetch('/api/payment-requests/return-for-correction', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ request_id: requestId, note: note || '' })
      });
    },
    apiCreateAndIssuePaymentOrderFromRequest: async function (requestId, orderData, sessionId) {
      return apiFetch('/api/payment-orders/create-from-request', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ request_id: requestId, order_data: orderData || {} })
      });
    },
    apiApproveAndIssuePaymentOrder: async function (requestId, orderData, sessionId) {
      return apiFetch('/api/payment-orders/approve-and-issue', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ request_id: requestId, order_data: orderData || {} })
      });
    },
    apiCreateDirectPaymentOrder: async function (data, sessionId) {
      return apiFetch('/api/payment-orders/create-direct', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify(data || {})
      });
    },
    apiUpdateDraftPaymentOrder: async function (orderId, data, sessionId) {
      return apiFetch('/api/payment-orders/update-draft', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ order_id: orderId, data: data || {} })
      });
    },
    apiIssuePaymentOrder: async function (orderId, sessionId) {
      return apiFetch('/api/payment-orders/issue', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ order_id: orderId })
      });
    },
    apiListPaymentOrders: async function (filters, sessionId) {
      filters = filters || {};
      var query = new URLSearchParams();
      ['status', 'cashbox_id', 'currency', 'order_type', 'source_request_id'].forEach(function (field) {
        if (filters[field]) query.set(field, filters[field]);
      });
      var response = await apiFetch('/api/payment-orders/list?' + query.toString(), { sessionId: sessionId });
      return response.orders || [];
    },
    apiGetPaymentOrderTimeline: async function (orderId, sessionId) {
      var response = await apiFetch('/api/payment-orders/timeline?order_id=' + encodeURIComponent(orderId || ''), { sessionId: sessionId });
      return response.events || [];
    },
    apiRepairPaymentOrdersCashboxFromRequest: async function (sessionId) {
      return apiFetch('/api/payment-orders/repair-cashbox', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({})
      });
    },
    apiListUsers: async function (filters, sessionId) {
      filters = filters || {};
      var query = new URLSearchParams();
      if (filters.role) query.set('role', filters.role);
      if (filters.active !== undefined && filters.active !== null && filters.active !== '') query.set('active', filters.active);
      if (filters.query) query.set('query', filters.query);
      var response = await apiFetch('/api/users/list?' + query.toString(), { sessionId: sessionId });
      return response.users || [];
    },
    apiCreateUser: async function (data, sessionId) {
      return apiFetch('/api/users/create', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify(data || {})
      });
    },
    apiUpdateUserPermissions: async function (userId, data, sessionId) {
      var payload = Object.assign({}, data || {}, { user_id: userId });
      return apiFetch('/api/users/update-permissions', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify(payload)
      });
    },
    apiResetUserPin: async function (userId, pin, sessionId) {
      return apiFetch('/api/users/reset-pin', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ user_id: userId, pin: pin })
      });
    },
    apiGetRolePermissionsMatrix: async function (sessionId) {
      var response = await apiFetch('/api/roles/permissions-matrix', { sessionId: sessionId });
      return response.matrix || [];
    },
    apiUpdateRolePermissions: async function (roleId, permissionIds, sessionId) {
      return apiFetch('/api/roles/update-permissions', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ role_id: roleId, permission_ids: permissionIds || [] })
      });
    },
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
    apiGetAuditLog: async function () { return []; },
    apiGetCashbookFilterOptions: async function (cashboxId, sessionId) {
      var query = new URLSearchParams();
      if (cashboxId) query.set('cashbox_id', cashboxId);
      return apiFetch('/api/cashbook/filter-options?' + query.toString(), { sessionId: sessionId });
    }
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
