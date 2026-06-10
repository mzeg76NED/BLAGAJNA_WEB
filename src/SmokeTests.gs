/**
 * Manual smoke tests for Apps Script editor.
 *
 * These tests use the active Apps Script user. They do not impersonate roles.
 * Add the active user's real email to USERS with the required role before
 * running business-flow tests.
 */
function smokeTestDatabaseInitialization() {
  return runSmokeTest_('Database initialization', function() {
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

    if (!summary.every(function(item) { return item.exists && item.headersOk; })) {
      throw new Error('One or more required sheets have missing headers.');
    }

    return {
      message: 'Database sheets and headers are available.',
      details: { sheets: summary }
    };
  });
}

function smokeTestSystemSetupValidation() {
  return runSmokeTest_('System setup validation', function() {
    const validation = validateSystemSetup();
    if (!validation.ok) {
      throw new Error('System setup validation failed: ' + validation.errors.join('; '));
    }
    return {
      message: 'System setup validation passed.',
      details: validation
    };
  });
}

function smokeTestPaymentRequestFlow() {
  return runSmokeTest_('Payment request flow', function() {
    ensureSmokeTestRole_([
      USER_ROLES.ADMIN,
      USER_ROLES.DIRECTOR,
      USER_ROLES.FINANCE,
      USER_ROLES.CASHIER_SUPERVISOR,
      USER_ROLES.APPROVER
    ]);

    const beforeCashEvents = listRecords(SHEET_NAMES.CASH_EVENTS).length;
    const request = createSmokeSubmittedInLimitRequest_();
    const afterCashEvents = listRecords(SHEET_NAMES.CASH_EVENTS).length;

    if (beforeCashEvents !== afterCashEvents) {
      throw new Error('Payment Request created a cash event, which is not allowed.');
    }

    return {
      message: 'Payment Request submitted without creating cash event or changing balance directly.',
      details: {
        request_id: request.request_id,
        final_status: request.status,
        cashEventsBefore: beforeCashEvents,
        cashEventsAfter: afterCashEvents
      }
    };
  });
}

function smokeTestPaymentOrderFlow() {
  return runSmokeTest_('Payment order flow', function() {
    ensureSmokeTestRole_([
      USER_ROLES.ADMIN,
      USER_ROLES.DIRECTOR,
      USER_ROLES.FINANCE,
      USER_ROLES.CASHIER_SUPERVISOR,
      USER_ROLES.APPROVER
    ]);

    createMinimalTestSetup();
    const beforeCashEvents = listRecords(SHEET_NAMES.CASH_EVENTS).length;
    const request = createSmokeSubmittedInLimitRequest_();
    const issued = getPaymentOrderById(request.linked_order_id);
    const afterCashEvents = listRecords(SHEET_NAMES.CASH_EVENTS).length;

    if (beforeCashEvents !== afterCashEvents) {
      throw new Error('Payment Order created a cash event, which is not allowed.');
    }

    return {
      message: 'Payment Request under limit created waiting Payment Order without affecting cash balance.',
      details: {
        request_id: request.request_id,
        order_id: issued.order_id,
        order_status: issued.status,
        cashEventsBefore: beforeCashEvents,
        cashEventsAfter: afterCashEvents
      }
    };
  });
}

function smokeTestCashPaymentFlow() {
  return runSmokeTest_('Cash payment flow', function() {
    ensureSmokeTestRole_([
      USER_ROLES.ADMIN,
      USER_ROLES.CASHIER_SUPERVISOR
    ]);

    createMinimalTestSetup();
    const balanceBefore = calculateCashboxBalance('TEST_CB_MAIN', 'RSD');
    const inflow = createCashInflow({
      cashbox_id: 'TEST_CB_MAIN',
      currency: 'RSD',
      amount: 10000,
      description: 'Smoke test priliv'
    });
    const request = createSmokeSubmittedInLimitRequest_(1000);
    const issued = getPaymentOrderById(request.linked_order_id);
    const pending = sendPaymentOrderToCashier(issued.order_id);
    const balanceAfterPending = calculateCashboxBalance('TEST_CB_MAIN', 'RSD');
    if (balanceAfterPending !== balanceBefore + 10000) {
      throw new Error('Pending ISPLATA changed balance before cashier execution.');
    }
    if (pending.pendingPayment.status !== CASH_EVENT_STATUSES.SUBMITTED) {
      throw new Error('Pending ISPLATA was not created as SUBMITTED.');
    }
    const payment = executePaymentOrder(issued.order_id, { amount: 1000 });
    const balanceAfter = calculateCashboxBalance('TEST_CB_MAIN', 'RSD');

    if (payment.cashEvent.event_type !== CASH_EVENT_TYPES.CASH_OUTFLOW) {
      throw new Error('Cash payment did not create CASH_OUTFLOW.');
    }
    if (balanceAfter !== balanceBefore + 9000) {
      throw new Error('Balance did not change by expected net smoke amount.');
    }

    return {
      message: 'Issued Payment Order created posted CASH_OUTFLOW and changed balance.',
      details: {
        inflow_event_id: inflow.event_id,
        order_id: issued.order_id,
        pending_payment_id: pending.pendingPayment.event_id,
        cash_outflow_event_id: payment.cashEvent.event_id,
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter
      }
    };
  });
}

