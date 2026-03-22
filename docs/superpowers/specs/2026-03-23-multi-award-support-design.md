# Multi-Award Support Design

## Goal

Allow the user to switch between multiple Australian Fair Work Modern Awards and a custom Enterprise Agreement (GMP EA) when calculating payslip totals, so the app remains useful across different industries and jobs.

---

## Background

The app currently hardcodes one set of penalty rates (the user's current employer's EA). The user has previously worked under MA000020 (Building & Construction) and MA000038 (Security), and wants the flexibility to switch Awards without reconfiguring anything manually.

---

## Data Architecture

### Award Data — Hardcoded in TypeScript

All Award data is stored in `src/data/awards.ts` as a static TypeScript array. This is appropriate because:
- The app is purely client-side (no backend)
- Award data is small (~40 entries × ~15 fields)
- Fair Work Commission updates rates once per year (1 July), requiring only a file edit

Each Award entry contains:

```ts
interface AwardConfig {
  id: string;              // e.g. 'gmp-ea', 'MA000033'
  name: string;            // e.g. 'GMP EA', 'Meat Industry Award 2020'
  shortName: string;       // e.g. 'GMP EA', 'Meat Industry'
  isCustomEA?: boolean;    // true for GMP EA

  // Penalty rate multipliers
  satOT1Multiplier: number;      // Saturday tier 1 rate
  satOT1LimitHours: number;      // Hours at tier 1 before tier 2. Use satOT1LimitHours === 0 as
                                 // a sentinel meaning "flat Saturday rate — apply satOT1Multiplier
                                 // to ALL Saturday hours, ignore satOT2Multiplier entirely."
  satOT2Multiplier: number;      // Saturday tier 2 rate (ignored when satOT1LimitHours === 0)
  sunMultiplier: number;         // Sunday rate
  sunMinHours: number;           // Sunday minimum engagement
  phMultiplier: number;          // Public holiday rate
  weekdayOT1Multiplier: number;  // Weekday OT tier 1
  weekdayOT1LimitHours: number;  // Hours at tier 1 before tier 2
  weekdayOT2Multiplier: number;  // Weekday OT tier 2
  afternoonShiftMultiplier?: number; // Optional shift loading (display only, not used in main calc)

  // Employment
  casualLoading: number;         // e.g. 0.25
  superRate: number;             // e.g. 0.12
  minEngagementHours: number;    // e.g. 3
  weeklyStandardHours: number;   // e.g. 38 — used for dynamic daily limit calculation

  // Reset defaults (used by usePayslip.resetAllData)
  defaultHourlyRate: number;     // e.g. 32.15 for GMP EA, 24.10 for standard awards
  defaultStartTime: string;      // e.g. '06:00'
  defaultEndTime: string;        // e.g. '16:00'
  defaultBreakMinutes: number;   // e.g. 30

  // Break rules
  breakRules: BreakRule[];

  // Classification levels (empty array for GMP EA and custom EAs)
  classifications: Classification[];
}

interface BreakRule {
  shiftMinHours: number;   // minimum shift length to trigger this rule
  mealBreakMinutes: number;
  restBreakMinutes: number;
  restBreakPaid: boolean;
}

interface Classification {
  code: string;    // e.g. 'MI1', 'CW3'
  ratePerHour: number;
}
```

**Pre-populated entries (initial release):**
- `gmp-ea` — GMP EA (current employer, hardcoded rules matching existing `regulations.ts`)
- `MA000033` — Meat Industry Award 2020
- `MA000038` — Security Services Industry Award 2020
- `MA000020` — Building and Construction General On-site Award 2020
- All remaining 36 awards from the 40-award dataset

### User State — LocalStorage

Persisted via the existing `usePayslip` hook pattern:

| Key | Type | Description |
|-----|------|-------------|
| `selectedAwardId` | `string` | ID of the active award (default: `'gmp-ea'`) |
| `hourlyRate` | `number` | User's actual hourly rate (already persisted) |
| `empType` | `string` | `'permanent'` or `'casual'` (already persisted) |

`minEngagement` is removed from user state — it is read directly from the selected Award's `minEngagementHours`.

---

## Calculator Changes

### Dynamic Daily Limit

The existing dynamic daily limit calculation in `usePayslip.ts` is **preserved unchanged**:

