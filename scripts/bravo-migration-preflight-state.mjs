export const MOCK_SCORE_PROFILE_COLUMNS = [
  "profile_name",
  "profile_email",
  "profile_phone",
  "profile_state",
  "profile_school",
];

/** Classify migration 0007 without modifying the database or migration ledger. */
export function inspectMockScoreProfileMigration({ recorded, tableExists, columns, baseMigrationPending }) {
  const presentColumns = MOCK_SCORE_PROFILE_COLUMNS.filter((column) => columns.includes(column));
  const absentColumns = MOCK_SCORE_PROFILE_COLUMNS.filter((column) => !columns.includes(column));

  if (presentColumns.length === MOCK_SCORE_PROFILE_COLUMNS.length) {
    return recorded
      ? { status: "complete", presentColumns, absentColumns }
      : { status: "reconciliation", presentColumns, absentColumns };
  }
  if (presentColumns.length > 0) {
    return { status: "manual_review", presentColumns, absentColumns };
  }
  if (recorded) {
    return { status: "reconciliation", presentColumns, absentColumns };
  }
  if (!tableExists && !baseMigrationPending) {
    return { status: "manual_review", presentColumns, absentColumns };
  }
  return { status: "safe_to_apply", presentColumns, absentColumns };
}
