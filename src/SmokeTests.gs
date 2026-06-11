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

function smokeTestAppLoginPinHelpers() {
  return runSmokeTest_('App login PIN helpers', function() {
    const pin = '1234';
    const salt = generatePinSalt();
    const hash = hashUserPin(pin, salt);

    if (!salt || salt === pin) {
      throw new Error('PIN salt was not generated correctly.');
    }
    if (!hash || hash === pin || String(hash).indexOf(pin) !== -1) {
      throw new Error('PIN hash exposes the original PIN.');
    }
    if (!verifyUserPin(pin, hash, salt)) {
      throw new Error('Valid PIN was not verified.');
    }
    if (verifyUserPin('0000', hash, salt)) {
      throw new Error('Invalid PIN was accepted.');
    }

    return {
      message: 'PIN helpers generate salt, hash PIN and verify without exposing plain PIN.',
      details: {
        hashLength: hash.length,
        saltLength: salt.length
      }
    };
  });
}

function smokeTestAppLoginModelReadOnly() {
  return runSmokeTest_('App login model read-only', function() {
    const requiredUserColumns = [
      'user_code',
      'pin_hash',
      'pin_salt',
      'last_login_at',
      'last_logout_at',
      'failed_login_count',
      'locked_until',
      'last_google_session_email'
    ];
    const requiredSessionColumns = [
      'session_id',
      'app_user_id',
      'user_code',
      'role',
      'google_session_email',
      'cashbox_id',
      'shift_id',
      'created_at',
      'last_seen_at',
      'expires_at',
      'active',
      'logout_at',
      'device_label'
    ];
    const requiredAuditActions = [
      'APP_USER_LOGIN',
      'APP_USER_LOGOUT',
      'APP_USER_SWITCH',
      'APP_USER_LOGIN_FAILED',
      'APP_SESSION_EXPIRED'
    ];

    const missingUserColumns = requiredUserColumns.filter(function(column) {
      return TABLE_HEADERS.USERS.indexOf(column) === -1;
    });
    const missingSessionColumns = requiredSessionColumns.filter(function(column) {
      return TABLE_HEADERS.APP_SESSIONS.indexOf(column) === -1;
    });
    const missingAuditActions = requiredAuditActions.filter(function(action) {
      return objectValues_(AUDIT_ACTIONS).indexOf(action) === -1;
    });

    if (SHEET_NAMES.APP_SESSIONS !== 'APP_SESSIONS') {
      throw new Error('APP_SESSIONS sheet name is not configured.');
    }
    if (missingUserColumns.length || missingSessionColumns.length || missingAuditActions.length) {
      throw new Error('App login model is incomplete.');
    }

    return {
      message: 'App login headers and audit action constants are configured.',
      details: {
        userColumns: requiredUserColumns.length,
        sessionColumns: requiredSessionColumns.length,
        auditActions: requiredAuditActions.length
      }
    };
  });
}

function smokeTestUserAdminAppLoginReadOnly() {
  return runSmokeTest_('User admin app login read-only', function() {
    const requiredAuditActions = [
      'USER_PIN_SET',
      'USER_PIN_RESET',
      'USER_CODE_CHANGED',
      'USER_APP_LOGIN_ENABLED',
      'USER_APP_LOGIN_DISABLED'
    ];
    const missingAuditActions = requiredAuditActions.filter(function(action) {
      return objectValues_(AUDIT_ACTIONS).indexOf(action) === -1;
    });
    const sample = sanitizeUserForApi_({
      user_id: 'USR-SAMPLE',
      email: 'sample@example.com',
      full_name: 'Sample User',
      role: USER_ROLES.REQUESTER,
      active: true,
      default_cashbox_id: '',
      user_code: 'SAMPLE',
      pin_hash: 'SECRET_HASH',
      pin_salt: 'SECRET_SALT',
      failed_login_count: 0
    });

    if (missingAuditActions.length) {
      throw new Error('Missing user admin audit actions: ' + missingAuditActions.join(', '));
    }
    if (Object.prototype.hasOwnProperty.call(sample, 'pin_hash') ||
        Object.prototype.hasOwnProperty.call(sample, 'pin_salt')) {
      throw new Error('Sanitized user exposes PIN hash or salt.');
    }
    if (sample.app_login_status !== 'PIN_SET') {
      throw new Error('Sanitized user did not expose safe app login status.');
    }

    return {
      message: 'User admin login constants and sanitization are configured.',
      details: {
        auditActions: requiredAuditActions.length,
        appLoginStatus: sample.app_login_status
      }
    };
  });
}

