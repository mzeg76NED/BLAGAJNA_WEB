/**
 * Read-only operational reports and management dashboard.
 *
 * Reports must not create, update or delete business records.
 */
const REPORT_VIEW_ROLES_ = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.DIRECTOR,
  USER_ROLES.FINANCE,
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.CASHIER
]);

function getManagementDashboardSummary(filters) {
  const scopedFilters = normalizeReportFilters_(filters);
  const dateKey = scopedFilters.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Belgrade', 'yyyy-MM-dd');
  const activeCashboxes = getActiveCashboxes_().filter(function(cashbox) {
    return !scopedFilters.cashbox_id || cashbox.cashbox_id === scopedFilters.cashbox_id;
  });
  const activeCurrencies = getActiveCurrencies_().filter(function(currency) {
    return !scopedFilters.currency || currency.currency_code === scopedFilters.currency;
  });
  const cashboxIds = activeCashboxes.map(function(cashbox) { return cashbox.cashbox_id; });
  const currencyCodes = activeCurrencies.map(function(currency) { return currency.currency_code; });
  const requests = listRecords(SHEET_NAMES.PAYMENT_REQUESTS);
  const orders = listRecords(SHEET_NAMES.PAYMENT_ORDERS);
  const cashEvents = listRecords(SHEET_NAMES.CASH_EVENTS);
  const shifts = listRecords(SHEET_NAMES.SHIFTS);
  const dailyClosings = listRecords(SHEET_NAMES.DAILY_CLOSING);
  const balances = activeCashboxes.reduce(function(rows, cashbox) {
    activeCurrencies.forEach(function(currency) {
      const balance = cashEvents.reduce(function(total, event) {
        if (event.cashbox_id !== cashbox.cashbox_id ||
          event.currency !== currency.currency_code ||
          !isCashEventBalanceAffecting(event)) {
          return total;
        }
        const amount = safeNumber_(event.amount);
        return event.direction === 'OUT' ? total - amount : total + amount;
      }, 0);
      rows.push({
        cashbox_id: cashbox.cashbox_id,
        cashbox_name: cashbox.name || cashbox.cashbox_id,
        currency: currency.currency_code,
        balance: balance
      });
    });
    return rows;
  }, []);

  return {
    balances: balances,
    openRequestsCount: requests.filter(function(request) {
      return [
        REQUEST_STATUSES.DRAFT,
        REQUEST_STATUSES.SUBMITTED,
        REQUEST_STATUSES.IN_REVIEW,
        REQUEST_STATUSES.APPROVED
      ].indexOf(request.status) !== -1 &&
        (!scopedFilters.currency || request.currency === scopedFilters.currency);
    }).length,
    requestsForApprovalCount: requests.filter(function(request) {
      return (request.status === REQUEST_STATUSES.SUBMITTED || request.status === REQUEST_STATUSES.IN_REVIEW) &&
        (!scopedFilters.currency || request.currency === scopedFilters.currency);
    }).length,
    ordersWaitingPaymentCount: orders.filter(function(order) {
      return (order.status === ORDER_STATUSES.WAITING_PAYMENT || order.status === ORDER_STATUSES.PARTIALLY_PAID) &&
        cashboxIds.indexOf(order.cashbox_id) !== -1 &&
        (!scopedFilters.currency || order.currency === scopedFilters.currency);
    }).length,
    missingDocumentsCount: []
      .concat(requests)
      .concat(orders)
      .concat(cashEvents)
      .concat(shifts)
      .concat(dailyClosings)
      .filter(function(record) {
        return record.document_status === DOCUMENT_STATUSES.MISSING;
      }).length,
    openShiftsCount: shifts.filter(function(shift) {
      return shift.status === SHIFT_STATUSES.OPEN && cashboxIds.indexOf(shift.cashbox_id) !== -1;
    }).length,
    dailyClosingsTodayCount: dailyClosings.filter(function(closing) {
      return cashboxIds.indexOf(closing.cashbox_id) !== -1 &&
        (!scopedFilters.currency || closing.currency === scopedFilters.currency) &&
        normalizeReportDateKey_(closing.closing_date) === dateKey;
    }).length,
    differencesCount: dailyClosings.filter(function(closing) {
      return cashboxIds.indexOf(closing.cashbox_id) !== -1 &&
        Math.abs(safeNumber_(closing.difference)) > 0.000001;
    }).length + shifts.filter(function(shift) {
      return cashboxIds.indexOf(shift.cashbox_id) !== -1 && hasShiftDifference_(shift);
    }).length,
    reversalsTodayCount: cashEvents.filter(function(event) {
      return cashboxIds.indexOf(event.cashbox_id) !== -1 &&
        currencyCodes.indexOf(event.currency) !== -1 &&
        (event.event_type === CASH_EVENT_TYPES.REVERSAL || event.status === CASH_EVENT_STATUSES.REVERSED) &&
        normalizeReportDateKey_(event.event_date || event.created_at) === dateKey;
    }).length
  };
}

