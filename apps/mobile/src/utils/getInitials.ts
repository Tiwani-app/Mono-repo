export const getInitials = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0][0].toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};