function smokeTestDocumentWorkflow() {
  return runSmokeTest_('Document workflow', function() {
    ensureSmokeTestRole_(DOCUMENT_ATTACH_ROLES_);
    const request = createSmokeSubmittedInLimitRequest_();
    const document = attachDocumentToEntity(ENTITY_TYPES.PAYMENT_REQUEST, request.request_id, {
      fileName: 'TEST-smoke-document.txt',
      mimeType: 'text/plain',
      base64Data: Utilities.base64Encode('Smoke test document')
    }, 'Smoke test dokument');
    const documents = listDocumentsForEntity(ENTITY_TYPES.PAYMENT_REQUEST, request.request_id);

    if (!documents.some(function(item) { return item.document_id === document.document_id; })) {
      throw new Error('Attached smoke document is not listed on entity.');
    }

    return {
      message: 'Document metadata and Drive upload workflow completed.',
      details: {
        request_id: request.request_id,
        document_id: document.document_id,
        file_url: document.file_url
      }
    };
  });
}

function smokeTestShiftWorkflow() {
  return runSmokeTest_('Shift workflow', function() {
    ensureSmokeTestRole_([
      USER_ROLES.ADMIN,
      USER_ROLES.CASHIER_SUPERVISOR,
      USER_ROLES.CASHIER
    ]);
    const cashboxId = createSmokeCashbox_();
    const shift = openShift(cashboxId, 'Smoke test otvaranje smene');
    const balance = getShiftBalance(shift.shift_id);
    const closed = closeShift(shift.shift_id, balance.balanceByCurrency, 'Smoke test zatvaranje smene');

    if (closed.status !== SHIFT_STATUSES.CLOSED && closed.status !== SHIFT_STATUSES.CLOSED_WITH_DIFFERENCE) {
      throw new Error('Shift did not close correctly.');
    }

    return {
      message: 'Shift opened, balanced and closed.',
      details: {
        shift_id: shift.shift_id,
        cashbox_id: cashboxId,
        final_status: closed.status
      }
    };
  });
}

function smokeTestDailyClosingWorkflow() {
  return runSmokeTest_('Daily closing workflow', function() {
    ensureSmokeTestRole_([
      USER_ROLES.ADMIN,
      USER_ROLES.DIRECTOR,
      USER_ROLES.FINANCE,
      USER_ROLES.CASHIER_SUPERVISOR
    ]);
    const cashboxId = createSmokeCashbox_();
    const closingDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Belgrade', 'yyyy-MM-dd');
    const preview = prepareDailyClosing(cashboxId, 'RSD', closingDate);
    const closing = closeDailyCashbox(cashboxId, 'RSD', closingDate, preview.calculated_balance, 'Smoke test dnevni zaključak');

    if (closing.status !== DAILY_CLOSING_STATUSES.CLOSED && closing.status !== DAILY_CLOSING_STATUSES.CLOSED_WITH_DIFFERENCE) {
      throw new Error('Daily closing did not finish with closed status.');
    }

    return {
      message: 'Daily closing preview and close workflow completed.',
      details: {
        closing_id: closing.closing_id,
        cashbox_id: cashboxId,
        closing_date: closingDate,
        final_status: closing.status
      }
    };
  });
}

function smokeTestDailyClosingPreview() {
  return smokeTestDailyClosingWorkflow();
}

