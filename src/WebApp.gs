/**
 * Web App entry point and thin API wrappers for the frontend.
 */
function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  if (params.bootstrap === 'app-login') {
    return renderAppLoginBootstrap_(params);
  }
  const specialView = params.view || params.page || '';
  if (specialView === 'manifest') {
    return ContentService
      .createTextOutput(JSON.stringify(buildPwaManifest_()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (specialView === 'sw') {
    return ContentService
      .createTextOutput(buildServiceWorker_())
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  const allowedViews = [
    'index',
    'mobile',
    'desktop',
    'desktop-v2',
    'print-payment-request',
    'print-payment-order',
    'print-cash-event',
    'print-shift-handover',
    'print-daily-closing',
    'print-report'
  ];
  const requestedView = params.view || params.page || detectDefaultView_(e);
  const view = allowedViews.indexOf(requestedView) === -1 ? 'mobile' : requestedView;
  const template = HtmlService.createTemplateFromFile('html/' + view);
  if (view.indexOf('print-') === 0) {
    template.printData = buildPrintTemplateData_(view, params);
  }

  return template.evaluate()
    .setTitle(APP_CONFIG.APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function renderAppLoginBootstrap_(params) {
  let status;
  try {
    status = getAppLoginBootstrapStatusForWeb(params.token || '');
  } catch (error) {
    return HtmlService
      .createHtmlOutput('<!doctype html><html><body><h1>Bootstrap pristup je odbijen.</h1><p>' + escapeHtmlForServer_(error.message || 'Token nije validan.') + '</p></body></html>')
      .setTitle('Bootstrap pristup odbijen')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  if (status.ok_for_deploy || status.bootstrap_done) {
    return HtmlService
      .createHtmlOutput('<!doctype html><html><body><h1>Bootstrap je već završen.</h1></body></html>')
      .setTitle('Bootstrap je završen')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  const template = HtmlService.createTemplateFromFile('html/app-login-bootstrap');
  template.bootstrapToken = params.token || '';
  template.bootstrapStatus = JSON.stringify(status);
  return template.evaluate()
    .setTitle('Bootstrap app login')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function escapeHtmlForServer_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPwaManifest_() {
  return {
    name: APP_CONFIG.APP_NAME || 'BLAGAJNA WEB',
    short_name: 'Blagajna',
    start_url: ScriptApp.getService().getUrl() + '?view=mobile',
    scope: ScriptApp.getService().getUrl(),
    display: 'standalone',
    background_color: '#0f1319',
    theme_color: '#0f1319',
    icons: [
      {
        src: 'https://ssl.gstatic.com/docs/script/images/logo/script-192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: 'https://ssl.gstatic.com/docs/script/images/logo/script-512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  };
}

function buildServiceWorker_() {
  return [
    'self.addEventListener("install", function(event) { self.skipWaiting(); });',
    'self.addEventListener("activate", function(event) { event.waitUntil(self.clients.claim()); });',
    'self.addEventListener("fetch", function(event) { event.respondWith(fetch(event.request)); });'
  ].join('\n');
}

function detectDefaultView_(e) {
  const params = e && e.parameter ? e.parameter : {};
  const userAgent = params.userAgent || params.ua || '';
  return detectMobile_(userAgent) ? 'mobile' : 'desktop';
}

function detectMobile_(userAgent) {
  if (!userAgent) {
    return true;
  }
  return /Mobi|Android|iPhone|iPad/i.test(String(userAgent));
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function apiCreatePaymentRequest(data, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.PAYMENT_REQUESTS_CREATE, function() {
      return createPaymentRequest(data || {});
    });
  });
}

function apiSubmitPaymentRequest(requestId, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.PAYMENT_REQUESTS_CREATE, function() {
      return submitPaymentRequest(requestId);
    });
  });
}

function apiUpdatePaymentRequest(requestId, data, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.PAYMENT_REQUESTS_CREATE, function() {
      return updatePaymentRequest(requestId, data || {});
    });
  });
}

function apiListMyPaymentRequests() {
  return apiWrap_(function() {
    return listMyPaymentRequests();
  });
}

function apiListRequestsForApproval() {
  return apiWrap_(function() {
    return listRequestsForApproval();
  });
}

function apiListPaymentRequests(filters) {
  return apiWrap_(function() {
    return listPaymentRequests(filters || {});
  });
}

function apiApprovePaymentRequest(requestId, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.PAYMENT_REQUESTS_APPROVE, function() {
      return approvePaymentRequest(requestId);
    });
  });
}

