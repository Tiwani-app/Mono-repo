import { eventFromRecord } from "../services/converters/eventConverter";
import { ledgerEntryFromRecord } from "../services/converters/financeConverter";
import { notificationFromRecord } from "../services/converters/notificationConverter";
import { userFromRecord } from "../services/converters/userConverter";
import {
  electionFromRecord,
  pollFromRecord,
} from "../services/converters/votingConverter";

describe("backend converters", () => {
  it("fails fast when required event fields are missing", () => {
    expect(() =>
      eventFromRecord({
        id: "event-1",
        title: "Meeting",
        description: "Monthly meeting",
        category: "meeting",
        location: "Clubhouse",
        createdBy: "admin-1",
        status: "published",
        rsvpList: [],
        rsvpCount: 0,
        capacity: 40,
      }),
    ).toThrow('Field "dateTime" must be a valid date.');
  });

  it("fails fast on legacy event status values instead of coercing them", () => {
    expect(() =>
      eventFromRecord({
        id: "event-1",
        title: "Meeting",
        description: "Monthly meeting",
        category: "meeting",
        startTime: new Date("2026-07-01T10:00:00.000Z"),
        location: "Clubhouse",
        createdBy: "admin-1",
        status: "upcoming",
        rsvpList: [],
        rsvpCount: 0,
        capacity: 40,
      }),
    ).toThrow('Field "status" has an unsupported value.');
  });

  it("defaults event reminder settings to enabled for older records", () => {
    expect(
      eventFromRecord({
        id: "event-1",
        title: "Meeting",
        description: "Monthly meeting",
        category: "meeting",
        startTime: new Date("2026-07-01T10:00:00.000Z"),
        location: "Clubhouse",
        createdBy: "admin-1",
        status: "published",
        rsvpList: [],
        rsvpCount: 0,
        capacity: 40,
        attendeeList: [],
      }),
    ).toMatchObject({
      dayReminderEnabled: true,
      hourReminderEnabled: true,
    });
  });

  it("preserves explicit event reminder settings from backend records", () => {
    expect(
      eventFromRecord({
        id: "event-2",
        title: "Meeting",
        description: "Monthly meeting",
        category: "meeting",
        startTime: new Date("2026-07-01T10:00:00.000Z"),
        location: "Clubhouse",
        createdBy: "admin-1",
        status: "published",
        rsvpList: [],
        rsvpCount: 0,
        capacity: 40,
        attendeeList: [],
        dayReminderEnabled: false,
        hourReminderEnabled: true,
      }),
    ).toMatchObject({
      dayReminderEnabled: false,
      hourReminderEnabled: true,
    });
  });

  it("fails fast on unsupported required enum values", () => {
    expect(() =>
      userFromRecord({
        id: "member-1",
        fullName: "Test Member",
        email: "member@example.com",
        phone: "555-0100",
        role: "owner",
        status: "active",
        financialStatus: "green",
        outstandingBalance: 0,
        maritalStatus: "single",
        memberSince: "2026-01-01",
      }),
    ).toThrow('Field "role" has an unsupported value.');
  });

  it("keeps optional profile fields nullable without hiding required failures", () => {
    expect(
      userFromRecord({
        id: "member-1",
        fullName: "Test Member",
        email: "member@example.com",
        phone: "555-0100",
        photoURL: null,
        role: "member",
        status: "active",
        financialStatus: "green",
        outstandingBalance: 0,
        maritalStatus: "single",
        memberSince: "2026-01-01",
      }),
    ).toMatchObject({
      photoURL: null,
      children: [],
      currencySymbol: "$",
    });
  });

  it("allows existing member profiles to omit a phone number", () => {
    expect(
      userFromRecord({
        id: "member-1",
        fullName: "Test Member",
        email: "member@example.com",
        role: "member",
        status: "active",
        financialStatus: "green",
        outstandingBalance: 0,
        maritalStatus: "single",
        memberSince: "2026-01-01",
      }),
    ).toMatchObject({
      phone: "",
    });
  });

  it("keeps malformed saved child records from crashing member subscriptions", () => {
    expect(
      userFromRecord({
        id: "member-1",
        fullName: "Test Member",
        email: "member@example.com",
        role: "member",
        status: "active",
        financialStatus: "green",
        outstandingBalance: 0,
        maritalStatus: "single",
        memberSince: "2026-01-01",
        children: [{ name: "", dateOfBirth: "2020-03-04" }],
      }),
    ).toMatchObject({
      children: [{ name: "Child 1", dateOfBirth: "2020-03-04" }],
    });
  });

  it("uses a temporary date for pending notification server timestamps", () => {
    const before = Date.now();
    const notification = notificationFromRecord({
      id: "notif-1",
      type: "general",
      title: "Announcement",
      body: "Saved locally while the server timestamp is pending.",
      sentAt: null,
    });
    const after = Date.now();

    expect(notification.sentAt).toBeInstanceOf(Date);
    expect(notification.sentAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(notification.sentAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("preserves finance settlement fields from backend records", () => {
    expect(
      ledgerEntryFromRecord({
        id: "finance-1",
        memberId: "member-1",
        type: "dues",
        label: "Q3 2026 Dues",
        amount: 5000,
        amountPaid: 2500,
        paidStatus: "partial",
        dueDate: new Date("2026-08-01"),
      }),
    ).toMatchObject({
      amountPaid: 2500,
      paid: false,
      paidStatus: "partial",
    });
  });

  it("keeps voting expiry dates nullable for older records", () => {
    expect(
      pollFromRecord({
        id: "poll-1",
        title: "Theme",
        question: "Which theme?",
        options: [],
        status: "open",
        totalVotes: 0,
        resultVisibility: "after_vote",
      }),
    ).toMatchObject({ expiresAt: null });
  });

  it("preserves voting expiry dates when present", () => {
    const expiresAt = new Date("2026-12-31T23:59:59.000Z");

    expect(
      electionFromRecord({
        id: "election-1",
        title: "Election",
        ballotType: "secret",
        races: [],
        status: "open",
        resultVisibility: "after_close",
        expiresAt,
      }),
    ).toMatchObject({ expiresAt });
  });
});
