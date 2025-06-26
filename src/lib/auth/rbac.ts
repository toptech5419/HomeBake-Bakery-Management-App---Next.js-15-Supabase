export type Role = 'owner' | 'manager' | 'sales_rep';
export interface User {
  id: string;
  email: string;
  role: Role;
}

export function isOwner(user?: User) {
  return user?.role === 'owner';
}
export function isManager(user?: User) {
  return user?.role === 'manager';
}
export function isSalesRep(user?: User) {
  return user?.role === 'sales_rep';
}
export function canViewUsers(user?: User) {
  return isOwner(user) || isManager(user);
}
export function canEditUser(user?: User, target?: User) {
  // Owners can edit anyone, managers can edit sales reps
  if (isOwner(user)) return true;
  if (isManager(user) && target?.role === 'sales_rep') return true;
  return false;
}
export function canInvite(user?: User) {
  return isOwner(user);
} 