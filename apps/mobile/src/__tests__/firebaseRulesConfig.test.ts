const fs = require("fs");
const path = require("path");

const root = process.env.TIWANI_FIREBASE_WORKSPACE
  ? path.resolve(process.env.TIWANI_FIREBASE_WORKSPACE)
  : path.resolve("../../backend/firebase");
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

  it("keeps React Native Firebase native-only config out of deploy config", () => {
    const config = JSON.parse(readRootFile("firebase.json"));

    expect(config).not.toHaveProperty("react-native");
  });

  it("keeps project aliases separated by environment", () => {
    const rc = JSON.parse(readRootFile(".firebaserc"));

    expect(rc.projects.default).toBe("tiwani-backend");
    expect(rc.projects.development).toBe("tiwani-backend");
    expect(rc.projects.staging).toBe("tiwani-staging");
    expect(rc.projects.production).toBe("tiwani-backend");
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

  it("keeps audit logs backend-written and admin-readable only", () => {
    const rules = readRootFile("firestore.rules");

    expect(rules).toContain("match /audit_logs/{logId}");
    expect(rules).toMatch(
      /match \/audit_logs\/\{logId\}[\s\S]*?allow read: if isAdmin\(\) && sameOrgExisting\(\);/,
    );
    expect(rules).toMatch(
      /match \/audit_logs\/\{logId\}[\s\S]*?allow write: if false;/,
    );
  });

  it("indexes audit logs by organisation and latest first", () => {
    const indexes = JSON.parse(readRootFile("firestore.indexes.json"));

    expect(indexes.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collectionGroup: "audit_logs",
          fields: [
            { fieldPath: "orgId", order: "ASCENDING" },
            { fieldPath: "createdAt", order: "DESCENDING" },
          ],
          queryScope: "COLLECTION",
        }),
      ]),
    );
  });

  it("limits library uploads to PDF files at 20MB or smaller", () => {
    const rules = readRootFile("storage.rules");

    expect(rules).toContain('request.resource.contentType == "application/pdf"');
    expect(rules).toContain('fileName.matches(".*\\\\.[pP][dD][fF]$")');
    expect(rules).toContain("request.resource.size <= 20 * 1024 * 1024");
    expect(rules).toContain(
      "match /organisations/{orgId}/library/{documentId}/{fileName}",
    );
    expect(rules).toContain(
      "allow write: if isAdmin() && sameOrg(orgId) && pdfUpload(fileName);",
    );
  });

  it("allows admins to delete library document records", () => {
    const rules = readRootFile("firestore.rules");

    expect(rules).toMatch(
      /match \/library_documents\/\{documentId\}[\s\S]*?allow delete: if isAdmin\(\) && sameOrgExisting\(\);/,
    );
  });

  it("limits profile photo access to active members in the same organisation", () => {
    const rules = readRootFile("storage.rules");

    expect(rules).toContain("allow read: if sameOrg(orgId);");
    expect(rules).toContain("request.auth.uid == userId");
    expect(rules).toContain("sameOrg(orgId) &&");
  });

  it("limits marketplace listing images to active members in the same organisation", () => {
    const rules = readRootFile("storage.rules");

    expect(rules).toContain(
      "match /organisations/{orgId}/marketplace/{listingId}/{fileName}",
    );
    expect(rules).toContain("allow write: if sameOrg(orgId) && imageUpload(fileName);");
  });
});
