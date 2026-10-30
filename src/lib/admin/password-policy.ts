export function validateAdminPassword(password: string, confirm?: string) {
  if (!password || password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }
  if (confirm !== undefined && password !== confirm) return 'Passwords do not match.';
  return null;
}
