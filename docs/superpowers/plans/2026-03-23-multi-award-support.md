# Multi-Award Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 40-Award selector to the payslip checker so the user can switch between GMP EA and any Australian Modern Award without reconfiguring anything manually.

**Architecture:** A new `src/data/awards.ts` file holds all award data as hardcoded TypeScript. The calculator and hook are refactored to accept an `AwardConfig` object instead of reading from `AU_REGS`. Two new components (`AwardSelector`, `AwardDetailPage`) are conditionally rendered from `App.tsx`, matching the existing `ResetModal` pattern. No router is added.

**Tech Stack:** React 19, TypeScript, Vite, Vitest. No new dependencies required.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/data/awards.ts` | **Create** | All award data + types (`AwardConfig`, `BreakRule`, `Classification`) |
| `src/utils/calculator.ts` | **Modify** | Accept `AwardConfig` instead of `minEngagement`; remove `AU_REGS` dependency |
| `src/utils/calculator.test.ts` | **Modify** | Update to pass `AwardConfig` mock instead of bare params |
| `src/hooks/usePayslip.ts` | **Modify** | Add `selectedAwardId`; remove `minEngagement`; use `award.*` for daily limit and reset |
| `src/constants/regulations.ts` | **Delete** | Migrated to `awards.ts` |
| `src/locales/en.ts` | **Modify** | Add new keys; fix `rule_super`/`hol` hardcoded rates |
| `src/locales/tw.ts` | **Modify** | Mirror new keys as stubs; fix `rule_super`/`hol` |
| `src/components/AwardSelector.tsx` | **Create** | Bottom sheet overlay for switching Awards |
| `src/components/AwardDetailPage.tsx` | **Create** | Full award detail view (classification, penalty rates, break rules) |
| `src/App.tsx` | **Modify** | Sidebar reorganised; wire AwardSelector + AwardDetailPage; dynamic super label |

---

## Task 1: Create Award Data Types and Dataset

**Files:**
- Create: `src/data/awards.ts`

- [ ] **Step 1: Write a failing test to validate award data shape**

Create `src/data/awards.test.ts`:

```ts
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
    expect(award!.satOT1LimitHours).toBe(0); // flat rate
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/data/awards.test.ts
```
Expected: FAIL — "Cannot find module './awards'"

- [ ] **Step 3: Create `src/data/awards.ts`**

```ts
export interface BreakRule {
  shiftMinHours: number;
  mealBreakMinutes: number;
  restBreakMinutes: number;
  restBreakPaid: boolean;
}

export interface Classification {
  code: string;
  ratePerHour: number;
}

export interface AwardConfig {
  id: string;
  name: string;
  shortName: string;
  isCustomEA?: boolean;

  // Saturday: set satOT1LimitHours = 0 for a flat rate (all hours at satOT1Multiplier)
  satOT1Multiplier: number;
  satOT1LimitHours: number;
  satOT2Multiplier: number;

  sunMultiplier: number;
  sunMinHours: number;
  phMultiplier: number;

  weekdayOT1Multiplier: number;
  weekdayOT1LimitHours: number;
  weekdayOT2Multiplier: number;

  afternoonShiftMultiplier?: number; // display only — not used in calculator

  casualLoading: number;
  superRate: number;
  minEngagementHours: number;
  weeklyStandardHours: number;

  defaultHourlyRate: number;
  defaultStartTime: string;
  defaultEndTime: string;
  defaultBreakMinutes: number;

  breakRules: BreakRule[];
  classifications: Classification[];
}

// Break rule presets (verified from Fair Work sources)
const BREAK_7H: BreakRule[] = [
  { shiftMinHours: 5, mealBreakMinutes: 30, restBreakMinutes: 0, restBreakPaid: false },
  { shiftMinHours: 7, mealBreakMinutes: 30, restBreakMinutes: 10, restBreakPaid: true },
  { shiftMinHours: 10, mealBreakMinutes: 60, restBreakMinutes: 20, restBreakPaid: true },
];

const BREAK_8H: BreakRule[] = [
  { shiftMinHours: 5, mealBreakMinutes: 30, restBreakMinutes: 0, restBreakPaid: false },
  { shiftMinHours: 8, mealBreakMinutes: 30, restBreakMinutes: 10, restBreakPaid: true },
  { shiftMinHours: 10, mealBreakMinutes: 60, restBreakMinutes: 20, restBreakPaid: true },
];

