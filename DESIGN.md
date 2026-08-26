---
version: alpha
name: Sky-AR-design
description: >-
  An austere, monochrome design language for a real-sky planetarium driven entirely by
  hand motion capture. It inherits the benchmark project's pure-black canvas and
  black-and-white typographic discipline intact, because here the canvas really is black.
  What it must solve instead is the problem gestures create: an interface with no buttons
  has no affordances, so the screen has to teach the vocabulary and mirror back what it
  currently sees. Color is spent on exactly two things — the targeting reticle and the
  live gesture readout — and they are the same colour for the same reason.
colors:
  canvas-night: "#000000"
  canvas-night-soft: "#0a0a0a"
  on-primary: "#ffffff"
  on-primary-mute: "#f0f0fa"
  hairline-on-dark: "#3a3a3f"
  ink-mute: "#5a5a5f"
  muted: "#9a9aa2"
  accent-reticle: "#ffb95e"
  star-cool: "#9bb0ff"
  star-neutral: "#ffffff"
  star-warm: "#ffb86b"
  night-on-primary: "#ff6a52"
  night-on-primary-mute: "#d4523f"
  night-hairline: "#5a1e18"
  night-accent-reticle: "#ff8a3d"
typography:
  display-xxl: "GmarketSansMedium / clamp(40px,7.5vw,80px) / 400 / 1.15 (0.95 >=640px) / +2.1px / uppercase"
  display-xl: "GmarketSansMedium / clamp(34px,5.5vw,60px) / 400 / 1.2 / +1.6px / uppercase"
  display-lg: "GmarketSansMedium / clamp(28px,4vw,48px) / 400 / 1.25 / +1.25px / uppercase"
  eyebrow: "Pretendard / 12px / 400 / 2 / +0.96px / uppercase"
  button-cap: "Pretendard / 13px / 700 / 0.94 / +1.17px / uppercase"
  caption: "Pretendard / 13px / 400 / 1.5"
  body-lg: "Pretendard / 16px / 400 / 1.7 / +0.32px"
  mono-hud: "ui-monospace / 12px / 400 / 1.4 / +0.4px / tabular-nums"
rounded:
  xs: 4px
  sm: 8px
  md: 16px
  pill: 32px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 18px
  xl: 24px
  xxl: 32px
  huge: 48px
components:
  button-ghost: "transparent fill, 1px solid on-primary, 32px radius, 18px/24px padding, inverts to white-on-black on hover, 0.3s ease"
  hud-pill: "bg canvas-night-soft at 80% alpha, backdrop-blur-md, 1px hairline, full radius, min 56x56 touch target"
  hud-panel: "bg canvas-night-soft at 95% alpha, backdrop-blur-md, 1px hairline, shadow-2xl"
  scrim-edge: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent) at 96px on top and bottom edges"
  reticle: "44px ring, 1px accent-reticle at 50% alpha, unfilled, four 6px ticks at 0/90/180/270; expands to 64px at 90% alpha on snap"
  gesture-guide: "top-left glass panel, one row per gesture: 24px glyph ring, name, effect; inactive rows at 34% opacity, the recognised row at 100% with an accent ring"
  hand-skeleton: "2D canvas overlay, 1.5px connection lines at 34% alpha, 2.2px joint dots at 55%, thumb-index pinch line in accent, palm ring on an active gesture"
  compass-strip: "top edge, 32px tall, scrim background, ticks every 15deg, cardinals in eyebrow tier"
  altitude-ladder: "right edge, ticks every 15deg from -30 to +90, ZENITH/HORIZON end labels in eyebrow tier"
  object-panel: "bottom sheet <640px (peek 120px, drag, snap 75dvh) / right drawer >=640px (max-w-md, full height)"
  permission-card: "full-screen on canvas-night, one display-lg line, one body-lg paragraph, exactly one button-ghost, one caption rationale"
---

# Sky AR — Design System

## Overview

This system is a direct descendant of the benchmark `solarsystem` design language: a pure
black canvas, white type, no drop shadows on marketing surfaces, and a single ghost-pill
CTA. Almost all of it carries over unchanged, because this product's canvas genuinely *is*
black — the camera runs, but its image is never shown. It exists only to read the user's
hand.

That is the whole reframe. The design problem here is not legibility over an uncontrolled
backdrop. It is this:

