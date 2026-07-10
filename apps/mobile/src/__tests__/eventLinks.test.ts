import {
  getMapsSearchUrl,
  getMeetingLinkLabel,
  isValidMeetingLink,
} from "../utils/eventLinks";

describe("isValidMeetingLink", () => {
  it("accepts https meeting links", () => {
    expect(isValidMeetingLink("https://meet.google.com/abc-defg-hij")).toBe(
      true,
    );
    expect(isValidMeetingLink("https://us02web.zoom.us/j/1234567890")).toBe(
      true,
    );
    expect(isValidMeetingLink("  https://teams.microsoft.com/l/meetup ")).toBe(
      true,
    );
  });

  it("rejects non-https or malformed values", () => {
    expect(isValidMeetingLink("http://meet.google.com/abc")).toBe(false);
    expect(isValidMeetingLink("meet.google.com/abc")).toBe(false);
    expect(isValidMeetingLink(["javascript", "alert(1)"].join(":"))).toBe(
      false,
    );
    expect(isValidMeetingLink("https://")).toBe(false);
    expect(isValidMeetingLink("")).toBe(false);
  });
});

describe("getMeetingLinkLabel", () => {
  it("labels known providers", () => {
    expect(getMeetingLinkLabel("https://meet.google.com/abc-defg-hij")).toBe(
      "Join on Google Meet",
    );
    expect(getMeetingLinkLabel("https://us02web.zoom.us/j/123")).toBe(
      "Join on Zoom",
    );
    expect(
      getMeetingLinkLabel("https://teams.microsoft.com/l/meetup-join/xyz"),
    ).toBe("Join on Microsoft Teams");
    expect(getMeetingLinkLabel("https://tiwani.webex.com/meet/room")).toBe(
      "Join on Webex",
    );
  });

  it("falls back to a generic label", () => {
    expect(getMeetingLinkLabel("https://example.com/call")).toBe(
      "Join Meeting",
    );
    expect(getMeetingLinkLabel("not a url")).toBe("Join Meeting");
  });
});

describe("getMapsSearchUrl", () => {
  it("builds a Google Maps search link with the encoded location", () => {
    const url = getMapsSearchUrl("Community Hall, 12 Adeyemi St");
    expect(url).toContain("https://www.google.com/maps/search/");
    expect(url).toContain(encodeURIComponent("Community Hall, 12 Adeyemi St"));
  });
});
