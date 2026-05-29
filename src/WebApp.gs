/**
 * Web App entry point and thin API wrappers for the frontend.
 */
function doGet(e) {
  const allowedViews = [
    'index',
    'mobile',
    'desktop',
    'print-payment-request',
    'print-payment-order',
    'print-cash-event',
    'print-shift-handover',
    'print-daily-closing',
    'print-report'
  ];
  const params = e && e.parameter ? e.parameter : {};
  const requestedView = params.view || params.page || 'mobile';
  const view = allowedViews.indexOf(requestedView) === -1 ? 'mobile' : requestedView;
  const template = HtmlService.createTemplateFromFile('html/' + view);
  if (view.indexOf('print-') === 0) {
    template.printData = buildPrintTemplateData_(view, params);
  }

  return template.evaluate()
    .setTitle(APP_CONFIG.APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function apiCreatePaymentRequest(data) {
  return apiWrap_(function() {
    return createPaymentRequest(data || {});
  });
}

function apiSubmitPaymentRequest(requestId) {
  return apiWrap_(function() {
    return submitPaymentRequest(requestId);
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

function apiApprovePaymentRequest(requestId) {
  return apiWrap_(function() {
    return approvePaymentRequest(requestId);
  });
}

function apiRejectPaymentRequest(requestId, reason) {
  return apiWrap_(function() {
    return rejectPaymentRequest(requestId, reason);
  });
}

function apiCreatePaymentOrderFromRequest(requestId, orderData) {
  return apiWrap_(function() {
    return createPaymentOrderFromRequest(requestId, withDefaultCashbox_(orderData || {}));
  });
}

function apiCreateDirectPaymentOrder(orderData) {
  return apiWrap_(function() {
    return createDirectPaymentOrder(withDefaultCashbox_(orderData || {}));
  });
}

function apiIssuePaymentOrder(orderId) {
  return apiWrap_(function() {
    return issuePaymentOrder(orderId);
  });
}

function apiCreateAndIssuePaymentOrderFromRequest(requestId, orderData) {
  return apiWrap_(function() {
    const order = createPaymentOrderFromRequest(requestId, withDefaultCashbox_(orderData || {}));
    return issuePaymentOrder(order.order_id);
  });
}

function apiApproveAndIssuePaymentOrder(requestId, orderData) {
  return apiWrap_(function() {
    approvePaymentRequest(requestId);
    const order = createPaymentOrderFromRequest(requestId, withDefaultCashbox_(orderData || {}));
    return issuePaymentOrder(order.order_id);
  });
}

function apiListOrdersWaitingForPayment() {
  return apiWrap_(function() {
    return listOrdersWaitingForPayment();
  });
}

function apiRejectPaymentOrderByCashier(orderId, reason) {
  return apiWrap_(function() {
    return rejectPaymentOrderByCashier(orderId, reason);
  });
}

function apiExecutePaymentOrder(orderId, paymentData) {
  return apiWrap_(function() {
    return executePaymentOrder(orderId, paymentData || {});
  });
}

function apiCreateCashInflow(data) {
  return apiWrap_(function() {
    return createCashInflow(withDefaultCashbox_(data || {}));
  });
}

function apiCalculateCashboxBalance(cashboxId, currency) {
  return apiWrap_(function() {
    return calculateCashboxBalance(cashboxId || getDefaultCashboxIdForCurrentUser_(), currency);
  });
}

function apiAttachDocumentToEntity(entityType, entityId, filePayload, note) {
  return apiWrap_(function() {
    return attachDocumentToEntity(entityType, entityId, filePayload, note);
  });
}

function apiListDocumentsForEntity(entityType, entityId) {
  return apiWrap_(function() {
    return listDocumentsForEntity(entityType, entityId);
  });
}

function apiOpenShift(cashboxId, openingNote) {
  return apiWrap_(function() {
    return openShift(cashboxId || getDefaultCashboxIdForCurrentUser_(), openingNote);
  });
}

function apiGetMyActiveShifts() {
  return apiWrap_(function() {
    return getMyActiveShifts();
  });
}

function apiGetShiftBalance(shiftId) {
  return apiWrap_(function() {
    return getShiftBalance(shiftId);
  });
}

function apiHandoverShift(shiftId, handoverToUserEmail, physicalBalanceByCurrency, note) {
  return apiWrap_(function() {
    return handoverShift(shiftId, handoverToUserEmail, parseJsonInput_(physicalBalanceByCurrency), note);
  });
}

function apiCloseShift(shiftId, physicalBalanceByCurrency, note) {
  return apiWrap_(function() {
    return closeShift(shiftId, parseJsonInput_(physicalBalanceByCurrency), note);
  });
}

function apiPrepareDailyClosing(cashboxId, currency, closingDate) {
  return apiWrap_(function() {
    return prepareDailyClosing(cashboxId || getDefaultCashboxIdForCurrentUser_(), currency, closingDate);
  });
}

function apiCloseDailyCashbox(cashboxId, currency, closingDate, physicalBalance, note) {
  return apiWrap_(function() {
    return closeDailyCashbox(cashboxId || getDefaultCashboxIdForCurrentUser_(), currency, closingDate, physicalBalance, note);
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

function apiGetUiBootstrap(includeDashboard) {
  return apiWrap_(function() {
    const user = getCurrentUser();
    const config = buildAppConfigForUi_(user);
    const data = {
      config: config,
      user: user
    };
    if (includeDashboard === true) {
      data.dashboard = getManagementDashboardSummary({
        cashbox_id: config.defaultCashboxId || ''
      });
    }
    return data;
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

function apiGetCurrentUserContext() {
  return apiWrap_(function() {
    return getCurrentUser();
  });
}

function apiGetAppConfigForUi() {
  return apiWrap_(function() {
    return buildAppConfigForUi_(getCurrentUser());
  });
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
  return {
    appName: APP_CONFIG.APP_NAME,
    version: APP_CONFIG.VERSION,
    currencies: SUPPORTED_CURRENCIES,
    requestPriorities: objectValues_(REQUEST_PRIORITIES),
    entityTypes: objectValues_(ENTITY_TYPES),
    defaultCashboxId: defaultCashboxId,
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

function getDefaultCashboxIdForCurrentUser_() {
  return getDefaultCashboxIdForUser_(getCurrentUser());
}

function getDefaultCashboxIdForUser_(user) {
  if (user && user.default_cashbox_id) {
    return user.default_cashbox_id;
  }
  const activeCashbox = listRecords(SHEET_NAMES.CASHBOXES).filter(function(cashbox) {
    return isTruthy_(cashbox.active);
  })[0];
  if (!activeCashbox) {
    throw new Error('Nema aktivne blagajne u sistemu.');
  }
  return activeCashbox.cashbox_id;
}