> **A gesture interface has no affordances. Nothing on screen is touchable, so nothing on
> screen suggests what is possible. The interface has to say so, and it has to prove it is
> listening.**

Buttons are self-documenting: they have edges, labels, and hover states. A hand waved at a
camera has none of that. A user who does not know that an open palm zooms in will never
discover it, and a user whose hand has drifted out of frame has no way to tell whether the
system is broken or simply not seeing them. Every unusual decision below — the permanent
gesture list, the skeleton overlay, the accent ring that lights on recognition — exists to
answer one of those two questions.

The second organizing constraint: the user's hand is in the air, some distance from the
screen, and their other hand may be busy. Anything that requires precise pointing is out.
The reticle is fixed at screen centre and the *sky* moves to it, rather than a cursor
moving to the star.

## Colors

### Brand & Accent

The palette is black and white. Photography and, here, live video supply every other hue.
There is exactly one accent, and it exists for a functional reason.

| Token | Value | Role |
|---|---|---|
| `--accent-reticle` | `#ffb95e` | Targeting reticle, active-gesture ring, pinch indicator. Nothing else. |

The benchmark's DESIGN.md states flatly that adding a brand accent color breaks the system.
Here it breaks the system *more* not to have one, for two reasons that turn out to be the
same reason.

First, a white crosshair drawn on a starfield is indistinguishable from a star; the user
cannot tell the instrument from the sky. Second, a white skeleton drawn over a white
constellation figure cannot say "this is your hand, and I can see it." Both are functional
failures, not stylistic preferences. **The accent marks the instrument, never the sky** —
that single sentence covers the reticle, the gesture ring, and the pinch line.

Amber rather than cyan, deliberately: long-wavelength light preserves scotopic (rod) dark
adaptation, cyan destroys it. For a product used with dark-adapted eyes this is a real
usability property.

**The accent budget is fully spent.** A second accent color is a system violation.

### Surface

| Token | Value | Role |
|---|---|---|
| `--canvas-night` | `#000000` | Page canvas, all pre-camera states |
| `--canvas-night-soft` | `#0a0a0a` | HUD chrome surface — used only at 60/80/95% alpha |
| `--hairline-on-dark` | `#3a3a3f` | Every 1px border |

### Text

| Token | Value | Role |
|---|---|---|
| `--on-primary` | `#ffffff` | Default |
| `--on-primary-mute` | `#f0f0fa` | Secondary |
| `--color-muted` | `#9a9aa2` | Tertiary, captions, inactive ticks |

### Sky Rendering

These are not UI colors — they parameterize the WebGL layer, and they belong in the design
system because they determine what the sky *looks* like more than any CSS rule does.

| Token | Value | Role |
|---|---|---|
| `--star-cool` | `#9bb0ff` | B-V ≈ -0.3 (Rigel, Spica) |
| `--star-neutral` | `#ffffff` | B-V ≈ 0.6 (Sun-like) |
| `--star-warm` | `#ffb86b` | B-V ≈ 1.8 (Betelgeuse, Antares) |
| `--star-saturation` | `0.55` | `mix(white, bvColor, s)` |

`--star-saturation: 0.55` is the decision that reconciles physics with the brand. Full B-V
saturation looks like a toy planetarium and plainly violates the black-and-white rule. Zero
saturation loses Betelgeuse and Rigel — which is the single most convincing "oh, this is
*real*" moment the product has. 0.55 keeps the field reading as monochrome while the four or
five genuinely colored stars stay recognizable. **Do not exceed 0.6.**

### Link

`--on-primary` with a persistent underline at 3px offset. Unchanged from the benchmark.
`link-blue-fallback: #0000ee` is documented and unused.

## Typography

### Font Family

- **Display:** `GmarketSansMedium`, falling back to `Pretendard Variable`, `Arial Narrow`.
- **UI / body:** `Pretendard Variable`, falling back to `Pretendard`, `Arial`, `Verdana`.
- **HUD numerics:** `ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace`.

Both webfonts are Korean-capable substitutes for the benchmark's D-DIN pairing, chosen
because the product's primary audience is Korean and the display tier must set Hangul.

### Hierarchy

