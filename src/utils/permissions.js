// permissions.js

export function getUser() {
  return JSON.parse(localStorage.getItem('user') || '{}');
}

export function isAdmin() {
  const user = getUser();
  return user.role === 'admin';
}

export function isDining() {
  const user = getUser();
  return user.role === 'dining';
}

export function isVendor() {
  const user = getUser();
  return user.role === 'vendor';
}

export function isBusiness() {
  const user = getUser();
  return user.role === 'business';
}

export function isGroup() {
  const user = getUser();
  return user.role === 'group';
}

export function hasGroupAccess() {
  const user = getUser();
  return ['group', 'business', 'admin'].includes(user.role);
}