function apiApprovePaymentRequestForDirectPayment(requestId, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.PAYMENT_REQUESTS_APPROVE, function() {
      return approvePaymentRequestForDirectPayment(requestId);
    });
  });
}

function apiRejectPaymentRequest(requestId, reason, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.PAYMENT_REQUESTS_REJECT, function() {
      return rejectPaymentRequest(requestId, reason);
    });
  });
}

function apiReturnPaymentRequestForCorrection(requestId, note, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.PAYMENT_REQUESTS_RETURN_FOR_CORRECTION, function() {
      return returnPaymentRequestForCorrection(requestId, note);
    });
  });
}

function apiCreatePaymentOrderFromRequest(requestId, orderData, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.PAYMENT_ORDERS_CREATE, function() {
      return createPaymentOrderFromRequest(requestId, withDefaultCashbox_(orderData || {}));
    });
  });
}

function apiCreateDirectPaymentOrder(orderData, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.PAYMENT_ORDERS_CREATE, function() {
      return createDirectPaymentOrder(withDefaultCashbox_(orderData || {}));
    });
  });
}

function apiUpdateDraftPaymentOrder(orderId, orderData, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.PAYMENT_ORDERS_CREATE, function() {
      return updateDraftPaymentOrder(orderId, withDefaultCashbox_(orderData || {}));
    });
  });
}

function apiIssuePaymentOrder(orderId, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.PAYMENT_ORDERS_ISSUE, function() {
      return issuePaymentOrder(orderId);
    });
  });
}

function apiCreateAndIssuePaymentOrderFromRequest(requestId, orderData, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.PAYMENT_ORDERS_CREATE, function() {
      return createPaymentOrderFromRequest(requestId, withDefaultCashbox_(orderData || {}));
    });
  });
}

function apiApproveAndIssuePaymentOrder(requestId, orderData, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.PAYMENT_REQUESTS_APPROVE, function() {
      const approved = approvePaymentRequest(requestId, withDefaultCashbox_(orderData || {}));
      return approved.linked_order_id ? getPaymentOrderById(approved.linked_order_id) : approved;
    });
  });
}

function apiListOrdersWaitingForPayment() {
  return apiWrap_(function() {
    return listOrdersWaitingForPayment();
  });
}

function apiSendPaymentOrderToCashier(orderId, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.PAYMENT_ORDERS_ISSUE, function() {
      return sendPaymentOrderToCashier(orderId);
    });
  });
}

function apiListPendingPaymentOrderOutflows(filters) {
  return apiWrap_(function() {
    return listPendingPaymentOrderOutflows(withDefaultCashbox_(filters || {}));
  });
}

function apiExecutePendingPaymentOrderOutflow(pendingPaymentId, paymentData, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.PAYMENT_ORDERS_EXECUTE, function() {
      return executePendingPaymentOrderOutflow(pendingPaymentId, withDefaultCashbox_(paymentData || {}));
    });
  });
}

function apiGetPaymentOrderTimeline(orderId) {
  return apiWrap_(function() {
    return getPaymentOrderTimeline(orderId);
  });
}

function apiListPaymentOrders(filters) {
  return apiWrap_(function() {
    return listPaymentOrders(filters || {});
  });
}

function apiRejectPaymentOrderByCashier(orderId, reason, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.PAYMENT_ORDERS_REJECT, function() {
      return rejectPaymentOrderByCashier(orderId, reason);
    });
  });
}

function apiExecutePaymentOrder(orderId, paymentData, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.PAYMENT_ORDERS_EXECUTE, function() {
      return executePaymentOrder(orderId, paymentData || {});
    });
  });
}

function apiReverseCashEvent(eventId, reason, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.CASH_EVENTS_REVERSE, function() {
      return reverseCashEvent(eventId, reason);
    });
  });
}

function apiCreateCashInflow(data, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.CASH_EVENTS_CREATE, function() {
      return createCashInflow(withDefaultCashbox_(data || {}));
    });
  });
}

function apiCreateDirectCashOutflow(data, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.CASH_EVENTS_CREATE, function() {
      return createDirectCashOutflow(withDefaultCashbox_(data || {}));
    });
  });
}

function apiCreateTreasuryHandover(data, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.CASH_EVENTS_CREATE, function() {
      return createTreasuryHandover(withDefaultCashbox_(data || {}));
    });
  });
}