function getCashboxBalanceReport(filters) {
  const scopedFilters = normalizeReportFilters_(filters);
  const cashboxes = getActiveCashboxes_().filter(function(cashbox) {
    return !scopedFilters.cashbox_id || cashbox.cashbox_id === scopedFilters.cashbox_id;
  });
  const currencies = getActiveCurrencies_().filter(function(currency) {
    return !scopedFilters.currency || currency.currency_code === scopedFilters.currency;
  });
  const balanceByKey = listRecords(SHEET_NAMES.CASH_EVENTS)
    .filter(function(event) {
      return isCashEventBalanceAffecting(event);
    })
    .reduce(function(index, event) {
      const key = event.cashbox_id + '|' + event.currency;
      const amount = safeNumber_(event.amount);
      index[key] = (index[key] || 0) + (event.direction === 'OUT' ? -amount : amount);
      return index;
    }, {});

  const rows = [];
  cashboxes.forEach(function(cashbox) {
    currencies.forEach(function(currency) {
      const key = cashbox.cashbox_id + '|' + currency.currency_code;
      rows.push({
        cashbox_id: cashbox.cashbox_id,
        cashbox_name: cashbox.name || cashbox.cashbox_id,
        currency: currency.currency_code,
        balance: balanceByKey[key] || 0
      });
    });
  });
  return rows;
}

function getOpenPaymentRequestsReport(filters) {
  const scopedFilters = normalizeReportFilters_(filters);
  const openStatuses = [
    REQUEST_STATUSES.DRAFT,
    REQUEST_STATUSES.SUBMITTED,
    REQUEST_STATUSES.IN_REVIEW,
    REQUEST_STATUSES.APPROVED
  ];
  return listRecords(SHEET_NAMES.PAYMENT_REQUESTS)
    .filter(function(request) {
      return openStatuses.indexOf(request.status) !== -1 &&
        (!scopedFilters.currency || request.currency === scopedFilters.currency);
    })
    .map(function(request) {
      return pickFields_(request, [
        'request_id',
        'created_at',
        'created_by',
        'requested_for_name',
        'amount',
        'currency',
        'purpose',
        'priority',
        'status',
        'document_status'
      ]);
    })
    .sort(sortByPriorityAndDate_);
}

function getRequestsForApprovalReport(filters) {
  const scopedFilters = normalizeReportFilters_(filters);
  return listRecords(SHEET_NAMES.PAYMENT_REQUESTS)
    .filter(function(request) {
      return (request.status === REQUEST_STATUSES.SUBMITTED || request.status === REQUEST_STATUSES.IN_REVIEW) &&
        (!scopedFilters.currency || request.currency === scopedFilters.currency);
    })
    .map(function(request) {
      return pickFields_(request, [
        'request_id',
        'created_at',
        'created_by',
        'requested_for_name',
        'amount',
        'currency',
        'purpose',
        'priority',
        'status',
        'document_status'
      ]);
    })
    .sort(sortByPriorityAndDate_);
}

