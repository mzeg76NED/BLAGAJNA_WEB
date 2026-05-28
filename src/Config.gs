/**
 * Shared configuration constants for BLAGAJNA WEB.
 */
const APP_NAME = 'BLAGAJNA WEB';
const SPREADSHEET_ID = '';

const APP_CONFIG = Object.freeze({
  APP_NAME: APP_NAME,
  VERSION: '0.2.0',
  SPREADSHEET_ID: SPREADSHEET_ID
});

const SHEET_NAMES = Object.freeze({
  USERS: 'USERS',
  CASHBOXES: 'CASHBOXES',
  CURRENCIES: 'CURRENCIES',
  PAYMENT_REQUESTS: 'PAYMENT_REQUESTS',
  PAYMENT_ORDERS: 'PAYMENT_ORDERS',
  CASH_EVENTS: 'CASH_EVENTS',
  DOCUMENTS: 'DOCUMENTS',
  SHIFTS: 'SHIFTS',
  DAILY_CLOSING: 'DAILY_CLOSING',
  AUDIT_LOG: 'AUDIT_LOG'
});

const USER_ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  DIRECTOR: 'DIRECTOR',
  FINANCE: 'FINANCE',
  CASHIER_SUPERVISOR: 'CASHIER_SUPERVISOR',
  CASHIER: 'CASHIER',
  APPROVER: 'APPROVER',
  REQUESTER: 'REQUESTER',
  VIEWER: 'VIEWER'
});

const REQUEST_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CONVERTED_TO_ORDER: 'CONVERTED_TO_ORDER',
  CANCELLED: 'CANCELLED'
});

const ORDER_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  WAITING_PAYMENT: 'WAITING_PAYMENT',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  REJECTED_BY_CASHIER: 'REJECTED_BY_CASHIER',
  CANCELLED: 'CANCELLED',
  CLOSED: 'CLOSED'
});

const CASH_EVENT_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  POSTED: 'POSTED',
  LOCKED: 'LOCKED',
  CANCELLED: 'CANCELLED',
  REVERSED: 'REVERSED'
});

const CASH_EVENT_TYPES = Object.freeze({
  CASH_INFLOW: 'CASH_INFLOW',
  CASH_OUTFLOW: 'CASH_OUTFLOW',
  CASH_TRANSFER_IN: 'CASH_TRANSFER_IN',
  CASH_TRANSFER_OUT: 'CASH_TRANSFER_OUT',
  CORRECTION: 'CORRECTION',
  REVERSAL: 'REVERSAL'
});

const DOCUMENT_STATUSES = Object.freeze({
  NONE: 'NONE',
  MISSING: 'MISSING',
  ATTACHED: 'ATTACHED',
  ACTIVE: 'ACTIVE',
  REPLACED: 'REPLACED',
  CANCELLED: 'CANCELLED'
});

const ENTITY_TYPES = Object.freeze({
  PAYMENT_REQUEST: 'PAYMENT_REQUEST',
  PAYMENT_ORDER: 'PAYMENT_ORDER',
  CASH_EVENT: 'CASH_EVENT',
  SHIFT: 'SHIFT',
  DAILY_CLOSING: 'DAILY_CLOSING'
});

const ENTITY_TABLE_MAP = Object.freeze({
  PAYMENT_REQUEST: Object.freeze({
    sheetName: SHEET_NAMES.PAYMENT_REQUESTS,
    idField: 'request_id'
  }),
  PAYMENT_ORDER: Object.freeze({
    sheetName: SHEET_NAMES.PAYMENT_ORDERS,
    idField: 'order_id'
  }),
  CASH_EVENT: Object.freeze({
    sheetName: SHEET_NAMES.CASH_EVENTS,
    idField: 'event_id'
  }),
  SHIFT: Object.freeze({
    sheetName: SHEET_NAMES.SHIFTS,
    idField: 'shift_id'
  }),
  DAILY_CLOSING: Object.freeze({
    sheetName: SHEET_NAMES.DAILY_CLOSING,
    idField: 'closing_id'
  })
});

const DOCUMENT_ROOT_FOLDER_ID = '';
const DOCUMENT_ROOT_FOLDER_NAME = 'BLAGAJNA_WEB_DOCUMENTS';