```ts
const dailyLimit = useMemo(() => {
  const enabledDaysCount = records.filter(r => r.enabled && r.id <= 5).length;
  if (enabledDaysCount === 0) return award.weeklyStandardHours / 5;
  return Math.round((award.weeklyStandardHours / enabledDaysCount) * 100) / 100;
}, [records, award]);
```

`AU_REGS.WEEKLY_STANDARD_HOURS` is replaced with `award.weeklyStandardHours`. The dynamic behaviour (dividing by the number of enabled weekdays) is kept as-is.

### `getResults()` Signature

`src/utils/calculator.ts` — `getResults()` currently reads from `AU_REGS`. It will accept an `AwardConfig` parameter instead:

```ts
export const getResults = (
  records: DailyRecord[],
  hourlyRate: number,
  empType: EmploymentType,
  dailyLimit: number,        // still computed dynamically in usePayslip
  award: AwardConfig         // replaces minEngagement param and all AU_REGS references
) => { ... }
```

The Saturday tier handling in the calculator must implement the `satOT1LimitHours === 0` sentinel:

```ts
if (award.satOT1LimitHours === 0) {
  // flat rate — all Saturday hours at satOT1Multiplier
  ot15 = netHours;
} else {
  ot15 = Math.min(netHours, award.satOT1LimitHours);
  ot20 = Math.max(0, netHours - award.satOT1LimitHours);
}
```

### `regulations.ts` Migration

`AU_REGS` currently provides: penalty multipliers, default time/rate values, break duration, and standard hours. After migration:

- Penalty multipliers → `AwardConfig` fields in `awards.ts`
- `DEFAULT_HOURLY_RATE`, `DEFAULT_START`, `DEFAULT_END`, `UNPAID_BREAK_DURATION` → `AwardConfig.defaultHourlyRate`, `defaultStartTime`, `defaultEndTime`, `defaultBreakMinutes` fields on each award entry
- `regulations.ts` can be **deleted** once `usePayslip.ts` and `calculator.ts` are fully migrated

---

## UI Changes

### Main Screen — Sidebar

The right sidebar is reorganised into three cards (top to bottom):

**Card 1 — Award**
- Award selector button: shows current award name + `⌄` chevron
- Clicking opens the Award Selector (Bottom Sheet on mobile, same interaction on desktop)
- "View full details →" link navigates to the Award Detail Page

**Card 2 — Rate**
- Hourly rate number input (large, unchanged)
- Permanent / Casual toggle (unchanged, same cyan styling — no colour change for Casual mode)
- When Casual is selected: adds one subtle row below the toggle showing `Base rate (÷1.25): $XX.XX` in `--label-color` / `--text`, no special colour

**Card 3 — Pay Summary**
- Unchanged except: the hardcoded `(12%)` label on the super row becomes dynamic, reading from `award.superRate` (e.g. `(${(award.superRate * 100).toFixed(0)}%)`)

**Removed from sidebar:**
- `Min. Engagement` input — now sourced from the selected Award's `minEngagementHours`

**How It Works panel (left side):**
- Badge next to title shows the active award name (e.g. `GMP EA`)
- Rules text updates dynamically to reflect the selected Award's penalty rates

### Award Selector (Bottom Sheet / Dropdown)

Triggered by tapping/clicking the Award card.

On mobile and desktop: bottom sheet component (consistent experience, no router needed). Implemented as a conditional render overlay, matching the existing `ResetModal` pattern in the codebase.

Content:
- List of all Awards: GMP EA first, then sorted alphabetically
- Each row: award name + MA number
- Active award has a checkmark `✓`
- `ⓘ` icon on each row navigates to the Award Detail Page without selecting
- Tapping a row selects the award and closes the sheet

### Award Detail Page

Implemented as a **conditional render** using a state flag (e.g. `showAwardDetail: string | null` in App), consistent with the existing `showResetModal` pattern. No router required.

Sections:
1. **Header**: Award name, MA number, industry badge, back button (`←`), "Use this Award →" CTA
2. **Classification Levels**: Grid of level buttons (e.g. MI1–MI5 + Casual). Tapping a level sets that level's rate as the hourly rate on the main screen and closes the detail page. Hidden for GMP EA (empty `classifications` array).
3. **Rate override**: Shows Award minimum rate (from selected classification) and an editable "Your actual rate" field with hint "Override if your EA pays above award minimum"
4. **Penalty Rates**: Grid of cards — Sat, Sun, PH, OT1, OT2, Shift loading if `afternoonShiftMultiplier` is set
5. **Break Rules**: Table with columns: Shift Duration / Meal Break / Rest Break / Paid?
6. **Other Rules**: Min Engagement, Standard Week, Super Rate