export const AWARDS: AwardConfig[] = [
  // ─── Custom EA ───────────────────────────────────────────────────────────
  {
    id: 'gmp-ea',
    name: 'GMP EA',
    shortName: 'GMP EA',
    isCustomEA: true,
    satOT1Multiplier: 1.5,
    satOT1LimitHours: 3.0,
    satOT2Multiplier: 2.0,
    sunMultiplier: 2.0,
    sunMinHours: 4.0,
    phMultiplier: 2.0,
    weekdayOT1Multiplier: 1.5,
    weekdayOT1LimitHours: 3.0,
    weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25,
    superRate: 0.12,
    minEngagementHours: 3.0,
    weeklyStandardHours: 38,
    defaultHourlyRate: 32.15,
    defaultStartTime: '06:00',
    defaultEndTime: '16:00',
    defaultBreakMinutes: 30,
    breakRules: BREAK_8H,
    classifications: [],
  },

  // ─── Modern Awards (alphabetical after GMP EA) ───────────────────────────
  {
    id: 'MA000076',
    name: 'Aged Care Award 2020',
    shortName: 'Aged Care',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 1.75, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '07:00', defaultEndTime: '15:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H,
    classifications: [
      { code: 'L1', ratePerHour: 24.10 }, { code: 'L2', ratePerHour: 25.01 },
      { code: 'L3', ratePerHour: 25.97 }, { code: 'L4', ratePerHour: 27.17 },
      { code: 'L5', ratePerHour: 28.46 }, { code: 'L6', ratePerHour: 29.83 },
      { code: 'L7', ratePerHour: 31.35 },
    ],
  },
  {
    id: 'MA000092',
    name: 'Alpine Resorts Award 2020',
    shortName: 'Alpine Resorts',
    satOT1Multiplier: 1.25, satOT1LimitHours: 0, satOT2Multiplier: 1.25,
    sunMultiplier: 1.5, sunMinHours: 3.0, phMultiplier: 2.25,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '07:00', defaultEndTime: '15:00', defaultBreakMinutes: 30,
    breakRules: BREAK_7H,
    classifications: [
      { code: 'L1', ratePerHour: 24.10 }, { code: 'L2', ratePerHour: 25.28 },
      { code: 'L3', ratePerHour: 26.49 }, { code: 'L4', ratePerHour: 27.72 },
    ],
  },
  {
    id: 'MA000080',
    name: 'Amusement, Events and Recreation Award 2020',
    shortName: 'Amusement & Events',
    satOT1Multiplier: 1.25, satOT1LimitHours: 0, satOT2Multiplier: 1.25,
    sunMultiplier: 1.5, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '07:00', defaultEndTime: '15:00', defaultBreakMinutes: 30,
    breakRules: BREAK_7H, classifications: [],
  },
  {
    id: 'MA000020',
    name: 'Building and Construction General On-site Award 2020',
    shortName: 'Building & Construction',
    satOT1Multiplier: 1.5, satOT1LimitHours: 2.0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 4.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '06:00', defaultEndTime: '14:00', defaultBreakMinutes: 30,
    breakRules: BREAK_7H,
    classifications: [
      { code: 'CW1', ratePerHour: 24.10 }, { code: 'CW2', ratePerHour: 25.10 },
      { code: 'CW3', ratePerHour: 26.83 }, { code: 'CW4', ratePerHour: 28.36 },
      { code: 'CW5', ratePerHour: 29.64 }, { code: 'CW6', ratePerHour: 31.07 },
      { code: 'CW7', ratePerHour: 32.82 }, { code: 'CW8', ratePerHour: 34.27 },
    ],
  },
  {
    id: 'MA000091',
    name: 'Broadcasting, Recorded Entertainment and Cinemas Award 2020',
    shortName: 'Broadcasting',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '07:00', defaultEndTime: '15:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
  {
    id: 'MA000018',
    name: "Children's Services Award 2010",
    shortName: "Children's Services",
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '07:00', defaultEndTime: '15:00', defaultBreakMinutes: 30,
    breakRules: BREAK_7H, classifications: [],
  },
  {
    id: 'MA000022',
    name: 'Cleaning Services Award 2020',
    shortName: 'Cleaning',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '06:00', defaultEndTime: '14:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H,
    classifications: [
      { code: 'L1', ratePerHour: 24.10 }, { code: 'L2', ratePerHour: 25.01 },
      { code: 'L3', ratePerHour: 25.97 },
    ],
  },
  {
    id: 'MA000002',
    name: 'Clerks — Private Sector Award 2020',
    shortName: 'Clerks',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 3.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '09:00', defaultEndTime: '17:00', defaultBreakMinutes: 30,
    breakRules: BREAK_7H,
    classifications: [
      { code: 'CL1', ratePerHour: 24.10 }, { code: 'CL2', ratePerHour: 25.08 },
      { code: 'CL3', ratePerHour: 26.04 }, { code: 'CL4', ratePerHour: 27.34 },
      { code: 'CL5', ratePerHour: 28.47 },
    ],
  },
  {
    id: 'MA000023',
    name: 'Educational Services (Post-Secondary Education) Award 2020',
    shortName: 'Educational Services',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '08:00', defaultEndTime: '16:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
  {
    id: 'MA000025',
    name: 'Electrical, Electronic and Communications Contracting Award 2020',
    shortName: 'Electrical',
    satOT1Multiplier: 1.5, satOT1LimitHours: 2.0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 4.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '07:00', defaultEndTime: '15:00', defaultBreakMinutes: 30,
    breakRules: BREAK_7H, classifications: [],
  },
  {
    id: 'MA000094',
    name: 'Fitness Industry Award 2020',
    shortName: 'Fitness',
    satOT1Multiplier: 1.25, satOT1LimitHours: 0, satOT2Multiplier: 1.25,
    sunMultiplier: 1.5, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '06:00', defaultEndTime: '14:00', defaultBreakMinutes: 30,
    breakRules: BREAK_7H, classifications: [],
  },
  {
    id: 'MA000073',
    name: 'Food, Beverage and Tobacco Manufacturing Award 2020',
    shortName: 'Food & Bev Manufacturing',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    afternoonShiftMultiplier: 1.15,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '06:00', defaultEndTime: '14:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
  {
    id: 'MA000004',
    name: 'General Retail Industry Award 2020',
    shortName: 'Retail',
    satOT1Multiplier: 1.25, satOT1LimitHours: 0, satOT2Multiplier: 1.25,
    sunMultiplier: 1.5, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 3.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '09:00', defaultEndTime: '17:00', defaultBreakMinutes: 30,
    breakRules: BREAK_7H,
    classifications: [
      { code: 'L1', ratePerHour: 24.10 }, { code: 'L2', ratePerHour: 24.73 },
      { code: 'L3', ratePerHour: 25.15 }, { code: 'L4', ratePerHour: 25.68 },
      { code: 'L5', ratePerHour: 26.74 }, { code: 'L6', ratePerHour: 27.25 },
      { code: 'L7', ratePerHour: 28.54 }, { code: 'L8', ratePerHour: 29.71 },
    ],
  },
  {
    id: 'MA000026',
    name: 'Graphic Arts, Printing and Publishing Award 2020',
    shortName: 'Graphic Arts',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    afternoonShiftMultiplier: 1.15,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '07:00', defaultEndTime: '15:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
  {
    id: 'MA000005',
    name: 'Hair and Beauty Industry Award 2020',
    shortName: 'Hair & Beauty',
    satOT1Multiplier: 1.25, satOT1LimitHours: 0, satOT2Multiplier: 1.25,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 3.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '09:00', defaultEndTime: '17:00', defaultBreakMinutes: 30,
    breakRules: BREAK_7H, classifications: [],
  },
  {
    id: 'MA000027',
    name: 'Health Professionals and Support Services Award 2020',
    shortName: 'Health Professionals',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 1.75, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    afternoonShiftMultiplier: 1.125,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 27.10, defaultStartTime: '07:00', defaultEndTime: '15:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
  {
    id: 'MA000100',
    name: 'Home Care Award 2020',
    shortName: 'Home Care',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 1.75, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '07:00', defaultEndTime: '15:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
  {
    id: 'MA000009',
    name: 'Hospitality Industry (General) Award 2020',
    shortName: 'Hospitality',
    satOT1Multiplier: 1.25, satOT1LimitHours: 0, satOT2Multiplier: 1.25,
    sunMultiplier: 1.5, sunMinHours: 3.0, phMultiplier: 2.25,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 2.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '09:00', defaultEndTime: '17:00', defaultBreakMinutes: 30,
    breakRules: BREAK_7H,
    classifications: [
      { code: 'L1', ratePerHour: 24.10 }, { code: 'L2', ratePerHour: 25.28 },
      { code: 'L3', ratePerHour: 26.10 }, { code: 'L4', ratePerHour: 27.32 },
      { code: 'L5', ratePerHour: 28.60 }, { code: 'L6', ratePerHour: 30.16 },
    ],
  },
  {
    id: 'MA000028',
    name: 'Joinery and Building Trades Award 2020',
    shortName: 'Joinery',
    satOT1Multiplier: 1.5, satOT1LimitHours: 2.0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 4.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '07:00', defaultEndTime: '15:00', defaultBreakMinutes: 30,
    breakRules: BREAK_7H, classifications: [],
  },
  {
    id: 'MA000112',
    name: 'Local Government Industry Award 2020',
    shortName: 'Local Government',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '07:00', defaultEndTime: '15:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
  {
    id: 'MA000010',
    name: 'Manufacturing and Associated Industries and Occupations Award 2020',
    shortName: 'Manufacturing',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    afternoonShiftMultiplier: 1.15,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '06:00', defaultEndTime: '14:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
  {
    id: 'MA000033',
    name: 'Meat Industry Award 2020',
    shortName: 'Meat Industry',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    afternoonShiftMultiplier: 1.15,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '06:00', defaultEndTime: '14:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H,
    classifications: [
      { code: 'MI1', ratePerHour: 24.10 }, { code: 'MI2', ratePerHour: 24.93 },
      { code: 'MI3', ratePerHour: 25.97 }, { code: 'MI4', ratePerHour: 27.10 },
      { code: 'MI5', ratePerHour: 28.35 },
    ],
  },
  {
    id: 'MA000034',
    name: 'Nurses Award 2020',
    shortName: 'Nurses',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 1.75, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    afternoonShiftMultiplier: 1.125,
    casualLoading: 0.2688, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 30.72, defaultStartTime: '07:00', defaultEndTime: '15:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
  {
    id: 'MA000035',
    name: 'Pastoral Award 2020',
    shortName: 'Pastoral',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '06:00', defaultEndTime: '14:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
  {
    id: 'MA000012',
    name: 'Pharmacy Industry Award 2020',
    shortName: 'Pharmacy',
    satOT1Multiplier: 1.25, satOT1LimitHours: 0, satOT2Multiplier: 1.25,
    sunMultiplier: 1.5, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 3.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '09:00', defaultEndTime: '17:00', defaultBreakMinutes: 30,
    breakRules: BREAK_7H, classifications: [],
  },
  {
    id: 'MA000053',
    name: 'Plumbing and Fire Sprinklers Award 2020',
    shortName: 'Plumbing',
    satOT1Multiplier: 1.5, satOT1LimitHours: 2.0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 4.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '07:00', defaultEndTime: '15:00', defaultBreakMinutes: 30,
    breakRules: BREAK_7H, classifications: [],
  },
  {
    id: 'MA000040',
    name: 'Quarrying Award 2020',
    shortName: 'Quarrying',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    afternoonShiftMultiplier: 1.15,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '06:00', defaultEndTime: '14:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
  {
    id: 'MA000075',
    name: 'Real Estate Industry Award 2020',
    shortName: 'Real Estate',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '09:00', defaultEndTime: '17:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
  {
    id: 'MA000003',
    name: 'Restaurant Industry Award 2020',
    shortName: 'Restaurant',
    satOT1Multiplier: 1.25, satOT1LimitHours: 0, satOT2Multiplier: 1.25,
    sunMultiplier: 1.5, sunMinHours: 3.0, phMultiplier: 2.25,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 2.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '09:00', defaultEndTime: '17:00', defaultBreakMinutes: 30,
    breakRules: BREAK_7H, classifications: [],
  },
  {
    id: 'MA000039',
    name: 'Road Transport and Distribution Award 2020',
    shortName: 'Road Transport',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '06:00', defaultEndTime: '14:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
  {
    id: 'MA000013',
    name: 'Social, Community, Home Care and Disability Services Industry Award 2010',
    shortName: 'SCHADS',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 1.75, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 2.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '07:00', defaultEndTime: '15:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
  {
    id: 'MA000038',
    name: 'Security Services Industry Award 2020',
    shortName: 'Security',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    afternoonShiftMultiplier: 1.1,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '18:00', defaultEndTime: '06:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H,
    classifications: [
      { code: 'L1', ratePerHour: 24.10 }, { code: 'L2', ratePerHour: 25.28 },
      { code: 'L3', ratePerHour: 26.49 }, { code: 'L4', ratePerHour: 27.72 },
      { code: 'L5', ratePerHour: 29.20 },
    ],
  },
  {
    id: 'MA000084',
    name: 'Storage Services and Wholesale Award 2020',
    shortName: 'Storage & Wholesale',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    afternoonShiftMultiplier: 1.15,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '06:00', defaultEndTime: '14:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
  {
    id: 'MA000017',
    name: 'Textile, Clothing, Footwear and Associated Industries Award 2020',
    shortName: 'Textile & Clothing',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    afternoonShiftMultiplier: 1.15,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '07:00', defaultEndTime: '15:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
  {
    id: 'MA000071',
    name: 'Timber Industry Award 2020',
    shortName: 'Timber',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    afternoonShiftMultiplier: 1.15,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '06:00', defaultEndTime: '14:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
  {
    id: 'MA000029',
    name: 'Transport and Distribution Award 2020',
    shortName: 'Transport',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    afternoonShiftMultiplier: 1.15,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '06:00', defaultEndTime: '14:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
  {
    id: 'MA000089',
    name: 'Vehicle Repair, Services and Retail Award 2020',
    shortName: 'Vehicle Repair',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 3.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '08:00', defaultEndTime: '16:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
  {
    id: 'MA000113',
    name: 'Water Industry Award 2020',
    shortName: 'Water Industry',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '07:00', defaultEndTime: '15:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
  {
    id: 'MA000090',
    name: 'Wine Industry Award 2020',
    shortName: 'Wine Industry',
    satOT1Multiplier: 1.5, satOT1LimitHours: 0, satOT2Multiplier: 2.0,
    sunMultiplier: 2.0, sunMinHours: 3.0, phMultiplier: 2.5,
    weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 2.0, weekdayOT2Multiplier: 2.0,
    casualLoading: 0.25, superRate: 0.12, minEngagementHours: 3.0, weeklyStandardHours: 38,
    defaultHourlyRate: 24.10, defaultStartTime: '06:00', defaultEndTime: '14:00', defaultBreakMinutes: 30,
    breakRules: BREAK_8H, classifications: [],
  },
];

export function getAwardById(id: string): AwardConfig | null {
  return AWARDS.find(a => a.id === id) ?? null;
}

export const DEFAULT_AWARD_ID = 'gmp-ea';
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/data/awards.test.ts
```
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/awards.ts src/data/awards.test.ts
git commit -m "feat: add AwardConfig types and 41-entry award dataset"
```

---

## Task 2: Migrate Calculator to AwardConfig

**Files:**
- Modify: `src/utils/calculator.ts`
- Modify: `src/utils/calculator.test.ts`

- [ ] **Step 1: Update the tests first**

Replace the contents of `src/utils/calculator.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getResults, type DailyRecord } from './calculator';
import { type AwardConfig } from '../data/awards';

// A mock award matching GMP EA rates for all existing tests
const GMP_EA_MOCK: AwardConfig = {
  id: 'gmp-ea', name: 'GMP EA', shortName: 'GMP EA', isCustomEA: true,
  satOT1Multiplier: 1.5, satOT1LimitHours: 3.0, satOT2Multiplier: 2.0,
  sunMultiplier: 2.0, sunMinHours: 4.0, phMultiplier: 2.0,
  weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 3.0, weekdayOT2Multiplier: 2.0,
  casualLoading: 0.25, superRate: 0.12,
  minEngagementHours: 3.0, weeklyStandardHours: 38,
  defaultHourlyRate: 32.15, defaultStartTime: '06:00', defaultEndTime: '16:00', defaultBreakMinutes: 30,
  breakRules: [], classifications: [],
};

describe('AU Payslip Calculator Logic', () => {
  const casualRate = 31.19;
  const baseRate = 24.952; // 31.19 / 1.25
  const defaultDailyLimit = 7.6;

  it('applies min engagement (3.0h) for short shifts', () => {
    const records: DailyRecord[] = [{
      id: 1, enabled: true, startTime: '09:00', endTime: '10:00', breakMinutes: 0, isHoliday: false
    }];
    const res = getResults(records, casualRate, 'casual', defaultDailyLimit, GMP_EA_MOCK);
    expect(res.totalOrdinary).toBe(3.0);
    expect(res.payOrdinary).toBeCloseTo(3.0 * casualRate, 2);
  });

  it('calculates weekday overtime correctly', () => {
    const records: DailyRecord[] = [{
      id: 1, enabled: true, startTime: '08:00', endTime: '18:00', breakMinutes: 30, isHoliday: false
    }];
    // 9.5h net: 7.6 ordinary + 1.9 OT
    const res = getResults(records, casualRate, 'casual', defaultDailyLimit, GMP_EA_MOCK);
    expect(res.totalOrdinary).toBe(7.6);
    expect(res.totalOT15).toBe(1.9);
    expect(res.payOrdinary).toBeCloseTo(7.6 * casualRate, 2);
    expect(res.payOT15).toBeCloseTo(1.9 * baseRate * 1.5, 2);
  });

  it('handles custom min engagement (2.0h)', () => {
    const award = { ...GMP_EA_MOCK, minEngagementHours: 2.0 };
    const records: DailyRecord[] = [{
      id: 1, enabled: true, startTime: '09:00', endTime: '10:00', breakMinutes: 0, isHoliday: false
    }];
    const res = getResults(records, casualRate, 'casual', defaultDailyLimit, award);
    expect(res.totalOrdinary).toBe(2.0);
  });

  it('applies Sunday minimum 4h guarantee', () => {
    const records: DailyRecord[] = [{
      id: 7, enabled: true, startTime: '09:00', endTime: '11:00', breakMinutes: 0, isHoliday: false
    }];
    const res = getResults(records, casualRate, 'casual', defaultDailyLimit, GMP_EA_MOCK);
    expect(res.totalHoliday).toBe(4.0);
    expect(res.payHoliday).toBeCloseTo(4.0 * baseRate * 2.0, 2);
  });

  it('calculates GMP EA Saturday tiers (3h 1.5x then 2.0x)', () => {
    const records: DailyRecord[] = [{
      id: 6, enabled: true, startTime: '09:00', endTime: '14:00', breakMinutes: 0, isHoliday: false
    }];
    // 5h: 3h @ 1.5x, 2h @ 2.0x
    const res = getResults(records, casualRate, 'casual', defaultDailyLimit, GMP_EA_MOCK);
    expect(res.totalOT15).toBe(3.0);
    expect(res.totalOT20).toBe(2.0);
  });

  it('calculates flat Saturday rate when satOT1LimitHours = 0', () => {
    const meatAward = { ...GMP_EA_MOCK, satOT1LimitHours: 0, satOT1Multiplier: 1.5 };
    const records: DailyRecord[] = [{
      id: 6, enabled: true, startTime: '09:00', endTime: '14:00', breakMinutes: 0, isHoliday: false
    }];
    // 5h all at 1.5x, no 2.0x tier
    const res = getResults(records, casualRate, 'casual', defaultDailyLimit, meatAward);
    expect(res.totalOT15).toBe(5.0);
    expect(res.totalOT20).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/utils/calculator.test.ts
```
Expected: FAIL — type errors (getResults still expects old signature)

- [ ] **Step 3: Update `src/utils/calculator.ts`**

Replace the file contents:

```ts
import { type AwardConfig } from '../data/awards';

export interface DailyRecord {
  id: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isHoliday: boolean;
}

export type EmploymentType = 'permanent' | 'casual';

export const calculateHours = (start: string, end: string) => {
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  let diff = (eH + eM / 60) - (sH + sM / 60);
  if (diff < 0) diff += 24;
  return diff;
};

export interface DailyBreakdown {
  id: number;
  totalHours: number;
  ordHours: number;
  otHours: number;
  holHours: number;
}

export const getResults = (
  records: DailyRecord[],
  hourlyRate: number,
  empType: EmploymentType,
  dailyLimit: number,
  award: AwardConfig,
) => {
  const baseRate = empType === 'casual'
    ? hourlyRate / (1 + award.casualLoading)
    : hourlyRate;

  let summary = {
    totalOrdinary: 0, totalOT15: 0, totalOT20: 0, totalHoliday: 0,
    payOrdinary: 0, payOT15: 0, payOT20: 0, payHoliday: 0,
  };

  const dailyBreakdown: DailyBreakdown[] = [];

  records.filter(r => r.enabled).forEach(r => {
    const dailyGross = calculateHours(r.startTime, r.endTime);
    let netHours = Math.max(0, dailyGross - (r.breakMinutes / 60));

    if (netHours > 0) {
      netHours = Math.max(netHours, award.minEngagementHours);
    }

    let ord = 0, ot15 = 0, ot20 = 0, hol = 0;
    const dayIndex = r.id; // 1=Mon, 6=Sat, 7=Sun

    if (r.isHoliday) {
      hol = netHours;
      summary.payHoliday += hol * baseRate * award.phMultiplier;
    } else if (dayIndex === 7) {
      hol = Math.max(netHours, award.sunMinHours);
      summary.payHoliday += hol * baseRate * award.sunMultiplier;
    } else if (dayIndex === 6) {
      if (award.satOT1LimitHours === 0) {
        // Flat Saturday rate — all hours at satOT1Multiplier
        ot15 = netHours;
        summary.payOT15 += ot15 * baseRate * award.satOT1Multiplier;
      } else {
        ot15 = Math.min(netHours, award.satOT1LimitHours);
        ot20 = Math.max(0, netHours - award.satOT1LimitHours);
        summary.payOT15 += ot15 * baseRate * award.satOT1Multiplier;
        summary.payOT20 += ot20 * baseRate * award.satOT2Multiplier;
      }
    } else {
      ord = Math.min(netHours, dailyLimit);
      const remaining = Math.max(0, netHours - dailyLimit);
      ot15 = Math.min(remaining, award.weekdayOT1LimitHours);
      ot20 = Math.max(0, remaining - award.weekdayOT1LimitHours);

      const ordRate = empType === 'casual' ? hourlyRate : baseRate;
      summary.payOrdinary += ord * ordRate;
      summary.payOT15 += ot15 * baseRate * award.weekdayOT1Multiplier;
      summary.payOT20 += ot20 * baseRate * award.weekdayOT2Multiplier;
    }

    summary.totalOrdinary = Math.round((summary.totalOrdinary + ord) * 100) / 100;
    summary.totalOT15 = Math.round((summary.totalOT15 + ot15) * 100) / 100;
    summary.totalOT20 = Math.round((summary.totalOT20 + ot20) * 100) / 100;
    summary.totalHoliday = Math.round((summary.totalHoliday + hol) * 100) / 100;

    dailyBreakdown.push({
      id: r.id,
      totalHours: Math.round(netHours * 10) / 10,
      ordHours: Math.round(ord * 10) / 10,
      otHours: Math.round((ot15 + ot20) * 10) / 10,
      holHours: Math.round(hol * 10) / 10,
    });
  });

  const grossPay = Math.round(
    (summary.payOrdinary + summary.payOT15 + summary.payOT20 + summary.payHoliday) * 100
  ) / 100;

  const superGuarantee = Math.round(summary.payOrdinary * award.superRate * 100) / 100;

  return {
    ...summary,
    grossPay,
    superGuarantee,
    baseRate: Math.round(baseRate * 100) / 100,
    dailyBreakdown,
  };
};
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/utils/calculator.test.ts src/data/awards.test.ts
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/calculator.ts src/utils/calculator.test.ts
git commit -m "feat: migrate calculator to accept AwardConfig parameter"
```

---

## Task 3: Migrate usePayslip Hook

**Files:**
- Modify: `src/hooks/usePayslip.ts`

- [ ] **Step 1: Replace `src/hooks/usePayslip.ts`**

```ts
import { useState, useEffect, useMemo } from 'react';
import { type DailyRecord, getResults, type EmploymentType } from '../utils/calculator';
import { AWARDS, getAwardById, DEFAULT_AWARD_ID, type AwardConfig } from '../data/awards';

const INITIAL_DAYS = [
  { id: 1, en: 'Mon', cn: '週一' },
  { id: 2, en: 'Tue', cn: '週二' },
  { id: 3, en: 'Wed', cn: '週三' },
  { id: 4, en: 'Thu', cn: '週四' },
  { id: 5, en: 'Fri', cn: '週五' },
  { id: 6, en: 'Sat', cn: '週六' },
  { id: 7, en: 'Sun', cn: '週日' },
];

export interface UIRecord extends DailyRecord {
  day: string;
  dayCn: string;
}

export function usePayslip() {
  const [selectedAwardId, setSelectedAwardId] = useState<string>(() =>
    localStorage.getItem('selectedAwardId') ?? DEFAULT_AWARD_ID
  );

  const award: AwardConfig = useMemo(
    () => getAwardById(selectedAwardId) ?? AWARDS[0],
    [selectedAwardId]
  );

  const [hourlyRate, setHourlyRate] = useState<number>(() => {
    const saved = localStorage.getItem('hourlyRate');
    return saved ? parseFloat(saved) : award.defaultHourlyRate;
  });

  const [empType, setEmpType] = useState<EmploymentType>(() =>
    (localStorage.getItem('empType') as EmploymentType) ?? 'casual'
  );

  const getDefaultRecords = (a: AwardConfig): UIRecord[] =>
    INITIAL_DAYS.map((d) => ({
      id: d.id, day: d.en, dayCn: d.cn,
      enabled: d.id <= 5,
      startTime: a.defaultStartTime,
      endTime: a.defaultEndTime,
      breakMinutes: a.defaultBreakMinutes,
      isHoliday: false,
    }));

  const [records, setRecords] = useState<UIRecord[]>(() => {
    const saved = localStorage.getItem('payslipRecords');
    if (saved) return JSON.parse(saved);
    return getDefaultRecords(award);
  });

  useEffect(() => {
    localStorage.setItem('selectedAwardId', selectedAwardId);
  }, [selectedAwardId]);

  useEffect(() => {
    localStorage.setItem('hourlyRate', hourlyRate.toString());
  }, [hourlyRate]);

  useEffect(() => {
    localStorage.setItem('empType', empType);
  }, [empType]);

  useEffect(() => {
    localStorage.setItem('payslipRecords', JSON.stringify(records));
  }, [records]);

  const updateRecord = <K extends keyof UIRecord>(id: number, field: K, value: UIRecord[K]) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const resetAllData = () => {
    setHourlyRate(award.defaultHourlyRate);
    setEmpType('casual');
    setRecords(getDefaultRecords(award));
  };

  const dailyLimit = useMemo(() => {
    const enabledDaysCount = records.filter(r => r.enabled && r.id <= 5).length;
    if (enabledDaysCount === 0) return award.weeklyStandardHours / 5;
    return Math.round((award.weeklyStandardHours / enabledDaysCount) * 100) / 100;
  }, [records, award]);

  const results = useMemo(
    () => getResults(records, hourlyRate, empType, dailyLimit, award),
    [records, hourlyRate, empType, dailyLimit, award]
  );

  return {
    award, selectedAwardId, setSelectedAwardId,
    hourlyRate, setHourlyRate,
    empType, setEmpType,
    records, updateRecord,
    results, dailyLimit,
    resetAllData,
  };
}
```

- [ ] **Step 2: Verify build compiles (no TypeScript errors)**

```bash
npx tsc --noEmit
```
Expected: errors only in `App.tsx` (still references old `minEngagement` / `AU_REGS`) — that's fine, we fix it in Task 7.

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/usePayslip.ts
git commit -m "feat: migrate usePayslip to use AwardConfig, remove minEngagement state"
```

---

## Task 4: Update Locales

**Files:**
- Modify: `src/locales/en.ts`
- Modify: `src/locales/tw.ts`

- [ ] **Step 1: Replace `src/locales/en.ts`**

```ts
import { type Translation } from './tw';

export const en: Translation = {
  title: 'AU Payslip Checker',
  rate: 'Employment Settings',
  hourlyRateLabel: 'Hourly Rate',
  empType: 'Employment Type',
  permanent: 'Permanent',
  casual: 'Casual',
  baseRateHint: 'Base Rate for Overtime',
  on: 'ON',
  day: 'DAY',
  start: 'START',
  end: 'END',
  break: 'Unpaid Smoko (m)',
  holiday: 'Public Holiday',
  summary: 'Pay Overview',
  ord: 'Ordinary Time',
  ot15: 'Overtime (1.5x)',
  ot20: 'Overtime (2.0x)',
  hol: 'Public Holiday',          // removed hardcoded "2.0x"
  gross: 'Total Gross Earnings',
  super: 'Super',
  details: 'Daily Hours',
  fwo_site: 'Visit Fair Work Ombudsman',
  fwo_calc: 'Use FWO Pay Calculator',
  howItWorks: 'Calculation Rules',
  rule_weekday: 'Daily Overtime: First OT hours at 1.5x, then 2x (applied after daily ordinary limit).',
  rule_break: 'Unpaid Breaks: FWO standard is 30m. Adjust per your EA (e.g. 50m or 65m Smoko).',
  rule_minimum: 'Min. Engagement: Automatically applies the minimum shift duration from the selected Award.',
  rule_limit: 'Daily Cap: Standard weekly hours divided by work days (e.g. 7.6h for 5-day week).',
  rule_fwo: 'Rate Verification: Cross-check with FWO Pay Calculator for your specific Award.',
  rule_sat: 'Saturday: Penalty rates apply per the selected Award.',
  rule_sun: 'Sunday: Double time with minimum engagement guarantee per the selected Award.',
  rule_ph: 'Public Holiday: Penalty rate per the selected Award.',
  rule_super: 'Super: Calculated on Ordinary Time Earnings (OTE) only.',  // removed hardcoded 12%
  rule_casual: 'Casual Overtime: Calculated using the Base Rate (excluding casual loading).',
  copyBtn: 'Copy Pay Summary',
  copyDone: 'Copied to Clipboard',
  resetBtn: 'Reset All Data',
  resetBtnShort: 'Reset',
  resetConfirmTitle: 'Reset all data?',
  resetConfirmDesc: 'All input data will be restored to default values.',
  cancel: 'Cancel',
  confirm: 'Confirm Reset',
  disclaimer: 'For estimation only. Refer to your EA or FWO for exact rules.',
  privacy: 'No data leaves your device. All calculations are performed locally.',
  // Award selector
  awardLabel: 'Award',
  viewFullDetails: 'View full details',
  useThisAward: 'Use this Award',
  classificationLevel: 'Classification Level',
  awardMinimum: 'Award minimum',
  yourActualRate: 'Your actual rate',
  overrideHint: 'Override if your EA pays above award minimum',
  casualBaseRate: 'Base rate (÷1.25)',
  breakRulesLabel: 'Break Rules',
  shiftDuration: 'Shift Duration',
  mealBreak: 'Meal Break',
  restBreak: 'Rest Break',
  paid: 'Paid',
  unpaid: 'Unpaid',
  allAwards: 'All Awards',
  penaltyRates: 'Penalty Rates',
  otherRules: 'Other Rules',
  minEngLabel: 'Min. Engagement',
  notInCalculator: 'Not included in calculator',
};
```

- [ ] **Step 2: Replace `src/locales/tw.ts`**

```ts
export const tw = {
  title: 'AU Payslip Checker',
  rate: '薪資設定',
  hourlyRateLabel: '時薪',
  empType: '雇用身分',
  permanent: '正職(FT/PT)',
  casual: '臨時 (Casual)',
  baseRateHint: '計算基準時薪',
  on: 'ON',
  day: '星期',
  start: '上班打卡',
  end: '下班打卡',
  break: '無薪 Smoko (m)',
  holiday: '國定假日',
  summary: '薪資總覽',
  ord: '普通工時',
  ot15: '加班 (1.5x)',
  ot20: '加班 (2.0x)',
  hol: '國定假日',              // removed hardcoded rate
  gross: '稅前總額',
  super: '退休金',
  details: '每日時數',
  fwo_site: '造訪 Fair Work 官網',
  fwo_calc: '造訪 FWO 薪資計算機',
  howItWorks: '計算規則',
  rule_weekday: '平日加班：超過每日上限後，前幾小時為 1.5x，之後 2x。',
  rule_break: '無薪休息：FWO 標準為 30m，可依公司 EA 填寫。',
  rule_minimum: '最低起聘：自動套用所選 Award 的最低保障時數。',
  rule_limit: '每日上限：每週標準工時分攤至工作天數 (如 5 天制為 7.6h)。',
  rule_fwo: '費率核對：建議搭配 FWO 官方薪資計算機以取得您的 Award 正確費率。',
  rule_sat: '週六：依所選 Award 的 Penalty Rate 計算。',
  rule_sun: '週日：依所選 Award 的倍率計算，並保證最低時數。',
  rule_ph: '公假：依所選 Award 的倍率計算。',
  rule_super: '退休金：僅依據普通工時薪資 (OTE) 計算。',  // removed hardcoded 12%
  rule_casual: 'Casual 加班費是以底薪計算 (已扣除 Casual Loading)。',
  copyBtn: '複製薪資摘要',
  copyDone: '已複製',
  resetBtn: '重設所有資料',
  resetBtnShort: '重設',
  resetConfirmTitle: '確定要重設嗎？',
  resetConfirmDesc: '所有輸入資料將會恢復至預設值。',
  cancel: '取消',
  confirm: '確定重設',
  disclaimer: '僅供參考。詳細規則請參照公司 EA 或 Fair Work 官方說明。',
  privacy: '數據不離身。僅在本地瀏覽器計算。',
  // Award selector (stubs — fill Chinese translations in follow-up)
  awardLabel: 'Award',
  viewFullDetails: '查看詳細',
  useThisAward: '套用此 Award',
  classificationLevel: '職級',
  awardMinimum: 'Award 最低時薪',
  yourActualRate: '你的實際時薪',
  overrideHint: '若 EA 高於 Award 最低，請在此覆蓋',
  casualBaseRate: '底薪 (÷1.25)',
  breakRulesLabel: '休息規則',
  shiftDuration: '班次長度',
  mealBreak: '用餐休息',
  restBreak: '短暫休息',
  paid: '有薪',
  unpaid: '無薪',
  allAwards: '所有 Award',
  penaltyRates: 'Penalty Rates',
  otherRules: '其他規則',
  minEngLabel: 'Award 最低保障時數',
  notInCalculator: '計算機不計算此項',
};

export type Translation = typeof tw;
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: Errors only in App.tsx (still using old locale keys like `minEngLabel` in the wrong place) — fix in Task 7.

- [ ] **Step 4: Commit**

```bash
git add src/locales/en.ts src/locales/tw.ts
git commit -m "feat: add award selector translation keys, fix hardcoded rates in locale strings"
```

---

## Task 5: Create AwardSelector Component

**Files:**
- Create: `src/components/AwardSelector.tsx`

The `AwardSelector` is a full-screen overlay (like `ResetModal`). It shows the award list and lets the user switch awards or navigate to the detail page.

- [ ] **Step 1: Create `src/components/AwardSelector.tsx`**

```tsx
import { AWARDS, type AwardConfig } from '../data/awards';
import { type Translation } from '../locales/tw';

interface Props {
  t: Translation;
  currentAwardId: string;
  onSelect: (awardId: string) => void;
  onViewDetail: (awardId: string) => void;
  onClose: () => void;
}

export function AwardSelector({ t, currentAwardId, onSelect, onViewDetail, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="award-selector-sheet" onClick={e => e.stopPropagation()}>
        <div className="award-selector-handle" />
        <div className="award-selector-header">
          <h3 className="section-title" style={{ margin: 0 }}>{t.awardLabel}</h3>
          <button className="modal-btn cancel" onClick={onClose}>✕</button>
        </div>
        <div className="award-selector-list">
          {AWARDS.map(award => (
            <AwardRow
              key={award.id}
              award={award}
              isActive={award.id === currentAwardId}
              onSelect={() => { onSelect(award.id); onClose(); }}
              onViewDetail={() => onViewDetail(award.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AwardRow({ award, isActive, onSelect, onViewDetail }: {
  award: AwardConfig;
  isActive: boolean;
  onSelect: () => void;
  onViewDetail: () => void;
}) {
  return (
    <div className={`award-row ${isActive ? 'award-row-active' : ''}`} onClick={onSelect}>
      <div className="award-row-dot" />
      <div className="award-row-info">
        <span className="award-row-name">{award.shortName}</span>
        {!award.isCustomEA && (
          <span className="award-row-ma">{award.id}</span>
        )}
      </div>
      {isActive && <span className="award-row-check">✓</span>}
      <button
        className="award-row-info-btn"
        onClick={e => { e.stopPropagation(); onViewDetail(); }}
        title="View details"
      >
        ⓘ
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add CSS for AwardSelector to `src/App.css`**

Append to the end of `src/App.css`:

```css
/* === Award Selector === */
.award-selector-sheet {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px 16px 0 0;
  padding: 12px 16px 24px;
  width: 100%;
  max-width: 500px;
  margin: auto auto 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.award-selector-handle {
  width: 36px; height: 4px;
  background: var(--border);
  border-radius: 2px;
  margin: 0 auto 12px;
}

.award-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.award-selector-list {
  overflow-y: auto;
  flex: 1;
}

.award-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;
}

.award-row:hover { background: rgba(0, 210, 255, 0.04); }
.award-row:last-child { border-bottom: none; }

.award-row-active { background: rgba(0, 210, 255, 0.06); }

.award-row-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--border);
  flex-shrink: 0;
}
.award-row-active .award-row-dot { background: var(--secondary); }

.award-row-info { flex: 1; }
.award-row-name { color: var(--text); font-size: 0.9rem; display: block; }
.award-row-ma { color: var(--label-color); font-size: 0.75rem; }
.award-row-active .award-row-name { color: var(--secondary); font-weight: 600; }

.award-row-check { color: var(--secondary); font-size: 0.9rem; }

.award-row-info-btn {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 1rem;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  opacity: 0.7;
}
.award-row-info-btn:hover { opacity: 1; }
```

- [ ] **Step 3: Verify TypeScript compiles (no errors in the new file)**

```bash
npx tsc --noEmit 2>&1 | grep AwardSelector
```
Expected: no output (no errors for AwardSelector)

- [ ] **Step 4: Commit**

```bash
git add src/components/AwardSelector.tsx src/App.css
git commit -m "feat: add AwardSelector bottom sheet component"
```

---

## Task 6: Create AwardDetailPage Component

**Files:**
- Create: `src/components/AwardDetailPage.tsx`

- [ ] **Step 1: Create `src/components/AwardDetailPage.tsx`**

```tsx
import { useState } from 'react';
import { getAwardById } from '../data/awards';
import { type Translation } from '../locales/tw';

interface Props {
  t: Translation;
  awardId: string;
  currentHourlyRate: number;
  onUseAward: (awardId: string, hourlyRate: number) => void;
  onBack: () => void;
}

export function AwardDetailPage({ t, awardId, currentHourlyRate, onUseAward, onBack }: Props) {
  const award = getAwardById(awardId);
  if (!award) return null;

  const [selectedClassIdx, setSelectedClassIdx] = useState<number | null>(null);
  const [rateOverride, setRateOverride] = useState<number>(
    selectedClassIdx !== null && award.classifications[selectedClassIdx]
      ? award.classifications[selectedClassIdx].ratePerHour
      : currentHourlyRate
  );

  const handleClassSelect = (idx: number) => {
    setSelectedClassIdx(idx);
    setRateOverride(award.classifications[idx].ratePerHour);
  };

  const handleUseAward = () => {
    onUseAward(award.id, rateOverride);
  };

  return (
    <div className="award-detail-page">
      {/* Header */}
      <div className="award-detail-header">
        <button className="award-back-btn" onClick={onBack}>← {t.allAwards}</button>
        <button className="btn-use-award" onClick={handleUseAward}>{t.useThisAward} →</button>
      </div>

      <div className="award-detail-body">
        {/* Award title */}
        <div className="award-detail-title-card">
          {!award.isCustomEA && (
            <span className="award-ma-badge">{award.id}</span>
          )}
          <h2 className="award-detail-name">{award.name}</h2>
        </div>

        {/* Classification levels */}
        {award.classifications.length > 0 && (
          <div className="sidebar-card">
            <h3 className="section-title">{t.classificationLevel}</h3>
            <div className="classification-grid">
              {award.classifications.map((c, idx) => (
                <button
                  key={c.code}
                  className={`class-btn ${selectedClassIdx === idx ? 'class-btn-active' : ''}`}
                  onClick={() => handleClassSelect(idx)}
                >
                  <span className="class-code">{c.code}</span>
                  <span className="class-rate">${c.ratePerHour.toFixed(2)}</span>
                </button>
              ))}
            </div>
            {/* Rate override */}
            <div className="rate-override-row">
              <span className="lbl-small">{t.yourActualRate}</span>
              <div className="input-with-symbol mini">
                <span>$</span>
                <input
                  type="number"
                  step="0.01"
                  value={rateOverride || ''}
                  onFocus={e => e.target.select()}
                  onChange={e => setRateOverride(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <p className="hint-text">{t.overrideHint}</p>
          </div>
        )}

        {/* Penalty Rates */}
        <div className="sidebar-card">
          <h3 className="section-title">{t.penaltyRates}</h3>
          <div className="penalty-grid">
            <PenaltyCard label="Saturday" value={
              award.satOT1LimitHours === 0
                ? `×${award.satOT1Multiplier}`
                : `×${award.satOT1Multiplier} (${award.satOT1LimitHours}h) → ×${award.satOT2Multiplier}`
            } />
            <PenaltyCard label="Sunday" value={`×${award.sunMultiplier}`} note={`min ${award.sunMinHours}h`} />
            <PenaltyCard label="Public Holiday" value={`×${award.phMultiplier}`} />
            <PenaltyCard
              label={`OT (first ${award.weekdayOT1LimitHours}h)`}
              value={`×${award.weekdayOT1Multiplier}`}
            />
            <PenaltyCard label="OT (after)" value={`×${award.weekdayOT2Multiplier}`} />
            {award.afternoonShiftMultiplier && (
              <PenaltyCard
                label="Afternoon Shift"
                value={`×${award.afternoonShiftMultiplier}`}
                note={t.notInCalculator}
                muted
              />
            )}
          </div>
        </div>

        {/* Break Rules */}
        <div className="sidebar-card">
          <h3 className="section-title">{t.breakRulesLabel}</h3>
          <table className="break-table">
            <thead>
              <tr>
                <th>{t.shiftDuration}</th>
                <th>{t.mealBreak}</th>
                <th>{t.restBreak}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ color: 'var(--label-color)' }}>Under {award.breakRules[0]?.shiftMinHours ?? 5}h</td>
                <td>—</td><td>—</td><td>—</td>
              </tr>
              {award.breakRules.map((rule, idx) => (
                <tr key={idx}>
                  <td>
                    {rule.shiftMinHours}h
                    {award.breakRules[idx + 1] ? ` – ${award.breakRules[idx + 1].shiftMinHours}h` : '+'}
                  </td>
                  <td>{rule.mealBreakMinutes > 0 ? `${rule.mealBreakMinutes} min` : '—'}</td>
                  <td>{rule.restBreakMinutes > 0 ? `${rule.restBreakMinutes} min` : '—'}</td>
                  <td>
                    {rule.restBreakMinutes > 0
                      ? <span className="tag-paid">{t.paid}</span>
                      : <span className="tag-unpaid">{t.unpaid}</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Other Rules */}
        <div className="sidebar-card">
          <h3 className="section-title">{t.otherRules}</h3>
          <div className="other-rules-grid">
            <RuleChip label={t.minEngLabel} value={`${award.minEngagementHours}h`} />
            <RuleChip label="Standard Week" value={`${award.weeklyStandardHours}h`} />
            <RuleChip label={t.super} value={`${(award.superRate * 100).toFixed(0)}%`} />
            <RuleChip label="Casual Loading" value={`${(award.casualLoading * 100).toFixed(0)}%`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PenaltyCard({ label, value, note, muted }: {
  label: string; value: string; note?: string; muted?: boolean;
}) {
  return (
    <div className="penalty-card">
      <div className="penalty-label">{label}</div>
      <div className={`penalty-value ${muted ? 'penalty-muted' : ''}`}>{value}</div>
      {note && <div className="penalty-note">{note}</div>}
    </div>
  );
}

function RuleChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rule-chip">
      <div className="rule-chip-label">{label}</div>
      <div className="rule-chip-value">{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Add CSS for AwardDetailPage to `src/App.css`**

Append to `src/App.css`:

```css
/* === Award Detail Page === */
.award-detail-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 1rem 2rem;
  box-sizing: border-box;
}

.award-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-top: 0.5rem;
}

.award-back-btn {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.9rem;
  cursor: pointer;
  padding: 4px 0;
}
.award-back-btn:hover { text-decoration: underline; }

.btn-use-award {
  background: var(--primary);
  color: #000;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-use-award:hover { opacity: 0.85; }

.award-detail-title-card {
  margin-bottom: 1rem;
}

.award-ma-badge {
  display: inline-block;
  background: rgba(0, 210, 255, 0.1);
  color: var(--primary);
  border: 1px solid rgba(0, 210, 255, 0.2);
  border-radius: 5px;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 700;
  margin-bottom: 6px;
}

.award-detail-name {
  color: var(--text);
  font-size: 1.3rem;
  margin: 0;
}

.award-detail-body { display: flex; flex-direction: column; gap: 0; }

/* Classification grid */
.classification-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.class-btn {
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s;
  min-width: 70px;
}
.class-btn:hover { border-color: var(--primary); }
.class-btn-active {
  background: rgba(0, 210, 255, 0.1);
  border-color: var(--primary);
}

.class-code { display: block; color: var(--primary); font-weight: 700; font-size: 0.85rem; }
.class-rate { display: block; color: var(--secondary); font-size: 0.75rem; }

.rate-override-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.lbl-small { color: var(--label-color); font-size: 0.85rem; }
.hint-text { color: var(--label-color); font-size: 0.75rem; margin: 0; }

/* Penalty grid */
.penalty-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.penalty-card {
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
}

.penalty-label { color: var(--label-color); font-size: 0.75rem; margin-bottom: 4px; }
.penalty-value { color: #fab387; font-size: 1rem; font-weight: 700; }
.penalty-muted { color: var(--label-color) !important; }
.penalty-note { color: var(--label-color); font-size: 0.7rem; margin-top: 3px; }

/* Break table */
.break-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.break-table th {
  color: var(--label-color);
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
  font-weight: 600;
}
.break-table td {
  padding: 7px 8px;
  color: var(--text);
  border-bottom: 1px solid var(--border);
}
.break-table tr:last-child td { border-bottom: none; }

.tag-paid {
  background: rgba(166, 227, 161, 0.1);
  color: #a6e3a1;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
}
.tag-unpaid {
  background: rgba(243, 139, 168, 0.1);
  color: #f38ba8;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
}

/* Other rules */
.other-rules-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.rule-chip {
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
}
.rule-chip-label { color: var(--label-color); font-size: 0.75rem; margin-bottom: 3px; }
.rule-chip-value { color: var(--text); font-size: 1rem; font-weight: 700; }

@media (max-width: 600px) {
  .penalty-grid { grid-template-columns: repeat(2, 1fr); }
  .other-rules-grid { grid-template-columns: repeat(2, 1fr); }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep AwardDetailPage
```
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add src/components/AwardDetailPage.tsx src/App.css
git commit -m "feat: add AwardDetailPage component with classification, penalty rates, break rules"
```

---

## Task 7: Wire Everything in App.tsx

**Files:**
- Modify: `src/App.tsx`

This is the largest change. The sidebar is reorganised into Award → Rate → Summary. `minEngagement` state and UI is removed. Two new overlays are conditionally rendered.

- [ ] **Step 1: Replace `src/App.tsx`**

```tsx
import { useState, useEffect } from 'react';
import './App.css';
import { usePayslip } from './hooks/usePayslip';
import { tw } from './locales/tw';
import { en } from './locales/en';
import { formatPaySummary } from './utils/formatters';
import { ResetModal } from './components/ResetModal';
import { MainView } from './components/MainView';
import { AwardSelector } from './components/AwardSelector';
import { AwardDetailPage } from './components/AwardDetailPage';

function App() {
  const [lang, setLang] = useState<'en' | 'tw'>('en');
  const [showRules, setShowRules] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showAwardSelector, setShowAwardSelector] = useState(false);
  const [detailAwardId, setDetailAwardId] = useState<string | null>(null);
  const [isPulsing, setIsPulsing] = useState(false);

  const {
    award, selectedAwardId, setSelectedAwardId,
    hourlyRate, setHourlyRate,
    empType, setEmpType,
    records, updateRecord,
    results, resetAllData
  } = usePayslip();

  const t = lang === 'en' ? en : tw;

  useEffect(() => {
    if (results.grossPay > 0) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 500);
      return () => clearTimeout(timer);
    }
  }, [results.grossPay]);

  const handleCopy = () => {
    const text = formatPaySummary(t, lang, records, results);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseAward = (awardId: string, hourlyRate: number) => {
    setSelectedAwardId(awardId);
    setHourlyRate(hourlyRate);
    setDetailAwardId(null);
  };

  const DAY_NAMES: Record<number, { en: string; tw: string }> = {
    1: { en: 'Mon', tw: '週一' }, 2: { en: 'Tue', tw: '週二' },
    3: { en: 'Wed', tw: '週三' }, 4: { en: 'Thu', tw: '週四' },
    5: { en: 'Fri', tw: '週五' }, 6: { en: 'Sat', tw: '週六' },
    7: { en: 'Sun', tw: '週日' },
  };

  const renderRule = (text: string) => {
    const parts = text.split(/[:：]/);
    if (parts.length > 1) {
      return (
        <p className="note highlight">
          • <strong>{parts[0]}</strong>: {parts.slice(1).join(':')}
        </p>
      );
    }
    return <p className="note highlight">• {text}</p>;
  };

  const renderRuleContent = () => (
    <div className="note-group">
      {renderRule(t.rule_limit)}
      {renderRule(t.rule_minimum)}
      {renderRule(t.rule_break)}
      {renderRule(t.rule_weekday)}
      {renderRule(t.rule_sat)}
      {renderRule(t.rule_sun)}
      {renderRule(t.rule_super)}
      {empType === 'casual' && <p className="note highlight">• {t.rule_casual}</p>}
      <div className="separator-mini"></div>
      {renderRule(t.rule_fwo)}
      <div className="disclaimer-mini">{t.disclaimer}</div>
    </div>
  );

  const SidebarContent = (
    <>
      {/* AWARD CARD */}
      <div className="sidebar-card">
        <h3 className="section-title">{t.awardLabel}</h3>
        <button
          className="award-selector-btn"
          onClick={() => setShowAwardSelector(true)}
        >
          <span className="award-selector-name">{award.shortName}</span>
          <span className="award-selector-chevron">⌄</span>
        </button>
        <button
          className="award-detail-link"
          onClick={() => setDetailAwardId(award.id)}
        >
          {t.viewFullDetails} →
        </button>
      </div>

      {/* RATE CARD */}
      <div className="sidebar-card">
        <h3 className="section-title">{t.hourlyRateLabel}</h3>
        <div className="rate-input-row">
          <div className="input-with-symbol rate-big">
            <span>$</span>
            <input
              type="number"
              step="0.01"
              value={hourlyRate || ''}
              onFocus={e => e.target.select()}
              onChange={e => setHourlyRate(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="emp-toggle">
          <button className={empType === 'permanent' ? 'active' : ''} onClick={() => setEmpType('permanent')}>
            {t.permanent}
          </button>
          <button className={empType === 'casual' ? 'active' : ''} onClick={() => setEmpType('casual')}>
            {t.casual}
          </button>
        </div>
        {empType === 'casual' && (
          <div className="casual-base-rate-hint">
            <span>{t.casualBaseRate}</span>
            <strong>${results.baseRate}</strong>
          </div>
        )}
      </div>

      {/* PAY OVERVIEW */}
      <div className="summary-card flat-block">
        <h3 className="section-title">{t.summary}</h3>
        <div className="pay-overview-grid">
          <div className="po-row">
            <span className="po-label">{t.ord}</span>
            <span className="po-hours">{results.totalOrdinary.toFixed(1)}h</span>
          </div>
          <div className="po-row">
            <span className="po-label">{t.ot15}</span>
            <span className="po-hours">{results.totalOT15.toFixed(1)}h</span>
          </div>
          <div className="po-row">
            <span className="po-label">{t.hol}</span>
            <span className="po-hours">{(results.totalOT20 + results.totalHoliday).toFixed(1)}h</span>
          </div>
          <div className="po-separator"></div>
          <div className="po-row po-accent">
            <span className="po-label">{t.gross}</span>
            <strong className={`po-amount ${isPulsing ? 'gross-pulse' : ''}`}>
              ${results.grossPay.toLocaleString(undefined, { minimumFractionDigits: 3 })}
            </strong>
          </div>
          <div className="po-row po-super">
            <span className="po-label">
              {t.super} ({(award.superRate * 100).toFixed(0)}%)
            </span>
            <strong className="po-amount po-super-amount">
              ${results.superGuarantee.toLocaleString(undefined, { minimumFractionDigits: 3 })}
            </strong>
          </div>
        </div>
        <button className={`copy-summary-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
          {copied ? t.copyDone : t.copyBtn}
        </button>
      </div>

      {/* DAILY HOURS */}
      {results.dailyBreakdown.length > 0 && (
        <div className="sidebar-card">
          <h3 className="section-title">{t.details}</h3>
          <div className="daily-hours-list">
            {results.dailyBreakdown.map(d => {
              const names = DAY_NAMES[d.id];
              const dayName = lang === 'en' ? names?.en : names?.tw;
              return (
                <div key={d.id} className="daily-hours-row">
                  <span className="dh-day">{dayName}</span>
                  <span className="dh-total">{d.totalHours}h</span>
                  <span className="dh-detail">
                    ORD:{d.ordHours} | OT:{d.otHours} | H:{d.holHours}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );

  const ResourceLinks = (
    <div className="resource-links">
      <a href="https://www.fairwork.gov.au/" target="_blank" rel="noreferrer" className="fw-link-card">
        <span className="link-title">{t.fwo_site}</span>
        <span className="link-arrow">→</span>
      </a>
      <a href="https://calculate.fairwork.gov.au/FindYourAward" target="_blank" rel="noreferrer" className="fw-link-card highlight-link">
        <span className="link-title">{t.fwo_calc}</span>
        <span className="link-arrow">→</span>
      </a>
    </div>
  );

  // Award Detail Page takes over full content area
  if (detailAwardId) {
    return (
      <div className="container">
        <header>
          <h1>{t.title}</h1>
          <div className="header-right">
            <button className="lang-toggle-circle" onClick={() => setLang(lang === 'en' ? 'tw' : 'en')}>
              {lang === 'en' ? '中' : 'EN'}
            </button>
          </div>
        </header>
        <AwardDetailPage
          t={t}
          awardId={detailAwardId}
          currentHourlyRate={hourlyRate}
          onUseAward={handleUseAward}
          onBack={() => setDetailAwardId(null)}
        />
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <h1>{t.title}</h1>
        <div className="header-right">
          <button className="reset-header-btn" onClick={() => setShowResetModal(true)}>
            <span className="desktop-text">{t.resetBtn}</span>
            <span className="mobile-text">{t.resetBtnShort}</span>
          </button>
          <button className="lang-toggle-circle" onClick={() => setLang(lang === 'en' ? 'tw' : 'en')}>
            {lang === 'en' ? '中' : 'EN'}
          </button>
        </div>
      </header>

      <MainView
        t={t} lang={lang} records={records} updateRecord={updateRecord}
        showRules={showRules} setShowRules={setShowRules}
        renderRuleContent={renderRuleContent}
        awardShortName={award.shortName}
        Sidebar={SidebarContent}
        ResourceLinks={ResourceLinks}
      />

      {showResetModal && (
        <ResetModal
          t={t}
          onConfirm={() => { resetAllData(); setShowResetModal(false); }}
          onCancel={() => setShowResetModal(false)}
        />
      )}

      {showAwardSelector && (
        <AwardSelector
          t={t}
          currentAwardId={selectedAwardId}
          onSelect={setSelectedAwardId}
          onViewDetail={id => { setShowAwardSelector(false); setDetailAwardId(id); }}
          onClose={() => setShowAwardSelector(false)}
        />
      )}

      <footer className="version-footer">
        <div className="footer-centered-content">
          <div className="footer-row main-line">
            <span>© 2026 chengche</span>
            <span className="dot">·</span>
            <a href="https://github.com/crayon3shawn/payslip-checker" className="github-link-with-icon" target="_blank" rel="noreferrer">
              <svg height="14" width="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
              GitHub
            </a>
            <span className="dot">·</span>
            <span className="v-tag-small">v1.8.0</span>
          </div>
          <p className="privacy-msg-en">{t.privacy}</p>
          <div className="footer-row license-line">
            <span>Licensed under CC BY 4.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Update `MainView.tsx` to accept `awardShortName` prop for the Rules badge**

In `src/components/MainView.tsx`, add `awardShortName: string` to the `Props` interface and pass it to the logic header:

```tsx
interface Props {
  t: Translation;
  lang: 'en' | 'tw';
  records: UIRecord[];
  updateRecord: <K extends keyof UIRecord>(id: number, field: K, value: UIRecord[K]) => void;
  showRules: boolean;
  setShowRules: (v: boolean) => void;
  renderRuleContent: () => ReactNode;
  awardShortName: string;   // NEW
  Sidebar: ReactNode;
  ResourceLinks: ReactNode;
}
```

In the JSX, update the logic header to show the badge:
```tsx
<div className="logic-header" onClick={() => setShowRules(!showRules)}>
  <h3 className="section-title">
    {t.howItWorks}
    <span className="award-rules-badge">{awardShortName}</span>
  </h3>
  <span className={`arrow ${showRules ? 'up' : ''}`}>▼</span>
</div>
```

- [ ] **Step 3: Add Award card + casual hint CSS to `src/App.css`**

Append to `src/App.css`:

```css
/* === Award Card in Sidebar === */
.award-selector-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  background: rgba(0, 210, 255, 0.04);
  border: 1px solid rgba(0, 210, 255, 0.2);
  border-radius: 8px;
  padding: 9px 12px;
  cursor: pointer;
  transition: border-color 0.2s;
  box-sizing: border-box;
  margin-bottom: 8px;
}
.award-selector-btn:hover { border-color: var(--primary); }
.award-selector-name { color: var(--secondary); font-weight: 700; font-size: 0.95rem; }
.award-selector-chevron { color: var(--primary); font-size: 1.1rem; }

.award-detail-link {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
  text-align: right;
  width: 100%;
  display: block;
  opacity: 0.8;
}
.award-detail-link:hover { opacity: 1; text-decoration: underline; }

/* Casual base rate hint */
.casual-base-rate-hint {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  font-size: 0.8rem;
  color: var(--label-color);
}
.casual-base-rate-hint strong { color: var(--text); }

/* Award badge in rules panel */
.award-rules-badge {
  display: inline-block;
  background: rgba(58, 237, 202, 0.1);
  color: var(--secondary);
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-left: 8px;
  vertical-align: middle;
}
```

- [ ] **Step 4: Verify full build succeeds**

```bash
npx tsc --noEmit && npm run build
```
Expected: clean build, no TypeScript errors.

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```
Expected: All tests PASS.

- [ ] **Step 6: Manual smoke test**

```bash
npm run dev
```

Check in browser:
- [ ] GMP EA shown by default in Award card
- [ ] Clicking Award card opens the selector sheet
- [ ] Selecting a different Award updates the Rules badge
- [ ] "View full details →" navigates to Award Detail Page
- [ ] Classification buttons pre-fill the rate
- [ ] "Use this Award →" applies and returns to main screen
- [ ] Casual mode shows base rate hint below toggle
- [ ] Super rate label shows correct percentage
- [ ] Reset All Data works correctly

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/components/MainView.tsx src/App.css
git commit -m "feat: wire AwardSelector and AwardDetailPage into App, reorganise sidebar"
```

---

## Task 8: Delete `regulations.ts` and Final Cleanup

**Files:**
- Delete: `src/constants/regulations.ts`

- [ ] **Step 1: Verify nothing imports `regulations.ts`**

```bash
grep -r "regulations" src/ --include="*.ts" --include="*.tsx"
```
Expected: no output (zero matches)

- [ ] **Step 2: Delete the file**

```bash
rm src/constants/regulations.ts
```

- [ ] **Step 3: Verify build still passes**

```bash
npx tsc --noEmit && npm run build
```
Expected: clean build.

- [ ] **Step 4: Run all tests one final time**

```bash
npx vitest run
```
Expected: All tests PASS.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete multi-award support — delete regulations.ts, bump to v1.8.0"
```

---

## Summary

8 tasks, ~35 steps. Each task produces a working, committed state. The order matters:

```
awards.ts → calculator.ts → usePayslip.ts → locales → AwardSelector → AwardDetailPage → App.tsx → cleanup
```

No new dependencies required. All tests remain green throughout.
