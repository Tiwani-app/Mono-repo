import { firebaseFunctions, requireFirebaseApp } from "../config/firebase";
import type { Role } from "../types/user";
import type {
  MemberInput,
} from "./membersService";
import type {
  ChargeInput,
  DuesPeriodInput,
  PaymentInput,
} from "./financeService";
import type {
  ElectionInput,
  ElectionVoterReceiptPayload,
  PollInput,
  RaceResult,
} from "./votingService";
import type {
  SendAnnouncementInput,
  SendAnnouncementResult,
} from "./notificationsService";

export interface SetupDeliveryResult {
  setupEmailError: string | null;
  setupEmailSent: boolean;
  setupLink: string | null;
}

export interface CallableResult<TResponse> {
  data: TResponse;
}

export const callCloudFunction = async <TRequest, TResponse>(
  name: string,
  payload: TRequest,
): Promise<TResponse> => {
  requireFirebaseApp();
  const callable = firebaseFunctions().httpsCallable<TRequest, TResponse>(name);
  const result = (await callable(payload)) as CallableResult<TResponse>;
  return result.data;
};

export const requestAccountDeletionCallable = (reason: string) =>
  callCloudFunction<{ reason: string }, { ok: boolean; requestId: string }>(
    "requestAccountDeletion",
    { reason },
  );

export const completeAccountDeletionCallable = (requestId: string) =>
  callCloudFunction<
    { requestId: string },
    {
      authDeleted: boolean;
      ok: boolean;
      profileAnonymized: boolean;
      requestId: string;
      tokenCount: number;
    }
  >("completeAccountDeletion", { requestId });

export const declineJoinRequestCallable = (requestId: string) =>
  callCloudFunction<{ requestId: string }, { ok: boolean; requestId: string }>(
    "declineJoinRequest",
    { requestId },
  );

export const approveJoinRequestCallable = (requestId: string) =>
  callCloudFunction<
    { requestId: string },
    { ok: boolean; requestId: string; uid: string } & SetupDeliveryResult
  >("approveJoinRequest", { requestId });

export const createMemberAccountCallable = (data: MemberInput) =>
  callCloudFunction<
    MemberInput,
    { ok: boolean; uid: string } & SetupDeliveryResult
  >("createMemberAccount", data);

export const suspendMemberCallable = (uid: string) =>
  callCloudFunction<{ uid: string }, { ok: boolean; status: "suspended"; uid: string }>(
    "suspendMember",
    { uid },
  );

export const reactivateMemberCallable = (uid: string) =>
  callCloudFunction<{ uid: string }, { ok: boolean; status: "active"; uid: string }>(
    "reactivateMember",
    { uid },
  );

export const updateMemberRoleCallable = (uid: string, role: Role) =>
  callCloudFunction<{ role: Role; uid: string }, { ok: boolean; role: Role; uid: string }>(
    "updateMemberRole",
    { role, uid },
  );

export const createFinancePeriodCallable = (data: DuesPeriodInput) =>
  callCloudFunction<
    {
      amount: number;
      dueDate: string;
      name: string;
      status: DuesPeriodInput["status"];
    },
    { chargedMembers: number; ok: boolean; periodId: string }
  >("createFinancePeriod", {
    amount: data.amount,
    dueDate: data.dueDate.toISOString(),
    name: data.name,
    status: data.status,
  });

export const createAdHocChargesCallable = (data: ChargeInput) =>
  callCloudFunction<
    {
      amount: number;
      dueDate: string | null;
      label: string;
      memberIds: string[];
      note: string;
      type: ChargeInput["type"];
    },
    { chargedMembers: number; ok: boolean }
  >("createAdHocCharges", {
    amount: data.amount,
    dueDate: data.dueDate ? data.dueDate.toISOString() : null,
    label: data.label,
    memberIds: data.memberIds,
    note: data.note,
    type: data.type,
  });

export const recordPaymentCallable = (data: PaymentInput) =>
  callCloudFunction<PaymentInput, { ok: boolean; paymentId: string }>(
    "recordPayment",
    data,
  );

export const reversePaymentCallable = (paymentId: string, note: string) =>
  callCloudFunction<
    { note: string; paymentId: string },
    { ok: boolean; paymentId: string }
  >("reversePayment", { note, paymentId });

