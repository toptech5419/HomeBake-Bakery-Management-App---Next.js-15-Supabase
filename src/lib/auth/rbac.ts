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
  // Only owners can view users
  return isOwner(user);
}
export function canEditUser(user?: User, target?: User) {
  // Only owners can edit users
  return isOwner(user);
}
export function canInvite(user?: User) {
  return isOwner(user);
} 