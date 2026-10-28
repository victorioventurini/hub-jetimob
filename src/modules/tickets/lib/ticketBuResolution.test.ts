import { describe, expect, it } from 'vitest';
import { isTicketInOtherBu } from './ticketBuResolution';

const soul = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f';
const jetimob = 'a0000000-0000-0000-0000-000000000001';

describe('ticket BU resolution', () => {
  it('does not request a switch when Soul is already selected', () => {
    expect(isTicketInOtherBu(soul, soul)).toBe(false);
  });
  it('requires a switch from Jetimob to Soul', () => {
    expect(isTicketInOtherBu(jetimob, soul)).toBe(true);
  });
  it('does not classify an unresolved ticket as another BU', () => {
    expect(isTicketInOtherBu(soul, null)).toBe(false);
  });
});