function apiPrepareCashCount(cashboxId, currency, countType) {
  return apiWrap_(function() {
    return prepareCashCount(cashboxId || getDefaultCashboxIdForCurrentUser_(), currency, countType);
  });
}

function apiCreateCashCount(data, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.SHIFTS_COUNT, function() {
      return createCashCount(withDefaultCashbox_(data || {}));
    });
  });
}

function apiCreateCashCounts(data, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.SHIFTS_COUNT, function() {
      return createCashCounts(withDefaultCashbox_(data || {}));
    });
  });
}

function apiCalculateCashboxBalance(cashboxId, currency) {
  return apiWrap_(function() {
    return calculateCashboxBalance(cashboxId || getDefaultCashboxIdForCurrentUser_(), currency);
  });
}

function apiAttachDocumentToEntity(entityType, entityId, filePayload, note, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.DOCUMENTS_ATTACH, function() {
      return attachDocumentToEntity(entityType, entityId, filePayload, note);
    });
  });
}

function apiListDocumentsForEntity(entityType, entityId, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.DOCUMENTS_VIEW, function() {
      return listDocumentsForEntity(entityType, entityId);
    });
  });
}

function apiOpenShift(cashboxId, openingNote, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.SHIFTS_OPEN, function() {
      return openShift(cashboxId || getDefaultCashboxIdForCurrentUser_(), openingNote);
    });
  });
}

function apiOpenShiftWithOpeningCount(data, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.SHIFTS_OPEN, function() {
      data = data || {};
      data.cashbox_id = data.cashbox_id || getDefaultCashboxIdForCurrentUser_();
      return openShiftWithOpeningCount(data);
    });
  });
}

function apiGetMyActiveShifts() {
  return apiWrap_(function() {
    return getMyActiveShifts();
  });
}

function apiGetShiftHistory(filters) {
  return apiWrap_(function() {
    const user = assertCurrentUserActive();
    const scoped = filters || {};
    const targetCashboxId = scoped.cashbox_id || getDefaultCashboxIdForCurrentUser_();
    const elevatedRoles = [
      USER_ROLES.ADMIN,
      USER_ROLES.DIRECTOR,
      USER_ROLES.FINANCE,
      USER_ROLES.CASHIER_SUPERVISOR
    ];
    const canSeeAll = elevatedRoles.indexOf(user.role) !== -1;
    return listRecords(SHEET_NAMES.SHIFTS)
      .filter(function(shift) {
        if (targetCashboxId && shift.cashbox_id !== targetCashboxId) return false;
        if (scoped.status && shift.status !== scoped.status) return false;
        if (!canSeeAll && shift.opened_by !== user.email && shift.handover_to !== user.email) return false;
        return true;
      })
      .sort(function(a, b) {
        return new Date(b.opened_at || 0).getTime() - new Date(a.opened_at || 0).getTime();
      })
      .slice(0, Number(scoped.limit || 50));
  });
}

function apiGetCashbookFilterOptions(cashboxId) {
  return apiWrap_(function() {
    assertCurrentUserActive();
    const targetCashboxId = cashboxId || getDefaultCashboxIdForCurrentUser_();
    const users = listRecords(SHEET_NAMES.USERS)
      .filter(function(user) {
        return String(user.status || '').toUpperCase() !== 'INACTIVE';
      })
      .map(function(user) {
        return {
          email: user.email || user.user_email || '',
          full_name: user.full_name || user.name || '',
          role: user.role || ''
        };
      })
      .filter(function(user) {
        return user.email;
      });
    const shifts = listRecords(SHEET_NAMES.SHIFTS)
      .filter(function(shift) {
        return !targetCashboxId || shift.cashbox_id === targetCashboxId;
      })
      .map(function(shift) {
        return {
          shift_id: shift.shift_id,
          opened_by: shift.opened_by || '',
          opened_at: shift.opened_at || '',
          closed_at: shift.closed_at || '',
          status: shift.status || ''
        };
      });
    return {
      users: users,
      shifts: shifts
    };
  });
}

function apiGetShiftBalance(shiftId) {
  return apiWrap_(function() {
    return getShiftBalance(shiftId);
  });
}

function apiGetActiveShiftBalance(cashboxId) {
  return apiWrap_(function() {
    const activeShift = getActiveShiftForCashbox(cashboxId || getDefaultCashboxIdForCurrentUser_());
    if (!activeShift) {
      throw new Error('No active shift for cashbox.');
    }
    return getShiftBalance(activeShift.shift_id);
  });
}

