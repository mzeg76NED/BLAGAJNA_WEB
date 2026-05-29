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
    const request = createSmokeApprovedRequest_();
    const afterCashEvents = listRecords(SHEET_NAMES.CASH_EVENTS).length;

    if (beforeCashEvents !== afterCashEvents) {
      throw new Error('Payment Request created a cash event, which is not allowed.');
    }

    return {
      message: 'Payment Request approved without affecting cash balance.',
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
    const request = createSmokeApprovedRequest_();
    const order = createPaymentOrderFromRequest(request.request_id, { cashbox_id: 'TEST_CB_MAIN' });
    const issued = issuePaymentOrder(order.order_id);
    const afterCashEvents = listRecords(SHEET_NAMES.CASH_EVENTS).length;

    if (beforeCashEvents !== afterCashEvents) {
      throw new Error('Payment Order created a cash event, which is not allowed.');
    }

    return {
      message: 'Payment Order issued without affecting cash balance.',
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
    const request = createSmokeApprovedRequest_();
    const order = createPaymentOrderFromRequest(request.request_id, {
      cashbox_id: 'TEST_CB_MAIN',
      amount_ordered: 1000
    });
    const issued = issuePaymentOrder(order.order_id);
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
    const request = createSmokeApprovedRequest_();
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
    const request = createSmokeApprovedRequest_();
    const order = createPaymentOrderFromRequest(request.request_id, {
      cashbox_id: 'TEST_CB_MAIN',
      amount_ordered: 100
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
    const request = createSmokeApprovedRequest_();
    const order = issuePaymentOrder(createPaymentOrderFromRequest(request.request_id, {
      cashbox_id: 'TEST_CB_MAIN',
      amount_ordered: 1000
    }).order_id);
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
    const request = createSmokeApprovedRequest_();
    const order = createPaymentOrderFromRequest(request.request_id, { cashbox_id: 'TEST_CB_MAIN' });
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
    smokeTestCashMovementsReportLimit()
  ];
  return {
    ok: tests.every(function(test) { return test.status === 'PASS' || test.status === 'SKIPPED'; }),
    tests: tests
  };
}

function createSmokeApprovedRequest_() {
  createMinimalTestSetup();
  const request = createPaymentRequest({
    requested_for_name: 'Smoke Test Primalac',
    amount: 1000,
    currency: 'RSD',
    purpose: 'Smoke test zahtev',
    preferred_cashbox_id: 'TEST_CB_MAIN',
    priority: REQUEST_PRIORITIES.NORMAL
  });
  submitPaymentRequest(request.request_id);
  return approvePaymentRequest(request.request_id, {});
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
