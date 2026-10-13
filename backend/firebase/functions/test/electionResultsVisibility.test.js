/* eslint-env node */

const assert = require("node:assert/strict");
const test = require("node:test");

const { memberCanSeeElectionResults } = require("../lib/voting");

const NOW = 1_000_000_000_000;
const past = { toDate: () => new Date(NOW - 60_000) };
const future = { toDate: () => new Date(NOW + 60_000) };
const election = (overrides) => ({
  status: "open",
  resultVisibility: "after_close",
  expiresAt: null,
  ...overrides,
});

test("members see results once the election is closed", () => {
  assert.equal(memberCanSeeElectionResults(election({ status: "closed" }), NOW), true);
});

test("members see results once an open election is past its end time", () => {
  assert.equal(memberCanSeeElectionResults(election({ expiresAt: past }), NOW), true);
});

test("members can't see results while voting is still going on", () => {
  assert.equal(memberCanSeeElectionResults(election({ expiresAt: future }), NOW), false);
  assert.equal(memberCanSeeElectionResults(election({ expiresAt: null }), NOW), false);
});

test("members can't see results of a draft election", () => {
  assert.equal(memberCanSeeElectionResults(election({ status: "draft", expiresAt: past }), NOW), false);
});

test("admin-only results stay hidden from members even after the election ends", () => {
  assert.equal(
    memberCanSeeElectionResults(election({ status: "closed", resultVisibility: "admin_only" }), NOW),
    false,
  );
});
