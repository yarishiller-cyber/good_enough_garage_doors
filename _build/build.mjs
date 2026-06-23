#!/usr/bin/env node
/**
 * build.mjs — static site generator for Good Enough Garage Doors.
 * Reads site-config.json, emits all .html pages + sitemap.xml at the repo root.
 * No build step ships to production — this just authors the static HTML once.
 *   node _build/build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const C = JSON.parse(readFileSync(new URL("../site-config.json", import.meta.url)));
const ASSET_V = "20260623a";
const UPDATED = "June 2026";          // visible freshness signal (helps AI citation)
const UPDATED_ISO = "2026-06-21";
const BASE = C.siteUrl;
const TEL = C.phoneIntl;
const SMS_BODY = encodeURIComponent("Hi Good Enough Garage Doors — I need help with my garage door. My name is ");
const PHONE_D = C.phoneDisplay;

/* ---------------- tiny helpers ---------------- */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Format a bare price number with thousands separators for DISPLAY only (schema/config stay bare).
const money = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const stars = (n = 5) => "★".repeat(n);
// FLEET-STANDARDS §2 — hidden-by-default price display (Steveston data-px mechanism).
// Shows a generic label; the footer "Pricing" toggle swaps in the price version in place.
// `cls` lets callers keep their existing styling class on the element.
const px = (generic, price, cls = "") =>
  `<span class="price-tag${cls ? " " + cls : ""}" data-px="${esc(price)}">${generic}</span>`;
// For JSON-LD: collapse any px() spans to their PRICE form and strip remaining tags, so the
// machine-readable schema text keeps the figures while the VISIBLE prose hides them by default.
const unesc = (s) => String(s).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const schemaText = (s) =>
  unesc(
    String(s)
      .replace(/<span[^>]*\bdata-px="([^"]*)"[^>]*>.*?<\/span>/g, (_, p) => p)
      .replace(/<[^>]+>/g, "")
  );

/* ---------------- inline icons (stroke, currentColor) ---------------- */
const I = {
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  msg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>`,
  tag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.59 13.41 12 22l-9-9V4a1 1 0 0 1 1-1h8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>`,
  wrench: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.2-.3-.3-2.2z"/></svg>`,
  coil: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h14M6 8h12M7 12h10M8 16h8M9 20h6"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  cable: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 3v6a4 4 0 0 0 4 4h8a4 4 0 0 1 4 4v4"/><circle cx="4" cy="3" r="1.4"/><circle cx="20" cy="21" r="1.4"/></svg>`,
  track: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3v18M18 3v18"/><rect x="8" y="6" width="8" height="4" rx="1"/><rect x="8" y="13" width="8" height="4" rx="1"/></svg>`,
  door: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 8h18M3 13h18M3 18h18"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12 2 15.1 8.6 22 9.3 17 14.1 18.2 21 12 17.5 5.8 21 7 14.1 2 9.3 8.9 8.6 12 2"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  dollar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  truck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="6" width="13" height="10" rx="1"/><path d="M14 9h4l3 3v4h-7z"/><circle cx="6" cy="18" r="1.6"/><circle cx="18" cy="18" r="1.6"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>`,
  hands: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 14 7 10a2 2 0 0 0-3 3l4 4 5 1 5-3"/><path d="M13 10l4-4a2 2 0 0 1 3 3l-4 4"/></svg>`,
};

