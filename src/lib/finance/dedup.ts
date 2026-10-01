// Imported-message deduplication.
//
// Mirrors the DB unique constraint on
// `imported_messages (household_id, source, source_message_id)`.

export interface ImportedMessageIdentity {
  source: string;
  sourceMessageId: string;
}

export function isDuplicateMessage(
  candidate: ImportedMessageIdentity,
  existing: readonly ImportedMessageIdentity[],
): boolean {
  for (const m of existing) {
    if (
      m.source === candidate.source &&
      m.sourceMessageId === candidate.sourceMessageId
    ) {
      return true;
    }
  }
  return false;
}
