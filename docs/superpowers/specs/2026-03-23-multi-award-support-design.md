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
  satOT1LimitHours: number;      // Hours before tier 2 kicks in (0 = flat rate)
  satOT2Multiplier: number;      // Saturday tier 2 rate
  sunMultiplier: number;         // Sunday rate
  sunMinHours: number;           // Sunday minimum engagement
  phMultiplier: number;          // Public holiday rate
  weekdayOT1Multiplier: number;  // Weekday OT tier 1
  weekdayOT1LimitHours: number;  // Hours before tier 2
  weekdayOT2Multiplier: number;  // Weekday OT tier 2
  afternoonShiftMultiplier?: number; // Optional shift loading

  // Employment
  casualLoading: number;         // e.g. 0.25
  superRate: number;             // e.g. 0.12
  minEngagementHours: number;    // e.g. 3
  weeklyStandardHours: number;   // e.g. 38
  dailyOrdinaryLimitHours: number; // e.g. 7.6

  // Break rules
  breakRules: BreakRule[];

  // Classification levels (empty array for GMP EA)
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

## UI Changes

### Main Screen — Sidebar

The right sidebar is reorganised into three cards (top to bottom):

**Card 1 — Award**
- Award selector button: shows current award name + `⌄` chevron
- Clicking opens the Award Selector (Bottom Sheet on mobile, same interaction on desktop)
- "View full details →" link navigates to the Award Detail Page

**Card 2 — Rate**
- Hourly rate number input (large, unchanged)
- Permanent / Casual toggle (unchanged, same cyan styling)
- When Casual is selected: adds one subtle row below the toggle showing `Base rate (÷1.25): $XX.XX`
- No colour change for Casual mode — same cyan palette throughout

**Card 3 — Pay Summary**
- Unchanged from current implementation

**Removed from sidebar:**
- `Min. Engagement` input — now sourced from the selected Award's data

**How It Works panel (left side):**
- Badge next to title shows the active award name (e.g. `GMP EA`)
- Rules text updates dynamically to reflect the selected Award's penalty rates

### Award Selector (Bottom Sheet / Dropdown)

Triggered by tapping/clicking the Award card.

On mobile: bottom sheet slides up from the bottom of the screen.
On desktop: same visual interaction (bottom sheet or inline dropdown — implementer's choice).

Content:
- List of all Awards grouped as: custom EA first, then sorted alphabetically
- Each row: award name + MA number
- Active award has a checkmark
- `ⓘ` icon on each row navigates to the Award Detail Page without selecting
- Tapping a row selects the award and closes the sheet

### Award Detail Page

A full-screen view (replaces main content, or navigates to new route — implementer's choice).

Sections:
1. **Header**: Award name, MA number, industry badge, back button, "Use this Award →" CTA
2. **Classification Levels**: Grid of level buttons (e.g. MI1–MI5 + Casual). Tapping a level pre-fills the hourly rate on the main screen. GMP EA has no classifications — this section is hidden.
3. **Rate input**: Shows Award minimum rate and an editable "Your actual rate" field with hint "Override if your EA pays above award minimum"
4. **Penalty Rates**: Grid of cards — Sat, Sun, PH, OT1, OT2, Shift loading (if applicable)
5. **Break Rules**: Table with columns: Shift Duration / Meal Break / Rest Break / Paid?
6. **Other Rules**: Chips for Min Engagement, Standard Week (38h), Super Rate

---

## Calculator Changes

`src/utils/calculator.ts` — `getResults()` currently reads from the hardcoded `AU_REGS` constant. It will instead accept an `AwardConfig` parameter:

```ts
export const getResults = (
  records: DailyRecord[],
  hourlyRate: number,
  empType: EmploymentType,
  award: AwardConfig   // replaces dailyLimit + minEngagement params
) => { ... }
```

All penalty multipliers, thresholds, and limits are read from `award` instead of `AU_REGS`. `AU_REGS` in `regulations.ts` becomes the source data for the GMP EA entry in `awards.ts` and can be deleted once migrated.

---

## Localisation

New translation keys needed in `en.ts` and `tw.ts`:
- Award card title
- "View full details"
- "Use this Award"
- Classification level label
- Award minimum label
- Base rate hint (Casual)
- Break rules table headers
- "All Awards" / back navigation

---

## Out of Scope

- User-created custom Award profiles (editing penalty rates in-app)
- Fetching Award data from an external API
- Award rate update notifications
- Afternoon/night shift loading in the main calculator (shown in detail page only)

---

## File Summary

| File | Change |
|------|--------|
| `src/data/awards.ts` | **Create** — full award dataset (40 awards + GMP EA) |
| `src/utils/calculator.ts` | **Modify** — accept `AwardConfig` param instead of `AU_REGS` |
| `src/constants/regulations.ts` | **Delete** — data migrated to `awards.ts` |
| `src/hooks/usePayslip.ts` | **Modify** — add `selectedAwardId` to state, remove `minEngagement` |
| `src/components/AwardSelector.tsx` | **Create** — Bottom Sheet / selector component |
| `src/components/AwardDetailPage.tsx` | **Create** — full award detail view |
| `src/App.tsx` | **Modify** — wire up new components, pass award to calculator |
| `src/locales/en.ts` | **Modify** — add new translation keys |
| `src/locales/tw.ts` | **Modify** — add new translation keys |