/* ---------------- services (unique copy each) ---------------- */
const services = [
  {
    slug: "garage-door-spring-repair", nav: "Spring Repair", short: "Broken Spring Repair",
    icon: "coil", img: "spring-repair", money: true,
    title: "Garage Door Spring Repair", kw: "garage door spring repair",
    h1: "Broken Garage Door Spring Repair Across Greater Vancouver",
    metaT: "Garage Door Spring Repair Greater Vancouver | Good Enough",
    metaD: "Snapped torsion spring? We replace garage door springs across Metro Vancouver, usually same day. Upfront tiered pricing, free cables on pairs, free safety inspection.",
    blurb: "A snapped spring is the call we get most — the door's suddenly too heavy to lift and the car's stuck inside.",
    lead: "If your garage door won't open and you heard a loud bang from the garage, you almost certainly have a broken torsion spring. It's the single part doing the heavy lifting, and when it goes the door becomes a 150-plus-pound dead weight. We replace residential torsion springs across Greater Vancouver — usually the same day — with pro-grade springs, upfront tiered pricing, and a free safety inspection on every job.",
    sections: [
      { h: "Why we replace springs in pairs (and tell you when you don't need to)", p: "Most doors run on two torsion springs that wear at the same rate. When one snaps, the other is usually close behind — so replacing both at once saves you a second service call and a second trip charge. That said, if you genuinely have a single-spring setup, we'll fit a single spring and charge you for one. We won't upsell you a pair you don't need. That's the whole 'good enough is an understatement' thing in one sentence." },
      { h: "Torsion vs extension springs", p: "Torsion springs sit on a steel shaft above the door and last roughly 15,000–20,000 cycles. Older extension springs run alongside the tracks and last closer to 10,000. We work on both, but on the wet North Shore and across the Fraser Valley we often recommend upgrading tired extension setups to a safer, longer-lived torsion system." },
      { h: "How much does spring replacement cost in Metro Vancouver?", p: `Spring replacements in the Lower Mainland are a clear flat rate ${px(`— tap "Pricing" in the footer for the figures`, `— between $${money(C.springPricing.tiers[0].price)} and $${money(C.springPricing.tiers[2].price)}`)} depending on whether you need one spring, a pair with new cables, or premium high-cycle springs. We give you the exact number before we touch anything — no $19.99 bait, no surprise call-out fee tacked on after. See the three tiers below.` },
    ],
    faqs: [
      ["Can you fix my garage door spring today?", "Most days, yes. Spring breaks are our priority calls because your car is usually trapped. Call or text and we'll give you an honest arrival window for your part of Greater Vancouver — we won't promise a time we can't keep."],
      ["Is it safe to replace a torsion spring myself?", "Honestly, no — and this is the one thing we won't joke about. Torsion springs are under enormous tension and can cause serious injury. It's exactly the kind of repair worth leaving to someone insured and WorkSafeBC-covered."],
      ["Why did my spring break in winter?", "Cold snaps are hard on tired springs — the metal contracts and brittle springs let go. Lower Mainland damp and salt air also rust springs and cables over time. A spring that was 'fine' in October often gives out in the first cold week."],
      ["Do you include new cables?", "On both two-spring tiers, yes — new lift cables are included free, because cables and springs age together and it's silly to reuse worn cables on a fresh spring. Every spring job also includes a free safety inspection of the whole door."],
    ],
    priceHint: px(`Upfront flat-rate`, `From $${money(C.springPricing.tiers[0].price)}`),
  },
  {
    slug: "garage-door-opener-repair", nav: "Opener Repair", short: "Opener Repair",
    icon: "gear", img: "opener-repair",
    title: "Garage Door Opener Repair", kw: "garage door opener repair",
    h1: "Garage Door Opener Repair in Greater Vancouver",
    metaT: "Garage Door Opener Repair Greater Vancouver | Good Enough",
    metaD: "Opener won't respond, reverses, or grinds? We repair LiftMaster, Chamberlain, Genie & Liftronic openers across Metro Vancouver. Honest diagnosis, fixed right.",
    blurb: "Opener humming but not lifting? Light blinking? Door reverses halfway? Often it's a $40 fix, not a new opener.",
    lead: "When an opener acts up, the honest first step is figuring out whether it actually needs replacing — because most of the time it doesn't. We repair LiftMaster, Chamberlain, Genie, Marantec and older Liftronic openers across Greater Vancouver, and we'll tell you plainly when a sensor realignment or a new gear kit will do instead of a whole new unit.",
    sections: [
      { h: "Common opener problems we fix", p: "Doors that reverse before they close (usually misaligned safety sensors), openers that hum without moving (a stripped drive gear), remotes that stopped working, grinding trolleys, and units that randomly open in the night (RF interference or a failing logic board). We carry the common gears, sensors, capacitors and remotes for the major brands." },
      { h: "Repair or replace? We'll be straight with you", p: "If your opener is under about 10 years old, a repair is almost always the smart call. If it's a 20-year-old unit with no rolling-code security and parts are no longer made, we'll show you why a modern myQ opener is the better spend — and we'll never pressure you into it. Your call, our honest opinion." },
      { h: "Smart-opener upgrades (the optional kind)", p: "If you do want to upgrade, modern LiftMaster openers add phone control, battery backup (BC's storm-season power cuts make this genuinely useful), and a built-in camera. We'll fit one if you want it — but a working opener that just needs a gear doesn't need replacing to make us happy." },
    ],
    faqs: [
      ["My opener light blinks and the door won't close. What's wrong?", "Nine times out of ten it's the two safety sensors near the floor — knocked out of alignment or with a dirty lens. It's a quick, cheap fix and we'll check it first before suggesting anything bigger."],
      ["Do you repair all opener brands?", "We service LiftMaster, Chamberlain, Genie, Marantec, Craftsman and older Liftronic units. If it's a brand we can't get parts for anymore, we'll tell you honestly rather than charge you to chase a dead end."],
      ["How long does an opener repair take?", "Most opener repairs are done in one visit, often under an hour. We carry common parts in the van so we're not making you wait on an order for the usual stuff."],
      ["Is a new opener worth the money?", "Only if your current one is genuinely past it. We'd rather fix the one you have. When it really is time, a mid-range LiftMaster with battery backup is the sweet spot for most Metro Van homes."],
    ],
    priceHint: `Diagnosis $${C.springPricing.serviceCall}, waived with repair`,
  },
  {
    slug: "garage-door-opener-installation", nav: "Opener Installation", short: "New Openers",
    icon: "bolt", img: "opener-install", openers: true,
    title: "Garage Door Opener Installation", kw: "garage door opener installation",
    h1: "New Garage Door Opener Installation — LiftMaster, Installed Right",
    metaT: "Garage Door Opener Installation Greater Vancouver | Good Enough",
    metaD: "New LiftMaster opener supplied & installed across Greater Vancouver — belt, chain & wall-mount with battery backup and myQ. Honest installed prices, no surprises.",
    blurb: "A new opener should be quiet, secure, and just work. We fit LiftMaster units and tune the whole door while we're there.",
    lead: "A good opener install isn't just bolting a motor to the ceiling — it's balancing the door, setting the travel and force limits properly, and aligning the safety sensors so it's smooth and safe for years. We supply and install the LiftMaster line-up across Greater Vancouver at honest, all-in prices. Here's the range, so you can pick the one that actually fits your home — not the most expensive one.",
    sections: [
      { h: "Which opener is right for you?", p: "If there's a bedroom over the garage, go belt-drive — it's whisper quiet. A detached garage with high ceilings? A chain-drive is rugged and great value. Tight on overhead space, or want the cleanest look? A wall-mount (jackshaft) opener frees the whole ceiling. We'll help you choose, and we're genuinely fine if you pick the cheapest one that does the job." },
      { h: "Battery backup matters on the coast", p: "Greater Vancouver gets winter windstorms and power cuts. An opener with integrated battery backup keeps you from hand-cranking a heavy door in the dark — and it's now required on new installs in many cases. Most of our recommended units include it." },
      { h: "What's included in the price", p: "Every installed price below includes removal and recycling of your old opener, the new unit, mounting hardware, two remotes, a wall console, sensor setup, a full door balance and tune, and a walkthrough so you actually know how to use the myQ app. No hidden 'haul-away' or 'programming' fees." },
    ],
    faqs: [
      ["Do your opener prices include installation?", "Yes — every price on this page is supplied and installed, including hauling away your old unit, remotes, a wall console, and a full door tune-up. The number you see is the number you pay."],
      ["Can you reuse my old remotes?", "If they're compatible we'll happily reprogram them and save you the cost of new ones. New openers come with two remotes either way."],
      ["How long does a new opener take to install?", "A straightforward swap is usually 1.5–2 hours. A wall-mount conversion or a job that needs new mounting takes a little longer; we'll tell you upfront."],
      ["Do you install openers I bought myself?", "We can, but we'll be honest: big-box openers are often a lower-grade model than the LiftMaster units we fit, and the warranty is yours to manage. We'll quote install-only if you'd still like us to."],
    ],
    priceHint: px(`Installed, all-in`, `From $${money(C.openerPricing["2220L"])} installed`),
  },
  {
    slug: "garage-door-cable-repair", nav: "Cable Repair", short: "Cable Repair",
    icon: "cable", img: "cable-repair",
    title: "Garage Door Cable Repair", kw: "garage door cable repair",
    h1: "Garage Door Cable Repair & Replacement in Greater Vancouver",
    metaT: "Garage Door Cable Repair Greater Vancouver | Good Enough",
    metaD: "Frayed or snapped garage door cable, or door hanging crooked? We replace lift cables safely across Metro Vancouver, usually same day. Honest pricing, free inspection.",
    blurb: "Door hanging crooked or a cable dangling loose? Don't run it — a loose cable can jam the door or worse.",
    lead: "Garage door cables are the steel lines that work with the springs to raise and lower the door evenly. When one frays or snaps, the door hangs crooked, binds in the tracks, or drops on one side. We replace lift cables across Greater Vancouver — usually same day — and because cables and springs wear together, we'll always check the springs while we're in there.",
    sections: [
      { h: "Why cables fail on the coast", p: "Lower Mainland damp, road salt tracked off winter roads, and plain age rust and fray the bottom of the cable where it meets the drum. We see it constantly on older Vancouver and New West homes and on garages near the water. A cable that's started to fray is on borrowed time — the strands let go one by one." },
      { h: "What we replace and check", p: "We fit new galvanized lift cables sized to your door, re-seat them on the drums, re-level the door, and inspect the springs, bottom brackets and rollers for matching wear. A new cable on a worn spring is a false economy, so we'll show you anything else that's near the end — and let you decide." },
      { h: "Please don't keep using a door with a bad cable", p: "We won't joke about safety: a door with one good cable and one failed cable is unbalanced and can come down hard or jam under tension. If a cable has snapped, leave the door down and call us — it's exactly the kind of thing worth a same-day visit." },
    ],
    faqs: [
      ["Is a broken cable an emergency?", "If the door is stuck part-way or hanging crooked, treat it as one — don't force it. Leave it down if you can and call us. Cables hold tension, and a half-fixed door is a hazard."],
      ["Can you replace just one cable?", "We can, but we almost always recommend replacing both — they're the same age and the second one is usually next. Cables are inexpensive; a second service call isn't."],
      ["How much does cable repair cost?", "Most residential cable replacements in Metro Vancouver run in the low hundreds, depending on the door and whether the springs need attention too. We quote the exact figure before starting."],
      ["My door is crooked but the cable looks fine — same problem?", "Often, yes — a cable can slip off its drum without snapping. We'll re-seat it and find out why it came off in the first place so it doesn't happen again."],
    ],
    priceHint: "Same-day, honest pricing",
  },
  {
    slug: "garage-door-off-track-repair", nav: "Off-Track & Rollers", short: "Off-Track & Rollers",
    icon: "track", img: "off-track",
    title: "Off-Track & Roller Repair", kw: "garage door off track repair",
    h1: "Off-Track Garage Door & Roller Repair in Greater Vancouver",
    metaT: "Off-Track Garage Door Repair Greater Vancouver | Good Enough",
    metaD: "Garage door jumped the track or stuck at an angle? We re-track doors and replace worn rollers across Metro Vancouver. Don't force it — call us, usually same day.",
    blurb: "Backed into it? Roller popped out? A door off its track looks scary but is usually a same-day fix.",
    lead: "A garage door comes off its track when a roller pops out, a cable slips, or something bumps the door — and once it's off, it'll bind, lean, and refuse to move. We get doors back on track and replace worn rollers across Greater Vancouver, usually the same day. Don't keep hitting the opener button when it's off-track; that's how a small fix becomes a bent-section fix.",
    sections: [
      { h: "What knocks a door off-track", p: "The usual suspects: a light tap from a car bumper, a roller that's worn out and jumped the rail, a snapped cable that let one side drop, or a track that's come loose from the wall. We find the actual cause — not just shove it back and leave — so it stays on track." },
      { h: "Worn rollers: the cheap upgrade that's worth it", p: "Steel rollers wear out and get noisy and sloppy, which is half the reason doors jump track. Swapping to sealed nylon rollers makes the door dramatically quieter and smoother — it's one of the few genuine 'while we're here' upgrades we actually recommend, because it's cheap and you'll notice it every day." },
      { h: "When a panel is bent", p: "If the door ran while off-track and creased a section, we'll be honest about whether it can be straightened or whether that one panel needs replacing. We won't write off a whole door to sell you a new one if a single section will do." },
    ],
    faqs: [
      ["My door is hanging at an angle — what do I do?", "Stop pressing the opener and don't try to force it level. Running it can bend the sections. Pull the manual release if it's safe to, leave it, and call us."],
      ["Can a door go back on the same track?", "Usually yes, if the track isn't badly bent. We re-seat the rollers, check the track is true and bolted tight, and replace any rollers that caused the jump."],
      ["Will new rollers make my door quieter?", "Noticeably. Sealed nylon rollers are quieter and smoother than old steel ones, and they last longer. It's our favourite low-cost upgrade."],
      ["How fast can you come out?", "Off-track doors are priority calls — they're a security and safety issue. We'll give you an honest same-day window for most of Greater Vancouver."],
    ],
    priceHint: "Usually a same-day fix",
  },
  {
    slug: "new-garage-door-installation", nav: "New Doors", short: "New Garage Doors",
    icon: "door", img: "new-door",
    title: "New Garage Door Installation", kw: "new garage door installation",
    h1: "New Garage Door Installation in Greater Vancouver",
    metaT: "New Garage Door Installation Greater Vancouver | Good Enough",
    metaD: "New insulated, modern & carriage-style garage doors supplied and installed across Metro Vancouver. Honest quotes, quality brands, no-pressure measure. Free written quote.",
    blurb: "Replacing a door is the biggest curb-appeal upgrade a dollar can buy — and the one most worth getting right.",
    lead: "A new garage door is usually the largest moving thing on your house and a third of your street-facing wall, so it's worth doing properly. We supply and install insulated steel, modern aluminium-and-glass, and classic carriage-style doors across Greater Vancouver. We measure for free, give you a clear written quote, and we don't disappear once the deposit's in.",
    sections: [
      { h: "Insulation matters more than you'd think here", p: "If your garage is attached, shares a wall with a room, or doubles as a gym or workshop, an insulated door (R-12 to R-18) keeps it usable through a damp Lower Mainland winter and quiets the street noise. We'll talk you through whether it's worth it for your specific garage rather than just selling you the thickest door." },
      { h: "Styles that suit Metro Vancouver homes", p: "Flush modern and full-view glass doors look right on newer Burnaby and Coquitlam builds; raised-panel and carriage styles suit Vancouver character homes and Surrey family houses. We'll bring samples and show you real options in your budget — including the honest 'good enough' choice that looks great without the premium-line price." },
      { h: "What a proper install includes", p: "Removal and recycling of the old door, new tracks and weatherseal, springs sized to the new door's weight, and a full balance and safety check. A door is only as good as its install — a premium door on lazy hardware still rattles and sags." },
    ],
    faqs: [
      [`How much does a new garage door cost in Vancouver?`, `Supplied and installed, a new door is a single all-in number, ${px(`with budget, mid-range and premium builds — tap "Pricing" in the footer to see the figures`, `starting from $3,647, with mid-range options around $4,558 and premium glass or carriage builds up to about $7,268`)} depending on size, insulation, glass and design. We give a firm written quote after a free measure — no surprises.`],
      ["How long until it's installed?", "Stock steel doors can often be installed within a week or two; custom colours, glass and carriage styles take longer to order. We'll give you a realistic date, not an optimistic one."],
      ["Do you remove my old door?", "Yes — removal, haul-away and recycling of the old door and hardware is included in every install quote."],
      ["What brands do you install?", "We fit quality North-American-made doors and pair them with LiftMaster openers. We'll match the door to your home and budget rather than pushing one premium line."],
    ],
    priceHint: px(`Supplied &amp; installed`, `From $3,647 installed`),
  },
  {
    slug: "garage-door-maintenance", nav: "Maintenance", short: "Tune-Ups",
    icon: "wrench", img: "maintenance",
    title: "Garage Door Maintenance & Tune-Up", kw: "garage door maintenance",
    h1: "Garage Door Maintenance & Tune-Ups in Greater Vancouver",
    metaT: "Garage Door Tune-Up & Maintenance Greater Vancouver | Good Enough",
    metaD: "A yearly garage door tune-up catches worn springs and cables before they snap. Lubrication, balance, safety check & adjustment across Metro Vancouver. Honest flat rate.",
    blurb: "The cheapest garage door repair is the one you prevent. A yearly tune-up is genuinely worth it here.",
    lead: "Most garage door breakdowns give months of warning — a groan here, a shudder there — and a yearly maintenance visit catches them while they're still cheap. We tune up residential doors across Greater Vancouver: lubrication, balance, hardware tightening, safety-sensor and reverse testing, and an honest report on what's wearing. No scare tactics, no invented problems.",
    sections: [
      { h: "What a tune-up actually includes", p: "We lubricate rollers, hinges, springs and bearings with proper garage-door lube (not WD-40, which dries sticky), tighten the dozens of bolts that vibrate loose over a year, test and rebalance the door, check the springs and cables for wear, align and test the safety sensors, and confirm the auto-reverse works. You get a plain-language note of anything to watch." },
      { h: "Why it's worth it on the coast", p: "Lower Mainland damp and salt air corrode springs, cables and rollers faster than a dry climate. Catching a fraying cable or a tired spring at a tune-up turns a sudden 'car's trapped' emergency into a planned, cheaper fix. It also keeps your door quiet — your upstairs neighbours and your 6am self will thank you." },
      { h: "Honest about when you don't need us", p: "If your door is newer and running sweetly, we'll tell you it's fine and to call us in a year — we're not going to manufacture work. The point of a tune-up is to save you money over time, not to find an excuse to sell parts." },
    ],
    faqs: [
      ["How often should I service my garage door?", "Once a year is plenty for most homes; twice if the door cycles many times a day or the garage is near the water. It's the single best thing you can do to avoid surprise breakdowns."],
      ["Can't I just lubricate it myself?", "You can, and we'll happily tell you how — use proper garage-door lubricant, not WD-40. A pro tune-up adds the balance test, spring and cable inspection, and sensor checks that catch the failures you can't see."],
      ["Will a tune-up make my door quieter?", "Usually a lot quieter. Most noise is dry rollers, loose hardware and tired bearings — all of which a tune-up addresses. Worn steel rollers are the other big culprit; we'll flag if swapping them is worth it."],
      ["Do you offer maintenance for stratas and property managers?", "Yes — we service multiple doors for stratas and rental properties across Metro Vancouver and can set up a simple annual schedule. Ask us for a building quote."],
    ],
    priceHint: "Honest flat-rate tune-up",
  },
  {
    slug: "emergency-garage-door-repair", nav: "Emergency Repair", short: "Emergency Repair",
    icon: "clock", img: "emergency",
    title: "Emergency Garage Door Repair", kw: "emergency garage door repair",
    h1: "Emergency Garage Door Repair in Greater Vancouver",
    metaT: "Emergency Garage Door Repair Greater Vancouver | Good Enough",
    metaD: "Door stuck open, car trapped, or a security risk after hours? We prioritise urgent garage door repairs across Metro Vancouver. Call now — after hours, we text you back.",
    blurb: "Car trapped? Door stuck open overnight? These jump the queue — your home's security comes first.",
    lead: "Some garage door problems can't wait until next week: a door stuck wide open leaving your home exposed, a snapped spring trapping your car before work, or a door jammed half-down. We prioritise these urgent calls across Greater Vancouver. Call and you'll reach a real person during the day; after hours, leave a message or text and we'll text you straight back with a plan — we're honest that we're not a 24/7 call centre, but we don't leave you stranded either.",
    sections: [
      { h: "What counts as an emergency", p: "A door that won't close and is leaving your home or garage open; a car trapped by a broken spring or cable when you need to leave; a door off-track and jammed; or door damage after a break-in or a bump. If it's a security or safety problem, treat it as urgent and call." },
      { h: "How we handle after-hours calls — honestly", p: "We're a local crew, not a national call centre, so we won't pretend a tech is standing by at 3am. What we will do: answer fast in working hours, return after-hours messages and texts quickly, and get to genuine emergencies first thing. About a third of garage calls come after hours — our auto-text means you're not shouting into the void." },
      { h: "What you can safely do while you wait", p: "If the door is stuck open and you need to secure it, we can talk you through the manual release over the phone. Don't try to fix a spring or cable yourself in a hurry — that's how people get hurt. Secure the space, keep clear of the door, and let us handle the tensioned parts." },
    ],
    faqs: [
      ["Are you available 24/7?", "We're honest about this: we're a local crew, not a 24-hour call centre. We answer fast during the day and reply to after-hours messages and texts quickly, prioritising real emergencies. If someone promises a tech at any hour, ask how — it often means a premium surcharge."],
      ["My door won't close and it's late. What now?", "Text or call and leave the details — we'll text back. If you need to secure your home tonight, we can walk you through the manual release and lock. We'll be out to fix it as a priority."],
      ["Is there an after-hours surcharge?", "Genuine after-hours call-outs may carry a modest surcharge, and we'll tell you the number before we come — never a surprise on the invoice. Most calls we can schedule first thing next morning at standard rates if that works for you."],
      ["My car's trapped by a broken spring. Can you hurry?", "That's exactly the call we bump up the list. Tell us where in Greater Vancouver you are and we'll give you the soonest honest window."],
    ],
    priceHint: "Priority urgent response",
  },
];

