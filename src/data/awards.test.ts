import { describe, it, expect } from 'vitest';
import { AWARDS, getAwardById } from './awards';

describe('awards dataset', () => {
  it('has at least 41 entries (40 awards + GMP EA)', () => {
    expect(AWARDS.length).toBeGreaterThanOrEqual(41);
  });

  it('GMP EA is first and marked as custom EA', () => {
    expect(AWARDS[0].id).toBe('gmp-ea');
    expect(AWARDS[0].isCustomEA).toBe(true);
  });

  it('getAwardById returns correct award', () => {
    const award = getAwardById('MA000033');
    expect(award).not.toBeNull();
    expect(award!.shortName).toBe('Meat Industry');
  });

  it('Meat Industry Award has correct Saturday rate', () => {
    const award = getAwardById('MA000033');
    expect(award!.satOT1Multiplier).toBe(1.5);
    expect(award!.satOT1LimitHours).toBe(0); // flat rate sentinel
    expect(award!.sunMultiplier).toBe(2.0);
    expect(award!.phMultiplier).toBe(2.5);
  });

  it('GMP EA has correct Sunday minimum (4h)', () => {
    const award = getAwardById('gmp-ea');
    expect(award!.sunMinHours).toBe(4.0);
    expect(award!.phMultiplier).toBe(2.0);
  });

  it('Building Award has tiered Saturday (satOT1LimitHours = 2)', () => {
    const award = getAwardById('MA000020');
    expect(award!.satOT1LimitHours).toBe(2);
    expect(award!.satOT1Multiplier).toBe(1.5);
    expect(award!.satOT2Multiplier).toBe(2.0);
  });

  it('every award has required fields', () => {
    for (const award of AWARDS) {
      expect(award.id).toBeTruthy();
      expect(award.name).toBeTruthy();
      expect(award.superRate).toBeGreaterThan(0);
      expect(award.breakRules.length).toBeGreaterThan(0);
    }
  });
});
