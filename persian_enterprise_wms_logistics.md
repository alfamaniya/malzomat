---
name: Persian Enterprise WMS & Logistics
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#444651'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#4b41e1'
  on-secondary: '#ffffff'
  secondary-container: '#645efb'
  on-secondary-container: '#fffbff'
  tertiary: '#00311f'
  on-tertiary: '#ffffff'
  tertiary-container: '#004a31'
  on-tertiary-container: '#27c38a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#e2dfff'
  secondary-fixed-dim: '#c3c0ff'
  on-secondary-fixed: '#0f0069'
  on-secondary-fixed-variant: '#3323cc'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: IBM Plex Sans
    fontSize: 1.75rem
    fontWeight: '700'
    lineHeight: 2.5rem
  headline-xl-mobile:
    fontFamily: IBM Plex Sans
    fontSize: 1.375rem
    fontWeight: '700'
    lineHeight: 2rem
  headline-lg:
    fontFamily: IBM Plex Sans
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.875rem
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.75rem
  body-lg:
    fontFamily: Noto Sans
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.625rem
  body-md:
    fontFamily: Noto Sans
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-sm:
    fontFamily: Noto Sans
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.25rem
  label-lg:
    fontFamily: Noto Sans
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
  label-md:
    fontFamily: Noto Sans
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
  label-sm:
    fontFamily: Noto Sans
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 0.875rem
  tabular-data:
    fontFamily: Noto Sans
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1.25rem
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.5rem
  margin: 1.5rem
  margin-mobile: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system establishes a high-density, authoritative industrial enterprise framework engineered expressly for Iranian logistics, inventory control (سامانه انبارداری), and multi-echelon procurement operations. Built natively for Right-to-Left (RTL) reading flows, it prioritizes uncompromising operational precision, low visual fatigue during prolonged scanning sessions, and absolute clarity in dense data tables.

The aesthetic follows an **Industrial Corporate & Structural Precision** movement:
- **Geometry & Density:** Sharp, controlled layout structures with exact alignment grids that treat screen real estate as a critical operational asset. Visual rhythm is disciplined, eliminating superfluous decorative flairs in favor of high-contrast tabular legibility.
- **Tone & Mood:** Institutional, dependable, regulatory-compliant, and audit-ready. The system conveys technical rigor, instilling confidence across warehouse operators, supply chain directors, and financial auditors.
- **RTL-First Logic:** Bidirectional coherence with physical real-world metaphors (e.g., progression flows from right to left, mirrored navigation drawers, right-aligned monetary values and procurement item identifiers, and left-aligned Latin serial numbers and SKUs).

## Colors

The color palette is calibrated for high-contrast light-mode environments such as warehouse workstations, industrial handheld scanners, and back-office audit consoles.

### Color Roles & Semantic Application
- **Primary Industrial Navy (`#1E3A8A`):** Anchors top-level enterprise navigation, table headers, active tab indicators, and primary action buttons (e.g., «ثبت نهایی سند», «صدور حواله انبار»).
- **Secondary Indigo (`#4F46E5`):** Reserved for outbound dispatch, gate-pass issuance (برگ خروج / مجوز خروج), logistics tracking links, and transfer orders.
- **Operational Status Indicators:**
  - **Emerald Green (`#10B981`):** Inbound receipts (رسید انبار), stock surplus, verified physical inventory counts, and multi-tier approval sign-offs («تایید نهایی مدیر»).
  - **Amber / Ochre (`#F59E0B`):** Pending approvals («در انتظار تایید سرپرست»), interim quarantine stock, reserve holds, and low-threshold reorder alerts.
  - **Crimson Alert (`#EF4444`):** Stockouts, physical discrepancies, damaged freight flags, unapproved ledger balances, and negative stock exceptions.
- **Surface & Structural Neutrals:**
  - Base canvas: `#F8FAFC` (cool slate background mitigating monitor glare).
  - Surface layers: `#FFFFFF` (high-contrast cards, modal sheets, and table rows).
  - Structural borders: `#E2E8F0` for table row dividers; `#CBD5E1` for actionable control strokes and input outlines.
  - Text typography: `#0F172A` (primary text, Persian numbers), `#475569` (secondary metadata, procurement subtitles), and `#94A3B8` (disabled states and decorative watermarks).

## Typography

The typographic hierarchy bridges strict Persian legibility (optimized for characters such as «ک»، «ی» and Persian numerals `۰۱۲۳۴۵۶۷۸۹`) with enterprise Latin serials, batch codes, and barcode strings.

### Font Pairing & Fallback Stack
- **Headlines:** `IBM Plex Sans` combined with system Persian fallbacks (`Vazirmatn`, `IRANSans`, `Tahoma`, sans-serif) for high architectural impact in structural headers, modal titles, and master KPI values.
- **Body & Data Grid:** `Noto Sans` with standard Persian metric fonts ensuring open counters, legible diacritics, and optimal line-height to prevent Persian ascender/descender clipping in tight vertical grids.

### Tabular Figures & Numerals
- All numerical metrics—such as unit quantities, inventory totals (موجودی کل), batch numbers, and Solar Hijri dates (تاریخ خورشیدی)—must utilize monospaced Persian numerals via `font-feature-settings: "tnum" 1, "ss01" 1` where supported.
- Technical SKUs and international HS codes (کد تعرفه گمرکی) stay LTR-enforced with monospaced letter spacing.

## Layout & Spacing

The layout model is anchored on a dense 4px base rhythm, optimizing multi-column tabular density without sacrificing visual scan paths.