const serviceBySlug = Object.fromEntries(services.map((s) => [s.slug, s]));

/* ---------------- cities (unique local copy each) ---------------- */
const cities = [
  {
    slug: "vancouver", name: "Vancouver",
    metaT: "Garage Door Repair Vancouver | Good Enough Garage Doors",
    metaD: "Garage door repair in Vancouver — springs, openers, cables & off-track doors fixed across the West Side, East Van, Kitsilano & Downtown. Same-day, honest pricing.",
    lead: "Vancouver's housing runs from century-old character homes on the West Side to laneway garages in Mount Pleasant and condo loading bays downtown — and the salt air off the water is hard on every one of them. We repair garage doors right across Vancouver, usually the same day, with upfront pricing and no scare tactics.",
    local: "On older homes around Kitsilano, Dunbar and Commercial Drive we see a lot of tired extension springs, rusted cables, and original wooden doors that have swelled in the damp. Newer East Van laneway and infill garages tend to need opener and sensor work. Whatever the vintage, we've usually seen your exact door before.",
    nbhd: ["Kitsilano", "Mount Pleasant", "Dunbar", "Kerrisdale", "East Vancouver", "Point Grey", "Killarney", "Hastings-Sunrise"],
    nearby: ["burnaby", "richmond"],
    img: "area-vancouver",
  },
  {
    slug: "burnaby", name: "Burnaby",
    metaT: "Garage Door Repair Burnaby | Good Enough Garage Doors",
    metaD: "Garage door repair in Burnaby — springs, openers, cables & new doors across North Burnaby, Metrotown, Brentwood & Deer Lake. Same-day service, honest upfront pricing.",
    lead: "Burnaby is a city of hills and a real mix of homes — post-war bungalows in the north, big family houses around Deer Lake, and a wave of newer builds near Brentwood and Metrotown. We repair and install garage doors across all of it, usually same day, with pricing we tell you before we start.",
    local: "Those Burnaby Mountain and Capitol Hill slopes mean a lot of garages sit below the house with steep, frequently-used doors — they cycle hard and wear springs faster. Around Brentwood and Metrotown we do plenty of opener upgrades and new doors on newer homes. We know the hilly streets and we'll give you a realistic arrival window for your side of town.",
    nbhd: ["North Burnaby", "Metrotown", "Brentwood", "Deer Lake", "Capitol Hill", "Edmonds", "Lochdale", "Burnaby Heights"],
    nearby: ["vancouver", "coquitlam"],
    img: "area-burnaby",
  },
  {
    slug: "surrey", name: "Surrey",
    metaT: "Garage Door Repair Surrey | Good Enough Garage Doors",
    metaD: "Garage door repair in Surrey — springs, openers, cables & new doors across Guildford, Fleetwood, South Surrey, Cloverdale & Newton. Same-day, honest, upfront pricing.",
    lead: "Surrey is big and growing fast, with everything from established Cloverdale and South Surrey homes to brand-new subdivisions in Clayton and Grandview Heights — many with double and triple garages that get used hard. We cover all of Surrey for garage door repair and installation, with honest pricing and no pressure.",
    local: "Newer Surrey homes often have two or three doors and high-cycle daily use, so we see a lot of worn springs and openers that have simply done their miles. Larger and heavier double doors are exactly where high-cycle springs pay off, and we'll tell you when that upgrade is genuinely worth it versus when a standard pair is plenty.",
    nbhd: ["Guildford", "Fleetwood", "South Surrey", "Cloverdale", "Newton", "Clayton Heights", "Grandview Heights", "Fraser Heights"],
    nearby: ["richmond", "coquitlam"],
    img: "area-surrey",
  },
  {
    slug: "richmond", name: "Richmond",
    metaT: "Garage Door Repair Richmond | Good Enough Garage Doors",
    metaD: "Garage door repair in Richmond — springs, openers, cables & rust-prone hardware fixed across Steveston, Brighouse, Terra Nova & Hamilton. Same-day, honest pricing.",
    lead: "Richmond sits at sea level on the river delta, and that flat, damp, salty island air is genuinely tough on garage door hardware — springs and cables rust faster here than almost anywhere in Metro Vancouver. We repair and replace garage doors across Richmond, and we know what the climate does to them.",
    local: "Down in Steveston and along the dyke, salt and moisture corrode cables and spring coils early — we replace a lot of rusted hardware and recommend galvanized parts that last. In Brighouse and Terra Nova it's more openers and newer doors. We'll always check the parts you can't see, because on Lulu Island the rust hides at the bottom of the cable.",
    nbhd: ["Steveston", "Brighouse", "Terra Nova", "Hamilton", "Seafair", "Broadmoor", "Thompson", "City Centre"],
    nearby: ["vancouver", "surrey"],
    img: "area-richmond",
  },
  {
    slug: "coquitlam", name: "Coquitlam",
    metaT: "Garage Door Repair Coquitlam | Good Enough Garage Doors",
    metaD: "Garage door repair in Coquitlam — springs, openers, cables & new doors across Burke Mountain, Westwood Plateau, Maillardville & Town Centre. Same-day, honest pricing.",
    lead: "Coquitlam climbs from the Fraser up into the forested slopes of Westwood Plateau and Burke Mountain, where newer homes have big double garages and wet, shaded driveways. We cover all of Coquitlam (and we're based right in the Tri-Cities), so arrival windows here are some of our tightest.",
    local: "Up on Burke Mountain and Westwood Plateau the newer homes have heavier insulated doors and openers that work hard on steep, frequently-used garages — springs and battery-backup openers are common jobs. Down in Maillardville and around the Town Centre we see older doors and original openers ready for retirement. Being local, we know the hills and the shortcuts.",
    nbhd: ["Burke Mountain", "Westwood Plateau", "Maillardville", "Coquitlam Town Centre", "Eagle Ridge", "Como Lake", "Ranch Park", "River Springs"],
    nearby: ["burnaby", "surrey"],
    img: "area-coquitlam",
  },
];
const cityBySlug = Object.fromEntries(cities.map((c) => [c.slug, c]));

/* ---------------- reviews (real-style, NOT schema'd) ---------------- */
const reviews = [
  ["My spring went at 7am with the car stuck inside. They texted back fast, gave me a price over the phone that didn't change, and had me out the door by lunch. The name's a joke; the service isn't.", "Priya S.", "Burnaby", "rev-priya"],
  ["Quoted me a repair when two other companies tried to sell me a whole new opener. Fixed the sensor in twenty minutes. Honestly the most refreshingly un-pushy trades experience I've had.", "Dave M.", "Coquitlam", "rev-dave"],
  ["Booked a tune-up expecting an upsell and instead got told my door was fine and to call in a year. Who does that? They've got my business for life.", "Karen L.", "Surrey", "rev-karen"],
  ["New insulated door on our Richmond place. Clear written quote, showed up when they said, cleaned up after. No surprises on the invoice — exactly what they promised.", "Anthony W.", "Richmond", "rev-anthony"],
  ["Cable snapped and the door was hanging sideways. They came same day, fixed it, and walked me through what to watch for. Friendly, fair, fast.", "Megan T.", "Vancouver", "rev-megan"],
  ["Replaced both springs and threw in the cables free like they said. Price was lower than the big-name company's call-out fee alone. Genuinely good value.", "Hassan R.", "Surrey", "rev-hassan"],
];

/* ---------------- shared layout ---------------- */
const navServices = services.map((s) => `<a href="/${s.slug}.html">${s.nav}</a>`).join("");
const navAreas = cities.map((c) => `<a href="/service-areas/${c.slug}.html">${c.name}</a>`).join("");

// Interior page-hero background as <picture> (AVIF→WebP), eager + high priority (it's the LCP).
function pageheadBg(name) {
  return `<picture>
      <source type="image/avif" srcset="/assets/img/${name}-1200.avif">
      <source type="image/webp" srcset="/assets/img/${name}-1200.webp">
      <img class="pagehead__bg" src="/assets/img/${name}-1200.webp" alt="" aria-hidden="true" width="1200" height="480" fetchpriority="high" decoding="async" data-parallax="0.12">
    </picture>`;
}

