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
  const lum = (c) => {
    const [r,g,b] = c.match(/[\\d.]+/g).slice(0,3).map(Number).map(v => {
      v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
    });
    return 0.2126*r + 0.7152*g + 0.0722*b;
  };
  const ratio = (a,b) => {
    const L1 = lum(a), L2 = lum(b);
    const hi = Math.max(L1,L2), lo = Math.min(L1,L2);
    return (hi+0.05)/(lo+0.05);
  };
  // Walk up for the first non-transparent background.
  const bgOf = (el) => {
    let n = el;
    while (n) {
      const bg = getComputedStyle(n).backgroundColor;
      if (bg && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(bg)) return bg;
      n = n.parentElement;
    }
    return 'rgb(255, 255, 255)';
  };

  return targets.map((t) => {
    const el = document.querySelector(t.q);
    if (!el) return { name: t.name, err: 'not found' };
    const cs = getComputedStyle(el);
    const bg = bgOf(el);
    return {
      name: t.name,
      fg: cs.color,
      bg,
      px: parseFloat(cs.fontSize),
      weight: parseInt(cs.fontWeight, 10),
      ratio: +ratio(cs.color, bg).toFixed(2),
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
