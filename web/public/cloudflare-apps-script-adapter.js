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

  // Fallback ako /api/currencies/list ikad zakaže (mreža, migracija u toku) - drži
  // aplikaciju upotrebljivom sa istim vrednostima koje su ranije bile hardkodovane.
  var FALLBACK_CURRENCIES = [
    { currency_code: 'RSD', name: 'Srpski dinar', active: true, is_default: true, denominations: [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1] },
    { currency_code: 'EUR', name: 'Evro', active: true, is_default: false, denominations: [500, 200, 100, 50, 20, 10, 5, 2, 1] }
  ];

  function buildConfig(session, cashboxes, currencyRows) {
    var user = sessionToUser(session) || {};
    var defaultCashboxId = session.cashbox_id || user.default_cashbox_id || (cashboxes[0] && cashboxes[0].cashbox_id) || '';
    var defaultCashbox = cashboxes.filter(function (cashbox) {
      return cashbox.cashbox_id === defaultCashboxId;
    })[0] || {};
    var currencies = (currencyRows && currencyRows.length ? currencyRows : FALLBACK_CURRENCIES)
      .filter(function (row) { return row.active !== false; });
    var cashDenominations = {};
    currencies.forEach(function (row) {
      cashDenominations[row.currency_code] = Array.isArray(row.denominations) && row.denominations.length
        ? row.denominations
        : [];
    });
    var defaultCurrencyRow = currencies.filter(function (row) { return row.is_default; })[0] || currencies[0] || {};
    return {
      appName: 'BLAGAJNA WEB',
      version: 'cloudflare-migration',
      // NAPOMENA: ovaj string se vidi u headeru (desktop) i hamburger fioci (mobilni) -
      // korisnik ga koristi da vizuelno potvrdi da gleda najnoviji deploy (a ne stari
      // keširan build). BUMP-ovati ovaj broj uz svaku FAZA izmenu koja dira frontend.
      appVersion: 'cloudflare-migration-0.5.0',
      environment: 'Cloudflare/Supabase migracija',
      currencies: currencies.map(function (row) { return row.currency_code; }),
      currencyDetails: currencies,
      cashDenominations: cashDenominations,
      cashboxes: cashboxes,
      requestPriorities: ['NORMAL', 'URGENT', 'VERY_URGENT'],
      entityTypes: ['PAYMENT_REQUEST', 'PAYMENT_ORDER', 'CASH_EVENT', 'SHIFT', 'DAILY_CLOSING'],
      defaultCashboxId: defaultCashboxId,
      defaultCashboxName: defaultCashbox.name || defaultCashbox.cashbox_id || defaultCashboxId,
      defaultCurrency: defaultCurrencyRow.currency_code || 'RSD',
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

  async function getBootstrapCurrencies(sessionId) {
    try {
      var response = await apiFetch('/api/currencies/list', { sessionId: sessionId });
      return response.currencies || [];
    } catch (error) {
      // Ne blokiraj bootstrap ako valute ne mogu da se ucitaju - FALLBACK_CURRENCIES
      // u buildConfig() drzi RSD/EUR kao pre uvodjenja dinamickog citanja iz baze.
      return [];
    }
  }

  async function getBootstrap(includeDashboard, sessionId) {
    var session = await getCurrentSession(sessionId);
    var cashboxesResponse = await apiFetch('/api/cashboxes', { sessionId: session.session_id });
    var shiftsResponse = await apiFetch('/api/shifts/mine/active', { sessionId: session.session_id });
    var balanceResponse = await apiFetch('/api/reports/cashbox-balance?cashbox_id=' + encodeURIComponent(session.cashbox_id || ''), { sessionId: session.session_id });
    var currencyRows = await getBootstrapCurrencies(session.session_id);
    var cashboxes = cashboxesResponse.cashboxes || [];
    var shifts = shiftsResponse.shifts || [];
    var activeShift = shifts[0] || null;
    var data = {
      config: buildConfig(session, cashboxes, currencyRows),
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
      var shift = response.shift;
      // Record the physical opening count for the audit trail (SHIFT_OPENING cash_counts
      // row). Best-effort: the shift itself is already open at this point, so a failure
      // here must not block the user from working - it just means the opening presek
      // wasn't recorded and can be redone from "Presek stanja" if needed.
      var counts = [];
      var countError = '';
      if (shift && shift.shift_id) {
        try {
          counts = await handlers.apiCreateCashCounts(Object.assign({}, data, {
            cashbox_id: shift.cashbox_id || data.cashbox_id || '',
            shift_id: shift.shift_id,
            count_type: 'SHIFT_OPENING'
          }), sessionId);
        } catch (err) {
          countError = (err && err.message) || 'Presek pri otvaranju smene nije sačuvan.';
        }
      }
      return {
        shift: shift,
        counts: counts,
        countSkipped: !counts.length,
        countError: countError
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
      var shiftsResponse = await apiFetch('/api/shifts/mine/active', { sessionId: sessionId });
      var shift = (shiftsResponse.shifts || []).filter(function (item) {
        return !data.cashbox_id || item.cashbox_id === data.cashbox_id;
      })[0];
      if (!shift) {
        throw new Error('Nema otvorene smene za zatvaranje.');
      }

      // Record the physical closing count (SHIFT_CLOSING cash_counts row + automatic
      // VIŠAK/MANJAK correction if it differs from the live balance) BEFORE closing -
      // createCashCountsCore requires an active shift, which stops existing the moment
      // the shift is actually closed. Unlike opening, this is NOT best-effort: /api/shifts/close
      // requires a physical balance for every active currency, so if the count fails to
      // save we must not proceed to close with garbage/missing data.
      var counts = [];
      if (Array.isArray(data.denominations) && data.denominations.length) {
        counts = await handlers.apiCreateCashCounts(Object.assign({}, data, {
          cashbox_id: shift.cashbox_id,
          shift_id: shift.shift_id,
          count_type: 'SHIFT_CLOSING'
        }), sessionId);
      }

      var physical = {};
      if (counts.length) {
        counts.forEach(function (count) {
          var total = count.counted_total !== undefined ? count.counted_total : count.counted_cash_total;
          physical[count.currency] = Number(total || 0);
        });
      } else if (data.currency && data.counted_cash_total !== undefined) {
        physical[data.currency] = Number(data.counted_cash_total || 0);
      } else if (data.physical_balance_json) {
        physical = data.physical_balance_json;
      }

      return handlers.apiCloseActiveShift(shift.cashbox_id, physical, data.note || '', sessionId);
    },
    apiCalculateCashboxBalance: async function (cashboxId, currency) {
      var response = await apiFetch('/api/cashbox-balance?cashbox_id=' + encodeURIComponent(cashboxId || '') + '&currency=' + encodeURIComponent(currency || ''), {});
      return Number((response && response.balance) || 0);
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
    apiReverseCashEvent: async function (eventId, reason, sessionId) {
      return apiFetch('/api/cash-events/reverse', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ event_id: eventId, reason: reason || '' })
      });
    },
    // FAZA 3s: prilozi (Google Drive) - filePayload = { file_name, mime_type, file_base64 }.
    apiUploadDocument: async function (entityType, entityId, filePayload, note, sessionId) {
      filePayload = filePayload || {};
      return apiFetch('/api/documents/upload', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          file_name: filePayload.file_name,
          mime_type: filePayload.mime_type,
          file_base64: filePayload.file_base64,
          note: note || ''
        })
      });
    },
    apiListDocuments: async function (entityType, entityId, sessionId) {
      var query = '?entity_type=' + encodeURIComponent(entityType || '') + '&entity_id=' + encodeURIComponent(entityId || '');
      return apiFetch('/api/documents/list' + query, {
        method: 'GET',
        sessionId: sessionId
      });
    },
    // FAZA 3t: brisanje priloga (soft-delete + brisanje fajla iz Supabase Storage).
    apiDeleteDocument: async function (documentId, sessionId) {
      return apiFetch('/api/documents/delete', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ document_id: documentId })
      });
    },
    // FAZA 3t: koje stavke (entity_id) iz zadate liste imaju bar jedan aktivan prilog -
    // koristi se za spajalicu na Knjizi (batch provera, ne po redu).
    apiGetDocumentsSummary: async function (entityType, entityIds, sessionId) {
      return apiFetch('/api/documents/summary', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ entity_type: entityType, entity_ids: entityIds || [] })
      });
    },
    // FAZA 3t: lagano osvezavanje liste blagajni (uklj. mandatory_count status) bez
    // punog bootstrap-a - koristi se za banner "blagajna zakljucana".
    apiGetCashboxes: async function (sessionId) {
      var response = await apiFetch('/api/cashboxes', { sessionId: sessionId });
      return response.cashboxes || [];
    },
    // FAZA 3t: obavezan presek stanja - samo ADMIN/DIREKTOR (proverava se i na
    // backend-u, ovo je samo transport).
    apiIssueMandatoryCashCount: async function (cashboxId, note, sessionId) {
      return apiFetch('/api/cashbox-count-orders/create', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ cashbox_id: cashboxId, note: note || '' })
      });
    },
    apiCancelMandatoryCashCount: async function (orderId, sessionId) {
      return apiFetch('/api/cashbox-count-orders/cancel', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ order_id: orderId })
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
    apiCreatePaymentAnnouncement: async function (data, sessionId) {
      return apiFetch('/api/payment-announcements/create', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify(data || {})
      });
    },
    apiListPaymentAnnouncements: async function (filters, sessionId) {
      filters = filters || {};
      var query = new URLSearchParams();
      // FAZA 3w: date_from/date_to (period) i created_by/user (filter po korisniku).
      ['cashbox_id', 'currency', 'status', 'date_from', 'date_to', 'created_by', 'user'].forEach(function (field) {
        if (filters[field]) query.set(field, filters[field]);
      });
      var response = await apiFetch('/api/payment-announcements/list?' + query.toString(), { sessionId: sessionId });
      return response.announcements || [];
    },
    apiUpdatePaymentAnnouncement: async function (announcementId, data, sessionId) {
      return apiFetch('/api/payment-announcements/update', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ announcement_id: announcementId, data: data || {} })
      });
    },
    apiSendPaymentAnnouncementToCashier: async function (announcementId, sessionId) {
      return apiFetch('/api/payment-announcements/send', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ announcement_id: announcementId })
      });
    },
    apiReturnPaymentAnnouncementForRevision: async function (announcementId, reason, sessionId) {
      return apiFetch('/api/payment-announcements/return', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ announcement_id: announcementId, reason: reason || '' })
      });
    },
    apiMatchPaymentAnnouncement: async function (announcementId, data, sessionId) {
      return apiFetch('/api/payment-announcements/match', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ announcement_id: announcementId, data: data || {} })
      });
    },
    apiCancelPaymentAnnouncement: async function (announcementId, reason, sessionId) {
      return apiFetch('/api/payment-announcements/cancel', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ announcement_id: announcementId, reason: reason || '' })
      });
    },
    apiListCurrencies: async function (sessionId) {
      var response = await apiFetch('/api/currencies/list', { sessionId: sessionId });
      return response.currencies || [];
    },
    apiCreateCurrency: async function (data, sessionId) {
      return apiFetch('/api/currencies/create', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify(data || {})
      });
    },
    apiUpdateCurrency: async function (currencyCode, data, sessionId) {
      return apiFetch('/api/currencies/update', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ currency_code: currencyCode, data: data || {} })
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
    apiGetOpenPaymentRequestsReport: async function (filters) {
      filters = filters || {};
      var query = new URLSearchParams();
      if (filters.cashbox_id) query.set('cashbox_id', filters.cashbox_id);
      if (filters.currency) query.set('currency', filters.currency);
      var response = await apiFetch('/api/reports/open-payment-requests?' + query.toString(), {});
      return response.rows || [];
    },
    apiGetRequestsForApprovalReport: async function (filters) {
      filters = filters || {};
      var query = new URLSearchParams();
      if (filters.cashbox_id) query.set('cashbox_id', filters.cashbox_id);
      if (filters.currency) query.set('currency', filters.currency);
      var response = await apiFetch('/api/reports/requests-for-approval?' + query.toString(), {});
      return response.rows || [];
    },
    apiGetOrdersWaitingPaymentReport: async function (filters) {
      filters = filters || {};
      var query = new URLSearchParams();
      if (filters.cashbox_id) query.set('cashbox_id', filters.cashbox_id);
      if (filters.currency) query.set('currency', filters.currency);
      var response = await apiFetch('/api/reports/orders-waiting-payment?' + query.toString(), {});
      return response.rows || [];
    },
    apiGetExecutedPaymentsReport: async function (filters) {
      filters = filters || {};
      var query = new URLSearchParams();
      ['cashbox_id', 'currency', 'date_from', 'date_to', 'pay_to_name', 'partner_name'].forEach(function (field) {
        if (filters[field]) query.set(field, filters[field]);
      });
      var response = await apiFetch('/api/reports/executed-payments?' + query.toString(), {});
      return response.rows || [];
    },
    apiGetDailyClosingReport: async function (filters) {
      filters = filters || {};
      var query = new URLSearchParams();
      ['cashbox_id', 'currency', 'status', 'date_from', 'date_to'].forEach(function (field) {
        if (filters[field]) query.set(field, filters[field]);
      });
      var response = await apiFetch('/api/reports/daily-closing?' + query.toString(), {});
      return response.rows || [];
    },
    apiGetDifferencesReport: async function (filters) {
      filters = filters || {};
      var query = new URLSearchParams();
      ['cashbox_id', 'currency', 'date_from', 'date_to'].forEach(function (field) {
        if (filters[field]) query.set(field, filters[field]);
      });
      var response = await apiFetch('/api/reports/differences?' + query.toString(), {});
      return response.rows || [];
    },
    apiGetCorrectionsAndReversalsReport: async function (filters) {
      filters = filters || {};
      var query = new URLSearchParams();
      ['cashbox_id', 'currency', 'date_from', 'date_to'].forEach(function (field) {
        if (filters[field]) query.set(field, filters[field]);
      });
      var response = await apiFetch('/api/reports/corrections-reversals?' + query.toString(), {});
      return response.rows || [];
    },
    apiGetMissingDocumentsReport: async function (filters) {
      filters = filters || {};
      var query = new URLSearchParams();
      if (filters.cashbox_id) query.set('cashbox_id', filters.cashbox_id);
      if (filters.currency) query.set('currency', filters.currency);
      var response = await apiFetch('/api/reports/missing-documents?' + query.toString(), {});
      return response.rows || [];
    },
    apiGetAuditExceptionsReport: async function (filters) {
      filters = filters || {};
      var query = new URLSearchParams();
      ['cashbox_id', 'currency', 'date_from', 'date_to'].forEach(function (field) {
        if (filters[field]) query.set(field, filters[field]);
      });
      var response = await apiFetch('/api/reports/audit-exceptions?' + query.toString(), {});
      return response.rows || [];
    },
    apiGetManagementDashboardSummary: async function (filters) {
      filters = filters || {};
      var query = new URLSearchParams();
      ['cashbox_id', 'currency', 'date'].forEach(function (field) {
        if (filters[field]) query.set(field, filters[field]);
      });
      return apiFetch('/api/reports/management-dashboard-summary?' + query.toString(), {});
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
    apiGetAuditLog: async function (filters) {
      filters = filters || {};
      var query = new URLSearchParams();
      ['entity_type', 'entity_id', 'date_from', 'date_to', 'limit'].forEach(function (field) {
        if (filters[field]) query.set(field, filters[field]);
      });
      var response = await apiFetch('/api/audit-log?' + query.toString(), {});
      return response.rows || [];
    },
    apiCreateCashCounts: async function (data, sessionId) {
      var response = await apiFetch('/api/cash-counts/create', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify(data || {})
      });
      return Array.isArray(response) ? response : [response];
    },
    apiGetCashCountsReport: async function (filters, sessionId) {
      filters = filters || {};
      var query = new URLSearchParams();
      ['cashbox_id', 'currency', 'shift_id', 'date_from', 'date_to'].forEach(function (field) {
        if (filters[field]) query.set(field, filters[field]);
      });
      var response = await apiFetch('/api/cash-counts/list?' + query.toString(), { sessionId: sessionId });
      return response.rows || [];
    },
    apiGetCashbookFilterOptions: async function (cashboxId, sessionId) {
      var query = new URLSearchParams();
      if (cashboxId) query.set('cashbox_id', cashboxId);
      return apiFetch('/api/cashbook/filter-options?' + query.toString(), { sessionId: sessionId });
    },
    apiGetCashSheetReport: async function (filters, sessionId) {
      filters = filters || {};
      var query = new URLSearchParams();
      ['cashbox_id', 'currency', 'date', 'date_from', 'date_to', 'shift_id'].forEach(function (field) {
        if (filters[field]) query.set(field, filters[field]);
      });
      return apiFetch('/api/reports/cash-sheet?' + query.toString(), { sessionId: sessionId });
    },
    apiGetShiftHistory: async function (filters, sessionId) {
      filters = filters || {};
      var query = new URLSearchParams();
      if (filters.cashbox_id) query.set('cashbox_id', filters.cashbox_id);
      if (filters.status) query.set('status', filters.status);
      if (filters.limit) query.set('limit', filters.limit);
      var response = await apiFetch('/api/shifts/history?' + query.toString(), { sessionId: sessionId });
      return response.rows || [];
    },
    apiPrepareDailyClosing: async function (cashboxId, currency, closingDate, sessionId) {
      return apiFetch('/api/daily-closing/prepare', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({ cashbox_id: cashboxId || '', currency: currency || '', closing_date: closingDate || '' })
      });
    },
    apiCloseDailyCashbox: async function (cashboxId, currency, closingDate, physicalBalance, note, sessionId) {
      var response = await apiFetch('/api/daily-closing/close', {
        method: 'POST',
        sessionId: sessionId,
        body: JSON.stringify({
          cashbox_id: cashboxId || '',
          currency: currency || '',
          closing_date: closingDate || '',
          physical_balance: physicalBalance,
          note: note || ''
        })
      });
      return response.closing || response;
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
