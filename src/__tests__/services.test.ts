import { updateEvent } from "../services/eventsService";
import { recordPayment } from "../services/financeService";
import { deleteListing, updateListing } from "../services/marketplaceService";

describe("service guardrails", () => {
  it("rejects missing event updates", async () => {
    await expect(updateEvent("missing-event", { title: "Nope" })).rejects.toThrow(
      "Event not found.",
    );
  });

  it("rejects missing listing updates and deletes", async () => {
    await expect(updateListing("missing-listing", { title: "Nope" })).rejects.toThrow(
      "Listing not found.",
    );
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