function smokeTestReportsReadOnly() {
  return runSmokeTest_('Reports read-only', function() {
    ensureSmokeTestRole_(REPORT_VIEW_ROLES_);
    const beforeAuditRows = listRecords(SHEET_NAMES.AUDIT_LOG).length;
    const beforeCashEvents = listRecords(SHEET_NAMES.CASH_EVENTS).length;
    const dashboard = getManagementDashboardSummary({});
    const balances = getCashboxBalanceReport({});
    const missingDocuments = getMissingDocumentsReport({});
    const afterAuditRows = listRecords(SHEET_NAMES.AUDIT_LOG).length;
    const afterCashEvents = listRecords(SHEET_NAMES.CASH_EVENTS).length;

    if (beforeAuditRows !== afterAuditRows || beforeCashEvents !== afterCashEvents) {
      throw new Error('Read-only reports changed audit or cash event rows.');
    }

    return {
      message: 'Reports returned data without writing business rows.',
      details: {
        dashboard: dashboard,
        balanceRows: balances.length,
        missingDocumentRows: missingDocuments.length
      }
    };
  });
}

function smokeTestDraftOrderCannotBeExecuted() {
  return runSmokeTest_('Draft order cannot be executed', function() {
    ensureSmokeTestRole_([
      USER_ROLES.ADMIN,
      USER_ROLES.CASHIER_SUPERVISOR
    ]);
    createMinimalTestSetup();
    const order = createDirectPaymentOrder({
      cashbox_id: 'TEST_CB_MAIN',
      pay_to_name: 'Smoke Test Primalac',
      amount_ordered: 100,
      currency: 'RSD',
      purpose: 'Smoke test draft nalog'
    });
    const beforeCashEvents = listRecords(SHEET_NAMES.CASH_EVENTS).length;
    let failed = false;
    try {
      executePaymentOrder(order.order_id, { amount: 100 });
    } catch (error) {
      failed = true;
    }
    const afterCashEvents = listRecords(SHEET_NAMES.CASH_EVENTS).length;
    if (!failed) {
      throw new Error('Draft order execution did not fail.');
    }
    if (beforeCashEvents !== afterCashEvents) {
      throw new Error('Draft order execution created a cash event.');
    }
    return {
      message: 'Draft order execution was rejected without cash event.',
      details: { order_id: order.order_id }
    };
  });
}

function smokeTestOverpaymentRejected() {
  return runSmokeTest_('Overpayment rejection', function() {
    ensureSmokeTestRole_([
      USER_ROLES.ADMIN,
      USER_ROLES.CASHIER_SUPERVISOR
    ]);
    createMinimalTestSetup();
    createCashInflow({
      cashbox_id: 'TEST_CB_MAIN',
      currency: 'RSD',
      amount: 10000,
      description: 'SMOKE TEST overpayment funding'
    });
    const request = createSmokeSubmittedInLimitRequest_(1000);
    const order = getPaymentOrderById(request.linked_order_id);
    sendPaymentOrderToCashier(order.order_id);
    const beforeCashEvents = listRecords(SHEET_NAMES.CASH_EVENTS).length;
    let failed = false;
    try {
      executePaymentOrder(order.order_id, { amount: 1001 });
    } catch (error) {
      failed = true;
    }
    const afterCashEvents = listRecords(SHEET_NAMES.CASH_EVENTS).length;
    if (!failed) {
      throw new Error('Overpayment did not fail.');
    }
    if (beforeCashEvents !== afterCashEvents) {
      throw new Error('Overpayment created a cash event.');
    }
    return {
      message: 'Overpayment was rejected without cash event.',
      details: { order_id: order.order_id }
    };
  });
}

function smokeTestDuplicateOrderPrevention() {
  return runSmokeTest_('Duplicate order prevention', function() {
    ensureSmokeTestRole_([
      USER_ROLES.ADMIN,
      USER_ROLES.DIRECTOR,
      USER_ROLES.FINANCE,
      USER_ROLES.CASHIER_SUPERVISOR,
      USER_ROLES.APPROVER
    ]);
    createMinimalTestSetup();
    const request = createSmokeSubmittedInLimitRequest_();
    const order = getPaymentOrderById(request.linked_order_id);
    let failed = false;
    try {
      createPaymentOrderFromRequest(request.request_id, { cashbox_id: 'TEST_CB_MAIN' });
    } catch (error) {
      failed = true;
    }
    if (!failed) {
      throw new Error('Duplicate order creation did not fail.');
    }
    return {
      message: 'Second payment order for the same request was rejected.',
      details: {
        request_id: request.request_id,
        order_id: order.order_id
      }
    };
  });
}