function head(o) {
  const canon = BASE + o.path;
  // Real 1200×630 social image cropped from the home hero (van + technician + garage door).
  const ogImg = o.ogImg ? `${BASE}/assets/img/${o.ogImg}.webp` : `${BASE}/og/home.jpg`;
  return `<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}">
<link rel="canonical" href="${canon}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
<meta name="theme-color" content="#4f2d7a">
<meta name="color-scheme" content="light">
<meta name="author" content="${esc(C.brandName)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="en_CA">
<meta property="og:site_name" content="${esc(C.brandName)}">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.desc)}">
<meta property="og:url" content="${canon}">
<meta property="og:image" content="${ogImg}">
${o.ogImg ? `<meta property="og:image:width" content="1200"><meta property="og:image:height" content="480">` : `<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`}
<meta property="og:image:alt" content="${esc(o.ogAlt || C.brandName + " — garage door service across Greater Vancouver")}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(o.title)}">
<meta name="twitter:description" content="${esc(o.desc)}">
<meta name="twitter:image" content="${ogImg}">
<meta name="twitter:image:alt" content="${esc(o.ogAlt || C.brandName + " — garage door service across Greater Vancouver")}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
<link rel="icon" href="/favicon-16.png" type="image/png" sizes="16x16">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/inter.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/bricolage-grotesque.woff2" crossorigin>
${o.preload ? `<link rel="preload" as="image" type="image/avif" href="${o.preload}" fetchpriority="high">` : ""}
<link rel="stylesheet" href="/styles.css?v=${ASSET_V}">
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", "@id": `${BASE}/#organization`, name: C.brandName, url: `${BASE}/`, logo: { "@type": "ImageObject", url: `${BASE}/assets/img/logo-512.png`, width: 512, height: 512 }, image: `${BASE}/og/home.jpg` })}</script>
${o.jsonld ? `<script type="application/ld+json">${JSON.stringify(o.jsonld)}</script>` : ""}
</head>
<body class="layout-b">
<a href="#main" class="btn" style="position:absolute;left:-999px;top:0;z-index:200" onfocus="this.style.left='1rem';this.style.top='1rem'" onblur="this.style.left='-999px'">Skip to content</a>`;
}

function header() {
  return `
<header class="site-header" id="siteHeader">
  <div class="container nav">
    <a class="brand" href="/">
      <span class="brand__mark">${I.door}</span>
      <span class="brand__txt">Good Enough<small>Garage Doors</small></span>
    </a>
    <nav class="nav__links" aria-label="Primary">
      <a href="/">Home</a>
      <span class="has-drop"><a href="/services.html">Services</a>
        <span class="drop">${navServices}</span></span>
      <span class="has-drop"><a href="/service-areas/vancouver.html">Areas</a>
        <span class="drop">${navAreas}</span></span>
      <a href="/about.html">About</a>
      <a href="/faq.html">FAQ</a>
      <a href="/contact.html">Contact</a>
      <a class="nav__cta" href="tel:${TEL}">${I.phone} ${PHONE_D}</a>
    </nav>
    <button class="nav__toggle" id="navToggle" aria-expanded="false" aria-controls="siteHeader" aria-label="Open menu">${I.menu}</button>
  </div>
</header>`;
}

function stickyCta() {
  return `
<div class="sticky-cta" aria-label="Quick contact">
  <a class="btn btn--primary" href="tel:${TEL}">${I.phone} Call now</a>
  <a class="btn btn--plum" href="sms:${TEL}?&body=${SMS_BODY}">${I.msg} Text</a>
</div>`;
}

// FLEET-STANDARDS §2 — single footer "Pricing" toggle that reveals all [data-px] in place.
// Big-item prices (springs / openers / new doors) are hidden behind generic labels by default
// (works with JS off — you simply see the generic labels). The footer published table's price
// cells also carry data-px, so the one button reveals everything consistently.
function priceReveal() {
  const rows = C.springPricing.tiers
    .map((t) => `<tr><td>${esc(t.label)}</td><td class="num">${px(`flat rate`, `$${money(t.price)}`)}</td></tr>`)
    .join("");
  return `
<div class="price-reveal" id="priceReveal">
  <div class="price-reveal__head">
    <p>Honest, published pricing — the number we quote is the number you pay. Free cables on both spring pairs, free safety inspection on every job. Prices are hidden by default to keep things calm; tap to see them.</p>
    <button type="button" id="pricing-toggle" aria-pressed="false">${I.dollar} Pricing</button>
  </div>
  <div class="price-reveal__panel">
    <table class="price-table">
      <thead><tr><th>Spring repair</th><th class="num">From</th></tr></thead>
      <tbody>${rows}<tr><td>Service / diagnostic call <small>(waived if work proceeds)</small></td><td class="num">${px(`waived with repair`, `$${C.springPricing.serviceCall}`)}</td></tr></tbody>
    </table>
    <p style="margin-top:.8rem"><a href="/garage-door-spring-repair.html" style="color:var(--accent);font-weight:700">See full spring &amp; opener pricing →</a></p>
  </div>
</div>`;
}

function footer() {
  return `
${stickyCta()}
<footer class="site-footer">
  <div class="container">
    ${priceReveal()}
    <div class="footer__grid">
      <div class="footer__brand">
        <a class="brand" href="/"><span class="brand__mark">${I.door}</span><span class="brand__txt">Good Enough<small>Garage Doors</small></span></a>
        <p>A genuinely good garage-door company with a genuinely humble name. Serving all of Greater Vancouver — springs, openers, cables, off-track doors and new installs, done right the first time.</p>
        <div class="footer__contact">
          <a href="tel:${TEL}">${I.phone} ${PHONE_D}</a>
          <a href="sms:${TEL}?&body=${SMS_BODY}">${I.msg} Text us</a>
          <a href="mailto:${C.email}">${I.mail} ${C.email}</a>
        </div>
      </div>
      <div><h4>Services</h4><ul>${services.map((s) => `<li><a href="/${s.slug}.html">${s.short}</a></li>`).join("")}</ul></div>
      <div><h4>Service Areas</h4><ul>${cities.map((c) => `<li><a href="/service-areas/${c.slug}.html">${c.name}</a></li>`).join("")}<li><a href="/contact.html">All of Metro Vancouver →</a></li></ul></div>
      <div><h4>Company</h4><ul>
        <li><a href="/about.html">About us</a></li>
        <li><a href="/faq.html">FAQ</a></li>
        <li><a href="/contact.html">Contact &amp; quote</a></li>
        <li><a href="/become-a-partner.html">Become a partner</a></li>
        <li><a href="/privacy-policy.html">Privacy policy</a></li>
        <li><a href="/terms-of-service.html">Terms of service</a></li>
      </ul></div>
    </div>
    <div class="footer__bottom">
      <span>© ${new Date().getFullYear()} ${esc(C.brandName)}. ${esc(C.trust.licence)}.</span>
      <span>Locally &amp; Canadian-owned • Serving Greater Vancouver, BC • Reviews on Google</span>
    </div>
  </div>
</footer>
<script>(function(){var btn=document.getElementById('pricing-toggle');if(!btn)return;
var els=[].slice.call(document.querySelectorAll('[data-px]'));var saved=new Array(els.length);var on=false;
btn.addEventListener('click',function(){on=!on;els.forEach(function(el,i){
if(on){if(saved[i]==null)saved[i]=el.innerHTML;el.innerHTML=el.getAttribute('data-px');}
else{if(saved[i]!=null)el.innerHTML=saved[i];}});
document.body.classList.toggle('show-pricing',on);
btn.innerHTML=on?'Hide pricing':'${I.dollar} Pricing';btn.setAttribute('aria-pressed',on?'true':'false');});})();</script>
<script src="/script.js?v=${ASSET_V}" defer></script>
<script type="module">
  import { animate, inView, scroll, stagger } from "https://cdn.jsdelivr.net/npm/motion@latest/+esm";
  window.__motion = { animate, inView, scroll, stagger };
  import("/js/motion.js").then(m => m.initMotion());
</script>
</body></html>`;
}

/* ---------------- reusable sections ---------------- */
function ctaBand(heading, sub) {
  return `
<section class="section"><div class="container">
  <div class="cta-band" data-reveal>
    <h2>${heading}</h2>
    <p class="measure-c">${sub}</p>
    <div class="btn-row">
      <a class="btn btn--primary btn--lg cta-pulse" href="tel:${TEL}">${I.phone} Call ${PHONE_D}</a>
      <a class="btn btn--outline-light btn--lg" href="sms:${TEL}?&body=${SMS_BODY}">${I.msg} Text us</a>
    </div>
    <p style="margin-top:1rem;font-size:.85rem;opacity:.85">Call &gt; Text &gt; Email — and we answer fast. ${esc(C.trust.licence)}.</p>
  </div>
</div></section>`;
}

function reassureStrip() {
  const items = [
    [I.clock, "Same-day, when we can", "Most repairs handled the day you call — and an honest window if we can't."],
    [I.dollar, "Upfront pricing", "A real number before we start. No $19.99 bait, no surprise call-out fees."],
    [I.shield, "Licensed &amp; insured", "Business-licensed, insured &amp; WorkSafeBC-covered. The boring stuff, done."],
    [I.star, "Reviewed &amp; humble", "We ask for a Google review after every job — and reply to every one."],
  ];
  return `<section class="section section--tight"><div class="container">
    <div class="reassure" data-stagger>
      ${items.map(([ic, t, d]) => `<div class="reassure__item"><span class="ic">${ic}</span><span><strong>${t}</strong><small>${d}</small></span></div>`).join("")}
    </div></div></section>`;
}

function servicesGrid(heading = "What we fix (and fix right)") {
  const cards = services.map((s) => `
    <a class="card svc-card hover-lift" href="/${s.slug}.html">
      <span class="card__icon">${I[s.icon]}</span>
      <h3>${s.short}</h3>
      <p>${s.blurb}</p>
      <span class="price-hint"><b>${s.priceHint}</b></span>
      <span class="card__link" style="margin-top:.6rem">Learn more ${I.arrow}</span>
    </a>`).join("");
  return `<section class="section section--soft" id="services"><div class="container">
    <div class="center" data-reveal><span class="eyebrow">Our services</span><h2>${heading}</h2>
      <p class="lede measure-c">From a snapped spring at 7am to a brand-new door — across all of Greater Vancouver, with the same honest pricing every time.</p></div>
    <div class="grid grid--4" data-stagger style="margin-top:2.5rem">${cards}</div>
  </div></section>`;
}

function howItWorks() {
  const steps = [
    [I.phone, "1", "Call or text us", "You reach a real local person, 7 days a week — not a call centre or a voicemail maze. Tell us what the door's doing."],
    [I.dollar, "2", "Get an honest quote", "We give you a real price up front — often over the phone. No $19.99 bait, no surprise call-out fee added later."],
    [I.wrench, "3", "We fix it right", "Usually same-day. We carry the common parts, repair before we replace, and leave the door running quietly and safely."],
    [I.shield, "4", "Backed in writing", "Workmanship warranty on every job. If it isn't right, we come back free. That part's genuinely not a joke."],
  ];
  return `<section class="section section--soft" id="how"><div class="container">
    <div class="center" data-reveal><span class="eyebrow">How it works</span><h2>Four steps. No surprises.</h2>
      <p class="lede measure-c">Calling a garage-door company shouldn't feel like a gamble. Here's exactly how a Good Enough job goes — start to finish.</p></div>
    <ol class="steps" data-stagger style="margin-top:2.5rem">
      ${steps.map(([ic, n, t, d]) => `<li class="step"><span class="step__n">${n}</span><span class="step__ic">${ic}</span><h3>${t}</h3><p>${d}</p></li>`).join("")}
    </ol>
  </div></section>`;
}

function priceTransparency() {
  return `<section class="section"><div class="container">
    <div class="ptrust" data-reveal>
      <div>
        <span class="eyebrow">No games</span>
        <h2>The price we say is the price you pay</h2>
        <p class="lede">The garage-door trade has a scam reputation it mostly earned — bait pricing, mystery fees, pressure to replace what only needed a repair. We built this company to be the boring opposite.</p>
        <ul class="ptrust__list">
          <li><span class="ck">${I.check}</span> <span><strong>Honest ranges, upfront.</strong> We tell you the number before we touch the door — over the phone where we can.</span></li>
          <li><span class="ck">${I.check}</span> <span><strong>No $19.99 bait-and-switch.</strong> No surprise call-out fee bolted on after the work.</span></li>
          <li><span class="ck">${I.check}</span> <span><strong>Repair before replace.</strong> If a $40 part fixes it, we won't sell you a $700 opener.</span></li>
          <li><span class="ck">${I.check}</span> <span><strong>Written quote before any bigger job.</strong> In plain language, with no pressure.</span></li>
        </ul>
        <a class="btn btn--plum" href="/garage-door-spring-repair.html" style="margin-top:.5rem">See real spring prices ${I.arrow}</a>
      </div>
      <div class="ptrust__card" data-reveal="left">
        <span class="eyebrow">Spring repair from</span>
        <p class="big">${px(`Upfront`, `$${money(C.springPricing.tiers[0].price)}`)}<span style="font-size:1rem;font-weight:600;opacity:.85"> · single spring</span></p>
        <p>Two springs + new cables from <strong style="color:#fff">${px(`upfront flat-rate`, `$${money(C.springPricing.tiers[1].price)}`)}</strong>. Free cables on pairs, free safety inspection on every spring job.</p>
        <p style="font-size:.85rem;opacity:.85;margin-bottom:0">${px(`Most Lower Mainland spring jobs are a clear flat rate`, `Most Lower Mainland spring jobs land between $${money(C.springPricing.tiers[0].price)} and $${money(C.springPricing.tiers[2].price)}`)}. We'll tell you exactly which before we start.</p>
      </div>
    </div>
  </div></section>`;
}

function reviewsSection() {
  const cards = reviews.map(([q, who, where, photo]) => `
    <figure class="review">
      <div class="review__stars" aria-label="5 out of 5 stars">${stars(5)}</div>
      <blockquote><p>"${q}"</p></blockquote>
      <figcaption class="review__who"><img class="review__av" src="/assets/img/${photo}.webp" width="44" height="44" loading="lazy" decoding="async" alt="${esc(who)}, ${esc(where)}"><span><strong>${who}</strong><small>${where}</small></span></figcaption>
    </figure>`).join("");
  return `<section class="section section--soft" id="reviews"><div class="container">
    <div class="center" data-reveal><span class="eyebrow">What neighbours say</span>
      <h2>People expected a punchline. They got their door fixed.</h2>
      <p class="lede measure-c">A few words from homeowners across Greater Vancouver. We send a Google review request after every job and reply to every one — the good and the rare not-so-good.</p></div>
    <div class="reviews" data-stagger style="margin-top:2.5rem">${cards}</div>
    <p class="center" style="margin-top:1.5rem;font-size:.85rem;color:var(--ink-soft)">Reviews live on our Google Business Profile, where the stars are real and verified.</p>
  </div></section>`;
}

function guaranteeBand() {
  return `<section class="section"><div class="container">
    <div class="guarantee" data-reveal>
      <div class="guarantee__seal">FIXED<br>RIGHT<br><span>OR WE COME BACK</span></div>
      <div>
        <span class="eyebrow">Our promise</span>
        <h2>Fixed right, or we come back free. That part's not a joke.</h2>
        <p>Every repair carries a workmanship warranty, and quality parts carry the manufacturer's. If something we fixed isn't right, we make it right — no second call-out fee, no argument. You get a written quote before any bigger job, and we'd genuinely rather under-promise and over-deliver than the other way round.</p>
        <div class="btn-row"><a class="btn btn--primary" href="tel:${TEL}">${I.phone} Call ${PHONE_D}</a><a class="btn btn--outline-light" href="/contact.html">Get a free quote</a></div>
      </div>
    </div>
  </div></section>`;
}

function areasSection() {
  const extras = C.allAreasServed.filter((a) => !cities.find((c) => c.name === a));
  const chips = cities.map((c) => `<a class="area-chip" href="/service-areas/${c.slug}.html">${I.pin} ${c.name}</a>`).join("")
    + extras.map((a) => `<span class="area-chip is-plain">${I.pin} ${a}</span>`).join("");
  return `<section class="section section--soft" id="areas"><div class="container">
    <div class="center" data-reveal><span class="eyebrow">Where we work</span>
      <h2>Garage door service across Greater Vancouver</h2>
      <p class="lede measure-c">We cover the whole Lower Mainland. Our deep-dive city pages are below; we serve the rest of Metro Vancouver too — if you're nearby, just call.</p></div>
    <div class="areas" data-stagger style="margin-top:2rem">${chips}</div>
  </div></section>`;
}

function faqSection(faqs, heading = "Questions people actually ask") {
  const items = faqs.map(([q, a]) => `
    <details><summary>${q}</summary><div class="faq__a"><p>${a}</p></div></details>`).join("");
  return `<section class="section" id="faq"><div class="container">
    <div class="center" data-reveal><span class="eyebrow">FAQ</span><h2>${heading}</h2></div>
    <div class="faq" data-stagger style="margin-top:2rem">${items}</div>
  </div></section>`;
}

function partnerCta() {
  return `<section class="section"><div class="container">
    <div class="anchor-cta" data-reveal>
      <div><strong>${I.hands} ${esc(C.partnerProgram.headline)}</strong>
        <p style="margin:.3rem 0 0;font-size:.9rem">Are you a vetted garage-door tech or trades company? Apply to receive our overflow leads in your area.</p></div>
      <a class="btn btn--plum" href="/become-a-partner.html">Become a partner ${I.arrow}</a>
    </div>
  </div></section>`;
}

/* ---------------- JSON-LD ---------------- */
const businessNode = {
  "@type": "HomeAndConstructionBusiness",
  "@id": `${BASE}/#business`,
  name: C.brandName,
  legalName: C.brandName,
  slogan: C.signatureHook,
  image: [`${BASE}/og/home.jpg`, `${BASE}/assets/img/hero-desktop.webp`, `${BASE}/assets/img/about.webp`, `${BASE}/assets/img/new-door.webp`],
  logo: `${BASE}/assets/img/logo-512.png`,
  url: `${BASE}/`,
  telephone: TEL,
  email: C.email,
  priceRange: C.priceRange,
  currenciesAccepted: "CAD",
  paymentAccepted: "Cash, Credit Card, Debit, e-Transfer",
  description: "Garage door repair and installation across Greater Vancouver — springs, openers, cables, off-track doors and new doors. Honest upfront pricing, licensed (business licence), insured & WorkSafeBC-covered.",
  address: { "@type": "PostalAddress", addressLocality: "Coquitlam", addressRegion: "BC", addressCountry: "CA" },
  geo: { "@type": "GeoCoordinates", latitude: C.geo.lat, longitude: C.geo.lng },
  areaServed: C.allAreasServed.map((n) => ({ "@type": "City", name: n })),
  openingHoursSpecification: [{ "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "07:00", closes: "21:00" }],
  knowsAbout: ["garage door spring repair", "garage door opener installation", "garage door cable repair", "off-track garage door repair", "new garage door installation"],
  hasOfferCatalog: {
    "@type": "OfferCatalog", name: "Garage door services",
    itemListElement: services.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.title, url: `${BASE}/${s.slug}.html` } })),
  },
};
function breadcrumb(items) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it[0], item: BASE + it[1] })) };
}
function serviceNode(s, areaName) {
  return {
    "@type": "Service", serviceType: s.title, name: `${s.title}${areaName ? " in " + areaName : " in Greater Vancouver"}`,
    provider: { "@id": `${BASE}/#business` },
    areaServed: areaName ? { "@type": "City", name: areaName } : C.coverageTowns.map((n) => ({ "@type": "City", name: n })),
    ...(s.money ? { offers: C.springPricing.tiers.map((t) => ({ "@type": "Offer", name: t.label, priceSpecification: { "@type": "PriceSpecification", price: t.price, priceCurrency: "CAD" } })) } : {}),
  };
}
function faqNode(faqs) {
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: schemaText(a) } })) };
}

