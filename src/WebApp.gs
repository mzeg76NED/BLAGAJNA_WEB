/**
 * Web App entry point and thin API wrappers for the frontend.
 */
function doGet(e) {
  const allowedViews = ['index', 'mobile', 'desktop'];
  const params = e && e.parameter ? e.parameter : {};
  const requestedView = params.view || params.page || 'mobile';
  const view = allowedViews.indexOf(requestedView) === -1 ? 'mobile' : requestedView;
  const template = HtmlService.createTemplateFromFile('html/' + view);

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
    return createPaymentOrderFromRequest(requestId, orderData || {});
  });
}

function apiCreateDirectPaymentOrder(orderData) {
  return apiWrap_(function() {
    return createDirectPaymentOrder(orderData || {});
  });
}

function apiIssuePaymentOrder(orderId) {
  return apiWrap_(function() {
    return issuePaymentOrder(orderId);
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
    return createCashInflow(data || {});
  });
}

function apiCalculateCashboxBalance(cashboxId, currency) {
  return apiWrap_(function() {
    return calculateCashboxBalance(cashboxId, currency);
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
    return openShift(cashboxId, openingNote);
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
    return prepareDailyClosing(cashboxId, currency, closingDate);
  });
}

function apiCloseDailyCashbox(cashboxId, currency, closingDate, physicalBalance, note) {
  return apiWrap_(function() {
    return closeDailyCashbox(cashboxId, currency, closingDate, physicalBalance, note);
  });
}

function apiListDailyClosings(filters) {
  return apiWrap_(function() {
    return listDailyClosings(filters || {});
  });
}

function apiGetCurrentUserContext() {
  return apiWrap_(function() {
    return getCurrentUser();
  });
}

function apiGetAppConfigForUi() {
  return apiWrap_(function() {
    return {
      appName: APP_CONFIG.APP_NAME,
      version: APP_CONFIG.VERSION,
      currencies: SUPPORTED_CURRENCIES,
      requestPriorities: objectValues_(REQUEST_PRIORITIES),
      entityTypes: objectValues_(ENTITY_TYPES),
      today: Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Belgrade', 'yyyy-MM-dd')
    };
  });
}

function apiSuccess_(data) {
  return {
    ok: true,
    data: data
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

function parseJsonInput_(value) {
  if (!value) {
    return value;
  }
  if (typeof value === 'object') {
    return value;
  }
  return JSON.parse(value);
}
