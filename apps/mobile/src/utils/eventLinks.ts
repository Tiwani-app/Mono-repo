// React Native's URL implementation is incomplete, so parse the hostname
// manually: strip any userinfo (user@host) and port before matching.
const getHttpsHostname = (value: string): string | null => {
  const match = /^https:\/\/([^/?#\s]+)\S*$/i.exec(value.trim());
  if (!match) {
    return null;
  }
  const host = (match[1].split("@").pop() ?? "").split(":")[0].toLowerCase();
  return host || null;
};

export const isValidMeetingLink = (value: string): boolean =>
  getHttpsHostname(value) !== null;

const MEETING_PROVIDERS: { pattern: RegExp; label: string }[] = [
  { pattern: /(^|\.)meet\.google\.com$/, label: "Join on Google Meet" },
  { pattern: /(^|\.)zoom\.(us|com)$/, label: "Join on Zoom" },
  {
    pattern: /(^|\.)teams\.(microsoft|live)\.com$/,
    label: "Join on Microsoft Teams",
  },
  { pattern: /(^|\.)webex\.com$/, label: "Join on Webex" },
];

export const getMeetingLinkLabel = (url: string): string => {
  const hostname = getHttpsHostname(url);
  if (!hostname) {
    return "Join Meeting";
  }
  return (
    MEETING_PROVIDERS.find(({ pattern }) => pattern.test(hostname))?.label ??
    "Join Meeting"
  );
};

// Google Maps works for both iOS and Android; the universal link opens the
// Google Maps app when installed and falls back to the browser.
export const getMapsSearchUrl = (location: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.trim())}`;
