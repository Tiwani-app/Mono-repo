import { LedgerEntry } from "../types/finance";

const loadIsolatedFinanceService =
  (): typeof import("../services/financeService") => {
    let service: typeof import("../services/financeService") | undefined;
    jest.isolateModules(() => {
      service = require("../services/financeService");
    });
    return service as typeof import("../services/financeService");
  };

describe("finance workflows", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("filters ledger subscriptions by member id", () => {
    const service = loadIsolatedFinanceService();
    const allSnapshots: LedgerEntry[][] = [];
    const memberSnapshots: LedgerEntry[][] = [];

    const unsubscribeAll = service.subscribeToLedger(null, entries =>
      allSnapshots.push(entries),
    );
    const unsubscribeMember = service.subscribeToLedger("member-1", entries =>
      memberSnapshots.push(entries),
    );

    expect(allSnapshots.at(-1)?.length).toBeGreaterThan(
      memberSnapshots.at(-1)?.length ?? 0,
    );
    expect(memberSnapshots.at(-1)?.every(entry => entry.uid === "member-1")).toBe(
      true,
    );

    unsubscribeAll();
    unsubscribeMember();
  });

  it("creates a dues period and unpaid dues rows for active members", async () => {
    const service = loadIsolatedFinanceService();
    const snapshots: LedgerEntry[][] = [];
    const unsubscribe = service.subscribeToLedger(null, entries =>
      snapshots.push(entries),
    );

    await service.createDuesPeriod({
      name: "Q3 2026 Dues",
      amount: 20000,
      dueDate: new Date("2026-09-30"),
      status: "active",
    });

    const duesPeriods = await service.getDuesPeriods();
    const createdPeriod = duesPeriods.find(period => period.name === "Q3 2026 Dues");
    const createdRows = snapshots
      .at(-1)
      ?.filter(entry => entry.label === "Q3 2026 Dues");

    expect(createdPeriod).toMatchObject({
      amount: 20000,
      status: "active",
      totalMembers: 3,
      paidCount: 0,
    });
    expect(createdRows).toHaveLength(3);
    expect(createdRows?.every(entry => entry.type === "dues" && !entry.paid)).toBe(
      true,
    );

    unsubscribe();
  });

  it("creates ad hoc charges for selected members", async () => {
    const service = loadIsolatedFinanceService();
    const memberSnapshots: LedgerEntry[][] = [];
    const unsubscribe = service.subscribeToLedger("member-1", entries =>
      memberSnapshots.push(entries),
    );

    await service.createAdHocCharge({
      memberIds: ["member-1"],
      type: "levy",
      label: "Hall Renovation Levy",
      amount: 5000,
      dueDate: new Date("2026-07-15"),
      note: "One-off levy",
    });

    const charge = memberSnapshots
      .at(-1)
      ?.find(entry => entry.label === "Hall Renovation Levy");
    expect(charge).toMatchObject({
      uid: "member-1",
      type: "levy",
      amount: 5000,
      paid: false,
      note: "One-off levy",
    });

    unsubscribe();
  });

  it("records a payment, marks matching unpaid charges paid, and refreshes dues counts", async () => {
    const service = loadIsolatedFinanceService();
    const memberSnapshots: LedgerEntry[][] = [];
    const unsubscribe = service.subscribeToLedger("member-1", entries =>
      memberSnapshots.push(entries),
    );

    await service.recordPayment({
      uid: "member-1",
      amount: 15000,
      paymentMethod: "Bank transfer",
      reference: "PAY-001",
      note: "Q2 settlement",
    });

    const latestLedger = memberSnapshots.at(-1) ?? [];
    const payment = latestLedger.find(entry => entry.type === "payment");
    const paidDues = latestLedger.find(entry => entry.id === "ledger-1");
    const duesPeriod = (await service.getDuesPeriods()).find(
      period => period.id === "dues-1",
    );

    expect(payment).toMatchObject({
      uid: "member-1",
      amount: 15000,
      paymentMethod: "Bank transfer",
      reference: "PAY-001",
      note: "Q2 settlement",
    });
    expect(paidDues).toMatchObject({
      paid: true,
      paymentMethod: "Bank transfer",
      reference: "PAY-001",
    });
    expect(paidDues?.paidAt).toBeInstanceOf(Date);
    expect(duesPeriod?.paidCount).toBe(2);

    unsubscribe();
  });

  it("rejects ad hoc charges for unknown members", async () => {
    const service = loadIsolatedFinanceService();

    await expect(
      service.createAdHocCharge({
        memberIds: ["missing-member"],
        type: "fine",
        label: "Late Fine",
        amount: 1000,
        dueDate: null,
        note: "",
      }),
    ).rejects.toThrow("One or more selected members could not be found.");
  });

  it("rejects invalid finance writes at the service boundary", async () => {
    const service = loadIsolatedFinanceService();

    await expect(
      service.createDuesPeriod({
        name: "",
        amount: 20000,
        dueDate: new Date("2026-09-30"),
        status: "active",
      }),
    ).rejects.toThrow("Dues period name is required.");

    await expect(
      service.createDuesPeriod({
        name: "Bad Dues",
        amount: 0,
        dueDate: new Date("2026-09-30"),
        status: "active",
      }),
    ).rejects.toThrow("Dues amount must be greater than zero.");

    await expect(
      service.createAdHocCharge({
        memberIds: [],
        type: "levy",
        label: "Empty Charge",
        amount: 1000,
        dueDate: null,
        note: "",
      }),
    ).rejects.toThrow("Select at least one member for this charge.");

    await expect(
      service.createAdHocCharge({
        memberIds: ["member-1"],
        type: "payment",
        label: "Invalid Type",
        amount: 1000,
        dueDate: null,
        note: "",
      }),
    ).rejects.toThrow("Charges cannot use payment as their type.");

    await expect(
      service.recordPayment({
        uid: "member-1",
        amount: 0,
        paymentMethod: "Bank transfer",
        reference: "PAY-000",
        note: "",
      }),
    ).rejects.toThrow("Payment amount must be greater than zero.");

    await expect(
      service.recordPayment({
        uid: "member-1",
        amount: 1000,
        paymentMethod: " ",
        reference: "PAY-000",
        note: "",
      }),
    ).rejects.toThrow("Payment method is required.");
  });
});
