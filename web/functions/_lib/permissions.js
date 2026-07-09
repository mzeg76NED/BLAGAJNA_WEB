import { supabaseRest } from './supabase.js';

export const USER_ROLES = [
  'ADMIN',
  'DIRECTOR',
  'FINANCE',
  'CASHIER_SUPERVISOR',
  'CASHIER',
  'APPROVER',
  'REQUESTER',
  'VIEWER'
];

export async function getAllPermissionIds(env) {
  const rows = await supabaseRest(env, '/permissions?select=permission_id&active=eq.true&order=permission_id.asc');
  return (rows || []).map((row) => row.permission_id).filter(Boolean);
}

export async function getRolePermissionsMatrix(env) {
  const allPermissions = await getAllPermissionIds(env);
  const rows = await supabaseRest(env, '/role_permissions?select=role_id,permission_id&allowed=eq.true');
  const matrix = {};
  USER_ROLES.forEach((role) => {
    matrix[role] = [];
  });
  (rows || []).forEach((row) => {
    if (!matrix[row.role_id]) matrix[row.role_id] = [];
    if (!matrix[row.role_id].includes(row.permission_id)) {
      matrix[row.role_id].push(row.permission_id);
    }
  });
  matrix.ADMIN = allPermissions.slice();
  return matrix;
}

export async function getPrivilegesForRole(env, role) {
  if (role === 'ADMIN') return getAllPermissionIds(env);
  const matrix = await getRolePermissionsMatrix(env);
  return matrix[role] || [];
}
