const fs = require("fs");
const path = require("path");

const root = path.resolve(".");
const readRootFile = (fileName: string) =>
  fs.readFileSync(path.join(root, fileName), "utf8");

describe("Firebase local rules configuration", () => {
  it("wires Firestore, Storage, and Emulator Suite config", () => {
    const config = JSON.parse(readRootFile("firebase.json"));

    expect(config.firestore.rules).toBe("firestore.rules");
    expect(config.firestore.indexes).toBe("firestore.indexes.json");
    expect(config.storage.rules).toBe("storage.rules");
    expect(config.emulators.auth.port).toBe(9099);
    expect(config.emulators.firestore.port).toBe(8080);
    expect(config.emulators.storage.port).toBe(9199);
    expect(config.emulators.ui.enabled).toBe(true);
  });

  it("keeps project aliases separated by environment", () => {
    const rc = JSON.parse(readRootFile(".firebaserc"));

    expect(rc.projects.default).toBe("tiwani-backend");
    expect(rc.projects.development).toBe("tiwani-backend");
    expect(rc.projects.staging).toBe("tiwani-staging");
    expect(rc.projects.production).toBe("tiwani-prod");
  });

  it("keeps secure voting writes blocked until Cloud Functions exist", () => {
    const rules = readRootFile("firestore.rules");

    expect(rules).toContain("match /votes/{userId}");
    expect(rules).toContain("match /voterRegistry/{userId}");
    expect(rules).toMatch(/match \/votes\/\{userId\}[\s\S]*?allow write: if false;/);
    expect(rules).toMatch(
      /match \/voterRegistry\/\{userId\}[\s\S]*?allow write: if false;/,
    );
  });

  it("keeps join request approvals blocked in client-side rules", () => {
    const rules = readRootFile("firestore.rules");

    expect(rules).toMatch(
      /request\.resource\.data\.status == "declined"/,
    );
    expect(rules).not.toMatch(/request\.resource\.data\.status == "approved"/);
  });

  it("keeps push device tokens backend-managed only", () => {
    const rules = readRootFile("firestore.rules");

    expect(rules).toContain("match /device_tokens/{tokenId}");
    expect(rules).toMatch(
      /match \/device_tokens\/\{tokenId\}[\s\S]*?allow read, write: if false;/,
    );
  });

  it("limits library uploads to PDF files at 20MB or smaller", () => {
    const rules = readRootFile("storage.rules");

    expect(rules).toContain('request.resource.contentType == "application/pdf"');
    expect(rules).toContain("request.resource.size <= 20 * 1024 * 1024");
    expect(rules).toContain(
      "match /organisations/{orgId}/library/{documentId}/{fileName}",
    );
  });
});