function apiGetActiveShiftState(cashboxId) {
  return apiWrap_(function() {
    const user = assertCurrentUserActive();
    const targetCashboxId = cashboxId || getDefaultCashboxIdForCurrentUser_();
    const activeShift = getActiveShiftForCashbox(targetCashboxId);
    return {
      activeShift: activeShift,
      canPostDirectCashEvents: !!(activeShift && activeShift.opened_by === user.email)
    };
  });
}

function apiHandoverShift(shiftId, handoverToUserEmail, physicalBalanceByCurrency, note, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.SHIFTS_CLOSE, function() {
      return handoverShift(shiftId, handoverToUserEmail, parseJsonInput_(physicalBalanceByCurrency), note);
    });
  });
}

function apiCloseShift(shiftId, physicalBalanceByCurrency, note, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.SHIFTS_CLOSE, function() {
      return closeShift(shiftId, parseJsonInput_(physicalBalanceByCurrency), note);
    });
  });
}

function apiCloseShiftWithLatestCashCounts(shiftId, note, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.SHIFTS_CLOSE, function() {
      return closeShiftWithLatestCashCounts(shiftId, note);
    });
  });
}

function apiCloseShiftWithClosingCount(data, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.SHIFTS_CLOSE, function() {
      data = data || {};
      data = withDefaultCashbox_(data);
      data.note = data.note || 'ZAVRŠNI POPIS SMENE';
      return closeShiftWithClosingCount(data);
    });
  });
}

function apiCloseActiveShift(cashboxId, physicalBalanceByCurrency, note, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.SHIFTS_CLOSE, function() {
      const activeShift = getActiveShiftForCashbox(cashboxId || getDefaultCashboxIdForCurrentUser_());
      if (!activeShift) {
        throw new Error('No active shift for cashbox.');
      }
      return closeShift(activeShift.shift_id, parseJsonInput_(physicalBalanceByCurrency), note);
    });
  });
}

function apiGetCashCountsReport(filters) {
  return apiWrap_(function() {
    return getCashCountsReport(filters || {});
  });
}

function apiGetCashSheetReport(filters) {
  return apiWrap_(function() {
    filters = filters || {};
    filters.cashbox_id = filters.cashbox_id || getDefaultCashboxIdForCurrentUser_();
    return getCashSheetReport(filters);
  });
}

function apiPrepareDailyClosing(cashboxId, currency, closingDate) {
  return apiWrap_(function() {
    return prepareDailyClosing(cashboxId || getDefaultCashboxIdForCurrentUser_(), currency, closingDate);
  });
}

function apiCloseDailyCashbox(cashboxId, currency, closingDate, physicalBalance, note, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.SHIFTS_CLOSE, function() {
      return closeDailyCashbox(cashboxId || getDefaultCashboxIdForCurrentUser_(), currency, closingDate, physicalBalance, note);
    });
  });
}

function apiListDailyClosings(filters) {
  return apiWrap_(function() {
    return listDailyClosings(filters || {});
  });
}

function apiGetManagementDashboardSummary(filters) {
  return apiWrap_(function() {
    return getManagementDashboardSummary(filters || {});
  });
}

function apiGetUiBootstrap(includeDashboard, sessionId) {
  return apiWrap_(function() {
    const build = function() {
      const user = getCurrentUser();
      const config = buildAppConfigForUi_(user);
      const activeShift = getActiveShiftForCashbox(config.defaultCashboxId || getDefaultCashboxIdForUser_(user));
      const data = {
        config: config,
        user: user,
        activeShift: activeShift,
        canPostDirectCashEvents: !!(activeShift && activeShift.opened_by === user.email)
      };
      if (includeDashboard === true) {
        data.dashboard = getManagementDashboardSummary({
          cashbox_id: config.defaultCashboxId || ''
        });
      }
      return data;
    };
    if (sessionId) {
      return runWithApiSession_(sessionId, null, build);
    }
    return build();
  });
}

function apiLoginAppUser(userCodeOrData, pin, context) {
  return apiWrap_(function() {
    const data = typeof userCodeOrData === 'object'
      ? (userCodeOrData || {})
      : { user_code: userCodeOrData, pin: pin, context: context };
    return loginAppUser(
      data.user_code || data.userCode || data.code || '',
      data.pin || '',
      data.context || context || {}
    );
  });
}

function apiLogoutAppUser(sessionIdOrData) {
  return apiWrap_(function() {
    const sessionId = typeof sessionIdOrData === 'object'
      ? (sessionIdOrData.session_id || sessionIdOrData.sessionId || '')
      : sessionIdOrData;
    return logoutAppUser(sessionId);
  });
}