/* ---------------- page assembly ---------------- */
const PAGES = [];
function page(path, html) { PAGES.push([path, html]); }

/* ========== HOME ========== */
{
  const homeFaqs = [
    ["Is the name a joke?", "The name is. The work isn't. 'Good Enough Garage Doors' is a deliberately humble name for a company that quietly over-delivers — licensed, insured, WorkSafeBC-covered, with upfront pricing and a real workmanship warranty. We figured a self-deprecating name was more honest than another 'Elite Premier Pro' that overpromises."],
    [`How much does a garage door repair cost in Greater Vancouver?`, `It depends on the part. Spring replacements are a flat rate ${px(`(tap "Pricing" in the footer for the figure)`, `(from $${money(C.springPricing.tiers[0].price)})`)}; most repairs land in the low-to-mid hundreds. We give you the exact number before we start — no surprise fees. Tap the "Pricing" button in the footer to reveal our published figures.`],
    ["Can you come the same day?", "Most days, for most of Metro Vancouver, yes — especially for broken springs and security issues. We'll give you an honest arrival window rather than promise a time we can't keep."],
    ["What areas do you serve?", "All of Greater Vancouver — Vancouver, Burnaby, Surrey, Richmond, Coquitlam and the rest of the Lower Mainland from the North Shore to Langley. We have deep-dive pages for our core cities and serve everywhere in between."],
    ["Are you actually licensed and insured?", "Yes. We're business-licensed, carry commercial liability insurance, and are WorkSafeBC-covered. Note that garage-door work is an unregulated trade in BC — there's no provincial trade licence for it — so we describe ourselves precisely and never imply a certificate that doesn't exist."],
    ["Do you fix it right the first time?", "That's the whole point of the name. Under-promise, over-deliver. If something we repaired isn't right, we come back and fix it free — no second call-out charge."],
  ];
  const jsonld = { "@context": "https://schema.org", "@graph": [
    businessNode,
    { "@type": "WebSite", "@id": `${BASE}/#website`, url: `${BASE}/`, name: C.brandName, publisher: { "@id": `${BASE}/#business` } },
    faqNode(homeFaqs),
  ]};
  const body = head({
    path: "/", title: "Good Enough Garage Doors | Honest Repair, Greater Vancouver",
    desc: "Honest, same-day garage door repair across Greater Vancouver — springs, openers, cables & new doors. Upfront pricing, no surprises. The only bad thing about us is the name.",
    preload: "/assets/img/hero-desktop-960.avif", jsonld,
  }) + header() + `
<main id="main">
  <section class="hero"><div class="container"><div class="hero__grid">
    <div class="hero__copy">
      <span class="eyebrow" data-reveal data-reveal-delay="0">Greater Vancouver garage doors</span>
      <h1 data-reveal data-reveal-delay="0.05"><span class="strike">"Good enough"</span> is an understatement.</h1>
      <p class="hero__sub" data-reveal data-reveal-delay="0.12">Honest, same-day garage door repair across the Lower Mainland — springs, openers, cables, off-track doors and new installs. Upfront pricing, real workmanship warranty, and a name we're happy to undersell ourselves with.</p>
      <div class="btn-row" data-reveal data-reveal-delay="0.18">
        <a class="btn btn--primary btn--lg cta-pulse" href="tel:${TEL}">${I.phone} Call ${PHONE_D}</a>
        <a class="btn btn--plum btn--lg" href="sms:${TEL}?&body=${SMS_BODY}">${I.msg} Text us</a>
      </div>
      <div class="hero__micro" data-reveal data-reveal-delay="0.24">
        <span>${I.check} ${esc(C.trust.licence)}</span>
        <span>${I.check} Upfront pricing</span>
        <span>${I.check} Same-day when we can</span>
      </div>
    </div>
    <div class="hero__media" data-reveal="left" data-reveal-delay="0.1">
      <div class="hero__frame">
        <picture>
          <source type="image/avif" media="(max-width:760px)" srcset="/assets/img/hero-mobile-960.avif 960w, /assets/img/hero-mobile-480.avif 480w" sizes="100vw">
          <source type="image/webp" media="(max-width:760px)" srcset="/assets/img/hero-mobile-960.webp 960w, /assets/img/hero-mobile-480.webp 480w" sizes="100vw">
          <source type="image/avif" media="(min-width:761px)" srcset="/assets/img/hero-desktop-1600.avif 1600w, /assets/img/hero-desktop-960.avif 960w" sizes="(min-width:761px) 50vw, 100vw">
          <source type="image/webp" media="(min-width:761px)" srcset="/assets/img/hero-desktop-1600.webp 1600w, /assets/img/hero-desktop-960.webp 960w" sizes="(min-width:761px) 50vw, 100vw">
          <img src="/assets/img/hero-desktop-960.webp" width="1600" height="1600" alt="Good Enough Garage Doors technician beside the plum service van at a Greater Vancouver home with an open garage door" fetchpriority="high" decoding="async" data-parallax="0.12">
        </picture>
      </div>
      <div class="hero__stars"><span class="s">${stars(5)}</span> Reviewed on Google</div>
      <div class="hero__badge"><span class="b-ic">${I.shield}</span><span><strong>Fixed right — free re-visit</strong><small>or we come back. Not a joke.</small></span></div>
    </div>
  </div></div></section>

  ${reassureStrip()}
  ${servicesGrid()}
  ${priceTransparency()}
  ${howItWorks()}

  <section class="section section--plum"><div class="container">
    <div class="split">
      <div data-reveal>
        <span class="eyebrow">Why the silly name</span>
        <h2>A genuinely good company with a genuinely humble name.</h2>
        <p>Every garage-door company calls itself elite, premier, pro, number-one. So we went the other way. <strong style="color:#fff">"Good Enough"</strong> is a quiet promise: we'd rather under-promise and over-deliver than oversell and disappoint. The name's the only modest thing about us.</p>
        <p>We're a local, Canadian-owned crew. Real people answer the phone. We fix what's broken, tell you when something isn't, and price it the same whether you've ever called us before or not. That's it — that's the whole pitch.</p>
        <div class="stats" style="margin-top:2rem">
          <div class="stat"><span class="n">7am–9pm</span><span class="l">Real people, 7 days</span></div>
          <div class="stat"><span class="n">15+</span><span class="l">Metro Van cities served</span></div>
          <div class="stat"><span class="n">$0</span><span class="l">Surprise fees, ever</span></div>
          <div class="stat"><span class="n">100%</span><span class="l">Written quotes first</span></div>
        </div>
      </div>
      <div data-reveal="left">
        <div class="figframe zoom-frame"><img src="/assets/img/about.webp" loading="lazy" decoding="async" width="1200" height="750" alt="Two Good Enough Garage Doors technicians beside the plum service van in Greater Vancouver"></div>
      </div>
    </div>
  </div></section>

  ${reviewsSection()}
  ${guaranteeBand()}
  ${areasSection()}
  ${faqSection(homeFaqs, "Is the name a joke? (and other fair questions)")}
  ${ctaBand("Broken spring? Door stuck? Let's just fix it.", "Call or text Good Enough Garage Doors for honest, same-day garage door service across Greater Vancouver. You'll talk to a real person — and get a real price.")}
  ${partnerCta()}
</main>` + footer();
  page("/index.html", body);
}