function getOrdersWaitingPaymentReport(filters) {
  const scopedFilters = normalizeReportFilters_(filters);
  return listRecords(SHEET_NAMES.PAYMENT_ORDERS)
    .filter(function(order) {
      return (order.status === ORDER_STATUSES.WAITING_PAYMENT || order.status === ORDER_STATUSES.PARTIALLY_PAID) &&
        (!scopedFilters.cashbox_id || order.cashbox_id === scopedFilters.cashbox_id) &&
        (!scopedFilters.currency || order.currency === scopedFilters.currency);
    })
    .map(function(order) {
      return {
        order_id: order.order_id,
        source_request_id: order.source_request_id,
        cashbox_id: order.cashbox_id,
        pay_to_name: order.pay_to_name,
        amount_ordered: safeNumber_(order.amount_ordered),
        amount_paid: safeNumber_(order.amount_paid),
        remaining_amount: safeNumber_(order.amount_ordered) - safeNumber_(order.amount_paid),
        currency: order.currency,
        purpose: order.purpose,
        due_date: order.due_date,
        priority: order.priority,
        status: order.status,
        document_status: order.document_status
      };
    })
    .sort(sortByPriorityAndDate_);
}

function getExecutedPaymentsReport(filters) {
  const scopedFilters = normalizeReportFilters_(filters);
  const range = getDateRangeFilter_(scopedFilters);
  const partnerText = String(scopedFilters.pay_to_name || scopedFilters.partner_name || '').toLowerCase();
  return listRecords(SHEET_NAMES.CASH_EVENTS)
    .filter(function(event) {
      return event.event_type === CASH_EVENT_TYPES.CASH_OUTFLOW &&
        isCashEventBalanceAffecting(event) &&
        (!scopedFilters.cashbox_id || event.cashbox_id === scopedFilters.cashbox_id) &&
        (!scopedFilters.currency || event.currency === scopedFilters.currency) &&
        (!partnerText || String(event.partner_name || '').toLowerCase().indexOf(partnerText) !== -1) &&
        isDateInRange_(event.event_date, range.dateFrom, range.dateTo);
    })
    .map(function(event) {
      return pickFields_(event, [
        'event_id',
        'event_date',
        'cashbox_id',
        'currency',
        'amount',
        'partner_name',
        'description',
        'linked_order_id',
        'linked_request_id',
        'status',
        'document_status',
        'posted_by',
        'posted_at'
      ]);
    })
    .sort(sortByEventDateDesc_);
}