export const recalculateMemberFinanceStandingCallable = (uid: string) =>
  callCloudFunction<
    { uid: string },
    {
      financialStatus: "green" | "red";
      ok: boolean;
      outstandingBalance: number;
      uid: string;
    }
  >("recalculateMemberFinanceStanding", { uid });

export const openPollCallable = (pollId: string) =>
  callCloudFunction<{ pollId: string }, { ok: boolean; pollId: string }>(
    "openPoll",
    { pollId },
  );

export const createPollCallable = (data: PollInput) =>
  callCloudFunction<
    Omit<PollInput, "expiresAt"> & { expiresAt: string | null },
    { ok: boolean; pollId: string }
  >(
    "createPoll",
    {
      ...data,
      expiresAt: data.expiresAt ? data.expiresAt.toISOString() : null,
    },
  );

export const updatePollCallable = (pollId: string, data: PollInput) =>
  callCloudFunction<
    Omit<PollInput, "expiresAt"> & { expiresAt: string | null; pollId: string },
    { ok: boolean; pollId: string }
  >("updatePoll", {
    ...data,
    expiresAt: data.expiresAt ? data.expiresAt.toISOString() : null,
    pollId,
  });

export const closePollCallable = (pollId: string) =>
  callCloudFunction<{ pollId: string }, { ok: boolean; pollId: string }>(
    "closePoll",
    { pollId },
  );

export const castPollVoteCallable = (pollId: string, optionId: string) =>
  callCloudFunction<
    { optionId: string; pollId: string },
    { ok: boolean; pollId: string }
  >("castPollVote", { optionId, pollId });

export const openElectionCallable = (electionId: string) =>
  callCloudFunction<
    { electionId: string },
    { electionId: string; ok: boolean }
  >("openElection", { electionId });

export const createElectionCallable = (data: ElectionInput) =>
  callCloudFunction<
    Omit<ElectionInput, "expiresAt"> & { expiresAt: string | null },
    { electionId: string; ok: boolean }
  >(
    "createElection",
    {
      ...data,
      expiresAt: data.expiresAt ? data.expiresAt.toISOString() : null,
    },
  );

export const updateElectionCallable = (
  electionId: string,
  data: ElectionInput,
) =>
  callCloudFunction<
    Omit<ElectionInput, "expiresAt"> & {
      electionId: string;
      expiresAt: string | null;
    },
    { electionId: string; ok: boolean }
  >("updateElection", {
    ...data,
    electionId,
    expiresAt: data.expiresAt ? data.expiresAt.toISOString() : null,
  });

export const closeElectionCallable = (electionId: string) =>
  callCloudFunction<
    { electionId: string },
    { electionId: string; ok: boolean }
  >("closeElection", { electionId });

export const castElectionBallotCallable = (
  electionId: string,
  choices: Record<string, string>,
) =>
  callCloudFunction<
    { choices: Record<string, string>; electionId: string },
    { ballotReceipt: string; electionId: string; ok: boolean }
  >("castElectionBallot", { choices, electionId });

export const generateElectionResultsCallable = (electionId: string) =>
  callCloudFunction<
    { electionId: string },
    { electionId: string; ok: boolean; races: RaceResult[] }
  >("generateElectionResults", { electionId });

export const listElectionVoterReceiptsCallable = (electionId: string) =>
  callCloudFunction<
    { electionId: string },
    {
      electionId: string;
      ok: boolean;
      receipts: ElectionVoterReceiptPayload[];
    }
  >("listElectionVoterReceipts", { electionId });

export const publishElectionResultsCallable = (electionId: string) =>
  callCloudFunction<
    { electionId: string },
    { electionId: string; ok: boolean; races: RaceResult[] }
  >("publishElectionResults", { electionId });

export const registerDeviceTokenCallable = (token: string, platform: string) =>
  callCloudFunction<
    { platform: string; token: string },
    { ok: boolean }
  >("registerDeviceToken", { platform, token });

export const sendAnnouncementPushCallable = (input: SendAnnouncementInput) =>
  callCloudFunction<
    SendAnnouncementInput,
    SendAnnouncementResult & {
      failed: number;
      invalidated: number;
    }
  >("sendAnnouncementPush", input);
