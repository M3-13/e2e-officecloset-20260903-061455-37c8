# Design — Project Identity

> This document is project-long-lived. Tokens are not changed without
> the Architect's approval. Developers MUST use these tokens
> instead of improvising their own colors/spacings.

## Style Direction

Dunkler, glamouröser Red-Carpet-Look: tiefes Schwarz-Braun, Champagner-Töne, Gold-Akzent und Burgunderrot – elegant wie eine Filmpremiere, aber klar und ruhig bedienbar.

## Colors

- `--color-bg`: **#151012**
- `--color-surface`: **#1F181A**
- `--color-surface_alt`: **#2A2023**
- `--color-fg`: **#F4EADB**
- `--color-muted`: **#B7A99A**
- `--color-border`: **#453438**
- `--color-accent`: **#C9A24B**
- `--color-accent_strong`: **#B98A2F**
- `--color-burgundy`: **#7A1F2B**
- `--color-danger`: **#C24A4A**
- `--color-success`: **#5FA37A**
- `--color-overlay`: **rgba(15,11,12,0.72)**

## Typography

- `font_family`: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif
- `heading_font_family`: Georgia, 'Times New Roman', serif
- `heading_weight`: 600
- `body_weight`: 400
- `size_scale`: xs: 12px; sm: 14px; md: 16px; lg: 20px; xl: 28px; xxl: 40px

## Spacing Scale

- `--space-0`: 4px
- `--space-1`: 8px
- `--space-2`: 12px
- `--space-3`: 16px
- `--space-4`: 24px
- `--space-5`: 32px
- `--space-6`: 48px

## Border-Radii

- `--radius-sm`: 4px
- `--radius-md`: 8px
- `--radius-lg`: 16px
- `--radius-pill`: 999px

## Components

### Button

padding 12px 24px, min-height 44px (mobile tap), radius md 8px, font-weight 600, letter-spacing 0.02em. Varianten: primary (bg=accent #C9A24B, text=#151012), secondary (bg transparent, border 1px #453438, text=#F4EADB), danger (bg=#C24A4A, text=#151012). States default/normal; hover: primary +8% Helligkeit, secondary bg=#2A2023, danger +8% Helligkeit; active: +4% Verdunklung und leichter innerer Druck; disabled: opacity 0.5, kein Hover.

### Card

bg=#1F181A, border 1px #453438, radius md 8px, padding 16px, Schatten 0 8px 24px rgba(0,0,0,0.35). Hover: border #C9A24B, transform translateY(-2px), transition 150ms ease.

### Input

bg=#151012, border 1px #453438, radius sm 4px, padding 12px 16px, min-height 44px, text=#F4EADB, placeholder=#B7A99A. Focus: border #C9A24B, ring 3px rgba(201,162,75,0.25). Error: border #C24A4A.

### Nav

Höhe 64px, bg=rgba(21,16,18,0.92) mit backdrop-blur, bottom border 1px #453438. Links: text #B7A99A, hover #F4EADB, aktiv #C9A24B mit 2px Unterstreichung. Brand/Logo: heading_font_family, Farbe #C9A24B.

### Modal

bg=#1F181A, border 1px #453438, radius lg 16px, padding 24px, max-width 520px, overlay rgba(15,11,12,0.72). Titel in heading_font_family, Farbe #C9A24B.

### Tag

Kategorie-Badge: bg=#2A2023, border 1px #453438, text=#B7A99A, radius pill, padding 4px 12px, font-size 12px, letter-spacing 0.04em. Aktiv: bg=rgba(122,31,43,0.35), border #7A1F2B, text=#F4EADB.

### EmptyState

Zentriert, muted #B7A99A, Icon in #453438, Abstand 24px zum Text, padding 48px 24px.

## Layout Principles

- Inhalts-Container max-width 1200px, horizontal zentriert, seitliches Padding 16px (mobil) / 24px (ab 768px) / 32px (ab 1024px)
- Breakpoints: mobil <640px, Tablet 640–1024px, Desktop >1024px; Navigation kollabiert unter 640px zu einem Menü
- Garderobe als responsives Grid: grid-template-columns repeat(auto-fill, minmax(220px, 1fr)), gap 16px
- Outfit-Creator zweispaltig ab 1024px (Auswahl links, Vorschau rechts), darunter einspaltig gestapelt
- Sektionsabstand 48px, innerhalb einer Sektion 24px zwischen Überschrift und Inhalt
- Primäraktionen stehen rechtsbündig in Aktionsleisten, destruktive Aktionen (Löschen) als sekundär/danger und nie direkt neben dem primären CTA
- Footer mit Impressum und Datenschutz auf jeder Seite, Abstand zum Inhalt mindestens 48px
