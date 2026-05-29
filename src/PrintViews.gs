/**
 * Read-only printable views and document data builders.
 *
 * These functions must not create payments, change statuses or write audit rows.
 */
const PRINT_VIEW_ROLES_ = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.DIRECTOR,
  USER_ROLES.FINANCE,
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.CASHIER,
  USER_ROLES.APPROVER,
  USER_ROLES.REQUESTER
]);

const PRINT_ELEVATED_ROLES_ = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.DIRECTOR,
  USER_ROLES.FINANCE,
  USER_ROLES.CASHIER_SUPERVISOR
]);

const PRINT_REPORT_TYPES_ = Object.freeze({
  'missing-documents': Object.freeze({
    title: 'Izveštaj: nedostajuća dokumenta',
    handler: getMissingDocumentsReport
  }),
  'cashbox-balance': Object.freeze({
    title: 'Izveštaj: presek stanja blagajni',
    handler: getCashboxBalanceReport
  }),
  'orders-waiting-payment': Object.freeze({
    title: 'Izveštaj: nalozi koji čekaju isplatu',
    handler: getOrdersWaitingPaymentReport
  }),
  'requests-for-approval': Object.freeze({
    title: 'Izveštaj: zahtevi za odobrenje',
    handler: getRequestsForApprovalReport
  }),
  'daily-closing': Object.freeze({
    title: 'Izveštaj: dnevni zaključci',
    handler: getDailyClosingReport
  }),
  'differences': Object.freeze({
    title: 'Izveštaj: razlike',
    handler: getDifferencesReport
  }),
  'corrections-reversals': Object.freeze({
    title: 'Izveštaj: korekcije i storno',
    handler: getCorrectionsAndReversalsReport
  })
});

function getPrintablePaymentRequestData(requestId) {
  assertRequiredFields({ request_id: requestId }, ['request_id']);
  const request = findRecordOrThrowForPrint_(SHEET_NAMES.PAYMENT_REQUESTS, 'request_id', requestId);
  const currentUser = assertUserCanActOnOwnOrRole(request.created_by || request.requester_user_id, PRINT_ELEVATED_ROLES_.concat([
    USER_ROLES.APPROVER
  ]));
  const linkedOrder = request.linked_order_id
    ? findRecordForPrint_(SHEET_NAMES.PAYMENT_ORDERS, 'order_id', request.linked_order_id)
    : null;

  return {
    printHeader: buildPrintHeader_('PAYMENT_REQUEST', request.request_id, currentUser),
    title: 'Zahtev za isplatu',
    request: request,
    requester: findUserByEmailOrIdForPrint_(request.created_by || request.requester_user_id),
    linkedOrder: linkedOrder,
    documents: listPrintDocumentsForEntity_(ENTITY_TYPES.PAYMENT_REQUEST, request.request_id)
  };
}

function getPrintablePaymentOrderData(orderId) {
  assertRequiredFields({ order_id: orderId }, ['order_id']);
  const currentUser = assertUserHasRole([
    USER_ROLES.ADMIN,
    USER_ROLES.DIRECTOR,
    USER_ROLES.FINANCE,
    USER_ROLES.CASHIER_SUPERVISOR,
    USER_ROLES.CASHIER,
    USER_ROLES.APPROVER
  ]);
  const order = findRecordOrThrowForPrint_(SHEET_NAMES.PAYMENT_ORDERS, 'order_id', orderId);
  const sourceRequest = order.source_request_id
    ? findRecordForPrint_(SHEET_NAMES.PAYMENT_REQUESTS, 'request_id', order.source_request_id)
    : null;
  const linkedCashEvent = order.linked_cash_event_id
    ? findRecordForPrint_(SHEET_NAMES.CASH_EVENTS, 'event_id', order.linked_cash_event_id)
    : null;

  return {
    printHeader: buildPrintHeader_('PAYMENT_ORDER', order.order_id, currentUser),
    title: 'Nalog za isplatu',
    order: order,
    sourceRequest: sourceRequest,
    linkedCashEvent: linkedCashEvent,
    cashbox: findRecordForPrint_(SHEET_NAMES.CASHBOXES, 'cashbox_id', order.cashbox_id),
    documents: listPrintDocumentsForEntity_(ENTITY_TYPES.PAYMENT_ORDER, order.order_id)
  };
}