function apiGetCurrentAppSession(sessionIdOrData) {
  return apiWrap_(function() {
    const sessionId = typeof sessionIdOrData === 'object'
      ? (sessionIdOrData.session_id || sessionIdOrData.sessionId || '')
      : sessionIdOrData;
    return getCurrentAppSession(sessionId);
  });
}

function apiSwitchAppUser(userCodeOrData, pin, context) {
  return apiWrap_(function() {
    const data = typeof userCodeOrData === 'object'
      ? (userCodeOrData || {})
      : { user_code: userCodeOrData, pin: pin, context: context };
    return switchAppUser(
      data.user_code || data.userCode || data.code || '',
      data.pin || '',
      data.context || context || {}
    );
  });
}

function apiListUsers(filters, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, [
      USER_PRIVILEGES.USERS_CREATE,
      USER_PRIVILEGES.USERS_UPDATE,
      USER_PRIVILEGES.USERS_ASSIGN_ROLES
    ], function() {
      return listUsers(filters || {});
    });
  });
}

function apiCreateUser(userData, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.USERS_CREATE, function() {
      return createUser(userData || {});
    });
  });
}

function apiUpdateUserPermissions(userId, permissionsData, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, [
      USER_PRIVILEGES.USERS_UPDATE,
      USER_PRIVILEGES.USERS_ASSIGN_ROLES,
      USER_PRIVILEGES.USERS_DISABLE
    ], function() {
      return updateUserPermissions(userId, permissionsData || {});
    });
  });
}

function apiResetUserPin(userId, newPin, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, [
      USER_PRIVILEGES.USERS_UPDATE,
      USER_PRIVILEGES.USERS_ASSIGN_ROLES
    ], function() {
      return resetUserPin(userId, newPin);
    });
  });
}

function apiPrepareUsersForAppLogin(sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, [
      USER_PRIVILEGES.USERS_CREATE,
      USER_PRIVILEGES.USERS_UPDATE,
      USER_PRIVILEGES.USERS_ASSIGN_ROLES
    ], function() {
      return prepareUsersForAppLogin();
    });
  });
}

function apiGetAppLoginBootstrapReadiness(tokenOrData) {
  return apiWrap_(function() {
    const token = typeof tokenOrData === 'object' && tokenOrData
      ? tokenOrData.token
      : tokenOrData;
    return getAppLoginBootstrapStatusForWeb(token);
  });
}

function apiRunAppLoginBootstrap(data) {
  return apiWrap_(function() {
    return runAppLoginBootstrapFromWeb(data || {});
  });
}

function apiGetPermissionsMatrix(sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, [
      USER_PRIVILEGES.USERS_CREATE,
      USER_PRIVILEGES.USERS_UPDATE,
      USER_PRIVILEGES.USERS_ASSIGN_ROLES,
      USER_PRIVILEGES.AUDIT_VIEW
    ], function() {
      return getPermissionsMatrix();
    });
  });
}

function apiGetAuditLog(filters, sessionId) {
  return apiWrap_(function() {
    return runWithApiSession_(sessionId, USER_PRIVILEGES.AUDIT_VIEW, function() {
      assertCurrentUserHasPrivilege_(USER_PRIVILEGES.AUDIT_VIEW);
      const limit = Number((filters || {}).limit || 100);
      return listRecords(SHEET_NAMES.AUDIT_LOG)
        .sort(function(left, right) {
          return toTime_(right.timestamp) - toTime_(left.timestamp);
        })
        .slice(0, isFinite(limit) && limit > 0 ? limit : 100);
    });
  });
}

function apiGetCashboxBalanceReport(filters) {
  return apiWrap_(function() {
    return getCashboxBalanceReport(filters || {});
  });
}

function apiGetOpenPaymentRequestsReport(filters) {
  return apiWrap_(function() {
    return getOpenPaymentRequestsReport(filters || {});
  });
}

function apiGetRequestsForApprovalReport(filters) {
  return apiWrap_(function() {
    return getRequestsForApprovalReport(filters || {});
  });
}

function apiGetOrdersWaitingPaymentReport(filters) {
  return apiWrap_(function() {
    return getOrdersWaitingPaymentReport(filters || {});
  });
}

function apiGetExecutedPaymentsReport(filters) {
  return apiWrap_(function() {
    return getExecutedPaymentsReport(filters || {});
  });
}

