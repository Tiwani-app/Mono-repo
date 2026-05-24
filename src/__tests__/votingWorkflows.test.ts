import { Election, Poll } from "../types/voting";

const loadIsolatedVotingService =
  (): typeof import("../services/votingService") => {
    let service: typeof import("../services/votingService") | undefined;
    jest.isolateModules(() => {
      service = require("../services/votingService");
    });
    return service as typeof import("../services/votingService");
  };

describe("voting workflows", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("creates, updates, closes, and hides polls from open subscriptions", async () => {
    const service = loadIsolatedVotingService();
    const snapshots: Poll[][] = [];
    const unsubscribe = service.subscribeToPolls(polls => snapshots.push(polls));

    const created = await service.createPoll({
      title: "Welfare Vote",
      question: "Which welfare item should come first?",
      status: "draft",
      options: ["Health fund", "Transport support"],
    });
    expect(snapshots.at(-1)?.some(poll => poll.id === created.id)).toBe(false);

    await service.updatePoll(created.id, { status: "open" });
    expect(snapshots.at(-1)?.some(poll => poll.id === created.id)).toBe(true);

    await service.updatePoll(created.id, {
      options: ["Health fund", "Scholarship"],
    });
    expect((await service.getPoll(created.id)).options.map(option => option.id)).toEqual([
      "health-fund",
      "scholarship",
    ]);

    await service.closePoll(created.id);
    expect((await service.getPoll(created.id)).status).toBe("closed");
    expect(snapshots.at(-1)?.some(poll => poll.id === created.id)).toBe(false);

    unsubscribe();
  });

  it("casts a poll vote once and tracks voter state", async () => {
    const service = loadIsolatedVotingService();

    await expect(service.hasCastPollVote("poll-1", "member-1")).resolves.toBe(false);
    await service.castPollVote("poll-1", "physical", "member-1");
    await expect(service.hasCastPollVote("poll-1", "member-1")).resolves.toBe(true);

    const afterFirstVote = await service.getPoll("poll-1");
    await service.castPollVote("poll-1", "physical", "member-1");
    const afterDuplicateVote = await service.getPoll("poll-1");

    expect(afterFirstVote.totalVotes).toBe(19);
    expect(afterDuplicateVote.totalVotes).toBe(19);
    expect(afterDuplicateVote.options.find(option => option.id === "physical")?.voteCount).toBe(11);
  });

  it("creates, updates, closes, and hides elections from open subscriptions", async () => {
    const service = loadIsolatedVotingService();
    const snapshots: Election[][] = [];
    const unsubscribe = service.subscribeToElections(elections =>
      snapshots.push(elections),
    );

    const created = await service.createElection({
      title: "Committee Election",
      ballotType: "open",
      status: "draft",
      races: [
        {
          office: "Secretary",
          candidates: [
            { name: "Ada", manifestoLine: "Clear records." },
            { name: "Bola", manifestoLine: "Timely minutes." },
          ],
        },
      ],
    });
    expect(snapshots.at(-1)?.some(election => election.id === created.id)).toBe(false);

    await service.updateElection(created.id, { status: "open" });
    expect(snapshots.at(-1)?.some(election => election.id === created.id)).toBe(true);

    await service.updateElection(created.id, {
      races: [
        {
          office: "Treasurer",
          candidates: [
            { name: "Chioma", manifestoLine: "Transparent reporting." },
            { name: "Dapo", manifestoLine: "Disciplined collections." },
          ],
        },
      ],
    });
    expect((await service.getElection(created.id)).races[0]).toMatchObject({
      raceId: "treasurer",
      office: "Treasurer",
    });

    await service.closeElection(created.id);
    expect((await service.getElection(created.id)).status).toBe("closed");
    expect(snapshots.at(-1)?.some(election => election.id === created.id)).toBe(false);

    unsubscribe();
  });

  it("casts an election ballot once and tallies results", async () => {
    const service = loadIsolatedVotingService();

    await expect(service.hasCastElectionVote("election-1", "member-1")).resolves.toBe(false);
    await service.castElectionBallot("election-1", { president: "Nkiru Okafor" }, "member-1");
    await expect(service.hasCastElectionVote("election-1", "member-1")).resolves.toBe(true);

    await service.castElectionBallot("election-1", { president: "Chukwuemeka Obi" }, "member-1");
    const results = await service.getElectionResults("election-1");

    expect(results[0].candidates).toEqual([
      { name: "Chukwuemeka Obi", voteCount: 0 },
      { name: "Nkiru Okafor", voteCount: 1 },
    ]);
  });

  it("rejects incomplete election ballots and missing poll options", async () => {
    const service = loadIsolatedVotingService();

    await expect(
      service.castElectionBallot("election-1", {}, "member-1"),
    ).rejects.toThrow("Ballot is incomplete.");
    await expect(
      service.castPollVote("poll-1", "missing-option", "member-1"),
    ).rejects.toThrow("Vote option not found.");
  });
});