function smokeTestRequestUnderLimitAutoCreatesOrder() {
  return runSmokeTest_('Request under limit auto creates payment order', function() {
    ensureSmokeTestRole_([
      USER_ROLES.ADMIN,
      USER_ROLES.DIRECTOR,
      USER_ROLES.FINANCE,
      USER_ROLES.CASHIER_SUPERVISOR,
      USER_ROLES.APPROVER,
      USER_ROLES.REQUESTER
    ]);
    createMinimalTestSetup();
    const beforeCashEvents = listRecords(SHEET_NAMES.CASH_EVENTS).length;
    const balanceBefore = calculateCashboxBalance('TEST_CB_MAIN', 'RSD');
    const request = createSmokeSubmittedInLimitRequest_(1000);
    const order = getPaymentOrderById(request.linked_order_id);
    const afterCashEvents = listRecords(SHEET_NAMES.CASH_EVENTS).length;
    const balanceAfter = calculateCashboxBalance('TEST_CB_MAIN', 'RSD');

    if (!order || order.status !== ORDER_STATUSES.WAITING_PAYMENT) {
      throw new Error('Under-limit request did not create WAITING_PAYMENT order.');
    }
    if (order.source_request_id !== request.request_id || order.linked_request_id !== request.request_id) {
      throw new Error('Order is not linked to source request.');
    }
    if (beforeCashEvents !== afterCashEvents || balanceBefore !== balanceAfter) {
      throw new Error('Request/order creation changed cash events or balance.');
    }
    return {
      message: 'Under-limit request auto-created a waiting order without cash movement.',
      details: { request_id: request.request_id, order_id: order.order_id }
    };
  });
}

function smokeTestRequestOverLimitRequiresApproval() {
  return runSmokeTest_('Request over limit waits for higher approval', function() {
    ensureSmokeTestRole_([
      USER_ROLES.ADMIN,
      USER_ROLES.DIRECTOR,
      USER_ROLES.FINANCE,
      USER_ROLES.CASHIER_SUPERVISOR,
      USER_ROLES.APPROVER
    ]);
    const request = createSmokeSubmittedOverLimitRequest_();
    if (request.linked_order_id) {
      throw new Error('Over-limit request created order before higher approval.');
    }
    if (request.status !== REQUEST_STATUSES.ESCALATED_TO_ORDER) {
      throw new Error('Over-limit request did not wait in ESCALATED_TO_ORDER.');
    }
    const approved = approvePaymentRequest(request.request_id, { cashbox_id: 'TEST_CB_MAIN' });
    const order = getPaymentOrderById(approved.linked_order_id);
    if (!order || order.status !== ORDER_STATUSES.WAITING_PAYMENT) {
      throw new Error('Higher approval did not create waiting order.');
    }
    return {
      message: 'Over-limit request waited for approval and then created waiting order.',
      details: { request_id: request.request_id, order_id: order.order_id }
    };
  });
}

function smokeTestCashMovementsReportLimit() {
  return runSmokeTest_('Cash movements report limit', function() {
    ensureSmokeTestRole_(REPORT_VIEW_ROLES_);
    const beforeAuditRows = listRecords(SHEET_NAMES.AUDIT_LOG).length;
    const beforeCashEvents = listRecords(SHEET_NAMES.CASH_EVENTS).length;
    const rows = getCashMovementsReport({ limit: 5 });
    const afterAuditRows = listRecords(SHEET_NAMES.AUDIT_LOG).length;
    const afterCashEvents = listRecords(SHEET_NAMES.CASH_EVENTS).length;
    if (rows.length > 5) {
      throw new Error('Cash movements report did not respect limit.');
    }
    if (beforeAuditRows !== afterAuditRows || beforeCashEvents !== afterCashEvents) {
      throw new Error('Cash movements report wrote data.');
    }
    return {
      message: 'Cash movements report is read-only and respects limit.',
      details: { rowCount: rows.length }
    };
  });
}