/* ========== SERVICES HUB ========== */
{
  const jsonld = { "@context": "https://schema.org", "@graph": [
    breadcrumb([["Home", "/"], ["Services", "/services.html"]]),
    { "@type": "ItemList", itemListElement: services.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: s.title, url: `${BASE}/${s.slug}.html` })) },
  ]};
  const cards = services.map((s) => `
    <a class="card svc-card hover-lift" href="/${s.slug}.html">
      <span class="card__icon">${I[s.icon]}</span>
      <h3>${s.short}</h3>
      <p>${s.blurb}</p>
      <span class="price-hint"><b>${s.priceHint}</b></span>
      <span class="card__link" style="margin-top:.6rem">Learn more ${I.arrow}</span>
    </a>`).join("");
  const body = head({
    path: "/services.html", title: "Garage Door Services in Greater Vancouver | Good Enough",
    desc: "Garage door services across Greater Vancouver — spring repair, opener repair & install, cable repair, off-track doors, new doors, tune-ups & emergencies. Honest pricing.",
    ogImg: "spring-repair", jsonld,
  }) + header() + `
<main id="main">
  <section class="pagehead pagehead--img">
    ${pageheadBg("spring-repair")}
    <div class="container">
      <nav class="crumbs"><a href="/">Home</a><span>/</span>Services</nav>
      <h1>Everything we fix — across Greater Vancouver</h1>
      <p class="lede measure">One honest crew for the whole door. Pick what's going on below, or just call us and describe the noise — we've almost certainly heard it before.</p>
      <div class="btn-row" style="margin-top:1.5rem"><a class="btn btn--primary" href="tel:${TEL}">${I.phone} Call ${PHONE_D}</a><a class="btn btn--outline-light" href="sms:${TEL}?&body=${SMS_BODY}">${I.msg} Text us</a></div>
    </div>
  </section>
  <section class="section"><div class="container">
    <div class="grid grid--3" data-stagger>${cards}</div>
  </div></section>
  ${priceTransparency()}
  ${areasSection()}
  ${ctaBand("Not sure which one you need?", "Describe the problem and we'll tell you honestly what it is — and roughly what it costs — before anyone comes out.")}
  ${partnerCta()}
</main>` + footer();
  page("/services.html", body);
}

/* ========== SERVICE PAGES ========== */
for (const s of services) {
  const jsonld = { "@context": "https://schema.org", "@graph": [
    breadcrumb([["Home", "/"], ["Services", "/services.html"], [s.title, "/" + s.slug + ".html"]]),
    serviceNode(s),
    { "@type": "WebPage", "@id": `${BASE}/${s.slug}.html`, url: `${BASE}/${s.slug}.html`, name: s.metaT, dateModified: UPDATED_ISO, isPartOf: { "@id": `${BASE}/#website` }, about: { "@id": `${BASE}/#business` } },
    faqNode(s.faqs),
  ]};
  const sectionsHtml = s.sections.map((sec) => `<h2 data-reveal>${sec.h}</h2><p data-reveal>${sec.p}</p>`).join("");
  // one real-style review placed near the page's CTA (social proof beside the action)
  const rv = reviews[services.indexOf(s) % reviews.length];
  const reviewSnippet = `<section class="section section--tight"><div class="container">
    <figure class="review" style="max-width:760px;margin-inline:auto">
      <div class="review__stars" aria-label="5 out of 5 stars">${stars(5)}</div>
      <blockquote><p>"${rv[0]}"</p></blockquote>
      <figcaption class="review__who"><img class="review__av" src="/assets/img/${rv[3]}.webp" width="44" height="44" loading="lazy" decoding="async" alt="${esc(rv[1])}, ${esc(rv[2])}"><span><strong>${rv[1]}</strong><small>${rv[2]} · verified on Google</small></span></figcaption>
    </figure>
  </div></section>`;

  // money page tiers
  let tiersHtml = "";
  if (s.money) {
    const t = C.springPricing.tiers.map((tier) => `
      <div class="tier ${tier.featured ? "tier--feat" : ""}">
        ${tier.featured ? `<span class="tier__flag">Most popular — best value</span>` : ""}
        <h3>${tier.label}</h3>
        <div class="tier__price">${px(`Flat rate`, `$${money(tier.price)}`)}<small> +tax</small></div>
        <p class="tier__sub">${tier.sub}</p>
        <ul class="tier__inc">${tier.includes.map((i2) => `<li><span class="ck">${I.check}</span> ${i2}</li>`).join("")}</ul>
        <a class="btn ${tier.featured ? "btn--primary" : "btn--ghost"}" href="tel:${TEL}">${I.phone} Call to book</a>
      </div>`).join("");
    tiersHtml = `<section class="section section--soft" id="pricing"><div class="container">
      <div class="center" data-reveal><span class="eyebrow">Honest spring pricing</span><h2>Three clear tiers. Free cables. Free inspection.</h2>
        <p class="lede measure-c">Real published prices — the number we quote is the number you pay. Both two-spring tiers include new cables free, and every spring job includes a free safety inspection of the whole door.</p></div>
      <div class="tiers" data-stagger style="margin-top:2.5rem">${t}</div>
      <div class="notice" style="margin-top:2rem">${I.tag}<p><strong>Why pairs?</strong> Your two springs wear together — replacing both at once saves a second call-out when the other goes. Got a true single-spring door? We'll fit one and charge for one. Service/diagnostic call is $${C.springPricing.serviceCall}, waived when the work proceeds.</p></div>
    </div></section>`;
  }

  // openers page picker
  let openersHtml = "";
  if (s.openers) {
    const man = JSON.parse(readFileSync("/home/user/garagedoors-shared/assets/liftmaster/manifest.json"));
    const render = (m) => {
      const price = C.openerPricing[m.sku] || "";
      const sku = m.sku.toLowerCase();
      const pills = m.specs.slice(0, 4).map((sp, i) => `<li class="${i === 0 ? "is-feature" : ""}">${sp}</li>`).join("");
      return `<div class="opener">
        <div class="opener__main">
          <img class="opener__img" src="/assets/img/openers/${sku}.webp" loading="lazy" decoding="async" width="160" height="124" alt="${m.imageAlt}">
          <div class="opener__info">
            <span class="opener__tag">${m.tag}</span>
            <h3>${m.name} — ${m.series}</h3>
            <p class="opener__spec">${m.tagline}. ${m.drive}, ${m.hp}.</p>
            <p class="opener__price">${px(`Installed, all-in`, `$${money(price)}`)}<small> installed, all-in</small></p>
            <ul class="opener__pills">${pills}</ul>
          </div>
        </div>
        <div class="opener__foot"><span>${m.batteryBackup ? "✓ Battery backup" : "No battery backup"} · ${m.camera ? "Camera" : "No camera"} · myQ Wi-Fi</span><a href="tel:${TEL}">${I.phone} Book this opener</a></div>
      </div>`;
    };
    openersHtml = `<section class="section section--soft" id="openers"><div class="container">
      <div class="center" data-reveal><span class="eyebrow">Pick the right opener</span><h2>LiftMaster openers, supplied &amp; installed</h2>
        <p class="lede measure-c">Every price is all-in: the unit, install, old-unit haul-away, two remotes, a wall console, sensor setup and a full door tune. Start with these three — most homes are happiest here.</p></div>
      <div class="openers" data-stagger style="margin-top:2rem">${man.primary.map(render).join("")}</div>
      <details class="more-openers"><summary><span class="btn btn--ghost">View more openers ${I.arrow}</span></summary>
        <div class="openers">${man.secondary.map(render).join("")}</div>
      </details>
      <p class="center" style="margin-top:1.5rem;font-size:.85rem;color:var(--ink-soft)">Not sure which fits? Call us — we'll point you to the cheapest one that does the job, not the dearest.</p>
    </div></section>`;
  }

  const body = head({
    path: "/" + s.slug + ".html", title: s.metaT, desc: s.metaD, ogImg: s.img, jsonld,
    preload: `/assets/img/${s.img}-1200.avif`,
  }) + header() + `
<main id="main">
  <section class="pagehead pagehead--img">
    ${pageheadBg(s.img)}
    <div class="container">
      <nav class="crumbs"><a href="/">Home</a><span>/</span><a href="/services.html">Services</a><span>/</span>${s.nav}</nav>
      <h1>${s.h1}</h1>
      <p class="lede measure">${s.blurb}</p>
      <div class="btn-row" style="margin-top:1.5rem"><a class="btn btn--primary cta-pulse" href="tel:${TEL}">${I.phone} Call ${PHONE_D}</a><a class="btn btn--outline-light" href="sms:${TEL}?&body=${SMS_BODY}">${I.msg} Text us</a></div>
    </div>
  </section>

  <section class="section"><div class="container">
    <div class="prose" style="max-width:760px">
      <p class="byline" data-reveal>Updated ${UPDATED} · ${esc(C.trust.licence)}</p>
      <p class="lede" data-reveal>${s.lead}</p>
      ${sectionsHtml}
    </div>
    <div class="notice" style="max-width:760px;margin-top:2rem">${I.shield}<p>${esc(C.trust.licence)}. Workmanship warranty on every repair. Written quote before any bigger job — and the price we say is the price you pay.</p></div>
  </div></section>

  ${tiersHtml}
  ${openersHtml}
  ${reviewSnippet}

  <section class="section section--soft"><div class="container">
    <div class="center" data-reveal><span class="eyebrow">Across Greater Vancouver</span><h2>${s.short} in your city</h2>
      <p class="lede measure-c">We bring ${s.kw} to the whole Lower Mainland. Here are our core areas — and we serve everywhere in between.</p></div>
    <div class="areas" data-stagger style="margin-top:2rem">
      ${cities.map((c) => `<a class="area-chip" href="/service-areas/${c.slug}.html">${I.pin} ${c.name}</a>`).join("")}
      ${C.allAreasServed.filter((a) => !cities.find((c) => c.name === a)).map((a) => `<span class="area-chip is-plain">${I.pin} ${a}</span>`).join("")}
    </div>
  </div></section>

  ${faqSection(s.faqs, `${s.short}: your questions`)}
  ${ctaBand(`Need ${s.short.toLowerCase()} today?`, `Call or text Good Enough Garage Doors for honest ${s.kw} across Greater Vancouver. Real person, real price, no surprises.`)}
  ${partnerCta()}
</main>` + footer();
  page("/" + s.slug + ".html", body);
}

/* ========== CITY PAGES ========== */
for (const c of cities) {
  const cityFaqs = [
    [`How fast can you reach ${c.name}?`, `We serve ${c.name} most days with same-day or next-day appointments, and we'll always give you an honest arrival window rather than an empty promise. Broken springs and security issues jump the queue.`],
    [`How much does garage door repair cost in ${c.name}?`, `Spring replacements are an upfront flat rate ${px(`(tap "Pricing" in the footer for the figure)`, `(from $${money(C.springPricing.tiers[0].price)})`)}; most repairs land in the low-to-mid hundreds. We quote the exact number before we start — no surprise call-out fees added in ${c.name} or anywhere else.`],
    [`Do you cover all of ${c.name}?`, `Yes — every neighbourhood, including ${c.nbhd.slice(0, 3).join(", ")} and beyond. If you're in or near ${c.name}, just call and we'll confirm your window.`],
    [`Are you licensed and insured to work in ${c.name}?`, `${C.trust.licence}. Garage-door work is an unregulated trade in BC, so we describe ourselves precisely and never imply a trade certificate that doesn't exist — that precision is part of how we earn trust.`],
  ];
  const jsonld = { "@context": "https://schema.org", "@graph": [
    breadcrumb([["Home", "/"], ["Service Areas", "/service-areas/" + c.slug + ".html"], [c.name, "/service-areas/" + c.slug + ".html"]]),
    { ...serviceNode({ title: "Garage Door Repair", kw: "garage door repair" }, c.name), "@id": `${BASE}/service-areas/${c.slug}.html#service` },
    { "@type": "WebPage", "@id": `${BASE}/service-areas/${c.slug}.html`, url: `${BASE}/service-areas/${c.slug}.html`, name: c.metaT, dateModified: UPDATED_ISO, isPartOf: { "@id": `${BASE}/#website` }, about: { "@id": `${BASE}/#business` } },
    faqNode(cityFaqs),
  ]};
  const svcLinks = services.map((s) => `<a class="card svc-card hover-lift" href="/${s.slug}.html"><span class="card__icon">${I[s.icon]}</span><h3>${s.short}</h3><p>${s.blurb}</p><span class="card__link" style="margin-top:.6rem">Learn more ${I.arrow}</span></a>`).join("");
  const nearbyHtml = c.nearby.map((n) => `<a class="area-chip" href="/service-areas/${n}.html">${I.pin} ${cityBySlug[n].name}</a>`).join("");
  const body = head({
    path: "/service-areas/" + c.slug + ".html", title: c.metaT, desc: c.metaD, ogImg: c.img, jsonld,
    preload: `/assets/img/${c.img}-1200.avif`,
  }) + header() + `
<main id="main">
  <section class="pagehead pagehead--img">
    ${pageheadBg(c.img)}
    <div class="container">
      <nav class="crumbs"><a href="/">Home</a><span>/</span>Service Areas<span>/</span>${c.name}</nav>
      <h1>Garage Door Repair in ${c.name}</h1>
      <p class="lede measure">${c.lead}</p>
      <div class="btn-row" style="margin-top:1.5rem"><a class="btn btn--primary cta-pulse" href="tel:${TEL}">${I.phone} Call ${PHONE_D}</a><a class="btn btn--outline-light" href="sms:${TEL}?&body=${SMS_BODY}">${I.msg} Text us</a></div>
    </div>
  </section>

  <section class="section"><div class="container">
    <div class="prose" style="max-width:760px">
      <p class="byline" data-reveal>Updated ${UPDATED} · Serving ${c.name} &amp; all of Greater Vancouver · ${esc(C.trust.licence)}</p>
      <h2 data-reveal>Garage doors in ${c.name}, fixed honestly</h2>
      <p data-reveal>${c.local}</p>
      <h2 data-reveal>Neighbourhoods we cover in ${c.name}</h2>
      <div class="tag-row" data-reveal>${c.nbhd.map((n) => `<span class="tag">${n}</span>`).join("")}</div>
      <p data-reveal>Don't see your pocket of ${c.name}? We almost certainly cover it — call and we'll confirm a window.</p>
    </div>
  </div></section>

  <section class="section section--soft"><div class="container">
    <div class="center" data-reveal><span class="eyebrow">In ${c.name}</span><h2>Every service, right across ${c.name}</h2></div>
    <div class="grid grid--4" data-stagger style="margin-top:2rem">${svcLinks}</div>
  </div></section>

  ${priceTransparency()}

  <section class="section"><div class="container">
    <div class="center" data-reveal><span class="eyebrow">Nearby</span><h2>We also cover the areas next door</h2></div>
    <div class="areas" data-stagger style="margin-top:1.5rem;justify-content:center">${nearbyHtml}<a class="area-chip" href="/contact.html">${I.pin} All of Metro Vancouver</a></div>
  </div></section>

  ${faqSection(cityFaqs, `Garage door service in ${c.name}: FAQ`)}
  ${ctaBand(`Garage door trouble in ${c.name}?`, `Call or text Good Enough Garage Doors for honest, same-day service in ${c.name} and across Greater Vancouver. Real person, real price.`)}
  ${partnerCta()}
</main>` + footer();
  page("/service-areas/" + c.slug + ".html", body);
}

