/**
 * Manual smoke tests for Apps Script editor.
 *
 * These tests use the active Apps Script user. They do not impersonate roles.
 * Add the active user's real email to USERS with the required role before
 * running business-flow tests.
 */
function smokeTestDatabaseInitialization() {
  initializeDatabase();

  const summary = Object.keys(SHEET_NAMES).map(function(key) {
    const sheetName = SHEET_NAMES[key];
    const sheet = getSheetByNameOrThrow(sheetName);
    const headers = getHeaders_(sheet);
    return {
      sheetName: sheetName,
      exists: true,
      headerCount: headers.length,
      expectedHeaderCount: TABLE_HEADERS[sheetName].length,
      headersOk: TABLE_HEADERS[sheetName].every(function(header) {
        return headers.indexOf(header) !== -1;
      })
    };
  });

  return {
    ok: summary.every(function(item) { return item.exists && item.headersOk; }),
    sheets: summary
  };
}

function smokeTestPaymentRequestFlow() {
  ensureSmokeTestRole_([
    USER_ROLES.ADMIN,
    USER_ROLES.DIRECTOR,
    USER_ROLES.FINANCE,
    USER_ROLES.CASHIER_SUPERVISOR,
    USER_ROLES.APPROVER
  ]);

  const beforeCashEvents = listRecords(SHEET_NAMES.CASH_EVENTS).length;
  const request = createSmokeApprovedRequest_();
  const afterCashEvents = listRecords(SHEET_NAMES.CASH_EVENTS).length;

  return {
    request_id: request.request_id,
    final_status: request.status,
    cashEventsBefore: beforeCashEvents,
    cashEventsAfter: afterCashEvents,
    noCashEventCreated: beforeCashEvents === afterCashEvents
  };
}

function smokeTestPaymentOrderFlow() {
  ensureSmokeTestRole_([
    USER_ROLES.ADMIN,
    USER_ROLES.DIRECTOR,
    USER_ROLES.FINANCE,
    USER_ROLES.CASHIER_SUPERVISOR,
    USER_ROLES.APPROVER
  ]);

  createMinimalTestSetup();
  const beforeCashEvents = listRecords(SHEET_NAMES.CASH_EVENTS).length;
  const request = createSmokeApprovedRequest_();
  const order = createPaymentOrderFromRequest(request.request_id, { cashbox_id: 'CB_MAIN' });
  const issued = issuePaymentOrder(order.order_id);
  const afterCashEvents = listRecords(SHEET_NAMES.CASH_EVENTS).length;

  return {
    request_id: request.request_id,
    order_id: issued.order_id,
    order_status: issued.status,
    cashEventsBefore: beforeCashEvents,
    cashEventsAfter: afterCashEvents,
    noCashEventCreated: beforeCashEvents === afterCashEvents
  };
}

function smokeTestCashPaymentFlow() {
  ensureSmokeTestRole_([
    USER_ROLES.ADMIN,
    USER_ROLES.CASHIER_SUPERVISOR
  ]);

  createMinimalTestSetup();
  const balanceBefore = calculateCashboxBalance('CB_MAIN', 'RSD');
  const inflow = createCashInflow({
    cashbox_id: 'CB_MAIN',
    currency: 'RSD',
    amount: 10000,
    description: 'Smoke test priliv'
  });
  const request = createSmokeApprovedRequest_();
  const order = createPaymentOrderFromRequest(request.request_id, {
    cashbox_id: 'CB_MAIN',
    amount_ordered: 1000
  });
  const issued = issuePaymentOrder(order.order_id);
  const payment = executePaymentOrder(issued.order_id, { amount: 1000 });
  const balanceAfter = calculateCashboxBalance('CB_MAIN', 'RSD');

  return {
    inflow_event_id: inflow.event_id,
    order_id: issued.order_id,
    cash_outflow_event_id: payment.cashEvent.event_id,
    cashOutflowCreated: payment.cashEvent.event_type === CASH_EVENT_TYPES.CASH_OUTFLOW,
    balanceBefore: balanceBefore,
    balanceAfter: balanceAfter,
    balanceChanged: balanceAfter === balanceBefore + 9000
  };
}

function smokeTestDailyClosingPreview() {
  ensureSmokeTestRole_([
    USER_ROLES.ADMIN,
    USER_ROLES.DIRECTOR,
    USER_ROLES.FINANCE,
    USER_ROLES.CASHIER_SUPERVISOR,
    USER_ROLES.CASHIER
  ]);

  createMinimalTestSetup();
  const closingDate = '2099-12-31';
  const beforeClosings = listRecords(SHEET_NAMES.DAILY_CLOSING).length;
  const preview = prepareDailyClosing('CB_MAIN', 'RSD', closingDate);
  const afterClosings = listRecords(SHEET_NAMES.DAILY_CLOSING).length;

  return {
    closingDate: closingDate,
    preview: preview,
    closingRowsBefore: beforeClosings,
    closingRowsAfter: afterClosings,
    noClosingCreated: beforeClosings === afterClosings
  };
}

function createSmokeApprovedRequest_() {
  createMinimalTestSetup();
  const request = createPaymentRequest({
    requested_for_name: 'Smoke Test Primalac',
    amount: 1000,
    currency: 'RSD',
    purpose: 'Smoke test zahtev',
    preferred_cashbox_id: 'CB_MAIN',
    priority: REQUEST_PRIORITIES.NORMAL
  });
  submitPaymentRequest(request.request_id);
  return approvePaymentRequest(request.request_id, {});
}

function ensureSmokeTestRole_(allowedRoles) {
  try {
    return assertUserHasRole(allowedRoles);
  } catch (error) {
    throw new Error(
      'Smoke test cannot continue with current Apps Script user. Add the active real email to USERS with one of these roles: ' +
      allowedRoles.join(', ') + '. Original error: ' + error.message
    );
  }
}
