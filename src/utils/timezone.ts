export const getUserTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};
