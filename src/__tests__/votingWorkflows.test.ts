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
    const unsubscribe = service.subscribeToPolls((polls) =>
      snapshots.push(polls),
    );

    const created = await service.createPoll({
      title: "Welfare Vote",
      question: "Which welfare item should come first?",
      status: "draft",
      options: ["Health fund", "Transport support"],
    });
    expect(created.resultVisibility).toBe("after_vote");
    expect(snapshots.at(-1)?.some((poll) => poll.id === created.id)).toBe(
      false,
    );

    await service.updatePoll(created.id, { status: "open" });
    expect(snapshots.at(-1)?.some((poll) => poll.id === created.id)).toBe(true);

    await service.updatePoll(created.id, {
      options: ["Health fund", "Scholarship"],
    });
    expect(
      (await service.getPoll(created.id)).options.map((option) => option.id),
    ).toEqual(["health-fund", "scholarship"]);

    await service.closePoll(created.id);
    expect((await service.getPoll(created.id)).status).toBe("closed");
    expect(snapshots.at(-1)?.some((poll) => poll.id === created.id)).toBe(
      false,
    );

    unsubscribe();
  });

  it("validates poll create and update input", async () => {
    const service = loadIsolatedVotingService();

    await expect(
      service.createPoll({
        title: " ",
        question: "Which option should win?",
        status: "open",
        options: ["Yes", "No"],
      }),
    ).rejects.toThrow("Poll title is required.");

    await expect(
      service.createPoll({
        title: "Duplicate Poll",
        question: "Which option should win?",
        status: "open",
        options: ["Yes", " yes ", " "],
      }),
    ).rejects.toThrow("Polls require at least two unique options.");

    await expect(
      service.updatePoll("poll-1", { status: "invalid" } as any),
    ).rejects.toThrow("Poll status is invalid.");
  });

  it("casts a poll vote once and tracks voter state", async () => {
    const service = loadIsolatedVotingService();

    await expect(service.hasCastPollVote("poll-1", "member-1")).resolves.toBe(
      false,
    );
    await expect(
      service.getPollVoterState("poll-1", "member-1"),
    ).resolves.toEqual({
      hasVoted: false,
      resultsVisible: false,
    });
    await service.castPollVote("poll-1", "physical", "member-1");
    await expect(service.hasCastPollVote("poll-1", "member-1")).resolves.toBe(
      true,
    );
    await expect(
      service.getPollVoterState("poll-1", "member-1"),
    ).resolves.toEqual({
      hasVoted: true,
      resultsVisible: true,
    });

    const afterFirstVote = await service.getPoll("poll-1");
    await service.castPollVote("poll-1", "physical", "member-1");
    const afterDuplicateVote = await service.getPoll("poll-1");

    expect(afterFirstVote.totalVotes).toBe(19);
    expect(afterDuplicateVote.totalVotes).toBe(19);
    expect(
      afterDuplicateVote.options.find((option) => option.id === "physical")
        ?.voteCount,
    ).toBe(11);
  });

  it("creates, updates, closes, and hides elections from open subscriptions", async () => {
    const service = loadIsolatedVotingService();
    const snapshots: Election[][] = [];
    const unsubscribe = service.subscribeToElections((elections) =>
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
    expect(created.resultVisibility).toBe("after_close");
    expect(
      snapshots.at(-1)?.some((election) => election.id === created.id),
    ).toBe(false);

    await service.updateElection(created.id, { status: "open" });
    expect(
      snapshots.at(-1)?.some((election) => election.id === created.id),
    ).toBe(true);

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
    expect(
      snapshots.at(-1)?.some((election) => election.id === created.id),
    ).toBe(false);

    unsubscribe();
  });

  it("validates election create and update input", async () => {
    const service = loadIsolatedVotingService();

    await expect(
      service.createElection({
        title: " ",
        ballotType: "secret",
        status: "open",
        races: [
          {
            office: "President",
            candidates: [
              { name: "Ada", manifestoLine: "Serve well." },
              { name: "Bola", manifestoLine: "Listen well." },
            ],
          },
        ],
      }),
    ).rejects.toThrow("Election title is required.");

    await expect(
      service.createElection({
        title: "Duplicate Election",
        ballotType: "secret",
        status: "open",
        races: [
          {
            office: " ",
            candidates: [
              { name: "Ada", manifestoLine: "Serve well." },
              { name: "Bola", manifestoLine: "Listen well." },
            ],
          },
        ],
      }),
    ).rejects.toThrow("Election office is required.");

    await expect(
      service.updateElection("election-1", {
        races: [
          {
            office: "President",
            candidates: [
              { name: "Ada", manifestoLine: "Serve well." },
              { name: " ada ", manifestoLine: "Duplicate name." },
            ],
          },
        ],
      }),
    ).rejects.toThrow(
      "Each election race requires at least two unique candidates.",
    );
  });

  it("casts an election ballot once and tallies results", async () => {
    const service = loadIsolatedVotingService();

    await expect(
      service.hasCastElectionVote("election-1", "member-1"),
    ).resolves.toBe(false);
    await service.castElectionBallot(
      "election-1",
      { president: "Nkiru Okafor" },
      "member-1",
    );
    await expect(
      service.hasCastElectionVote("election-1", "member-1"),
    ).resolves.toBe(true);
    const voterState = await service.getElectionVoterState(
      "election-1",
      "member-1",
    );
    expect(voterState).toMatchObject({
      hasVoted: true,
      resultsVisible: false,
    });
    expect(voterState.ballotReceipt).toContain("BALLOT-election-1-member-1-");

    await service.castElectionBallot(
      "election-1",
      { president: "Chukwuemeka Obi" },
      "member-1",
    );
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
    await expect(
      service.castElectionBallot(
        "election-1",
        { president: "Missing Candidate" },
        "member-1",
      ),
    ).rejects.toThrow("Ballot contains an invalid candidate.");
  });

  it("rejects votes and ballots when voting items are not open", async () => {
    const service = loadIsolatedVotingService();

    const closedPoll = await service.createPoll({
      title: "Closed Poll",
      question: "Should this accept votes?",
      status: "closed",
      options: ["Yes", "No"],
    });
    await expect(
      service.castPollVote(closedPoll.id, "yes", "member-1"),
    ).rejects.toThrow("This poll is not open for voting.");

    const closedElection = await service.createElection({
      title: "Closed Election",
      ballotType: "secret",
      status: "closed",
      races: [
        {
          office: "Chair",
          candidates: [
            { name: "Ada", manifestoLine: "Serve well." },
            { name: "Bola", manifestoLine: "Listen well." },
          ],
        },
      ],
    });
    await expect(
      service.castElectionBallot(
        closedElection.id,
        { chair: "Ada" },
        "member-1",
      ),
    ).rejects.toThrow("This election is not open for ballots.");
  });
});