function getPrintableCashEventData(eventId) {
  assertRequiredFields({ event_id: eventId }, ['event_id']);
  const currentUser = assertUserHasRole([
    USER_ROLES.ADMIN,
    USER_ROLES.DIRECTOR,
    USER_ROLES.FINANCE,
    USER_ROLES.CASHIER_SUPERVISOR,
    USER_ROLES.CASHIER
  ]);
  const event = findRecordOrThrowForPrint_(SHEET_NAMES.CASH_EVENTS, 'event_id', eventId);
  const linkedOrder = event.linked_order_id
    ? findRecordForPrint_(SHEET_NAMES.PAYMENT_ORDERS, 'order_id', event.linked_order_id)
    : null;
  const linkedRequest = event.linked_request_id
    ? findRecordForPrint_(SHEET_NAMES.PAYMENT_REQUESTS, 'request_id', event.linked_request_id)
    : null;

  return {
    printHeader: buildPrintHeader_('CASH_EVENT', event.event_id, currentUser),
    title: 'Blagajnički događaj',
    event: event,
    cashbox: findRecordForPrint_(SHEET_NAMES.CASHBOXES, 'cashbox_id', event.cashbox_id),
    linkedOrder: linkedOrder,
    linkedRequest: linkedRequest,
    documents: listPrintDocumentsForEntity_(ENTITY_TYPES.CASH_EVENT, event.event_id)
  };
}

function getPrintableShiftHandoverData(shiftId) {
  assertRequiredFields({ shift_id: shiftId }, ['shift_id']);
  const currentUser = assertUserHasRole([
    USER_ROLES.ADMIN,
    USER_ROLES.DIRECTOR,
    USER_ROLES.FINANCE,
    USER_ROLES.CASHIER_SUPERVISOR,
    USER_ROLES.CASHIER
  ]);
  const shift = findRecordOrThrowForPrint_(SHEET_NAMES.SHIFTS, 'shift_id', shiftId);

  return {
    printHeader: buildPrintHeader_('SHIFT', shift.shift_id, currentUser),
    title: 'Primopredaja smene',
    shift: shift,
    cashbox: findRecordForPrint_(SHEET_NAMES.CASHBOXES, 'cashbox_id', shift.cashbox_id),
    openingBalance: safeParseJsonForPrint_(shift.opening_balance_json),
    closingBalance: safeParseJsonForPrint_(shift.closing_balance_json),
    physicalBalance: safeParseJsonForPrint_(shift.physical_balance_json),
    difference: safeParseJsonForPrint_(shift.difference_json),
    documents: listPrintDocumentsForEntity_(ENTITY_TYPES.SHIFT, shift.shift_id)
  };
}

function getPrintableDailyClosingData(closingId) {
  assertRequiredFields({ closing_id: closingId }, ['closing_id']);
  const currentUser = assertUserHasRole([
    USER_ROLES.ADMIN,
    USER_ROLES.DIRECTOR,
    USER_ROLES.FINANCE,
    USER_ROLES.CASHIER_SUPERVISOR
  ]);
  const closing = findRecordOrThrowForPrint_(SHEET_NAMES.DAILY_CLOSING, 'closing_id', closingId);

  return {
    printHeader: buildPrintHeader_('DAILY_CLOSING', closing.closing_id, currentUser),
    title: 'Dnevni zaključak blagajne',
    closing: closing,
    cashbox: findRecordForPrint_(SHEET_NAMES.CASHBOXES, 'cashbox_id', closing.cashbox_id),
    includedEvents: listCashEventsForClosingPrint_(closing),
    documents: listPrintDocumentsForEntity_(ENTITY_TYPES.DAILY_CLOSING, closing.closing_id)
  };
}

function getPrintableReportData(reportType, filters) {
  assertRequiredFields({ report_type: reportType }, ['report_type']);
  const currentUser = assertUserHasRole(REPORT_VIEW_ROLES_);
  const report = PRINT_REPORT_TYPES_[reportType];
  if (!report) {
    throw new Error('Unsupported printable report type: ' + reportType);
  }
  const scopedFilters = normalizePrintFilters_(filters || {});
  const rows = report.handler(scopedFilters);

  return {
    printHeader: buildPrintHeader_('REPORT', reportType, currentUser),
    title: report.title,
    reportType: reportType,
    filters: scopedFilters,
    rows: rows || []
  };
}

function generatePrintablePdf(viewType, idOrFilters) {
  throw new Error('PDF generation is not implemented in Task 13. Use browser print or Save as PDF.');
}