function smokeTestAppSessionGatingReadOnly() {
  return runSmokeTest_('App session gating read-only', function() {
    let emptySessionFailed = false;
    try {
      requireAppSession('', USER_PRIVILEGES.PAYMENT_REQUESTS_CREATE);
    } catch (error) {
      emptySessionFailed = /sessionId|non-empty|Sesija je istekla/i.test(error.message || '');
    }
    if (!emptySessionFailed) {
      throw new Error('requireAppSession did not reject empty sessionId.');
    }

    const auditContext = buildAuditContextFromSession({
      app_user_id: 'USR-SAMPLE',
      app_user_name: 'Sample User',
      user_code: 'SAMPLE',
      role: USER_ROLES.CASHIER,
      google_session_email: 'blagajna@example.com',
      cashbox_id: 'CB_MAIN',
      shift_id: 'SHF-SAMPLE'
    });
    if (auditContext.app_user_id !== 'USR-SAMPLE' || auditContext.google_session_email !== 'blagajna@example.com') {
      throw new Error('Audit context does not include app user and Google session email.');
    }

    const response = apiCreatePaymentRequest({
      requested_for_name: 'Should not be written',
      amount: 1,
      currency: 'RSD',
      purpose: 'Missing app session test'
    }, '');
    if (!response || response.ok !== false || !/Sesija je istekla|sessionId|non-empty/i.test(response.error && response.error.message || '')) {
      throw new Error('Protected write API without session did not fail safely.');
    }

    return {
      message: 'Session gating rejects empty session and audit context carries app identity fields.',
      details: {
        emptySessionRejected: true,
        protectedWriteRejected: true,
        auditContextFields: Object.keys(auditContext).length
      }
    };
  });
}

function smokeTestAppLoginDatabaseReadiness() {
  return runSmokeTest_('App login database readiness', function() {
    const report = reportAppLoginDatabaseReadiness();
    if (!report || !report.users || !report.app_sessions || !report.audit_log) {
      throw new Error('Readiness report did not return expected sections.');
    }
    return {
      message: 'App login database readiness was checked; structure columns may be ensured, but users and PINs are not changed.',
      details: {
        ok_for_deploy: report.ok_for_deploy,
        blockers: report.blockers || [],
        warnings: report.warnings || [],
        duplicate_user_ids: report.users.duplicate_user_ids || [],
        active_admin_count: report.users.active_admin_count || 0,
        active_admin_with_pin_count: report.users.active_admin_with_pin_count || 0
      }
    };
  });
}

function smokeTestRequireAppSessionWrite(sessionId) {
  return runSmokeTest_('Require app session write/context', function() {
    const context = requireAppSession(sessionId, USER_PRIVILEGES.PAYMENT_REQUESTS_CREATE);
    if (!context.app_user_id || !context.google_session_email) {
      throw new Error('Valid app session did not return app identity context.');
    }
    return {
      message: 'Valid app session returned app user context.',
      details: {
        app_user_id: context.app_user_id,
        role: context.role,
        google_session_email: context.google_session_email
      }
    };
  });
}

function smokeTestCreateUserWithPinWrite() {
  return runSmokeTest_('Create user with app PIN write', function() {
    ensureSmokeTestRole_([USER_ROLES.ADMIN]);
    const suffix = Utilities.getUuid().split('-')[0].toUpperCase();
    const user = createUser({
      user_code: 'SMOKE_' + suffix,
      email: 'smoke.' + suffix.toLowerCase() + '@example.com',
      full_name: 'Smoke App Login User',
      role: USER_ROLES.VIEWER,
      active: true,
      pin: '1234'
    });
    const raw = getUserByCode_(user.user_code);
    if (!raw || !raw.pin_hash || !raw.pin_salt) {
      throw new Error('Created user does not have PIN hash and salt.');
    }
    if (user.pin_hash || user.pin_salt) {
      throw new Error('API user result exposes PIN hash or salt.');
    }
    if (!verifyUserPin('1234', raw.pin_hash, raw.pin_salt)) {
      throw new Error('Created user PIN does not verify.');
    }
    return {
      message: 'User with user_code and PIN was created. This is a write smoke test.',
      details: { user_id: user.user_id, user_code: user.user_code }
    };
  });
}

function smokeTestResetUserPinWrite(userId) {
  return runSmokeTest_('Reset user PIN write', function() {
    ensureSmokeTestRole_([USER_ROLES.ADMIN]);
    assertNonEmptyString(userId, 'userId');
    const beforeMatch = findRecordById(SHEET_NAMES.USERS, 'user_id', userId);
    if (!beforeMatch) {
      throw new Error('User not found: ' + userId);
    }
    const before = beforeMatch.record;
    const updated = resetUserPin(userId, '9876');
    const after = getUserById_(userId);
    if (!after || !after.pin_hash || !after.pin_salt) {
      throw new Error('Reset PIN did not write hash and salt.');
    }
    if (String(before.pin_hash || '') === String(after.pin_hash || '') ||
        String(before.pin_salt || '') === String(after.pin_salt || '')) {
      throw new Error('Reset PIN did not change hash and salt.');
    }
    if (!verifyUserPin('9876', after.pin_hash, after.pin_salt)) {
      throw new Error('Reset PIN does not verify.');
    }
    if (updated.pin_hash || updated.pin_salt) {
      throw new Error('Reset result exposes PIN hash or salt.');
    }
    return {
      message: 'User PIN was reset. This is a write smoke test.',
      details: { user_id: updated.user_id, user_code: updated.user_code }
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
    smokeTestPermissionsMatrix(),
    smokeTestAppLoginPinHelpers(),
    smokeTestAppLoginModelReadOnly(),
    smokeTestUserAdminAppLoginReadOnly(),
    smokeTestAppLoginDatabaseReadiness(),
    smokeTestAppSessionGatingReadOnly()
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