| Tier | Size | Weight | Line height | Tracking | Case |
|---|---|---|---|---|---|
| `.type-display-xxl` | `clamp(40px, 7.5vw, 80px)` | 400 | 1.15 → 0.95 ≥640px | +2.1px | UPPER |
| `.type-display-xl` | `clamp(34px, 5.5vw, 60px)` | 400 | 1.2 | +1.6px | UPPER |
| `.type-display-lg` | `clamp(28px, 4vw, 48px)` | 400 | 1.25 | +1.25px | UPPER |
| `.type-eyebrow` | 12px | 400 | 2 | +0.96px | UPPER |
| `.type-button-cap` | 13px | 700 | 0.94 | +1.17px | UPPER |
| `.type-caption` | 13px | 400 | 1.5 | — | — |
| `.type-body-lg` | 16px | 400 | 1.7 | +0.32px | — |
| `.type-mono-hud` | 12px | 400 | 1.4 | +0.4px | — |

### The mono exception, argued

The benchmark states: *"No mono. Code blocks are not part of the brand's typographic
system."* `.type-mono-hud` is a deliberate, bounded exception.

Live azimuth, altitude, FOV and sidereal-time readouts update continuously and are not
driven by user input. In proportional figures those readouts shimmer — glyph widths change
under the digits and the whole line jitters horizontally, which in an AR context reads as a
*tracking failure*, not a typographic one. `font-variant-numeric: tabular-nums` fixes it.

The exception is restricted to **numeric readouts that change without user input.** Note the
benchmark already quietly uses `font-mono` for `<dl>` fact values in its info panel, so this
formalizes an existing practice rather than inventing one.

### The layer rule

The tier classes live inside `@layer components`. This is not cosmetic: Tailwind builds its
utilities at the `@import "tailwindcss"` line at the top of the file, so a tier declared
below it without a layer wins on source order and **silently swallows every `text-*`
override**. `type-display-lg text-sm` rendered at 28px for a while before anyone noticed,
because clamp() happens to produce plausible sizes. If a size override ever appears to do
nothing, check the layer first.

### Principles

- Display tiers are always uppercase with positive tracking. Never lowercase a display tier.
- `font-synthesis-weight: none` on all display tiers — never let the browser fake a weight.
- Never set body copy in the display face.

## Layout

### Spacing System

8px base. `xxs 4 · xs 8 · sm 12 · md 16 · lg 18 · xl 24 · xxl 32 · huge 48`.

Marketing gutters: `px-6 sm:px-12 md:px-16 lg:px-24`. Section rhythm: `py-28 sm:py-36`.
Containers: `max-w-3xl` (prose), `max-w-4xl` (mixed), `max-w-7xl` (full).

### The immersive viewport, and the reachability rule

The benchmark is a two-handed desktop mouse experience. Here one hand is in the air in front
of the camera, so the *other* hand — if there is one — does all the touching. That produces
rules the benchmark has no need for:

