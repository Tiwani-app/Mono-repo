import { TiwaniEvent } from "../types/event";

const loadIsolatedEventsService =
  (): typeof import("../services/eventsService") => {
    let service: typeof import("../services/eventsService") | undefined;
    jest.isolateModules(() => {
      service = require("../services/eventsService");
    });
    return service as typeof import("../services/eventsService");
  };

describe("event workflows", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("creates, updates, and cancels events", async () => {
    const service = loadIsolatedEventsService();
    const snapshots: TiwaniEvent[][] = [];
    const unsubscribe = service.subscribeToEvents((events) =>
      snapshots.push(events),
    );

    const created = await service.createEvent({
      title: "Committee Dinner",
      description: "Planning dinner.",
      category: "committee",
      dateTime: new Date("2026-08-01T18:00:00+01:00"),
      location: "Lagos",
      capacity: 20,
      status: "draft",
    });

    expect(snapshots.at(-1)?.some((event) => event.id === created.id)).toBe(
      true,
    );
    expect(created.rsvpCount).toBe(0);

    await service.updateEvent(created.id, {
      title: "Committee Dinner Updated",
      status: "published",
    });
    expect((await service.getEvent(created.id)).title).toBe(
      "Committee Dinner Updated",
    );

    await service.cancelEvent(created.id);
    expect((await service.getEvent(created.id)).status).toBe("cancelled");

    unsubscribe();
  });

  it("validates event create and update input", async () => {
    const service = loadIsolatedEventsService();

    await expect(
      service.createEvent({
        title: " ",
        description: "Planning dinner.",
        category: "committee",
        dateTime: new Date("2026-08-01T18:00:00+01:00"),
        location: "Lagos",
        capacity: 20,
        status: "draft",
      }),
    ).rejects.toThrow("Event title is required.");

    await expect(
      service.createEvent({
        title: "Committee Dinner",
        description: "Planning dinner.",
        category: "committee",
        dateTime: new Date("invalid"),
        location: "Lagos",
        capacity: 20,
        status: "draft",
      }),
    ).rejects.toThrow("Event date and time are required.");

    await expect(
      service.updateEvent("event-1", { capacity: -1 }),
    ).rejects.toThrow(
      "Event capacity must be zero or a positive whole number.",
    );
  });

  it("toggles RSVP and removes check-in when RSVP is undone", async () => {
    const service = loadIsolatedEventsService();

    await service.toggleRsvp("event-1", "member-extra");
    const rsvpedEvent = await service.getEvent("event-1");
    expect(rsvpedEvent.rsvpList).toContain("member-extra");
    expect(rsvpedEvent.rsvpCount).toBe(rsvpedEvent.rsvpList.length);

    await service.checkInAttendee("event-1", "member-extra");
    expect((await service.getEvent("event-1")).attendees).toContain(
      "member-extra",
    );

    await service.toggleRsvp("event-1", "member-extra");
    const event = await service.getEvent("event-1");
    expect(event.rsvpList).not.toContain("member-extra");
    expect(event.attendees).not.toContain("member-extra");
    expect(event.rsvpCount).toBe(event.rsvpList.length);
  });

  it("returns attendee display data with checked-in state", async () => {
    const service = loadIsolatedEventsService();

    const attendees = await service.getEventAttendees("event-2");
    expect(
      attendees.find((attendee) => attendee.uid === "member-1"),
    ).toMatchObject({
      fullName: "Tiwalade Adebayo",
      email: "member@tiwani.app",
      checkedIn: true,
    });
    expect(
      attendees.find((attendee) => attendee.uid === "chair-1"),
    ).toMatchObject({
      fullName: "Nkiru Okafor",
      checkedIn: false,
    });
  });

  it("rejects check-in for members who did not RSVP", async () => {
    const service = loadIsolatedEventsService();

    await expect(
      service.checkInAttendee("event-1", "not-rsvped"),
    ).rejects.toThrow("Only RSVP attendees can be checked in.");
  });

  it("rejects new RSVPs when event is closed or full", async () => {
    const service = loadIsolatedEventsService();

    const fullEvent = await service.createEvent({
      title: "Small Dinner",
      description: "One seat only.",
      category: "social",
      dateTime: new Date("2026-09-01T18:00:00+01:00"),
      location: "Lagos",
      capacity: 1,
      status: "published",
    });

    await service.toggleRsvp(fullEvent.id, "member-1");
    await expect(service.toggleRsvp(fullEvent.id, "member-2")).rejects.toThrow(
      "This event is full.",
    );

    const draftEvent = await service.createEvent({
      title: "Draft Meeting",
      description: "Not ready.",
      category: "meeting",
      dateTime: new Date("2026-10-01T10:00:00+01:00"),
      location: "Lagos",
      capacity: 0,
      status: "draft",
    });
    await expect(service.toggleRsvp(draftEvent.id, "member-1")).rejects.toThrow(
      "RSVP is not available for this event.",
    );
  });
});