function getCashMovementsReport(filters) {
  const scopedFilters = normalizeReportFilters_(filters);
  const range = getDateRangeFilter_(scopedFilters);
  const limit = Number(scopedFilters.limit || 100);
  const userFilter = String(scopedFilters.user || scopedFilters.posted_by || scopedFilters.created_by || '').toLowerCase();
  const shiftFilter = String(scopedFilters.shift_id || '').trim();
  const shiftRange = shiftFilter ? getShiftDateRangeForReport_(shiftFilter) : null;
  const eventsWithBalance = listRecords(SHEET_NAMES.CASH_EVENTS)
    .filter(function(event) {
      return (!scopedFilters.cashbox_id || event.cashbox_id === scopedFilters.cashbox_id) &&
        (!scopedFilters.currency || event.currency === scopedFilters.currency) &&
        (!scopedFilters.status || event.status === scopedFilters.status) &&
        (!userFilter || String(event.posted_by || event.created_by || '').toLowerCase().indexOf(userFilter) !== -1) &&
        (!shiftRange || (
          event.cashbox_id === shiftRange.cashbox_id &&
          isDateTimeInShiftRange_(event.event_date || event.created_at, shiftRange)
        ));
    })
    .sort(function(left, right) {
      return toTime_(left.event_date || left.created_at) - toTime_(right.event_date || right.created_at);
    });
  const runningByKey = {};

  return eventsWithBalance
    .map(function(event) {
      const amount = safeNumber_(event.amount);
      const key = event.cashbox_id + '|' + event.currency;
      if (!Object.prototype.hasOwnProperty.call(runningByKey, key)) {
        runningByKey[key] = 0;
      }
      if (isCashEventBalanceAffecting(event)) {
        runningByKey[key] += event.direction === 'OUT' ? -amount : amount;
      }
      const isReversal = event.event_type === CASH_EVENT_TYPES.REVERSAL && event.reversal_of_event_id;
      const displayDirection = isReversal
        ? (event.direction === 'OUT' ? 'IN' : 'OUT')
        : event.direction;
      const displayAmount = isReversal ? -amount : amount;
      return {
        event_date: event.event_date || event.created_at,
        event_id: event.event_id,
        event_type: event.event_type,
        direction: event.direction,
        amount: amount,
        signed_amount: event.direction === 'OUT' ? -amount : amount,
        display_direction: displayDirection,
        display_amount: displayAmount,
        running_balance: runningByKey[key],
        currency: event.currency,
        partner_name: event.partner_name,
        description: event.description,
        linked_order_id: event.linked_order_id,
        reversal_of_event_id: event.reversal_of_event_id,
        status: event.status,
        document_status: event.document_status,
        posted_by: event.posted_by,
        posted_at: event.posted_at,
        created_by: event.created_by,
        created_at: event.created_at
      };
    })
    .filter(function(event) {
      return isDateInRange_(event.event_date || event.created_at, range.dateFrom, range.dateTo);
    })
    .sort(sortByEventDateDesc_)
    .slice(0, isFinite(limit) && limit > 0 ? limit : 100);
}

function getShiftDateRangeForReport_(shiftId) {
  const match = findRecordById(SHEET_NAMES.SHIFTS, 'shift_id', shiftId);
  if (!match) {
    throw new Error('Shift not found: ' + shiftId);
  }
  return {
    cashbox_id: match.record.cashbox_id,
    opened_at: match.record.opened_at,
    closed_at: match.record.closed_at || match.record.handover_at || ''
  };
}

function isDateTimeInShiftRange_(dateValue, shiftRange) {
  const eventTime = toTime_(dateValue);
  const openedTime = toTime_(shiftRange.opened_at);
  const closedTime = shiftRange.closed_at ? toTime_(shiftRange.closed_at) : Number.MAX_SAFE_INTEGER;
  return eventTime >= openedTime && eventTime <= closedTime;
}

function getMissingDocumentsReport(filters) {
  const scopedFilters = normalizeReportFilters_(filters);
  return []
    .concat(missingPaymentRequests_(scopedFilters))
    .concat(missingPaymentOrders_(scopedFilters))
    .concat(missingCashEvents_(scopedFilters))
    .concat(missingGenericEntities_(SHEET_NAMES.DAILY_CLOSING, 'DAILY_CLOSING', 'closing_id', 'closing_date', scopedFilters))
    .concat(missingGenericEntities_(SHEET_NAMES.SHIFTS, 'SHIFT', 'shift_id', 'opened_at', scopedFilters));
}

function getDailyClosingReport(filters) {
  const scopedFilters = normalizeReportFilters_(filters);
  const range = getDateRangeFilter_(scopedFilters);
  return listRecords(SHEET_NAMES.DAILY_CLOSING)
    .filter(function(closing) {
      return (!scopedFilters.cashbox_id || closing.cashbox_id === scopedFilters.cashbox_id) &&
        (!scopedFilters.currency || closing.currency === scopedFilters.currency) &&
        (!scopedFilters.status || closing.status === scopedFilters.status) &&
        isDateInRange_(closing.closing_date, range.dateFrom, range.dateTo);
    })
    .map(function(closing) {
      return pickFields_(closing, [
        'closing_id',
        'closing_date',
        'cashbox_id',
        'currency',
        'opening_balance',
        'total_in',
        'total_out',
        'calculated_balance',
        'physical_balance',
        'difference',
        'status',
        'closed_by',
        'closed_at'
      ]);
    })
    .sort(sortByClosingDateDesc_);
}

