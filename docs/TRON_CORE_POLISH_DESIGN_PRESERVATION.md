# TRON Core Polish — Design Preservation Log

## Statement

Existing TRON AI **logo, robot hero video/poster, cinematic landing composition, glass/neon component language, typography tokens, and color palette were not redesigned**. Changes are navigation honesty, auth states, copy, and scoped mobile layout fixes.

## Brand assets

| Asset | Changed? |
|---|---|
| `/videos/tron-ai-hero.mp4` | **No** |
| `/images/tron-ai-hero-poster.webp` | **No** |
| `/images/assets/tron-logo.png` | **No** |
| Landing hero layout / robot stage | **No** |
| Chat bubble / Voice HUD / CV editor visual systems | **No rewrite** |

## Intentional UI differences (minimal)

| Page / component | Change | Classification | Bug fixed |
|---|---|---|---|
| TopBar | Replaced Workspace tab + Career mega button with Interview + CV Builder | minimal nav | Hide unfinished Workspace |
| Sidebar | Removed Desktop Agent / Job Finder / Interview Agent links; core shortcuts | minimal nav | Hide unfinished features |
| LandingNavbar | Removed Desktop Agent menu item; “Open Workspace” → “Open Chat” | minimal CTA | Wrong destination |
| CareerCenterPage | Slim cards: Interview, CV, Profile, History only | minimal content | Hide Job Finder etc. |
| RequireAuth / NotFound / FeatureUnavailable | New screens using existing `GlassCard` / `NeonButton` / `TronLogo` | essential UX | Guest 404 vs auth |
| Chat offline banner | Copy only; same amber banner layout | none/copy | localhost leak |
| Chat composer | Attachment button removed (layout otherwise same) | minimal | Fake ingestion success |
| AppLayout | `100dvh` + safe-area padding | essential mobile | Mobile viewport |

## Screenshots

Automated before/after screenshot capture was **not** committed (no visual regression harness). Owner should spot-check `/` hero video + logo after preview deploy. No hero/logo/robot files appear in the git diff.
