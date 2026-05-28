import { updateEvent } from "../services/eventsService";
import { recordPayment } from "../services/financeService";
import { deleteListing, updateListing } from "../services/marketplaceService";
import { signIn, sendPasswordReset } from "../services/authService";

describe("service guardrails", () => {
  it("validates mock auth sign-in and reset requests", async () => {
    await expect(signIn("not-an-email", "password")).rejects.toMatchObject({
      code: "auth/invalid-email",
    });
    await expect(signIn("admin@tiwani.app", "wrongpass")).rejects.toMatchObject(
      {
        code: "auth/wrong-password",
      },
    );
    await expect(
      sendPasswordReset("missing@example.com"),
    ).rejects.toMatchObject({
      code: "auth/user-not-found",
    });

    await expect(signIn("admin@tiwani.app", "password")).resolves.toMatchObject(
      {
        uid: "admin-1",
      },
    );
  });

  it("blocks pending mock auth accounts", async () => {
    let service: typeof import("../services/authService") | undefined;
    jest.isolateModules(() => {
      const { mockUsers } = require("../services/mockData");
      mockUsers.push({
        ...mockUsers[0],
        uid: "pending-user",
        email: "pending@tiwani.app",
        status: "pending",
      });
      service = require("../services/authService");
    });

    await expect(
      service?.signIn("pending@tiwani.app", "password"),
    ).rejects.toMatchObject({ code: "auth/account-pending" });
  });

  it("rejects missing event updates", async () => {
    await expect(
      updateEvent("missing-event", { title: "Nope" }),
    ).rejects.toThrow("Event not found.");
  });

  it("rejects missing listing updates and deletes", async () => {
    await expect(
      updateListing("missing-listing", { title: "Nope" }),
    ).rejects.toThrow("Listing not found.");
    await expect(deleteListing("missing-listing")).rejects.toThrow(
      "Listing not found.",
    );
  });

  it("rejects payments for unknown members", async () => {
    await expect(
      recordPayment({
        uid: "missing-member",
        amount: 100,
        paymentMethod: "Bank transfer",
        reference: "",
        note: "",
      }),
    ).rejects.toThrow("Member not found.");
  });
});