const REQUEST_PRIORITIES = Object.freeze({
  NORMAL: 'NORMAL',
  URGENT: 'URGENT'
});

const ORDER_TYPES = Object.freeze({
  FROM_REQUEST: 'FROM_REQUEST',
  DIRECT_ORDER: 'DIRECT_ORDER'
});

const SHIFT_STATUSES = Object.freeze({
  OPEN: 'OPEN',
  HANDED_OVER: 'HANDED_OVER',
  CLOSED: 'CLOSED',
  CLOSED_WITH_DIFFERENCE: 'CLOSED_WITH_DIFFERENCE',
  CANCELLED: 'CANCELLED'
});

const DAILY_CLOSING_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  CLOSED: 'CLOSED',
  CLOSED_WITH_DIFFERENCE: 'CLOSED_WITH_DIFFERENCE',
  LOCKED: 'LOCKED'
});

const AUDIT_ACTIONS = Object.freeze({
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  SUBMIT: 'SUBMIT',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  CANCEL: 'CANCEL',
  POST: 'POST',
  LOCK: 'LOCK',
  REVERSE: 'REVERSE'
});

const SUPPORTED_CURRENCIES = Object.freeze(['RSD', 'EUR']);

const TABLE_HEADERS = Object.freeze({
  USERS: Object.freeze([
    'user_id',
    'email',
    'full_name',
    'role',
    'active',
    'default_cashbox_id',
    'created_at',
    'updated_at'
  ]),
  CASHBOXES: Object.freeze([
    'cashbox_id',
    'name',
    'location',
    'responsible_user_id',
    'active',
    'created_at',
    'updated_at'
  ]),
  CURRENCIES: Object.freeze([
    'currency_code',
    'name',
    'active',
    'is_default'
  ]),
  PAYMENT_REQUESTS: Object.freeze([
    'request_id',
    'created_at',
    'created_by',
    'requester_user_id',
    'requested_for_name',
    'amount',
    'currency',
    'purpose',
    'description',
    'preferred_cashbox_id',
    'needed_by_date',
    'priority',
    'status',
    'reviewed_by',
    'reviewed_at',
    'rejection_reason',
    'linked_order_id',
    'document_status',
    'updated_at'
  ]),
  PAYMENT_ORDERS: Object.freeze([
    'order_id',
    'created_at',
    'created_by',
    'source_request_id',
    'order_type',
    'cashbox_id',
    'pay_to_name',
    'amount_ordered',
    'amount_paid',
    'currency',
    'purpose',
    'description',
    'due_date',
    'priority',
    'status',
    'issued_by',
    'issued_at',
    'executed_by',
    'executed_at',
    'linked_cash_event_id',
    'document_status',
    'cancellation_reason',
    'cashier_rejection_reason',
    'updated_at'
  ]),
  CASH_EVENTS: Object.freeze([
    'event_id',
    'created_at',
    'created_by',
    'event_date',
    'event_type',
    'cashbox_id',
    'currency',
    'direction',
    'amount',
    'linked_request_id',
    'linked_order_id',
    'partner_name',
    'description',
    'document_status',
    'status',
    'posted_by',
    'posted_at',
    'locked_by',
    'locked_at',
    'reversal_of_event_id',
    'updated_at'
  ]),
  DOCUMENTS: Object.freeze([
    'document_id',
    'created_at',
    'uploaded_by',
    'entity_type',
    'entity_id',
    'file_name',
    'file_id',
    'file_url',
    'mime_type',
    'status',
    'note'
  ]),
  SHIFTS: Object.freeze([
    'shift_id',
    'cashbox_id',
    'opened_by',
    'opened_at',
    'opening_note',
    'opening_balance_json',
    'closed_by',
    'closed_at',
    'handover_to',
    'handover_at',
    'closing_balance_json',
    'physical_balance_json',
    'difference_json',
    'status',
    'note',
    'updated_at'
  ]),
  DAILY_CLOSING: Object.freeze([
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
    'closed_at',
    'note'
  ]),
  AUDIT_LOG: Object.freeze([
    'log_id',
    'timestamp',
    'user',
    'action',
    'entity_type',
    'entity_id',
    'old_value',
    'new_value',
    'comment'
  ])
});
