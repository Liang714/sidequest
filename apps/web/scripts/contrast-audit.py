"""
Measure the CREW palette's real contrast ratios in a browser.

Hand-calculated palettes ship AA failures; this catches them. It found the
original ink-3 at 3.58:1 (specced as 4.6:1) — see the spec's §H note.

Walks the rendered DOM, resolves each element's *effective* background by
climbing past transparent ancestors, then applies the WCAG AA threshold that
matches its computed font size and weight (3:1 only for >=24px, or >=18.66px
bold; 4.5:1 otherwise).

Usage — needs the dev server running and /dev/kitchen-sink reachable:

    pnpm --filter @sidequest/web dev          # in another shell
    uv run --with playwright python apps/web/scripts/contrast-audit.py

Override the URL if dev picked a different port:

    KITCHEN_SINK_URL=http://localhost:3002/dev/kitchen-sink uv run ...

Exits non-zero if anything fails, so it can gate CI once a browser is
available there.
"""
import os
import sys

from playwright.sync_api import sync_playwright

URL = os.environ.get("KITCHEN_SINK_URL", "http://localhost:3001/dev/kitchen-sink")

JS = """
(targets) => {
  const parse = (c) => {
    const n = (c.match(/[\d.]+/g) || [0,0,0]).map(Number);
    return { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? n[3] : 1 };
  };

  const lum = ({r, g, b}) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };

  const ratio = (fg, bg) => {
    const L1 = lum(fg), L2 = lum(bg);
    const hi = Math.max(L1, L2), lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
  };

  // Soft tints (chips, badges, the presence strip) are rgba over a parent.
  // Comparing text against the *undiluted* tint reports nonsense — a
  // warn-text label on warn-soft came back as exactly 1.00 before this
  // composited. Collect every layer up to the first opaque one, then blend
  // bottom-up.
  const effectiveBg = (el) => {
    const layers = [];
    let n = el;
    while (n) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c.a > 0) layers.push(c);
      if (c.a === 1) break;
      n = n.parentElement;
    }
    if (!layers.length) return { r: 255, g: 255, b: 255, a: 1 };
    let base = layers[layers.length - 1];
    for (let i = layers.length - 2; i >= 0; i -= 1) {
      const t = layers[i];
      base = {
        r: t.r * t.a + base.r * (1 - t.a),
        g: t.g * t.a + base.g * (1 - t.a),
        b: t.b * t.a + base.b * (1 - t.a),
        a: 1,
      };
    }
    return base;
  };

  const hex = ({r, g, b}) =>
    "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

  return targets.map((t) => {
    const el = document.querySelector(t.q);
    if (!el) return { name: t.name, err: "not found" };
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    const bg = effectiveBg(el);
    return {
      name: t.name,
      fg: hex(fg),
      bg: hex(bg),
      px: parseFloat(cs.fontSize),
      weight: parseInt(cs.fontWeight, 10),
      ratio: +ratio(fg, bg).toFixed(2),
    };
  });
}
"""

TARGETS = [
    {"name": "hot as text",       "q": "p.text-hot-text"},
    {"name": "mint as text",      "q": "p.text-mint-text"},
    {"name": "info as text",      "q": "p.text-info-text"},
    {"name": "ink-muted",         "q": "p.text-ink-muted"},
    {"name": "ink-faint (meta)",  "q": "p.text-ink-faint"},
    {"name": "primary btn label", "q": "button.bg-hot span"},
    {"name": "body copy",         "q": "span.text-body"},
    {"name": "caption",           "q": "span.text-caption"},
    {"name": "h1",                "q": "span.text-h1"},
    # Stage 2 additions — new colour usages introduced by the CREW grammar.
    {"name": "danger as text",    "q": "button.text-danger-text"},
    {"name": "warn as text",      "q": "span.text-warn-text"},
    {"name": "mint on mint-soft", "q": "p.text-mint-text"},
    {"name": "bubble on-hot",     "q": "div.bg-hot.text-on-hot"},
    {"name": "crew names (h2)",   "q": "p.text-h2.text-ink"},
    {"name": "person interests",  "q": "p.truncate.text-caption.text-ink-muted"},
]


def audit(page, theme):
    rows = page.evaluate(JS, TARGETS)
    print(f"\n=== {theme.upper()} ===")
    print(f"{'element':<20}{'size':>6}{'wt':>5}{'ratio':>8}   verdict")
    all_ok = True
    for r in rows:
        if r.get("err"):
            print(f"{r['name']:<20}{'':>19}   ! {r['err']}")
            all_ok = False
            continue
        # WCAG AA: 3:1 for >=24px, or >=18.66px bold; else 4.5:1
        large = r["px"] >= 24 or (r["px"] >= 18.66 and r["weight"] >= 700)
        need = 3.0 if large else 4.5
        ok = r["ratio"] >= need
        all_ok = all_ok and ok
        print(f"{r['name']:<20}{r['px']:>6.1f}{r['weight']:>5}{r['ratio']:>8.2f}   "
              f"{'PASS' if ok else 'FAIL'} (needs {need})")
    return all_ok


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={"width": 1000, "height": 1400})
    page.goto(URL)
    page.wait_for_load_state("networkidle")

    dark_ok = audit(page, "dark")
    page.click("text=Light")
    page.wait_for_timeout(400)
    light_ok = audit(page, "light")

    b.close()

passed = dark_ok and light_ok
print(f"\nALL PASS: {passed}")
sys.exit(0 if passed else 1)
