"use client";

import { useState, type ReactNode } from "react";
import { Camera, MapPin, Plus, Search, Star, Users } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  ChatBubble,
  CheckInStrip,
  Chip,
  CompatBadge,
  CrewCard,
  CrewCardSkeleton,
  EmptyState,
  ErrorState,
  FaceStack,
  OfflineBanner,
  PersonRow,
  PersonRowSkeleton,
  PresenceStrip,
  XPBar,
} from "@/components/ui";
import { distanceBandLabel, joinNames } from "@/lib/people";

const CREW = [
  { id: "u-minji", name: "Minji" },
  { id: "u-tae", name: "Tae" },
  { id: "u-sora", name: "Sora" },
  { id: "u-hyun", name: "Hyun" },
  { id: "u-jamie", name: "Jamie" },
];

export function KitchenSink() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [selected, setSelected] = useState<string[]>(["Photography"]);
  const [loading, setLoading] = useState(false);

  function toggle(tag: string) {
    setSelected((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  return (
    // data-theme on a wrapper lets both themes be compared without touching
    // the app-wide next-themes setting.
    <div data-theme={theme} className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur-md">
        <div>
          <p className="text-label uppercase text-ink-faint">CREW design system</p>
          <h1 className="text-h2 text-ink">Kitchen sink</h1>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        >
          {theme === "dark" ? "Light" : "Dark"}
        </Button>
      </header>

      <main className="mx-auto max-w-[900px] px-4 pb-20">
        <Section title="Color" note="Fills vs accessible text variants. On light, hot is 3.1:1 and mint 1.6:1 as text — hence the separate -text tokens.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Swatch className="bg-bg border border-line" label="bg" />
            <Swatch className="bg-surface border border-line" label="surface" />
            <Swatch className="bg-surface-elevated border border-line" label="surface-elevated" />
            <Swatch className="bg-line" label="line" />
            <Swatch className="bg-hot" label="hot (fill)" labelClassName="text-on-hot" />
            <Swatch className="bg-mint" label="mint (fill)" labelClassName="text-on-mint" />
            <Swatch className="bg-info" label="info" labelClassName="text-on-info" />
            <Swatch className="bg-danger" label="danger" labelClassName="text-on-danger" />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 rounded-card border border-line bg-surface p-4">
            <p className="text-hot-text text-body-s font-semibold">hot as text</p>
            <p className="text-mint-text text-body-s font-semibold">mint as text</p>
            <p className="text-info-text text-body-s font-semibold">info as text</p>
            <p className="text-ink-muted text-body-s">ink-muted</p>
            <p className="text-ink-faint text-body-s">ink-faint (metadata only)</p>
          </div>
        </Section>

        <Section title="Type" note="Figtree, sentence case throughout. Uppercase only on the label style.">
          <div className="rounded-card border border-line bg-surface p-4">
            <Row m="display 30/1.12"><span className="text-display">Free tonight?</span></Row>
            <Row m="h1 27/1.14"><span className="text-h1">7 people are out near you</span></Row>
            <Row m="h2 21/1.25"><span className="text-h2">Minji, Tae &amp; Sora</span></Row>
            <Row m="h3 17/1.35"><span className="text-h3">Hongdae Photo Hunt</span></Row>
            <Row m="body 16/1.55"><span className="text-body">Find 5 neon signs, then a group photo.</span></Row>
            <Row m="body-s 14/1.5"><span className="text-body-s text-ink-muted">Exit 9, Hongik Univ. Station</span></Row>
            <Row m="caption 12.5"><span className="text-caption text-ink-muted">under 1km · Lv 4 · 2 mutual</span></Row>
            <Row m="label 11 upper"><span className="text-label uppercase text-ink-faint">Crews forming</span></Row>
            <Row m="numeric tabular"><span className="text-numeric tabular-nums">₩15,000 · 2,840 / 3,500</span></Row>
            <Row m="Hangul (no tracking)"><span lang="ko" className="text-h2">홍대 사진 헌트</span></Row>
          </div>
        </Section>

        <Section title="Buttons" note="Primary is a tangerine fill with near-black ink — 6.7:1. White on hot would be 2.5:1 and fail.">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Join them</Button>
            <Button variant="secondary">Open room</Button>
            <Button variant="ghost">Not now</Button>
            <Button variant="danger">Leave quest</Button>
            <Button disabled>Quest full</Button>
            <Button loading={loading} onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1600); }}>
              Click to load
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md" icon={<Plus className="h-[18px] w-[18px]" />}>Medium + icon</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="mt-3">
            <Button block size="lg">Block — sticky footer CTA</Button>
          </div>
        </Section>

        <Section
          title="The Rule of Faces"
          note="46px overlapping stacks only on crew cards (already co-committed). 32px non-overlapping for browsable individuals, which lead with interests. No face grid exists anywhere."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-card border border-line bg-surface p-4 shadow-e1">
              <p className="mb-3 text-label uppercase text-ink-faint">Crew card — 46px stack</p>
              <FaceStack people={CREW.slice(0, 3)} />
              <p className="mt-3 text-h2">Minji, Tae &amp; Sora</p>
              <p className="text-body-s text-ink-muted">are looking for 2 more</p>
            </div>
            <div className="rounded-card border border-line bg-surface p-4 shadow-e1">
              <p className="mb-3 text-label uppercase text-ink-faint">Overflow past 3</p>
              <FaceStack people={CREW} />
              <p className="mt-3 text-body-s text-ink-muted">+2 collapses the rest</p>
            </div>
          </div>
          <div className="mt-3 rounded-card border border-line bg-surface p-4 shadow-e1">
            <p className="mb-3 text-label uppercase text-ink-faint">Person row — 32px, interests lead</p>
            <div className="flex items-start gap-3">
              <Avatar name="Jamie" userId="u-jamie" size="sm" />
              <div className="flex-1">
                <p className="text-h3">Jamie</p>
                <p className="text-caption text-ink-muted">Photography, cafés · EN OK</p>
                <p className="text-caption text-ink-muted">under 1km · Lv 4 · 2 mutual friends</p>
              </div>
              <Button variant="secondary" size="sm">Invite</Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-4 rounded-card border border-line bg-surface p-4">
            <AvatarSpec size="xs" label="xs 24" />
            <AvatarSpec size="sm" label="sm 32 — rows" />
            <AvatarSpec size="md" label="md 46 — stacks" />
            <AvatarSpec size="lg" label="lg 78 — profile" />
            <div className="text-center">
              <Avatar name="Tae" userId="u-tae" size="md" checkedIn />
              <p className="mt-2 text-caption text-mint-text">checked in</p>
            </div>
            <div className="text-center">
              <Avatar name="Sora" userId="u-sora" size="md" dimmed />
              <p className="mt-2 text-caption text-ink-faint">not arrived</p>
            </div>
          </div>
        </Section>

        <Section title="Chips & badges" note="Selected chips carry a check as well as the fill — color is never the only signal.">
          <div className="flex flex-wrap gap-2">
            {["Photography", "Cafés", "Walking", "Board games"].map((tag) => (
              <Chip key={tag} selected={selected.includes(tag)} onClick={() => toggle(tag)}>
                {tag}
              </Chip>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone="shared" icon={<Star className="h-[13px] w-[13px]" />}>Shared interest</Chip>
            <Chip tone="neutral" icon={<MapPin className="h-[13px] w-[13px]" />}>under 1km</Chip>
            <Chip tone="info" icon={<Users className="h-[13px] w-[13px]" />}>94% match</Chip>
            <Chip tone="warn">Pending</Chip>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="warn">Sponsored</Badge>
            <Badge tone="mint" icon={<Star className="h-3 w-3" />}>Friend</Badge>
            <Badge tone="info">AI draft</Badge>
            <Badge tone="hot">Pro</Badge>
            <Badge tone="neutral">EN OK</Badge>
            <Badge tone="danger">Started</Badge>
            <Badge tone="neutral" icon={<Camera className="h-3 w-3" />}>Photo</Badge>
          </div>
        </Section>

        <Section title="States" note="Every empty state carries an action — that's enforced by the component's required `action` prop, not by review.">
          <OfflineBanner message="You're offline. Showing what we last loaded." />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <EmptyState
              icon={<Users className="h-7 w-7" />}
              title="Nobody's marked themselves free near you yet."
              body="You could be the first — people look for this."
              action={{ label: "I'm free tonight" }}
            />
            <ErrorState
              title="Our side broke, not yours."
              body="Try again in a moment."
              onRetry={() => {}}
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <CrewCardSkeleton />
            <div className="rounded-card border border-line bg-surface p-4">
              <PersonRowSkeleton />
              <PersonRowSkeleton />
              <PersonRowSkeleton />
            </div>
          </div>
        </Section>

        <Section
          title="Crew card"
          note="Hierarchy inverts the category default: faces → names → activity → trust → CTA. Time is a datum in the meta line, never a countdown headline — in CREW the pressure is social (&ldquo;looking for 2 more&rdquo;), which is truer and can&rsquo;t be inflated into FOMO."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CrewCard
              people={CREW.slice(0, 3)}
              namesLine={joinNames(["Minji", "Tae", "Sora"])}
              needLine="are looking for 2 more"
              questTitle="Hongdae Photo Hunt"
              time="9:00 PM"
              place="Exit 9, Hongik Univ."
              distanceLabel="1.2km"
              startsIn="starts in 45m"
              urgent
              trust={
                <>
                  <Badge tone="mint" icon={<Star className="h-3 w-3" />}>Sora is your friend</Badge>
                  <CompatBadge score={94} onExplain={() => {}} />
                </>
              }
            />
            <CrewCard
              people={CREW.slice(0, 4)}
              namesLine={joinNames(["Minji", "Tae", "Sora", "Hyun"])}
              questTitle="Euljiro Print Crawl"
              time="7:30 PM"
              place="Euljiro 3-ga"
              distanceLabel="2.8km"
              startsIn="starts in 2h"
              variant="full"
              sponsored
              trust={<Badge tone="neutral">EN OK</Badge>}
            />
            <CrewCard
              people={CREW.slice(1, 3)}
              namesLine={joinNames(["Tae", "Sora"])}
              needLine="you&rsquo;re in"
              questTitle="Mangwon Night Market"
              time="8:00 PM"
              place="Mangwon Stn"
              variant="joined"
              ctaLabel="Open room"
            />
            <CrewCard
              people={CREW}
              namesLine={joinNames(["Minji", "Tae", "Sora", "Hyun", "Jamie"])}
              questTitle="Seongsu Cafe Hunt"
              time="Last Friday"
              place="Seongsu"
              variant="past"
            />
          </div>
        </Section>

        <Section
          title="Person row"
          note="Interests lead, avatar is 32px and non-overlapping, distance arrives pre-banded. distanceBandLabel() is the only sanctioned way to render how far away a person is — a precise figure, sampled a few times, locates them."
        >
          <div className="rounded-card border border-line bg-surface px-4 shadow-e1">
            <PersonRow
              id="u-jamie"
              name="Jamie"
              interests={["Photography", "Cafés"]}
              languageBadge="EN OK"
              distanceLabel={distanceBandLabel(0.6)}
              level={4}
              mutualCount={2}
              note="Up for a café or a walk"
              action={<Button variant="secondary" size="sm">Invite</Button>}
            />
            <PersonRow
              id="u-sora"
              name="Sora"
              interests={["Dance", "Food"]}
              distanceLabel={distanceBandLabel(2.1)}
              level={12}
              mutualCount={5}
              relation="friend"
              action={<Button variant="secondary" size="sm">Invite</Button>}
            />
            <PersonRow
              id="u-hyun"
              name="Hyun"
              interests={["Board games", "Coffee"]}
              distanceLabel={distanceBandLabel(4.4)}
              level={9}
              relation="invited"
              action={<Button variant="ghost" size="sm" disabled>Invited</Button>}
            />
          </div>
          <p className="mt-3 text-caption text-ink-faint">
            Bands: {distanceBandLabel(0.4)} · {distanceBandLabel(2.2)} · {distanceBandLabel(4.9)} · {distanceBandLabel(12)}
          </p>
        </Section>

        <Section
          title="Presence"
          note="Always shows remaining time and an edit affordance. Nobody is discoverable by default, and nobody stays discoverable by accident — this strip is what makes the second half true."
        >
          <div className="flex flex-col gap-3">
            <PresenceStrip state="off" label="You&rsquo;re hidden right now." actionLabel="I&rsquo;m free tonight" />
            <PresenceStrip state="on" label="You&rsquo;re free until 11 PM" actionLabel="Edit" />
            <PresenceStrip state="expiring" label="Visible for 15 more minutes" actionLabel="Extend" />
          </div>
        </Section>

        <Section
          title="Room"
          note="Check-in sits above the chat: &ldquo;are the others actually coming?&rdquo; is the highest-anxiety question in the product. A failed send stays visible with a retry — losing a message in a group you&rsquo;re about to meet is the worst failure mode here."
        >
          <CheckInStrip
            people={[
              { id: "u-minji", name: "Minji", checkedIn: true },
              { id: "u-tae", name: "Tae", checkedIn: true },
              { id: "u-sora", name: "Sora", checkedIn: false },
              { id: "u-jamie", name: "Jamie", checkedIn: false },
            ]}
            countLabel="2 of 4 here"
          />
          <div className="mt-3 rounded-card border border-line bg-surface p-4">
            <ChatBubble kind="theirs" senderName="Minji" senderId="u-minji" text="I'm at exit 9, black jacket" />
            <ChatBubble kind="mine" text="On my way, 5 min" className="mt-3" />
            <ChatBubble kind="system" text="Tae checked in" />
            <ChatBubble kind="theirs" senderName="Tae" senderId="u-tae" text="found a great spot for the group shot" />
            <ChatBubble kind="theirs" senderName="Tae" senderId="u-tae" grouped text="right by the crossing" className="mt-1" />
            <ChatBubble kind="mine" text="Sending…" status="sending" className="mt-3" />
            <ChatBubble kind="mine" text="see you there" status="failed" onRetry={() => {}} className="mt-3" />
          </div>
        </Section>

        <Section
          title="Progress"
          note="XP is mint and tabular so it doesn&rsquo;t jitter as it counts up. Compatibility is always tappable through to the real breakdown — docs/AI.md is explicit that it&rsquo;s a conventional scorer, so the honest presentation is a transparent one."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-card border border-line bg-surface p-4">
              <XPBar current={2840} target={3500} level={7} />
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4">
              <CompatBadge score={94} onExplain={() => {}} />
              <CompatBadge score={61} />
            </div>
          </div>
        </Section>

        <Section title="Radius & elevation" note="Six radii, no exceptions. Dark gets depth from surface lightness + hairline; shadows only exist on light.">
          <div className="flex flex-wrap gap-3">
            {(["card", "button", "input", "bubble", "sheet", "chip"] as const).map((r) => (
              <div
                key={r}
                className={`flex h-20 w-24 items-center justify-center border border-line bg-surface text-caption text-ink-muted rounded-${r}`}
              >
                {r}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <div className="flex h-20 w-28 items-center justify-center rounded-card border border-line bg-surface text-caption text-ink-muted shadow-e1">e1 card</div>
            <div className="flex h-20 w-28 items-center justify-center rounded-card border border-line bg-surface-elevated text-caption text-ink-muted shadow-e2">e2 sheet</div>
            <div className="flex h-20 w-28 items-center justify-center rounded-card border border-line bg-surface-elevated text-caption text-ink-muted shadow-e3">e3 modal</div>
          </div>
        </Section>

        <Section title="Icons" note="Lucide, 1.5px stroke. Emoji are gone from all interface chrome — they render inconsistently per platform and can't take state color.">
          <div className="flex flex-wrap gap-4 rounded-card border border-line bg-surface p-4 text-ink-muted">
            {[Search, MapPin, Plus, Users, Camera, Star].map((Icon, i) => (
              <Icon key={i} className="h-6 w-6" />
            ))}
          </div>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mt-10 border-t border-line pt-5">
      <h2 className="text-h2 text-ink">{title}</h2>
      {note && <p className="mb-4 mt-1 max-w-[70ch] text-body-s text-ink-muted">{note}</p>}
      {children}
    </section>
  );
}

function Row({ m, children }: { m: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-3 border-b border-line py-2 last:border-b-0">
      <span className="w-[150px] shrink-0 text-label uppercase text-ink-faint">{m}</span>
      {children}
    </div>
  );
}

function Swatch({
  className,
  label,
  labelClassName = "text-ink-muted",
}: {
  className: string;
  label: string;
  /** Must be legible against this swatch's own fill, not the page background. */
  labelClassName?: string;
}) {
  return (
    <div className={`flex h-16 flex-col justify-end rounded-input p-2 ${className}`}>
      <span className={`text-label uppercase ${labelClassName}`}>{label}</span>
    </div>
  );
}

function AvatarSpec({ size, label }: { size: "xs" | "sm" | "md" | "lg"; label: string }) {
  return (
    <div className="text-center">
      <Avatar name="Minji" userId="u-minji" size={size} />
      <p className="mt-2 text-caption text-ink-faint">{label}</p>
    </div>
  );
}