### Grid Architecture
- **Desktop (1280px+):** Fluid 12-column grid with a fixed collapsible right-hand administrative drawer (width: 260px expanded, 64px icon-only). Gutters are locked at `1rem` (16px), margins at `1.5rem` (24px).
- **Tablet / Industrial Rugged Terminals (768px – 1279px):** 8-column layout. Sidebar tucks into an off-canvas drawer. Tables gain horizontal edge-to-edge scroll locks with sticky procurement code columns.
- **Mobile Handheld Scanners (< 768px):** Single-column stack with `0.75rem` (12px) margin canvas, converting data table rows into structured card summaries with large touch targets for barcode scan verification.

### Spacing Discipline
- Compact component padding: `space-xs` (4px) and `space-sm` (8px) define internal table cell padding, badge limits, and input borders.
- Inter-section spacing: `space-lg` (16px) separates toolbar filtering panels from primary data tables.

## Elevation & Depth

To maximize clarity in dense data environments, this design system avoids heavy shadows, relying on crisp 1px structural outlines and controlled surface-layer separation.

### Elevation Hierarchy
- **Level 0 (Base Canvas):** `#F8FAFC`. Houses the primary page container, sub-headers, and audit breadcrumbs.
- **Level 1 (Data Cards & Table Surfaces):** `#FFFFFF` paired with an explicit perimeter border (`1px solid #E2E8F0`). Casts no shadow in rest state; gains a micro-shadow on hover interactions (`0 1px 3px rgba(15, 23, 42, 0.06)`).
- **Level 2 (Popovers, Filter Drawers & Shamsi Date Pickers):** Background `#FFFFFF`, perimeter border `1px solid #CBD5E1`, with a focused ambient elevation: `0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Modal Sheets & Print Verification Dialogs):** `#FFFFFF` elevated above a neutral tinted backdrop (`rgba(15, 23, 42, 0.45)`) with `0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)`.

All elevations maintain neutral-tinted shadow penumbras without colored glows, reinforcing industrial utility.

## Shapes

The shape system employs a deliberate **Soft (0.25rem / 4px)** radius convention (`roundedness: 1`), embodying geometric discipline and factory-grade efficiency.

### Shape Scale
- **Micro Elements (Checkboxes, Action Buttons, Input Fields):** `0.25rem` (4px). Matches the compact cell structure and provides crisp optical alignments across vertical scan lines.
- **Grouping Containers (Data Tables, Filter Panels, Cards):** `0.5rem` (`rounded-lg` / 8px). Softens modular cards while preserving grid structure.
- **Floating Modals & Inspection Dialogs:** `0.75rem` (`rounded-xl` / 12px). Applied strictly to top-level overlays.
- **Pill Exception:** Status badges, approval chips, and count indicators utilize a pill border-radius (`9999px`) to create an immediate visual contrast against square tabular rows and input boxes.

## Components

### Dense Data Tables (جدول اطلاعات تدارکاتی)
- **Header:** Background `#F1F5F9`, text `#334155`, font weight bold, height `40px`, border bottom `2px solid #CBD5E1`.
- **Row Styling:** Row height `44px` in default mode, `36px` in dense mode. Alternating subtle zebra striping (`#FFFFFF` to `#F8FAFC`). Hover state highlights row in `#EFF6FF` with a right-hand primary accent bar (`3px solid #1E3A8A`).
- **Procurement Codes (کد کالا / بارکد):** Displayed in an isolated monospaced chip with a directional `dir="ltr"` container, paired with a one-click copy icon.

### Multi-Level Approval Badges (نشانگر تایید سلسله‌مراتبی)
- Pill-shaped (`rounded-full`), padding `2px 8px`, font size `0.75rem`, accompanied by a right-aligned `6px` status dot.
  - *Draft (پیش‌نویس):* Slate tint (`#F1F5F9`), text `#475569`.
  - *Supervisor Approval (تایید سرپرست انبار):* Amber tint (`#FEF3C7`), text `#B45309`.
  - *Manager Finalized (تایید نهایی مدیریت):* Emerald tint (`#D1FAE5`), text `#047857`.
  - *Rejected / Blocked (عدم تایید / راکد):* Crimson tint (`#FEE2E2`), text `#B91C1C`.

### Form Controls & Input Fields (فیلدهای ورودی اطلاعات)
- **Height & Spacing:** Standard `36px` control height. Padding `0.5rem 0.75rem`. Border `1px solid #CBD5E1`, transition to `2px solid #1E3A8A` on active focus.
- **RTL Labeling:** Labels float permanently above the input right-aligned, text color `#334155`, size `0.75rem`. Mandatory indicators utilize a bold crimson asterisk (`*`) placed on the right.

### Solar Shamsi Date Pickers (انتخابگر تاریخ شمسی)
- Displayed in standard Iranian format (`۱۴۰۳/۰۸/۱۵`). Popover calendar features solar months (فروردین through اسفند) with Persian numerical day grids. Current day marked with `#1E3A8A` fill and white text; official holidays highlighted in `#EF4444`.

### Audit Log Cards & Barcode Tags (شناسنامه کالا و لاگ بازرسی)
- **Log Timeline:** Right-hand vertical rail (`2px solid #E2E8F0`) with timestamped circular nodes displaying user avatar, role badge, Solar timestamp, and operation type (e.g., «افزایش موجودی انبار مرکزی»).
- **Physical Barcode / QR Tags:** Print-ready component with clean monochrome styling (`#000000` on `#FFFFFF`), explicit cut guides, SKU number, storage rack coordinates (راهرو / قفسه / ردیف), and product description.