function getDifferencesReport(filters) {
  const scopedFilters = normalizeReportFilters_(filters);
  const closingDifferences = getDailyClosingReport(scopedFilters)
    .filter(function(closing) {
      return Math.abs(safeNumber_(closing.difference)) > 0.000001;
    })
    .map(function(closing) {
      return {
        source_type: 'DAILY_CLOSING',
        source_id: closing.closing_id,
        date: closing.closing_date,
        cashbox_id: closing.cashbox_id,
        currency: closing.currency,
        calculated_balance: safeNumber_(closing.calculated_balance),
        physical_balance: safeNumber_(closing.physical_balance),
        difference: safeNumber_(closing.difference),
        status: closing.status
      };
    });

  const shiftDifferences = listRecords(SHEET_NAMES.SHIFTS)
    .filter(function(shift) {
      return (!scopedFilters.cashbox_id || shift.cashbox_id === scopedFilters.cashbox_id) &&
        hasShiftDifference_(shift);
    })
    .map(function(shift) {
      return {
        source_type: 'SHIFT',
        source_id: shift.shift_id,
        date: shift.closed_at || shift.handover_at || shift.opened_at,
        cashbox_id: shift.cashbox_id,
        currency: '',
        calculated_balance: '',
        physical_balance: '',
        difference: shift.difference_json,
        status: shift.status
      };
    });

  return closingDifferences.concat(shiftDifferences);
}

function getCorrectionsAndReversalsReport(filters) {
  const scopedFilters = normalizeReportFilters_(filters);
  const range = getDateRangeFilter_(scopedFilters);
  return listRecords(SHEET_NAMES.CASH_EVENTS)
    .filter(function(event) {
      return (event.event_type === CASH_EVENT_TYPES.CORRECTION ||
        event.event_type === CASH_EVENT_TYPES.REVERSAL ||
        event.status === CASH_EVENT_STATUSES.REVERSED) &&
        (!scopedFilters.cashbox_id || event.cashbox_id === scopedFilters.cashbox_id) &&
        (!scopedFilters.currency || event.currency === scopedFilters.currency) &&
        isDateInRange_(event.event_date || event.created_at, range.dateFrom, range.dateTo);
    })
    .map(function(event) {
      return pickFields_(event, [
        'event_id',
        'event_date',
        'event_type',
        'cashbox_id',
        'currency',
        'direction',
        'amount',
        'reversal_of_event_id',
        'description',
        'status',
        'posted_by',
        'posted_at'
      ]);
    })
    .sort(sortByEventDateDesc_);
}

function getAuditExceptionsReport(filters) {
  const scopedFilters = normalizeReportFilters_(filters);
  return []
    .concat(exceptionRows_(SHEET_NAMES.PAYMENT_REQUESTS, 'REJECTED_REQUEST', 'PAYMENT_REQUEST', 'request_id', 'created_at', [
      REQUEST_STATUSES.REJECTED,
      REQUEST_STATUSES.CANCELLED
    ], scopedFilters))
    .concat(exceptionRows_(SHEET_NAMES.PAYMENT_ORDERS, 'PAYMENT_ORDER_EXCEPTION', 'PAYMENT_ORDER', 'order_id', 'created_at', [
      ORDER_STATUSES.REJECTED_BY_CASHIER,
      ORDER_STATUSES.CANCELLED
    ], scopedFilters))
    .concat(exceptionRows_(SHEET_NAMES.DOCUMENTS, 'CANCELLED_DOCUMENT', 'DOCUMENT', 'document_id', 'created_at', [
      DOCUMENT_STATUSES.CANCELLED
    ], scopedFilters))
    .concat(getCorrectionsAndReversalsReport(scopedFilters).map(function(event) {
      return {
        exception_type: event.event_type === CASH_EVENT_TYPES.CORRECTION ? 'CORRECTION_EVENT' : 'REVERSAL_EVENT',
        entity_type: 'CASH_EVENT',
        entity_id: event.event_id,
        date: event.event_date,
        description: event.description,
        status: event.status
      };
    }))
    .concat(getDifferencesReport(scopedFilters).map(function(item) {
      return {
        exception_type: 'DIFFERENCE',
        entity_type: item.source_type,
        entity_id: item.source_id,
        date: item.date,
        description: 'Difference: ' + item.difference,
        status: item.status
      };
    }));
}