function buildPrintTemplateData_(view, params) {
  const routeParams = params || {};
  if (view === 'print-payment-request') {
    return getPrintablePaymentRequestData(routeParams.id);
  }
  if (view === 'print-payment-order') {
    return getPrintablePaymentOrderData(routeParams.id);
  }
  if (view === 'print-cash-event') {
    return getPrintableCashEventData(routeParams.id);
  }
  if (view === 'print-shift-handover') {
    return getPrintableShiftHandoverData(routeParams.id);
  }
  if (view === 'print-daily-closing') {
    return getPrintableDailyClosingData(routeParams.id);
  }
  if (view === 'print-report') {
    return getPrintableReportData(routeParams.type, routeParams);
  }
  throw new Error('Unsupported print view: ' + view);
}

function buildPrintHeader_(sourceType, sourceId, currentUser) {
  const timezone = Session.getScriptTimeZone() || 'Europe/Belgrade';
  const user = currentUser || getCurrentUser();
  return {
    appName: APP_CONFIG.APP_NAME,
    subtitle: 'Interni dokument blagajničkog poslovanja',
    companyName: 'Industrija Mesa Nedeljković doo',
    generatedAt: Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd HH:mm:ss'),
    generatedBy: user.email || user.user_id || '',
    sourceType: sourceType,
    sourceId: sourceId,
    note: 'Dokument generisan iz sistema BLAGAJNA WEB. Izvorni zapis se nalazi u sistemu.'
  };
}

function findRecordOrThrowForPrint_(sheetName, idField, idValue) {
  const record = findRecordForPrint_(sheetName, idField, idValue);
  if (!record) {
    throw new Error('Record not found for print: ' + idField + '=' + idValue);
  }
  return record;
}

function findRecordForPrint_(sheetName, idField, idValue) {
  if (!idValue) {
    return null;
  }
  const match = findRecordById(sheetName, idField, idValue);
  return match ? match.record : null;
}

function listPrintDocumentsForEntity_(entityType, entityId) {
  if (!entityType || !entityId) {
    return [];
  }
  return listRecords(SHEET_NAMES.DOCUMENTS)
    .filter(function(documentRecord) {
      return documentRecord.entity_type === entityType &&
        String(documentRecord.entity_id) === String(entityId);
    })
    .sort(function(left, right) {
      return toTime_(right.created_at) - toTime_(left.created_at);
    });
}

function listCashEventsForClosingPrint_(closing) {
  const closingDate = normalizePrintDateKey_(closing.closing_date);
  return listRecords(SHEET_NAMES.CASH_EVENTS)
    .filter(function(event) {
      return event.cashbox_id === closing.cashbox_id &&
        event.currency === closing.currency &&
        normalizePrintDateKey_(event.event_date || event.created_at) === closingDate &&
        (event.status === CASH_EVENT_STATUSES.LOCKED || event.status === CASH_EVENT_STATUSES.POSTED);
    })
    .sort(function(left, right) {
      return toTime_(left.event_date || left.created_at) - toTime_(right.event_date || right.created_at);
    });
}

function findUserByEmailOrIdForPrint_(emailOrId) {
  if (!emailOrId) {
    return null;
  }
  const text = String(emailOrId);
  const users = listRecords(SHEET_NAMES.USERS);
  for (let i = 0; i < users.length; i++) {
    if (String(users[i].email) === text || String(users[i].user_id) === text) {
      return users[i];
    }
  }
  return null;
}

function safeParseJsonForPrint_(value) {
  if (!value) {
    return {};
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return {
      raw_value: value
    };
  }
}

function normalizePrintFilters_(filters) {
  const excludedKeys = {
    view: true,
    page: true,
    type: true,
    id: true
  };
  return Object.keys(filters || {}).reduce(function(result, key) {
    if (!excludedKeys[key] && filters[key] !== '') {
      result[key] = filters[key];
    }
    return result;
  }, {});
}

function normalizePrintDateKey_(dateValue) {
  if (!dateValue) {
    return '';
  }
  if (dateValue instanceof Date) {
    return Utilities.formatDate(dateValue, Session.getScriptTimeZone() || 'Europe/Belgrade', 'yyyy-MM-dd');
  }
  const text = String(dateValue || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return match[1] + '-' + match[2] + '-' + match[3];
  }
  const parsed = new Date(text);
  if (isNaN(parsed.getTime())) {
    return text;
  }
  return Utilities.formatDate(parsed, Session.getScriptTimeZone() || 'Europe/Belgrade', 'yyyy-MM-dd');
}