function apiGetCashMovementsReport(filters) {
  return apiWrap_(function() {
    return getCashMovementsReport(withDefaultCashbox_(filters || {}));
  });
}

function apiGetMissingDocumentsReport(filters) {
  return apiWrap_(function() {
    return getMissingDocumentsReport(filters || {});
  });
}

function apiGetDailyClosingReport(filters) {
  return apiWrap_(function() {
    return getDailyClosingReport(filters || {});
  });
}

function apiGetDifferencesReport(filters) {
  return apiWrap_(function() {
    return getDifferencesReport(filters || {});
  });
}

function apiGetCorrectionsAndReversalsReport(filters) {
  return apiWrap_(function() {
    return getCorrectionsAndReversalsReport(filters || {});
  });
}

function apiGetAuditExceptionsReport(filters) {
  return apiWrap_(function() {
    return getAuditExceptionsReport(filters || {});
  });
}

function apiGetCurrentUserContext(sessionId) {
  return apiWrap_(function() {
    if (sessionId) {
      return runWithApiSession_(sessionId, null, function() {
        return getCurrentUser();
      });
    }
    return getCurrentUser();
  });
}

function apiGetAppConfigForUi(sessionId) {
  return apiWrap_(function() {
    if (sessionId) {
      return runWithApiSession_(sessionId, null, function() {
        return buildAppConfigForUi_(getCurrentUser());
      });
    }
    return buildAppConfigForUi_(getCurrentUser());
  });
}

function runWithApiSession_(sessionId, requiredPrivileges, callback) {
  const context = requireAppSession(sessionId, requiredPrivileges);
  return withAppSessionContext_(context, callback);
}

function apiSuccess_(data) {
  return {
    ok: true,
    data: sanitizeApiValue_(data)
  };
}

function apiError_(error) {
  const response = {
    ok: false,
    error: {
      message: error && error.message ? error.message : 'Neočekivana greška.'
    }
  };
  if (APP_CONFIG && APP_CONFIG.DEBUG_MODE === true && error && error.stack) {
    response.error.debug = error.stack;
  }
  return response;
}

function apiWrap_(callback) {
  try {
    return apiSuccess_(callback());
  } catch (error) {
    return apiError_(error);
  }
}

function sanitizeApiValue_(value) {
  if (value === undefined || value === null) {
    return value;
  }
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone() || 'Europe/Belgrade', 'yyyy-MM-dd HH:mm:ss');
  }
  if (Array.isArray(value)) {
    return value.map(function(item) {
      return sanitizeApiValue_(item);
    });
  }
  if (typeof value === 'object') {
    return Object.keys(value).reduce(function(result, key) {
      result[key] = sanitizeApiValue_(value[key]);
      return result;
    }, {});
  }
  return value;
}

function parseJsonInput_(value) {
  if (!value) {
    return value;
  }
  if (typeof value === 'object') {
    return value;
  }
  return JSON.parse(value);
}

function buildAppConfigForUi_(currentUser) {
  const defaultCashboxId = getDefaultCashboxIdForUser_(currentUser || {});
  const cashboxes = listCashboxes();
  const defaultCashbox = cashboxes.filter(function(cashbox) {
    return cashbox.cashbox_id === defaultCashboxId;
  })[0] || {
    cashbox_id: defaultCashboxId,
    name: defaultCashboxId
  };
  return {
    appName: APP_CONFIG.APP_NAME,
    version: APP_CONFIG.VERSION,
    appVersion: APP_CONFIG.APP_VERSION,
    environment: APP_CONFIG.ENVIRONMENT,
    currencies: listSupportedCurrencies(),
    cashDenominations: getCurrencyDenominationMap(),
    cashboxes: cashboxes,
    requestPriorities: objectValues_(REQUEST_PRIORITIES),
    paymentRequestApprovalRules: PAYMENT_REQUEST_APPROVAL_RULES,
    entityTypes: objectValues_(ENTITY_TYPES),
    defaultCashboxId: defaultCashboxId,
    defaultCashboxName: defaultCashbox.name || defaultCashbox.cashbox_id,
    defaultCurrency: getDefaultCurrencyCode(),
    today: Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Belgrade', 'yyyy-MM-dd')
  };
}

function withDefaultCashbox_(data) {
  const result = Object.assign({}, data || {});
  if (!result.cashbox_id) {
    result.cashbox_id = getDefaultCashboxIdForCurrentUser_();
  }
  return result;
}
