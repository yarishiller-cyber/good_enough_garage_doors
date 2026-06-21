# Good Enough Garage Doors — site facts (read with `_shared/CLAUDE.md`)

The master method lives in the shared brain (`garagedoors-shared/` = `_shared/`). This file
is the site-specific layer. Source of truth for content/tokens/pricing is `site-config.json`.

## Identity
- **Brand:** Good Enough Garage Doors · **Domain:** goodenoughgaragedoors.ca
- **Email:** info@goodenoughgaragedoors.ca
- **Phone (temporary):** 778-800-0769 → `tel:+17788000769`, `sms:+17788000769`
- **Coverage:** `gva-wide` — all of Greater Vancouver. Core city pages built first:
  Vancouver, Burnaby, Surrey, Richmond, Coquitlam (expand toward ~15–20 max, never sprawl).
- **Voice:** humble over-deliverer — *"'Good enough' is an understatement."* Under-promise,
  over-deliver, value-forward. Resolve the joke instantly; pair every laugh with a hard trust
  signal. Never joke about safety, competence, or the customer's money.
- **Palette:** plum `#6b3fa0` + warm sand `#e0a82e`. **Fonts:** Bricolage Grotesque / Inter.
  **Layout:** variant B (split hero, soft cards). **Motion:** warm + measured.

## How the site is built
- **Static HTML/CSS/JS, no build step ships.** Pages are authored once by a Node generator:
  - `node _build/build.mjs` → regenerates all `*.html` + `sitemap.xml` from `site-config.json`.
  - `GEMINI_API_KEY=$GEMINI_API_KEY node _build/gen-images.mjs` → idempotent Nano Banana image
    batch (van-ref anchor + every page hero, plum van/sand uniform consistent via `--ref`).
  - `node _build/gen-avif.mjs` → AVIF siblings for every hero webp (LCP win) + raster logo (`sharp`).
  - `node _build/fonts.mjs` → re-download self-hosted latin woff2 (Inter + Bricolage, in `assets/fonts/`).
  - `node _build/shoot.mjs` / `shoot2.mjs` / `audit.mjs` → puppeteer QA (needs `npm i puppeteer`).
- Edit copy/pricing/areas in `site-config.json` or `_build/build.mjs`, then re-run `build.mjs`.
- **Bump `ASSET_V` in `build.mjs`** whenever CSS/JS changes (cache-busting `?v=`).
- **Performance baked in:** AVIF→WebP `<picture>` on every hero (incl. interior `.pagehead`), hero
  preloaded + `fetchpriority=high`, self-hosted variable fonts (no Google CDN) preloaded, lazy +
  `decoding=async` below the fold, `robots max-image-preview:large`, `.htaccess` Brotli + 1yr immutable.
- **Schema:** business `@graph` has logo, image[], hasOfferCatalog, geo, areaServed, hours; service +
  city pages add `WebPage` with `dateModified` + a visible "Updated <month>" byline (freshness for AI).
- **A11y:** footer price toggle + FAQ are native `<details>` (work with JS off); plum focus ring (AA);
  scroll-padding for sticky header; form `autocomplete`/`inputmode`; AA-safe `--accent-dark` for text.

## Features wired (per `_shared/playbooks/SITE-REQUIREMENTS.md`)
- Floating call+text sticky bar (mobile) on every page; sticky topbar call/text on desktop.
- Dual-orientation hero on home via `<picture>` (hero-mobile portrait + hero-desktop landscape).
  Interior pages use the `.pagehead--img` photo-bg + plum gradient pattern.
- Unique page per service (8) + services hub; spring page = 3 tiers + free cables + free
  inspection; **footer price-reveal toggle** (degrades to visible without JS).
- Become-a-Partner overflow-lead form + Contact form → **`form-handler.php`** (PHP `mail()` to
  info@ — no secrets in repo; Hostinger serves PHP) → `thank-you.html`. (Direct Postgres egress
  was blocked in the build env, so Supabase REST wasn't provisioned — `mail()` is the live path.)
- Full JSON-LD (HomeAndConstructionBusiness + Service + Offer + Breadcrumb + FAQPage). **No
  self-serving review schema.** AI-crawler `robots.txt`. **No `llms.txt`.**
- Compliance wording everywhere: *"Licensed (business licence), insured & WorkSafeBC-covered."*

## Deploy
Push to the deploy branch; Hostinger Git auto-deploys. After deploy: submit `sitemap.xml` in
Google Search Console + Bing. The `_build/` dir and `node_modules/` are git-ignored / blocked
by `.htaccess` from being served.