function getDateRangeFilter_(filters) {
  return {
    dateFrom: filters && filters.date_from ? normalizeReportDateKey_(filters.date_from) : '',
    dateTo: filters && filters.date_to ? normalizeReportDateKey_(filters.date_to) : ''
  };
}

function isDateInRange_(dateValue, dateFrom, dateTo) {
  if (!dateFrom && !dateTo) {
    return true;
  }
  if (!dateValue) {
    return false;
  }
  const dateKey = normalizeReportDateKey_(dateValue);
  return (!dateFrom || dateKey >= dateFrom) && (!dateTo || dateKey <= dateTo);
}

function safeNumber_(value) {
  const numberValue = Number(value || 0);
  return isFinite(numberValue) ? numberValue : 0;
}

function sortByPriorityAndDate_(left, right) {
  const leftUrgent = left.priority === REQUEST_PRIORITIES.URGENT ? 1 : 0;
  const rightUrgent = right.priority === REQUEST_PRIORITIES.URGENT ? 1 : 0;
  if (leftUrgent !== rightUrgent) {
    return rightUrgent - leftUrgent;
  }
  return toTime_(left.created_at || left.due_date) - toTime_(right.created_at || right.due_date);
}

function getActiveCashboxes_() {
  return listRecords(SHEET_NAMES.CASHBOXES).filter(function(cashbox) {
    return isTruthy_(cashbox.active);
  });
}

function getActiveCurrencies_() {
  return listRecords(SHEET_NAMES.CURRENCIES).filter(function(currency) {
    return isTruthy_(currency.active);
  });
}

function getCashboxName_(cashboxId) {
  const match = findRecordById(SHEET_NAMES.CASHBOXES, 'cashbox_id', cashboxId);
  return match ? match.record.name : cashboxId;
}

function normalizeReportFilters_(filters) {
  const currentUser = assertUserHasRole(REPORT_VIEW_ROLES_);
  const scopedFilters = Object.assign({}, filters || {});
  if (currentUser.role === USER_ROLES.CASHIER && currentUser.default_cashbox_id) {
    if (scopedFilters.cashbox_id && scopedFilters.cashbox_id !== currentUser.default_cashbox_id) {
      throw new Error('Cashier can view only own default cashbox reports.');
    }
    scopedFilters.cashbox_id = currentUser.default_cashbox_id;
  }
  return scopedFilters;
}

function normalizeReportDateKey_(dateValue) {
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
    throw new Error('Invalid date filter: ' + dateValue);
  }
  return Utilities.formatDate(parsed, Session.getScriptTimeZone() || 'Europe/Belgrade', 'yyyy-MM-dd');
}

function pickFields_(record, fields) {
  return fields.reduce(function(result, field) {
    result[field] = record[field];
    return result;
  }, {});
}

function sortByEventDateDesc_(left, right) {
  return toTime_(right.event_date || right.created_at) - toTime_(left.event_date || left.created_at);
}

function sortByClosingDateDesc_(left, right) {
  return toTime_(right.closing_date) - toTime_(left.closing_date);
}