- **Minimum interactive target: 56×56px** (up from the benchmark's 44px).
- **All primary controls live in the bottom 30% of the viewport,** within a thumb arc.
- **The top 20% holds read-only display only** — the compass strip and the gesture panel.
  Thumbs cannot reach it, and it is exactly where non-interactive information belongs.
- `env(safe-area-inset-*)` respected on all four edges; `viewport-fit=cover`.
- The immersive route is `100dvh`, `overscroll-behavior: none`, and never scrolls.

### Whitespace Philosophy

Unchanged from the benchmark on marketing surfaces: generous, and the black does the work.
In the HUD, whitespace is the *sky* — every pixel of chrome is a star the user cannot see.
Chrome earns its place or it is removed. The gesture panel earns it by being the only thing
that explains the controls; nothing else gets that exemption.

## Gesture Legibility

This section has no counterpart in the benchmark. It exists because a gesture interface has
to teach itself.

### The vocabulary

Four gestures, and only four. Every additional gesture costs the user memory and costs the
recogniser accuracy, so the set stays small enough to hold in the head at a glance.

| Gesture | Effect |
|---|---|
| Open palm, **still** | Zoom in |
| Open palm, **sweeping** | Look around (pan) |
| Fist | Zoom out |
| Pinch (thumb to index) | Select whatever is in the reticle |

Open-and-still versus open-and-sweeping are the same hand shape separated by **speed**. This
is deliberate: the alternative is a fifth hand shape or an explicit mode toggle, and both are
worse. Sweeping to look around and holding still to move closer are already how a person
behaves in front of a window. The threshold carries hysteresis (0.35 to enter panning, 0.18
to leave) so the two never flicker at the boundary.

### Three obligations, always on screen

1. **The vocabulary is permanently visible.** The gesture list is not onboarding that
   disappears after the first run — it is the interface. Nothing else on screen tells the
   user that a fist means anything at all. It lives in a glass panel at top-left because it
   is read-only display and the reachability rule reserves the top edge for exactly that.
2. **Recognition is mirrored back.** The row matching the current gesture goes to full
   opacity with an accent ring; every other row sits at 34%. The user learns the mapping by
   watching it happen, and learns instantly when a gesture is *not* landing.
3. **Tracking is proven, not claimed.** The hand skeleton is drawn as connection lines and
   joint dots. It is the answer to "is it even seeing me?", and it is why the camera image
   itself is unnecessary — the skeleton carries all the information the user needs and none
   of the information they did not ask to broadcast.

### The camera image is never shown

A live self-view would compete with the starfield for every pixel and would put the user's
room on screen for no functional gain. The skeleton is a strictly better answer: it proves
tracking, it costs almost nothing to draw, and it keeps the product's promise that the video
does not leave the device — visibly, not just in a privacy note.

The consequence is that the black-canvas rule from the benchmark survives **unmodified**.
There is no scrim contract here. HUD elements sit on black or on stars, and stars are small
and sparse enough that `--hud-shadow` plus the existing glass panels are sufficient.

```
--hud-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
```

### Failure has to be a first-class state

Hand tracking fails often and for boring reasons — permission denied, the camera is held by
a video call, the browser is on plain HTTP, the model will not load. Each failure gets its
own card naming the actual cause, and **every one of them offers the same escape hatch**:
drag and scroll. The product must never become unusable because a camera did not cooperate.
When tracking is off, the gesture panel says so and names the fallback rather than showing a
list of gestures that will not work.

### Night vision

`<html data-vision="night">` remaps tokens wholesale:

```
--on-primary:       #ff6a52;
--on-primary-mute:  #d4523f;
--hairline-on-dark: #5a1e18;
--accent-reticle:   #ff8a3d;
--star-saturation:  0;
```

The WebGL layer cannot take a CSS filter, so stars take a `uTint` uniform and lines take a
material colour — both driven from the same value, so the whole sky reddens as one piece.
The hand skeleton follows the same remap; it is chrome, not sky.

Note `--star-saturation: 0` in night mode: B−V colour is meaningless once everything is red,
and leaving it on produces muddy off-reds.

## Elevation & Depth

The benchmark forbids shadows and blur outright ("depth is photographic"). That rule holds
on marketing surfaces and is broken, narrowly and deliberately, for HUD chrome.

| Level | Treatment | Where |
|---|---|---|
| 0 — Flat | No shadow, no blur | All marketing surfaces, permission cards |
| 1 — Sky | The starfield itself supplies depth | Immersive backdrop |
| 2 — Glass | `bg-surface/70–80` + `backdrop-blur-md` + 1px hairline | HUD pills, gesture panel |
| 3 — Panel | `bg-surface/97` + `shadow-2xl` + hairline, **no blur** | Object panel, sheets |

Glass exists so a control stays readable when a constellation figure runs underneath it. It
is not decoration and it must not migrate onto the marketing pages, where the canvas is
controlled and flat is correct.

**Blur is reserved for level 2, and level 2 only.** Measured on the immersive route with the
settings panel open: removing `backdrop-filter` from the level-3 panels moved 81 → 92 fps,
and the 95th-percentile frame from 20.8 ms to 14.6 ms. The median barely moved — the blur was
buying jank in the tail rather than a steady cost, which is the worse kind. And at level 3's
opacity the blur is not visible at all, so it was paying that for nothing.

The rule: **if the surface is opaque enough that you cannot see the blur, it must not have
one.** Level 2 keeps it because those surfaces are genuinely translucent and small.

For the record, the larger cost is painting a big DOM panel over a continuously animating
canvas at all — hiding the panels entirely restores 143 fps from 92. That is inherent to the
composition and is accepted: the panel is a transient state, and 92 fps is comfortably above
the 60 fps target. It is documented here so nobody re-litigates it by guessing.

## Shapes

`xs 4px · sm 8px · md 16px · pill 32px · full 9999px`.

In practice: `rounded-full` for every pill, switch and icon button; `32px` on `.btn-ghost`;
`rounded-2xl` for popovers; `rounded-t-2xl` for the mobile sheet.

The reticle is a **circle, never a square, and never filled.** A filled reticle occludes the
object it is trying to identify.

## Sky Rendering Tokens

### The Milky Way

Drawn as 48,000 dim points, never as a filled shape. Physically the Milky Way *is*
unresolved stars, and to the eye it is a grainy smudge rather than a smooth band — paint it
as a surface and it reads as fog, which is to say as a graphic rather than as sky.

```
--mw-opacity:      0.42;   /* 겹침으로 밝기를 만든다 — 점 하나하나는 아주 옅다 */
--mw-size-min:     1.15px;
--mw-size-max:     2.30px; /* at the brightest contour */
--mw-alpha-gamma:  2.1;    /* 높은 감마가 띠의 가장자리를 확실히 어둡게 만든다 */
```

Additive blending here, unlike the stars. Overlapping unresolved starlight genuinely does
add, and with a black canvas there is no video underneath for it to punch through. The
brightness comes from *density*, not from any single point — which is why the per-point
alpha must stay low enough that individual grains never read as dots.

### Magnitude ramp

```
--star-mag-limit:  8;      /* photographic depth; also the catalog cutoff */
--star-size-min:   1.2px;  /* at mag 8 */
--star-size-max:   4.6px;  /* at mag -1.46 (Sirius) */
--star-size-gamma: 1.6;    /* pow() on normalized brightness for size */
--star-alpha-gamma: 0.75;  /* pow() on normalized brightness for alpha */
```

Normalized brightness is `b = clamp((magLimit - mag) / (magLimit + 1.46), 0, 1)`. Size and
alpha use *different* gammas on purpose: size ramps steeply so first-magnitude stars read as
landmarks, alpha ramps gently so the faint field still has texture rather than dropping out.

**Brightness is not size.** A brighter star gets a *wider, stronger glow* around a core that
stays tight — that is the signal the eye actually reads as brightness. Scaling size alone
produces a big dot, not a bright star.

```
--star-glow-halo:   1 + 2.6·b^2.2   /* sprite is enlarged by this to give the glow room */
--star-core-radius: 0.42 / halo     /* ⚠️ divided by halo, so the core stays the same size */
--star-spike-from:  0.72            /* diffraction cross fades in above this b */
--star-spike-max:   0.30            /* and never exceeds this weight */
```

The core radius **must** be divided by the halo factor. Enlarge the sprite without shrinking
the core fraction and every star gets dimmer, because the same energy spreads over more area.

The faint diffraction cross on the brightest stars is not a camera affectation — the human
lens really does throw rays off first-magnitude stars. It is capped hard because it turns
gaudy the instant it is overdone.

Both scale with zoom — zooming in must *reveal* fainter stars, because that is what a
telescope does and the product's whole premise is that the sky is real.

### Line vocabulary — differentiate by dash and opacity, never by hue

| Token | Value | Stroke |
|---|---|---|
| `--line-constellation` | `rgba(255,255,255,0.28)` | 1.25px solid |
| `--line-constellation-active` | `rgba(255,255,255,0.85)` | 2.0px solid |
| `--line-boundary` | `rgba(255,255,255,0.10)` | 1.0px dashed 6/6, off by default |
| `--line-horizon` | `rgba(255,255,255,0.35)` | 1.0px solid, alpha fades downward |
| `--line-ecliptic` | `rgba(255,255,255,0.18)` | 1.0px dotted 2/6 |
| `--line-meridian` | `rgba(255,255,255,0.12)` | 1.0px dotted 2/10 |

Using stroke pattern rather than color as the semantic channel is the direct descendant of
the benchmark's black-and-white rule — and it has a second payoff: it survives the
night-vision remap completely unchanged, whereas a hue-coded system would collapse.

### Blending

Star points use **NormalBlending**. Additive is prettier in isolation, but it inflates both
colour and alpha in dense regions — the Milky Way core, the Pleiades — into a milky patch
that swallows the constellation lines drawn over it. Normal blending keeps the figures
readable, and figures are what this product is for.

### Render order

```
——— WebGL canvas ———
0  horizon / ecliptic / meridian               renderOrder 0
1  stars                                       renderOrder 1
2  constellation lines — base, then active     renderOrder 2, 3
3  Sun / Moon / planets                        renderOrder 4
——— DOM overlays, in z order ———
4  gesture / tap capture layer                 z-0
5  constellation labels                        z-10
6  hand skeleton (2D canvas)                   z-20
7  reticle, compass strip, altitude ladder,
   gesture panel, HUD readouts                 z-30
8  object panel, location picker               z-40+
```

The capture layer sits at z-0, directly above the canvas and *below* the labels.
Anything higher swallows label taps entirely — a silent failure, because the sky
still responds to drags and nothing looks broken.

The hand skeleton sits *above* the labels and *below* the HUD: it is more important than a
constellation name (it proves the input works) and less important than a control.

Everything inside the canvas uses `depthTest: false` with an explicit `renderOrder`. There is
no geometry in the scene — it is a painter's-algorithm sky shell.

## Components

### Buttons

`.btn-ghost` is the only CTA. Transparent fill, 1px `--on-primary` border, 32px radius,
18px/24px padding, `.type-button-cap`, inverts to black-on-white on hover over 0.3s.

**Exactly one `.btn-ghost` per permission card, per marketing band.** Never a filled button.

HUD controls are not CTAs — they are pills (below) and never use `.btn-ghost`.

### Cards & Containers

Marketing: flat, 1px `--hairline-on-dark`, no shadow, no blur.
HUD: the Glass and Panel elevation levels above.

### Inputs & Forms

The only form surfaces are the location picker (city search + raw lat/lon) and the sliders
(sky dim, FOV trim). Inputs are transparent with a 1px bottom hairline that goes solid white
on focus. No filled input backgrounds — they read as chrome on a video.

Sliders: 2px track at `--hairline-on-dark`, 20px `--on-primary` thumb, 56px touch height with
the visual track centered inside it.

### Navigation

Marketing pages carry the benchmark's header and footer. **The immersive route has neither.**
Chrome is a HUD, and the only navigation out is a single 56px close/back control in the
bottom control row.

### Signature Components

**`reticle`** — 44px ring, 1px `--accent-reticle` at 50% alpha, unfilled, with four 6px ticks
at 0/90/180/270. On snap (a catalogued object within ~1.8° of center) it expands to 64px at
90% alpha and the object's name appears directly beneath it in `.type-eyebrow`. Transition
`0.3s ease-in-out`. Never filled; the name below the reticle is never accent-colored.

**`compass-strip`** — top edge, 32px tall, scrim background, ticks every 15°, cardinal and
intercardinal letters in `.type-eyebrow`. A linear tape that translates with heading.

**`gesture-guide`** — top-left glass panel. One row per gesture: a 24px glyph ring, the
gesture name, and its effect right-aligned. Inactive rows sit at 34% opacity; the recognised
row goes to 100% with an accent ring and accent effect text. When tracking is off the panel
replaces its footer with the drag-and-scroll fallback note. This panel is not chrome to be
minimised — it is the only documentation the interface has.

**`hand-skeleton`** — a 2D canvas overlay, never a DOM tree and never part of the 3D scene.
Twenty-one joint dots at 55% alpha and 1.5px connection lines at 34%, both in `--on-primary`.
A pinch draws an accent line between thumb and index tips whose opacity tracks how close they
are, so the user can see the gesture arming before it fires. An active gesture adds a thin
accent ring at the palm centre. The whole thing fades in and out over 0.18s so a dropped
frame of tracking does not read as a flicker.

**`altitude-ladder`** — right edge, ticks every 15° from −30° to +90°, `ZENITH` and `HORIZON`
in `.type-eyebrow` at the ends. Same scrim treatment.

**`world-map`** — the location step's centrepiece, not a thumbnail. It draws Natural Earth
coastlines directly in equirectangular projection: no tile server, no API key, no outbound
request. It must hold a **2:1 aspect** — stretching it to fill a box distorts the projection —
so it is sized as the largest 2:1 rectangle that fits the space available.

Longitude wraps infinitely; latitude is clamped. City dots are always drawn, and *names*
appear progressively as zoom creates room (rank 1 → 2 → 3), dropping any label that would
collide with one already placed. Zoom carries a **scale bar** in 1·2·5 steps plus the
magnification — a bar communicates distance faster than any number, and `×4.6` alone never
tells you whether that is a country or a city block.

**`home-starfield`** — the landing page's interactive field. Plain dots by default; **one**
star twinkles at a time, on a short decaying oscillation. A uniform sine across every star
makes the whole page shimmer, which reads as a moving background rather than a sky — and
real scintillation is irregular and hits a few stars at a time anyway.

Tapping detonates a supernova and leaves a new star. **Lines only — no radial gradients.**
A soft glowing orb looks nothing like an actual remnant and reads instantly as computer
graphics; what the eye keeps from the Crab or the Veil is thin, irregular filaments. So:
three slightly-deformed shock shells, radial filaments of varying length and weight, a
one-frame point flash with a short diffraction cross. Meteors cross every 4–11 seconds, a
tapered line with a small bright head — no halo.

**`permission-card`** — full-screen on `--canvas-night`. One `.type-display-lg` line, one
`.type-body-lg` paragraph, one `.btn-ghost`, one `.type-caption` explaining why the permission
is needed. Exactly one CTA, inherited directly from the benchmark. Failure variants name the
actual cause in the title and always offer the drag-and-scroll escape as the primary action —
the retry is the *secondary* link, because a user who just got refused wants a way forward
more than a second attempt.

**`hud-controls`** — a **vertical** column at the right edge of the immersive route, each
control an icon above a short label. Laid out horizontally along the bottom, the labels ran
together into a sentence ("손 별자리 정북") and stopped reading as separate buttons — and the
row blanked out the horizon across the full width. Vertical at the right costs one narrow
strip instead.

**`language-switch`** — in the mobile menu, language sits **below** the navigation as a
segmented switch, not as a fourth row. Language is a setting, not a destination; giving it
the same size and an index number makes it read as another page.

**`object-panel`** — ported from the benchmark's info panel without modification: bottom sheet
below 640px (peek 120px, touch-drag, snap to 75dvh, close below peek−30), right drawer at
640px and up (`max-w-md`, full height, `border-l`). Facts render as a `<dl>` with
`border-b border-hairline py-3.5` rows and `.type-mono-hud` values.

## Motion

The sky is already in continuous hand-driven motion. Transform-based UI reveals fight that
motion and read as jitter — or worse, as a tracking failure. So motion gets *quieter* here,
and that is a rule, not a preference.

| Tier | Value | Where |
|---|---|---|
| Reveal (marketing) | `0.8s cubic-bezier(0.22, 1, 0.36, 1)`, opacity + `translateY(32px)` | Home, About — unchanged from benchmark |
| Reveal (immersive) | `0.4s`, **opacity only** | Everything inside the AR HUD |
| UI | `duration-300 ease-in-out` | Pills, toggles, reticle snap |
| Overlay | `duration-400 cubic-bezier(0.16, 1, 0.3, 1)` | Sheets, drawers, permission transitions |
| Hand smoothing | velocity low-pass, τ = 0.085s | Pan input — see below |
| Skeleton fade | 0.18s exponential | Hand appearing / disappearing |
| Sheet spring | `stiffness 420, damping 40, mass 0.9` | Object panel enter / drag / snap |
| Snap spring | `stiffness 520, damping 26, mass 0.6` | Reticle locking onto a target |
| Tap spring | `stiffness 600, damping 30`, `scale 0.92` | HUD pill press |

**In the AR HUD, reveals animate opacity only. No `translateY`.**

Hand smoothing is a motion decision as much as an engineering one. The raw landmark stream
jitters by a pixel or two every frame; feeding it straight into the camera makes the sky
shimmer. τ below ~0.06s keeps that shimmer; above ~0.12s the sky lags the hand and feels like
dragging something heavy. 0.085s reads as "solid" — the sky stops when the hand stops, which
is the single strongest cue that tracking is working.

The camera itself is **not** additionally smoothed. Smoothing an already-smoothed input
produces a rubber-band feel where the sky keeps drifting after the hand halts.

### Springs, and where they are allowed

Duration-based easing describes a *scripted* movement; a spring describes a *physical* one.
The rule follows from that: **anything the user's hand or finger is directly driving gets a
spring; anything the system decides on its own gets a duration.**

- **Spring** — the object panel (a finger is dragging it), the reticle snap (it should feel
  like it catches), HUD pill presses (the finger pushed it). These read as physical because
  the user caused them.
- **Duration** — layer toggles, label fades, reveal tiers. Nothing was grabbed, so nothing
  should bounce.

The object sheet is velocity-aware: a short flick dismisses it regardless of distance,
because the user has already expressed intent and overruling that with a distance threshold
feels obstructive. Velocity is checked *before* distance for exactly that reason.

`prefers-reduced-motion: reduce` disables all reveals and smooth scrolling. It does **not**
disable hand tracking or sky motion — that is the product, not an animation.

## Do's and Don'ts

**Do**

- Keep the gesture vocabulary visible at all times, and light up the row that is recognised.
- Draw the hand skeleton whenever tracking is live — it is the proof the input works.
- Offer drag-and-scroll as an escape from every hand-tracking failure, by name.
- Keep every touch control inside the bottom-30% thumb arc, at 56×56px minimum.
- Distinguish line types by dash pattern and opacity.
- Keep `--star-saturation` at or below 0.6.
- Keep the display tiers uppercase with positive tracking.

**Don't**

- Don't show the camera image. The skeleton carries everything the user needs, and the video
  belongs to them, not to the screen.
- Don't hide the gesture list behind a help button. A gesture interface with hidden
  documentation is an interface with no documentation.
- Don't add a fifth gesture. Each one costs the user memory and the recogniser accuracy.
- Don't introduce a second accent color. `--accent-reticle` is the entire accent budget, and
  it marks the instrument — reticle, gesture ring, pinch line — never the sky.
- Don't use hue to distinguish line types.
- Don't fill the reticle — it would occlude the thing it identifies.
- Don't put glass or `backdrop-blur` on marketing surfaces.
- Don't use a filled button anywhere; the ghost pill is the only CTA.
- Don't animate `transform` on HUD reveals.
- Don't spring something the user did not grab. A bouncing toggle is noise.
- Don't use a radial gradient to make something glow. Draw the lines that are actually there.
- Don't lay the immersive controls out horizontally — they blank the horizon and read as prose.
- Don't put a header or footer on the immersive route.

## Responsive Behavior

### Breakpoints

`sm 640 · md 768 · lg 1024 · xl 1280`. The AR route is designed at 390×844 first; everything
above `sm` is a graceful widening, not a redesign.

### Touch Targets

56×56px minimum on the immersive route, 44×44px on marketing. Safe-area insets respected on
all four edges with `viewport-fit=cover`.

### Collapsing Strategy

- Object panel: bottom sheet → right drawer at `sm`.
- Compass strip: full tape → cardinals only below 360px.
- Altitude ladder: hidden below 360px width; it is the least essential readout.
- Gesture panel: keeps all four rows at every size. It is the last thing to collapse, because
  collapsing it removes the only explanation of the controls.
- HUD numerics: az/alt always; zoom factor hidden below `sm`.

### Zoom Behavior

Zoom is a change of the virtual camera's field of view, derived from a fixed assumed
horizontal FOV (67°) and the viewport aspect ratio, so the framing is identical on any screen
shape. Zoom is clamped to ×1–×8. Star size and alpha both scale with it, so zooming in
*reveals* fainter stars rather than merely magnifying the same ones — which is what a
telescope does, and the product's premise is that the sky is real.

## Iteration Guide

When adding a surface, ask in this order:

1. **Is this the immersive route or a marketing page?** Marketing surfaces follow the
   benchmark unmodified — pure black, flat, no blur, no glass. The immersive route may use
   glass, and only for controls.
2. **Is this text, a control, or an instrument?** Text gets `--hud-shadow`. Controls get a
   glass pill. Instruments — reticle, gesture ring, pinch line — get the accent.
3. **Does it need a hue?** Almost certainly not. The accent budget is spent, and it marks the
   instrument, never the sky.
4. **If it is a new interaction, how will the user find out it exists?** If the answer is not
   "it is in the gesture panel", it is not discoverable and should not ship.
5. **What happens when hand tracking fails?** Every path needs an answer, and the answer is
   always a named fallback rather than a dead end.
6. **Did the user drag it?** If yes, spring. If the system decided on its own, duration.
7. **Where does the thumb reach?** Bottom 30%, or it is read-only.

Lint this document with `npx @google/design.md lint DESIGN.md`.
