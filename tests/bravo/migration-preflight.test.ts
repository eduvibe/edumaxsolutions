import { describe, expect, it } from "vitest";
import { MOCK_SCORE_PROFILE_COLUMNS, inspectMockScoreProfileMigration } from "../../scripts/bravo-migration-preflight-state.mjs";

const profileColumns = [...MOCK_SCORE_PROFILE_COLUMNS];

describe("Bravo migration 0007 preflight classification", () => {
  it("allows a pending migration when all profile columns are absent", () => {
    expect(inspectMockScoreProfileMigration({
      recorded: false, tableExists: true, columns: [], baseMigrationPending: false,
    }).status).toBe("safe_to_apply");
  });

  it("allows the pending sequence to create the score table before applying 0007", () => {
    expect(inspectMockScoreProfileMigration({
      recorded: false, tableExists: false, columns: [], baseMigrationPending: true,
    }).status).toBe("safe_to_apply");
  });

  it("requires reconciliation when all columns exist but 0007 is unrecorded", () => {
    expect(inspectMockScoreProfileMigration({
      recorded: false, tableExists: true, columns: profileColumns, baseMigrationPending: false,
    }).status).toBe("reconciliation");
  });

  it("stops for manual review when only some columns exist", () => {
    expect(inspectMockScoreProfileMigration({
      recorded: false, tableExists: true, columns: profileColumns.slice(0, 2), baseMigrationPending: false,
    }).status).toBe("manual_review");
  });

  it("accepts a recorded migration only when all five columns exist", () => {
    expect(inspectMockScoreProfileMigration({
      recorded: true, tableExists: true, columns: profileColumns, baseMigrationPending: false,
    }).status).toBe("complete");
    expect(inspectMockScoreProfileMigration({
      recorded: true, tableExists: true, columns: [], baseMigrationPending: false,
    }).status).toBe("reconciliation");
  });

  it("stops if the score table is missing after its creating migration is already recorded", () => {
    expect(inspectMockScoreProfileMigration({
      recorded: false, tableExists: false, columns: [], baseMigrationPending: false,
    }).status).toBe("manual_review");
  });
});
