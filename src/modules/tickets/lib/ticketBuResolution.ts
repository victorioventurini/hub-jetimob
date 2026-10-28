/** A BU hint must not suggest switching to the unit already selected. */
export function isTicketInOtherBu(currentBuId: string | null | undefined, resolvedBuId: string | null | undefined): boolean {
  return Boolean(currentBuId && resolvedBuId && currentBuId !== resolvedBuId);
}