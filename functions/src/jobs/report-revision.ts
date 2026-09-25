type Addendum = { id: string; note: string; reason: string; authorId: string; authorName: string; createdAt: string };
export function buildReportRevision(original: Record<string, any>, previous: Record<string, any>, addendum: Addendum) {
  const revision = Number(previous.revision || 1) + 1;
  return { ...previous, id: addendum.id, baseReportId: original.id, previousReportId: previous.id, reportNumber: `${original.reportNumber}-R${revision}`, revision, addenda: [...(previous.addenda || []), addendum] };
}