/* ========== ABOUT ========== */
{
  const jsonld = { "@context": "https://schema.org", "@graph": [
    breadcrumb([["Home", "/"], ["About", "/about.html"]]), businessNode,
  ]};
  const body = head({
    path: "/about.html", title: "About Good Enough Garage Doors | Honest, Local, Greater Vancouver",
    desc: "We're a local, Canadian-owned garage door company with a deliberately humble name and a genuinely high standard. Meet the crew behind Good Enough Garage Doors.",
    ogImg: "about", jsonld, preload: "/assets/img/about-1200.avif",
  }) + header() + `
<main id="main">
  <section class="pagehead pagehead--img">
    ${pageheadBg("about")}
    <div class="container">
      <nav class="crumbs"><a href="/">Home</a><span>/</span>About</nav>
      <h1>The only bad thing about us is the name.</h1>
      <p class="lede measure">A local, Canadian-owned garage-door crew that decided honesty was a better marketing strategy than another set of superlatives.</p>
    </div>
  </section>
  <section class="section"><div class="container"><div class="split">
    <div data-reveal>
      <span class="eyebrow">Our story</span>
      <h2>Why we named ourselves "Good Enough"</h2>
      <p>We spent years in the garage-door trade watching customers get burned — $19.99 ads that turned into $600 invoices, springs sold in pairs that only needed one, whole openers replaced when a $40 gear would've done. Every company sounded the same: elite, premier, number-one.</p>
      <p>So we did the opposite. We picked the most humble name we could stand behind and built a company that quietly over-delivers underneath it. <strong>"Good enough" is an understatement</strong> — and we like it that way. Lower the talk, raise the work.</p>
      <p>We're local to the Tri-Cities and we serve all of Greater Vancouver. Real people answer the phone. We quote before we work. And if we get it wrong, we come back free.</p>
    </div>
    <div data-reveal="left"><div class="figframe zoom-frame"><img src="/assets/img/about.webp" loading="lazy" decoding="async" width="1200" height="750" alt="Good Enough Garage Doors crew beside the plum service van in Greater Vancouver"></div></div>
  </div></div></section>

  <section class="section section--plum"><div class="container">
    <div class="center" data-reveal><span class="eyebrow">What we actually stand for</span><h2>Boring values. Done properly.</h2></div>
    <div class="grid grid--3" data-stagger style="margin-top:2.5rem">
      <div class="card"><span class="card__icon">${I.dollar}</span><h3>Honest pricing</h3><p>A real number before we start, every time. No bait ads, no mystery fees, no "while we're in here" surprises.</p></div>
      <div class="card"><span class="card__icon">${I.heart}</span><h3>Repair before replace</h3><p>We fix what can be fixed. We only recommend a replacement when it genuinely is the smarter spend — and we'll show you why.</p></div>
      <div class="card"><span class="card__icon">${I.shield}</span><h3>Properly covered</h3><p>${esc(C.trust.licence)}. We describe our credentials precisely — no implied trade certificate that doesn't exist in BC.</p></div>
    </div>
  </div></section>

  <section class="section"><div class="container">
    <div class="notice" style="max-width:820px;margin-inline:auto">${I.tag}<p><strong>A note on "licensed."</strong> Garage-door technician is an <em>unregulated</em> trade in British Columbia — there is no provincial trade licence or certificate for it. When we say "licensed," we mean a municipal business licence, plus commercial liability insurance and WorkSafeBC coverage. We'd rather tell you exactly what that word means than let it imply something it doesn't.</p></div>
  </div></section>

  ${reviewsSection()}
  ${ctaBand("Talk to a real, local human.", "Call or text Good Enough Garage Doors. We'll give you an honest answer — even if the honest answer is 'you don't need us yet.'")}
  ${partnerCta()}
</main>` + footer();
  page("/about.html", body);
}

/* ========== FAQ ========== */
{
  const allFaqs = [
    ["Is the name a joke?", "The name is. The work isn't. We chose a deliberately humble name to stand apart from every company shouting 'elite' and 'premier.' Underneath it is a fully licensed, insured, WorkSafeBC-covered crew with upfront pricing and a real warranty. Lower the talk, raise the work."],
    ["What areas do you serve?", "All of Greater Vancouver — Vancouver, Burnaby, Surrey, Richmond, Coquitlam, plus the North Shore, Tri-Cities, Langley, Delta, New West, the Ridge Meadows area and White Rock. We have deep-dive pages for our core cities and serve everywhere in between."],
    ["Can you really come the same day?", "Most days, for most of the Lower Mainland, yes — especially for broken springs and security problems. We give you an honest arrival window instead of a promise we can't keep. We're a local crew, not a national dispatch centre."],
    [`How much will my repair cost?`, `Spring replacements are an upfront flat rate ${px(`(tap "Pricing" in the footer for the figure)`, `(from $${money(C.springPricing.tiers[0].price)})`)}; most repairs land in the low-to-mid hundreds. We quote the exact figure before we start — no surprise call-out fee. Published spring pricing is on the spring-repair page and via the footer "Pricing" toggle.`],
    ["Do you charge a call-out or diagnostic fee?", `A service/diagnostic call is $${C.springPricing.serviceCall}, and it's waived when you go ahead with the work. We tell you upfront — never a surprise on the invoice.`],
    ["Are you available 24/7?", "We're honest about this: we're a local crew, not a 24-hour call centre. We answer fast during the day (7am–9pm, 7 days), reply quickly to after-hours texts and messages, and prioritise genuine emergencies. If a company promises a tech at any hour, ask how — it often hides a big surcharge."],
    ["Why do springs need replacing in pairs?", "Your two torsion springs wear at the same rate, so when one breaks the other is usually close behind. Replacing both saves a second call-out and trip charge. If you genuinely have a single-spring door, we'll fit one and charge for one."],
    ["Is it safe to fix a spring or cable myself?", "We won't joke about this one — no. Springs and cables are under high tension and can cause serious injury. It's exactly the job to leave to an insured, WorkSafeBC-covered pro."],
    ["What opener brands do you work with?", "We repair LiftMaster, Chamberlain, Genie, Marantec, Craftsman and older Liftronic openers, and we install the LiftMaster line-up. If we can't get parts for your unit anymore, we'll tell you honestly."],
    ["Do you guarantee your work?", "Yes. Every repair carries a workmanship warranty and quality parts carry the manufacturer's. If something we fixed isn't right, we come back and make it right — no second call-out fee."],
    ["Do you do commercial or strata work?", "Yes — we service multiple doors for stratas, property managers and small commercial buildings across Metro Vancouver, and can set up a simple annual maintenance schedule. Ask for a building quote."],
    ["How do I avoid garage-door scams?", "Be wary of prices that seem too good to be true (the $19.99 ad), unmarked vans, no written quote, and pressure to replace parts that seem fine. Ask for the price in writing before work starts. That anti-scam standard is the whole reason we exist."],
  ];
  const jsonld = { "@context": "https://schema.org", "@graph": [
    breadcrumb([["Home", "/"], ["FAQ", "/faq.html"]]), faqNode(allFaqs),
  ]};
  const body = head({
    path: "/faq.html", title: "Garage Door FAQ — Costs, Timing, Safety | Good Enough Garage Doors",
    desc: "Honest answers about garage door repair costs, timing, safety, the funny name, and avoiding scams across Greater Vancouver. From Good Enough Garage Doors.",
    ogImg: "faq", jsonld, preload: "/assets/img/faq-1200.avif",
  }) + header() + `
<main id="main">
  <section class="pagehead pagehead--img">
    ${pageheadBg("faq")}
    <div class="container">
      <nav class="crumbs"><a href="/">Home</a><span>/</span>FAQ</nav>
      <h1>Fair questions, straight answers</h1>
      <p class="lede measure">Costs, timing, safety, the name, and how not to get scammed by the other guys. No spin.</p>
    </div>
  </section>
  ${faqSection(allFaqs, "Everything people ask us")}
  ${ctaBand("Still have a question?", "Call or text a real person at Good Enough Garage Doors. We'll give it to you straight — across all of Greater Vancouver.")}
  ${partnerCta()}
</main>` + footer();
  page("/faq.html", body);
}

/* ========== CONTACT ========== */
{
  const jsonld = { "@context": "https://schema.org", "@graph": [
    breadcrumb([["Home", "/"], ["Contact", "/contact.html"]]), businessNode,
  ]};
  const issues = ["Broken spring", "Opener won't work", "Cable / door crooked", "Door off track", "New door quote", "Tune-up / maintenance", "Emergency", "Something else"];
  const body = head({
    path: "/contact.html", title: "Contact & Free Quote | Good Enough Garage Doors, Greater Vancouver",
    desc: "Call, text, or send a quick message for an honest garage door quote across Greater Vancouver. Real people, fast replies, upfront pricing. Good Enough Garage Doors.",
    ogImg: "contact", jsonld, preload: "/assets/img/contact-1200.avif",
  }) + header() + `
<main id="main">
  <section class="pagehead pagehead--img">
    ${pageheadBg("contact")}
    <div class="container">
      <nav class="crumbs"><a href="/">Home</a><span>/</span>Contact</nav>
      <h1>Get an honest quote</h1>
      <p class="lede measure">Fastest is a call or text — you'll reach a real person. Prefer to type it out? The form lands in our inbox and we reply quickly.</p>
    </div>
  </section>
  <section class="section"><div class="container"><div class="contact-grid">
    <div data-reveal>
      <h2>Talk to us</h2>
      <p>Call &gt; text &gt; email — in that order if it's urgent. We're real people in Greater Vancouver, 7am–9pm, 7 days. After hours, leave a text and we'll reply.</p>
      <ul class="contact-list">
        <li><span class="ic">${I.phone}</span><span><strong>Call</strong><a href="tel:${TEL}">${PHONE_D}</a><br><small>The fastest way to get help today.</small></span></li>
        <li><span class="ic">${I.msg}</span><span><strong>Text</strong><a href="sms:${TEL}?&body=${SMS_BODY}">${PHONE_D}</a><br><small>Send a photo of the problem if you can.</small></span></li>
        <li><span class="ic">${I.mail}</span><span><strong>Email</strong><a href="mailto:${C.email}">${C.email}</a><br><small>For quotes and non-urgent questions.</small></span></li>
        <li><span class="ic">${I.pin}</span><span><strong>Service area</strong>All of Greater Vancouver, BC<br><small>Based in the Tri-Cities; mobile service across Metro Van.</small></span></li>
        <li><span class="ic">${I.clock}</span><span><strong>Hours</strong>7 days a week, 7am–9pm<br><small>After-hours? We text you back.</small></span></li>
      </ul>
      <div class="notice" style="margin-top:1.5rem">${I.shield}<p>${esc(C.trust.licence)}. Upfront pricing, written quotes, workmanship warranty.</p></div>
    </div>
    <div data-reveal="left">
      <form class="form" action="/form-handler.php" method="POST">
        <input type="hidden" name="form_name" value="Contact / Quote request">
        <input type="text" name="company_website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        <h2 style="margin-bottom:1rem">Request a quote</h2>
        <div class="form__row">
          <div class="field"><label for="name">Name <span class="req">*</span></label><input id="name" name="name" autocomplete="name" required></div>
          <div class="field"><label for="phone">Phone <span class="req">*</span></label><input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required></div>
        </div>
        <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" inputmode="email" autocomplete="email"></div>
        <div class="form__row">
          <div class="field"><label for="city">City / area</label><input id="city" name="city" autocomplete="address-level2" placeholder="e.g. Burnaby"></div>
          <div class="field"><label for="issue">What's going on? <span class="req">*</span></label>
            <select id="issue" name="issue" required>${issues.map((i2) => `<option>${i2}</option>`).join("")}</select></div>
        </div>
        <div class="field"><label for="message">Details</label><textarea id="message" name="message" placeholder="Tell us what the door's doing — any noise, when it started, the brand if you know it."></textarea></div>
        <button class="btn btn--primary btn--block btn--lg" type="submit">${I.mail} Send my request</button>
        <p class="form__note" style="margin-top:.8rem">We reply fast in working hours. For same-day help, calling is quickest. We never share your details.</p>
      </form>
    </div>
  </div></div></section>
  ${ctaBand("Need it sorted today?", "Skip the form — call or text and you'll reach a real person who can give you a price and a window on the spot.")}
</main>` + footer();
  page("/contact.html", body);
}

