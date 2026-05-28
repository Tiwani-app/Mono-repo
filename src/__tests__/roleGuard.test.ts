import { User } from "../types/user";
import { isAdmin } from "../utils/roleGuard";

const baseUser: User = {
  uid: "user-1",
  fullName: "Ada Member",
  email: "ada@example.com",
  phone: "123",
  photoURL: null,
  role: "member",
  status: "active",
  financialStatus: "green",
  outstandingBalance: 0,
  address: "",
  maritalStatus: "single",
  dateOfBirth: "",
  spouseName: null,
  spouseDateOfBirth: null,
  weddingAnniversary: null,
  children: [],
  memberSince: "2026-01-01",
  notificationPreferences: { events: true, finance: true, voting: true },
  currencySymbol: "$",
  timezone: "America/New_York",
};

describe("role guards", () => {
  it("only treats admin users as admins", () => {
    expect(isAdmin({ ...baseUser, role: "admin" })).toBe(true);
    expect(isAdmin({ ...baseUser, role: "member" })).toBe(false);
    expect(isAdmin({ ...baseUser, role: "electoral_chairman" })).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });
});