---

## Localisation

New translation keys needed in `en.ts` and `tw.ts`. Add stubs in `tw.ts` matching the same key names; fill Chinese translations in a follow-up pass.

New keys:
- `awardLabel` — "Award"
- `viewFullDetails` — "View full details"
- `useThisAward` — "Use this Award"
- `classificationLevel` — "Classification Level"
- `awardMinimum` — "Award minimum"
- `yourActualRate` — "Your actual rate"
- `baseRateHint` — "Override if your EA pays above award minimum"
- `casualBaseRate` — "Base rate (÷1.25)"
- `breakRules` — "Break Rules"
- `shiftDuration` — "Shift Duration"
- `mealBreak` — "Meal Break"
- `restBreak` — "Rest Break"
- `paid` / `unpaid` — "Paid" / "Unpaid"
- `allAwards` — "All Awards"
- `penaltyRates` — "Penalty Rates"
- `otherRules` — "Other Rules"
- `minEngagement` — "Min. Engagement"

---

## Known Issues / Implementation Notes

### `afternoonShiftMultiplier` is display-only
`AwardConfig.afternoonShiftMultiplier` is shown in the Award Detail Page penalty rates section but is **not applied in the main calculator**. The detail page must include a visible disclaimer "(Not included in calculator)" next to this rate card. Adding afternoon/night shift calculation to the main calculator is out of scope for this release.

### Stale `minEngagement` localStorage key
After this release, the `'minEngagement'` key in localStorage becomes orphaned. It will not be read or written. No migration is needed — it simply goes unused. Implementors should not attempt to re-read it.

### `rule_super` and `hol` translation strings hardcode rates
`en.ts` contains:
- `rule_super`: `'Super: Calculated at 12% of Ordinary Time Earnings (OTE) only.'` — hardcodes 12%
- `hol`: `'Public Holiday (2.0x)'` — hardcodes 2.0x

Both should be made dynamic or replaced with award-agnostic wording. Suggested:
- `rule_super` → `'Super: Calculated at {rate}% of Ordinary Time Earnings (OTE) only.'` (interpolated) or simply `'Super: Calculated on Ordinary Time Earnings (OTE) only.'`
- `hol` → `'Public Holiday'` (drop the multiplier; it's shown in the Pay Overview anyway)

Update both `en.ts` and `tw.ts` accordingly. Add these strings to the file change table.

---

## Out of Scope

- User-created custom Award profiles (editing penalty rates in-app)
- Fetching Award data from an external API
- Award rate update notifications
- Afternoon/night shift loading in the main calculator (shown in detail page only)
- Traditional Chinese translations for new keys (stubs only in this release)

---

## File Summary

| File | Change |
|------|--------|
| `src/data/awards.ts` | **Create** — full award dataset (40 awards + GMP EA) |
| `src/utils/calculator.ts` | **Modify** — accept `AwardConfig` param, remove `AU_REGS` dependency, implement `satOT1LimitHours === 0` sentinel |
| `src/hooks/usePayslip.ts` | **Modify** — add `selectedAwardId` state, replace `AU_REGS` references with `award.*`, remove `minEngagement` state |
| `src/constants/regulations.ts` | **Delete** — all data migrated to `awards.ts` |
| `src/components/AwardSelector.tsx` | **Create** — Bottom Sheet overlay component (same pattern as `ResetModal`) |
| `src/components/AwardDetailPage.tsx` | **Create** — full award detail view, conditionally rendered |
| `src/App.tsx` | **Modify** — add `showAwardDetail` state, wire up new components, pass `award` to calculator, dynamic super rate label |
| `src/locales/en.ts` | **Modify** — add new translation keys |
| `src/locales/en.ts` | **Modify** — add new translation keys; make `rule_super` and `hol` award-agnostic |
| `src/locales/tw.ts` | **Modify** — add stub keys matching `en.ts`; update `rule_super` and `hol` |