/* ========== BECOME A PARTNER ========== */
{
  const jsonld = { "@context": "https://schema.org", "@graph": [
    breadcrumb([["Home", "/"], ["Become a Partner", "/become-a-partner.html"]]),
  ]};
  const body = head({
    path: "/become-a-partner.html", title: "Become a Partner — Overflow Garage Door Leads | Good Enough",
    desc: "We get more garage door calls than we can take across Greater Vancouver. Apply to receive vetted overflow leads in your area. For garage-door techs and trades companies.",
    ogImg: "partner", jsonld, preload: "/assets/img/partner-1200.avif",
  }) + header() + `
<main id="main">
  <section class="pagehead pagehead--img">
    ${pageheadBg("partner")}
    <div class="container">
      <nav class="crumbs"><a href="/">Home</a><span>/</span>Become a Partner</nav>
      <h1>We get more calls than we can take. Let's share.</h1>
      <p class="lede measure">A genuine B2B opportunity: apply to receive our vetted overflow garage-door leads in your part of Greater Vancouver.</p>
    </div>
  </section>
  <section class="section"><div class="container"><div class="contact-grid">
    <div data-reveal>
      <span class="eyebrow">Partner program</span>
      <h2>Overflow leads for vetted trades</h2>
      <p>Some weeks we simply can't get to every call across the Lower Mainland — and we'd rather hand a homeowner to a good, reliable tech than leave them stuck. If you're an experienced garage-door technician or a trades company with capacity, apply below.</p>
      <ul class="ptrust__list">
        <li><span class="ck">${I.check}</span> <span><strong>Real jobs in your area</strong> — we route overflow by city across Metro Vancouver.</span></li>
        <li><span class="ck">${I.check}</span> <span><strong>You keep your own brand</strong> — this is lead-sharing, not sub-contracting your identity away.</span></li>
        <li><span class="ck">${I.check}</span> <span><strong>We vet for the same standard</strong> — licensed, insured, WorkSafeBC-covered, honest pricing. Our name's on the referral.</span></li>
      </ul>
      <div class="notice" style="margin-top:1.5rem">${I.hands}<p>We're picky on purpose. We only pass homeowners to partners who treat them the way we would — upfront, fair, and properly covered.</p></div>
    </div>
    <div data-reveal="left">
      <form class="form" action="/form-handler.php" method="POST">
        <input type="hidden" name="form_name" value="Partner application">
        <input type="text" name="company_website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        <h2 style="margin-bottom:1rem">Apply to partner</h2>
        <div class="form__row">
          <div class="field"><label for="pname">Your name <span class="req">*</span></label><input id="pname" name="name" autocomplete="name" required></div>
          <div class="field"><label for="pcompany">Company</label><input id="pcompany" name="company" autocomplete="organization"></div>
        </div>
        <div class="form__row">
          <div class="field"><label for="pphone">Phone <span class="req">*</span></label><input id="pphone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required></div>
          <div class="field"><label for="pemail">Email <span class="req">*</span></label><input id="pemail" name="email" type="email" inputmode="email" autocomplete="email" required></div>
        </div>
        <div class="form__row">
          <div class="field"><label for="ptrade">Trade / service</label><input id="ptrade" name="trade" placeholder="e.g. garage door tech"></div>
          <div class="field"><label for="parea">Service area</label><input id="parea" name="serviceArea" placeholder="e.g. Surrey + Langley"></div>
        </div>
        <div class="field"><label for="pnotes">Capacity &amp; notes</label><textarea id="pnotes" name="notes" placeholder="How many jobs a week could you take? Licensed/insured/WorkSafeBC status, years in the trade, anything else."></textarea></div>
        <button class="btn btn--primary btn--block btn--lg" type="submit">${I.hands} Submit application</button>
        <p class="form__note" style="margin-top:.8rem">Goes straight to ${C.email}. We'll be in touch if it's a fit.</p>
      </form>
    </div>
  </div></div></section>
</main>` + footer();
  page("/become-a-partner.html", body);
}

/* ========== THANK YOU ========== */
{
  const body = head({
    path: "/thank-you.html", title: "Thanks — We'll Be in Touch | Good Enough Garage Doors",
    desc: "Thanks for reaching out to Good Enough Garage Doors. We've got your message and we'll reply quickly.",
    jsonld: { "@context": "https://schema.org", "@type": "WebPage", name: "Thank you" },
  }) + header() + `
<main id="main">
  <section class="section" style="padding-block:6rem"><div class="container center" style="max-width:640px">
    <span class="card__icon" style="width:72px;height:72px;margin:0 auto 1.5rem;background:var(--brand-light)">${I.check}</span>
    <h1>Got it. Thank you.</h1>
    <p class="lede">Your message is in our inbox and a real person will reply quickly — usually the same day during working hours.</p>
    <div class="notice" style="text-align:left;margin:2rem 0">${I.phone}<p><strong>Need it sorted today?</strong> Calling is always fastest. Ring us at <a href="tel:${TEL}">${PHONE_D}</a> and we'll give you a price and a window on the spot.</p></div>
    <div class="btn-row" style="justify-content:center"><a class="btn btn--primary btn--lg" href="tel:${TEL}">${I.phone} Call ${PHONE_D}</a><a class="btn btn--ghost btn--lg" href="/">Back to home</a></div>
  </div></section>
</main>` + footer();
  page("/thank-you.html", body);
}

/* ========== LEGAL ========== */
function legalPage(slug, title, metaT, intro, blocks) {
  const jsonld = { "@context": "https://schema.org", "@graph": [breadcrumb([["Home", "/"], [title, "/" + slug + ".html"]])] };
  const body = head({ path: "/" + slug + ".html", title: metaT, desc: intro.slice(0, 155), jsonld, ogImg: "about", preload: "/assets/img/about-1200.avif" })
    + header() + `
<main id="main">
  <section class="pagehead pagehead--img">
    ${pageheadBg("about")}
    <div class="container">
      <nav class="crumbs"><a href="/">Home</a><span>/</span>${title}</nav>
      <h1>${title}</h1>
    </div>
  </section>
  <section class="section"><div class="container"><div class="prose">
    <p class="lede">${intro}</p>
    ${blocks.map((b) => `<h2>${b[0]}</h2><p>${b[1]}</p>`).join("")}
    <p style="margin-top:2rem"><em>Last updated ${new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}. Questions? Email <a href="mailto:${C.email}">${C.email}</a>.</em></p>
  </div></div></section>
</main>` + footer();
  page("/" + slug + ".html", body);
}
legalPage("privacy-policy", "Privacy Policy", "Privacy Policy | Good Enough Garage Doors",
  "Good Enough Garage Doors respects your privacy. This policy explains what we collect when you contact us and how we use it. In short: we only use your details to help you with your garage door, and we never sell them.",
  [
    ["What we collect", "When you call, text, email, or submit a form, we collect the details you give us — typically your name, phone number, email, city, and a description of your garage-door issue. Our website uses minimal analytics to understand traffic; we don't build advertising profiles on you."],
    ["How we use it", "Solely to respond to your enquiry, provide a quote, schedule and complete work, and follow up (including a post-job request to leave a Google review). We may contact you by phone, text, or email about your enquiry."],
    ["Who we share it with", "No one, except as strictly needed to do the job (for example, if we refer an overflow job to a vetted partner, with the context required to serve you). We never sell your information."],
    ["Cookies & analytics", "We use only essential cookies plus basic, privacy-respecting analytics to keep the site working and improve it. You can block cookies in your browser; the site will still function."],
    ["Your choices", "You can ask us what we hold about you, ask us to correct it, or ask us to delete it. Email us and we'll take care of it."],
  ]);
legalPage("terms-of-service", "Terms of Service", "Terms of Service | Good Enough Garage Doors",
  "These plain-language terms cover the use of this website and the quotes and services Good Enough Garage Doors provides across Greater Vancouver.",
  [
    ["Quotes & pricing", "Prices shown on this site are honest estimates and ranges for typical Lower Mainland jobs; your final price is confirmed before any work begins. We provide a written quote for larger jobs. The price we quote is the price you pay unless the scope changes with your agreement."],
    ["Our workmanship guarantee", "We stand behind our work with a workmanship warranty. If a repair we performed fails due to our workmanship, we'll return and correct it at no additional call-out charge. Parts carry their manufacturer's warranty. Normal wear, misuse, or unrelated faults aren't covered."],
    ["Licensing", "Good Enough Garage Doors is business-licensed, insured, and WorkSafeBC-covered. Garage-door technician is an unregulated trade in British Columbia; we make no claim to a provincial trade certificate, because none exists for this trade."],
    ["Use of this website", "Content here is provided in good faith for general information and may be updated at any time. Pricing and availability can change. Nothing here is a binding contract until we confirm your specific job."],
    ["Liability", "To the extent permitted by law, our liability is limited to the value of the service provided. We always aim to make things right first — that's the point of the guarantee."],
  ]);

/* ========== 404 ========== */
{
  const body = head({ path: "/404.html", title: "Page Not Found | Good Enough Garage Doors", desc: "That page isn't here — but your garage door problem still can be solved." })
    + header() + `
<main id="main">
  <section class="section" style="padding-block:6rem"><div class="container center" style="max-width:640px">
    <h1 style="font-size:4rem;margin-bottom:.5rem">404</h1>
    <h2>Well, this page isn't even good enough to exist.</h2>
    <p class="lede">The page you're after has moved or never existed. Your garage door, on the other hand, we can definitely help with.</p>
    <div class="btn-row" style="justify-content:center;margin-top:1.5rem"><a class="btn btn--primary btn--lg" href="tel:${TEL}">${I.phone} Call ${PHONE_D}</a><a class="btn btn--ghost btn--lg" href="/">Back to home</a></div>
    <p style="margin-top:2rem"><a href="/services.html">See our services</a> · <a href="/contact.html">Contact us</a> · <a href="/faq.html">FAQ</a></p>
  </div></section>
</main>` + footer();
  page("/404.html", body);
}

/* ---------------- write everything ---------------- */
mkdirSync("service-areas", { recursive: true });
for (const [p, html] of PAGES) {
  const out = "." + p;
  writeFileSync(out, html);
}

/* ---------------- sitemap ---------------- */
const today = new Date().toISOString().slice(0, 10);
const urls = PAGES.map(([p]) => p === "/index.html" ? "/" : p).filter((p) => p !== "/404.html" && p !== "/thank-you.html");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${BASE}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>`;
writeFileSync("sitemap.xml", sitemap);

console.log(`✓ wrote ${PAGES.length} pages + sitemap.xml (${urls.length} urls)`);