function missingPaymentRequests_(filters) {
  return listRecords(SHEET_NAMES.PAYMENT_REQUESTS)
    .filter(function(record) {
      return record.document_status === DOCUMENT_STATUSES.MISSING &&
        (!filters.currency || record.currency === filters.currency);
    })
    .map(function(record) {
      return {
        entity_type: 'PAYMENT_REQUEST',
        entity_id: record.request_id,
        date: record.created_at,
        description: record.purpose,
        amount: safeNumber_(record.amount),
        currency: record.currency,
        document_status: record.document_status
      };
    });
}

function missingPaymentOrders_(filters) {
  return listRecords(SHEET_NAMES.PAYMENT_ORDERS)
    .filter(function(record) {
      return record.document_status === DOCUMENT_STATUSES.MISSING &&
        (!filters.cashbox_id || record.cashbox_id === filters.cashbox_id) &&
        (!filters.currency || record.currency === filters.currency);
    })
    .map(function(record) {
      return {
        entity_type: 'PAYMENT_ORDER',
        entity_id: record.order_id,
        date: record.created_at,
        description: record.purpose,
        amount: safeNumber_(record.amount_ordered),
        currency: record.currency,
        document_status: record.document_status
      };
    });
}

function missingCashEvents_(filters) {
  return listRecords(SHEET_NAMES.CASH_EVENTS)
    .filter(function(record) {
      return record.document_status === DOCUMENT_STATUSES.MISSING &&
        (!filters.cashbox_id || record.cashbox_id === filters.cashbox_id) &&
        (!filters.currency || record.currency === filters.currency);
    })
    .map(function(record) {
      return {
        entity_type: 'CASH_EVENT',
        entity_id: record.event_id,
        date: record.event_date,
        description: record.description,
        amount: safeNumber_(record.amount),
        currency: record.currency,
        document_status: record.document_status
      };
    });
}

function missingGenericEntities_(sheetName, entityType, idField, dateField, filters) {
  const headers = getConfiguredHeaders_(sheetName);
  if (headers.indexOf('document_status') === -1) {
    return [];
  }
  return listRecords(sheetName)
    .filter(function(record) {
      return record.document_status === DOCUMENT_STATUSES.MISSING &&
        (!filters.cashbox_id || record.cashbox_id === filters.cashbox_id) &&
        (!filters.currency || record.currency === filters.currency);
    })
    .map(function(record) {
      return {
        entity_type: entityType,
        entity_id: record[idField],
        date: record[dateField],
        description: record.note || '',
        amount: '',
        currency: record.currency || '',
        document_status: record.document_status
      };
    });
}

function getOpenShiftsReport_(filters) {
  return listRecords(SHEET_NAMES.SHIFTS, { status: SHIFT_STATUSES.OPEN })
    .filter(function(shift) {
      return !filters.cashbox_id || shift.cashbox_id === filters.cashbox_id;
    });
}

function hasShiftDifference_(shift) {
  if (!shift.difference_json) {
    return false;
  }
  try {
    const difference = typeof shift.difference_json === 'object'
      ? shift.difference_json
      : JSON.parse(shift.difference_json);
    return Object.keys(difference || {}).some(function(currency) {
      return Math.abs(safeNumber_(difference[currency])) > 0.000001;
    });
  } catch (error) {
    return true;
  }
}

function exceptionRows_(sheetName, exceptionType, entityType, idField, dateField, statuses, filters) {
  const range = getDateRangeFilter_(filters);
  return listRecords(sheetName)
    .filter(function(record) {
      return statuses.indexOf(record.status) !== -1 &&
        isDateInRange_(record[dateField], range.dateFrom, range.dateTo);
    })
    .map(function(record) {
      return {
        exception_type: exceptionType,
        entity_type: entityType,
        entity_id: record[idField],
        date: record[dateField],
        description: record.purpose || record.note || record.file_name || '',
        status: record.status
      };
    });
}