function smokeTestPermissionsMatrix() {
  return runSmokeTest_('Permissions matrix', function() {
    if (!userHasPrivilege_({ role: USER_ROLES.ADMIN }, USER_PRIVILEGES.USERS_CREATE)) {
      throw new Error('ADMIN is missing users:create privilege.');
    }
    if (!userHasPrivilege_({ role: USER_ROLES.REQUESTER }, USER_PRIVILEGES.PAYMENT_REQUESTS_CREATE)) {
      throw new Error('REQUESTER is missing payment_requests:create privilege.');
    }
    if (userHasPrivilege_({ role: USER_ROLES.REQUESTER }, USER_PRIVILEGES.PAYMENT_ORDERS_EXECUTE)) {
      throw new Error('REQUESTER must not execute payment orders.');
    }
    if (!userHasPrivilege_({ role: USER_ROLES.CASHIER }, USER_PRIVILEGES.PAYMENT_ORDERS_EXECUTE)) {
      throw new Error('CASHIER is missing payment_orders:execute privilege.');
    }
    if (userHasPrivilege_({ role: USER_ROLES.CASHIER }, USER_PRIVILEGES.USERS_CREATE)) {
      throw new Error('CASHIER must not create users.');
    }
    return {
      message: 'Permissions matrix contains expected minimum role privileges.',
      details: {
        roles: objectValues_(USER_ROLES).length,
        privileges: objectValues_(USER_PRIVILEGES).length
      }
    };
  });
}

function runAllSmokeTests() {
  const tests = [
    smokeTestDatabaseInitialization(),
    smokeTestSystemSetupValidation(),
    smokeTestPaymentRequestFlow(),
    smokeTestPaymentOrderFlow(),
    smokeTestCashPaymentFlow(),
    smokeTestDocumentWorkflow(),
    smokeTestShiftWorkflow(),
    smokeTestDailyClosingWorkflow(),
    smokeTestReportsReadOnly(),
    smokeTestDraftOrderCannotBeExecuted(),
    smokeTestOverpaymentRejected(),
    smokeTestDuplicateOrderPrevention(),
    smokeTestRequestUnderLimitAutoCreatesOrder(),
    smokeTestRequestOverLimitRequiresApproval(),
    smokeTestCashMovementsReportLimit(),
    smokeTestPermissionsMatrix()
  ];
  return {
    ok: tests.every(function(test) { return test.status === 'PASS' || test.status === 'SKIPPED'; }),
    tests: tests
  };
}

function createSmokeSubmittedInLimitRequest_(amount) {
  createMinimalTestSetup();
  const request = createPaymentRequest({
    requested_for_name: 'Smoke Test Primalac',
    amount: amount || 1000,
    currency: 'RSD',
    purpose: 'Smoke test zahtev',
    description: 'Smoke test zahtev za isplatu kroz nalog.',
    preferred_cashbox_id: 'TEST_CB_MAIN',
    priority: REQUEST_PRIORITIES.NORMAL
  });
  return submitPaymentRequest(request.request_id);
}

function createSmokeSubmittedOverLimitRequest_() {
  createMinimalTestSetup();
  const request = createPaymentRequest({
    requested_for_name: 'Smoke Test Primalac',
    amount: getPaymentRequestDirectLimit_('RSD') + 1000,
    currency: 'RSD',
    purpose: 'Smoke test zahtev preko limita',
    description: 'Smoke test zahtev preko limita za odobrenje više instance.',
    preferred_cashbox_id: 'TEST_CB_MAIN',
    priority: REQUEST_PRIORITIES.URGENT
  });
  return submitPaymentRequest(request.request_id);
}

function createSmokeApprovedRequest_() {
  const request = createSmokeSubmittedOverLimitRequest_();
  return approvePaymentRequest(request.request_id, { cashbox_id: 'TEST_CB_MAIN' });
}

function createSmokeCashbox_() {
  createMinimalTestSetup();
  const cashboxId = 'TEST_CB_SMOKE_' + Utilities.getUuid().split('-')[0].toUpperCase();
  const now = getCurrentTimestamp_();
  appendRecord(SHEET_NAMES.CASHBOXES, {
    cashbox_id: cashboxId,
    name: 'TEST - Smoke blagajna',
    location: 'Smoke test',
    responsible_user_id: 'TEST_USR_CASHIER',
    active: true,
    created_at: now,
    updated_at: now
  });
  return cashboxId;
}

function runSmokeTest_(name, callback) {
  try {
    const result = callback();
    return {
      name: name,
      status: 'PASS',
      message: result && result.message ? result.message : 'Smoke test passed.',
      details: result && result.details ? result.details : result
    };
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    const isSkipped = message.indexOf('Smoke test cannot continue with current Apps Script user') !== -1 ||
      message.indexOf('Current user email is not available') !== -1 ||
      message.indexOf('Current user is not registered') !== -1;
    return {
      name: name,
      status: isSkipped ? 'SKIPPED' : 'FAIL',
      message: message
    };
  }
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
