"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FAM, CAT_STYLE, EVENTS, HERO_EVENTS, GUESTS, PLACES, suggest, type FamKey } from "@/lib/home";

type Category = { id: number; name_en: string };
type Vendor = { id: string; business_name: string; category_id: number; city: string; photos: string[]; verified: boolean; rating: number; review_count: number };
type Props = { categories: Category[]; vendors: Vendor[]; signedIn: boolean; role: string | null };

const cx = (...c: (string | false)[]) => c.filter(Boolean).join(" ");
const famOf = (catId: number) => FAM[CAT_STYLE[catId]?.fam ?? "cobalt"];

function Icon({ d, size = 20, className, stroke = "currentColor", fill = "none", width = 2 }: { d: string; size?: number; className?: string; stroke?: string; fill?: string; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={d} />
    </svg>
  );
}
const I = {
  search: "M5 11a6 6 0 1 0 12 0a6 6 0 1 0-12 0M20 20l-4.5-4.5",
  pin: "M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM10 10a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
  heart: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  check: "M5 12l5 5 9-10",
  image: "M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM7.5 9.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0M21 15l-5-5L5 20",
};

function Logo({ size, dark }: { size: number; dark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 92 92" aria-hidden="true">
      <path d="M0 42A42 42 0 0 1 42 0V42Z" fill={dark ? "#4C66FF" : "#2D4BFF"} />
      <circle cx="71" cy="21" r="21" fill="#FF7A1A" />
      <path d="M0 92V71A21 21 0 0 1 42 71V92Z" fill="#FF6FB5" />
      <rect x="50" y="50" width="42" height="42" rx="8" fill={dark ? "#1FBF80" : "#14A06C"} />
      <path d="M71 57C72 66 76 70 85 71C76 72 72 76 71 85C70 76 66 72 57 71C66 70 70 66 71 57Z" fill={dark ? "#121212" : "#FFFFFF"} />
    </svg>
  );
}

const pill = (sel: boolean) => cx("g-chip inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full pl-2 pr-4 text-sm font-medium", sel ? "bg-cobalt text-white" : "bg-sand text-ink");
const ask = (sel: boolean) => cx("g-chip min-h-11 cursor-pointer rounded-full border-[1.5px] px-[18px] text-[15px] font-medium", sel ? "border-ink bg-ink text-white" : "border-line bg-white text-ink");
const bubble = (catId: number, sel: boolean) => {
  const f = famOf(catId);
  return { className: "inline-flex size-7 items-center justify-center rounded-full", style: sel ? { background: "rgba(255,255,255,.2)", color: "#fff" } : { background: f.t100, color: f.t700 } };
};
const famTag = (catId: number) => ({ background: famOf(catId).t100, color: famOf(catId).t700 });

function CardTop({ catId, photo, children }: { catId: number; photo?: string; children?: React.ReactNode }) {
  const f = famOf(catId);
  return (
    <div className="relative flex h-[168px] items-center justify-center overflow-hidden" style={{ background: f.t100, color: f.t700 }}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- vendor photos are Supabase storage URLs, same as /vendors
        <img src={photo} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <>
          <span aria-hidden="true" className="absolute -bottom-14 -right-9 size-[190px]" style={{ background: f.t200, borderRadius: f.radius }} />
          <Icon d={I.image} size={36} className="relative" />
        </>
      )}
      {children}
    </div>
  );
}

const STEP = "flex items-center justify-center size-7 rounded-full bg-cobalt text-white text-[13px] font-bold";

export default function HomeClient({ categories, vendors, signedIn, role }: Props) {
  const [mode, setMode] = useState<"planner" | "vendor">("planner");
  const [cat, setCat] = useState<string>("all"); // "all" | "team" | "fam:<key>" | "<category id>"
  const [q, setQ] = useState("");
  const [occ, setOcc] = useState("birthday");
  const [guests, setGuests] = useState("m");
  const [place, setPlace] = useState("tbd");
  const [picks, setPicks] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [bizName, setBizName] = useState("");
  const [bizArea, setBizArea] = useState("");
  const [bizCat, setBizCat] = useState(2);

  // Saved vendors are a per-browser convenience; storage can be blocked, so failures are ignored.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- must run after hydration so server and client HTML match
    try { setSaved(JSON.parse(localStorage.getItem("glimsey:saved") || "{}")); } catch {}
  }, []);
  const toggleSave = (id: string) => {
    const next = { ...saved, [id]: !saved[id] };
    setSaved(next);
    try { localStorage.setItem("glimsey:saved", JSON.stringify(next)); } catch {}
  };

  const catName = (id: number) => categories.find((c) => c.id === id)?.name_en ?? "";
  const query = q.trim().toLowerCase();
  const qEvent = query ? EVENTS.find((e) => e.label.toLowerCase().startsWith(query) || query.includes(e.label.toLowerCase())) : undefined;
  const famSel = cat.startsWith("fam:") ? (cat.slice(4) as FamKey) : null;

  const event = EVENTS.find((e) => e.id === occ)!;
  const sugg = suggest(event, guests, place);
  const inTeam = (id: number) => picks[id] ?? sugg.includes(id);
  const teamIds = categories.filter((c) => inTeam(c.id)).map((c) => c.id);

  let list = vendors.filter((v) => {
    const fam = CAT_STYLE[v.category_id]?.fam;
    const okCat = cat === "all" || (cat === "team" ? teamIds.includes(v.category_id) : famSel ? fam === famSel : v.category_id === Number(cat));
    const okQ = !query || (qEvent ? qEvent.cats.includes(v.category_id) : `${v.business_name} ${catName(v.category_id)} ${fam ? FAM[fam].label : ""} ${v.city}`.toLowerCase().includes(query));
    return okCat && okQ;
  });
  const hasFilter = cat !== "all" || !!query;
  if (!hasFilter) list = list.slice(0, 8);

  let listTitle = "Popular this week";
  if (cat === "team") listTitle = `Your ${event.label.toLowerCase()} vendor team`;
  else if (famSel) listTitle = FAM[famSel].label;
  else if (cat !== "all") listTitle = catName(Number(cat));
  else if (qEvent) listTitle = `For your ${qEvent.label.toLowerCase()}`;
  else if (query) listTitle = `Results for “${q.trim()}”`;

  const savedCount = Object.values(saved).filter(Boolean).length;
  const clearFilters = () => { setCat("all"); setQ(""); };
  const listUrl = signedIn && role === "vendor" ? "/vendor/profile" : "/login?next=/vendor/profile";
  const occLower = occ === "other" ? "event" : event.label.toLowerCase();
  const n = teamIds.length;

  const tile = (key: FamKey, layout: string) => {
    const f = FAM[key], sel = famSel === key;
    const style: React.CSSProperties = key === "jade"
      ? { background: f.solid, color: "#121212", outline: sel ? "3px solid #121212" : undefined, outlineOffset: 4, borderRadius: f.radius }
      : { background: sel ? f.solid : f.t100, color: sel ? f.on : f.t700, borderRadius: f.radius };
    return {
      "aria-pressed": sel,
      onClick: () => setCat(sel ? "all" : `fam:${key}`),
      className: cx("g-tile flex aspect-square w-full cursor-pointer flex-col gap-1.5 border-none p-[22px]", layout),
      style,
    };
  };

  return (
    <div className="home overflow-x-hidden bg-white text-base leading-relaxed text-ink">
      {/* NAV */}
      <header className="border-b border-line bg-white">
        <nav aria-label="Main" className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-8 gap-y-4 px-6 py-4">
          <Link href="/" aria-label="Glimsey home" className="flex items-center gap-2 text-ink no-underline">
            <Logo size={36} />
            <span className="text-[25px] font-bold leading-none tracking-[-0.035em]">glimsey</span>
          </Link>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[15px] font-medium">
            <a href="#popular">Categories</a>
            <a href="#plan">How it works</a>
            <a href="#vendors">For vendors</a>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] font-medium">
            <Link href="/vendors" lang="ar">العربية</Link>
            <a href="#popular" aria-label={`Saved vendors: ${savedCount}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-sand px-3.5">
              <Icon d={I.heart} size={18} stroke="#AD4B7B" fill={savedCount ? "#FF6FB5" : "none"} />
              <span>Saved {savedCount}</span>
            </a>
            {signedIn ? <Link href="/requests">My requests</Link> : <Link href="/login">Sign in</Link>}
            <Link href={listUrl} className="inline-flex min-h-11 items-center rounded-[10px] bg-tangerine px-[18px] font-semibold transition-colors hover:bg-[#D96816]">List your business</Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section id="top" className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-12 px-6 pb-10 pt-14">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col items-start gap-6">
          <div role="group" aria-label="Show the page for" className="inline-flex gap-1 rounded-full bg-sand p-1">
            {(["planner", "vendor"] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
                className={cx("min-h-11 cursor-pointer rounded-full px-[18px] text-sm font-semibold", mode === m ? "bg-white text-ink shadow-[0_2px_8px_rgba(18,18,18,.1)]" : "bg-transparent text-[#5C5A55]")}>
                {m === "planner" ? "I'm planning an event" : "I'm a vendor"}
              </button>
            ))}
          </div>

          {mode === "planner" ? (
            <div className="flex w-full flex-col items-start gap-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#D9F0E7] px-3 py-1 text-[13px] font-semibold text-[#0E6D49]"><span aria-hidden="true" className="size-2 rounded-full bg-jade" />Now in Riyadh</span>
              <h1 className="m-0 text-[clamp(40px,6vw,64px)] font-bold leading-[1.04] tracking-[-0.035em]">Every event vendor.<br />One place.</h1>
              <p className="m-0 max-w-[520px] text-lg text-muted">Find venues, caterers, photographers and more for your next event, and contact them directly.</p>
              <form onSubmit={(e) => { e.preventDefault(); document.getElementById("popular")?.scrollIntoView({ behavior: "smooth" }); }}
                className="flex w-full max-w-[600px] flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-2 shadow-[0_8px_24px_rgba(18,18,18,.06)]">
                <label className="flex min-h-11 min-w-0 flex-[1_1_240px] items-center gap-2.5 px-2.5">
                  <Icon d={I.search} />
                  <span className="sr-only">What are you planning?</span>
                  <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="What are you planning? Try “birthday” or “catering”"
                    className="min-w-0 flex-1 border-none bg-transparent py-2.5 text-[15px] outline-offset-[6px] placeholder:text-muted" />
                </label>
                <span aria-hidden="true" className="h-7 w-px bg-line" />
                <span className="inline-flex items-center gap-1.5 px-2.5 text-[15px]"><Icon d={I.pin} size={18} />Riyadh</span>
                <button className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] bg-cobalt px-[22px] text-[15px] font-semibold text-white transition-colors hover:bg-cobalt-dark">Find vendors</button>
              </form>
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-sm font-semibold">Planning a…</span>
                {HERO_EVENTS.map((id) => {
                  const e = EVENTS.find((x) => x.id === id)!, sel = qEvent?.id === id;
                  return (
                    <button key={id} type="button" aria-pressed={sel} onClick={() => { setOcc(id); setPicks({}); setQ(e.label); setCat("all"); }}
                      className={cx(ask(sel), "px-4 text-sm")}>{e.label}</button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-col items-start gap-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#FFEADA] px-3 py-1 text-[13px] font-semibold text-[#AD5312]"><span aria-hidden="true" className="size-2 rounded-full bg-tangerine" />For vendors</span>
              <h1 className="m-0 text-[clamp(40px,6vw,64px)] font-bold leading-[1.04] tracking-[-0.035em]">Get found by people planning their next event.</h1>
              <p className="m-0 max-w-[520px] text-lg text-muted">List your business in a few minutes. Choose a category, show your work, and let customers contact you directly.</p>
              <div className="flex flex-wrap gap-3">
                <Link href={listUrl} className="inline-flex min-h-12 items-center rounded-[10px] bg-tangerine px-6 font-semibold transition-colors hover:bg-[#D96816]">List your business</Link>
                <a href="#vendors" className="inline-flex min-h-12 items-center rounded-[10px] border-[1.5px] border-ink bg-white px-6 font-semibold hover:bg-sand">Preview your listing</a>
              </div>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[15px]">
                {["Pick the category that fits what you do", "Customers contact you directly", "Starting in Riyadh, growing to new cities"].map((t) => (
                  <li key={t} className="flex items-center gap-2.5"><Icon d={I.check} stroke="#14A06C" width={2.4} />{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Hero tiles: the four category families */}
        <div className="flex w-full max-w-[480px] flex-[1_1_340px] flex-col gap-3">
          <div className="grid grid-cols-2 gap-4">
            <span className="g-float block">
              <button type="button" {...tile("cobalt", "items-start justify-end text-left")}>
                <span className="text-[17px] font-bold leading-tight tracking-[-0.01em]">{FAM.cobalt.label}</span>
                <span className="text-[13px] opacity-85">{FAM.cobalt.hint}</span>
              </button>
            </span>
            <span className="g-float block [animation-delay:-1.5s]">
              <button type="button" {...tile("tangerine", "items-center justify-center p-7 text-center")}>
                <span className="text-[17px] font-bold leading-tight tracking-[-0.01em]">{FAM.tangerine.label}</span>
                <span className="text-[13px] opacity-85">{FAM.tangerine.hint}</span>
              </button>
            </span>
            <span className="g-float block [animation-delay:-3s]">
              <button type="button" {...tile("rose", "items-start justify-end text-left")}>
                <span className="text-[17px] font-bold leading-tight tracking-[-0.01em]">{FAM.rose.label}</span>
                <span className="text-[13px] opacity-85">{FAM.rose.hint}</span>
              </button>
            </span>
            <span className="g-float block [animation-delay:-4.5s]">
              <button type="button" {...tile("jade", "items-center justify-center gap-2.5 text-center")}>
                <svg className="g-twinkle block w-[54%]" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 10C52.8 36 64 47.2 90 50C64 52.8 52.8 64 50 90C47.2 64 36 52.8 10 50C36 47.2 47.2 36 50 10Z" fill="#FFFFFF" /></svg>
                <span className="text-[15px] font-bold leading-tight tracking-[-0.01em]">{FAM.jade.label}</span>
              </button>
            </span>
          </div>
          <p className="m-0 text-center text-[13px] text-muted">Tap a tile to explore that family of vendors</p>
        </div>
      </section>

      {/* CATEGORIES + VENDORS */}
      <section id="popular" className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 pb-20 pt-8">
        <div className="flex flex-col gap-3">
          <h2 className="m-0 text-[15px] font-semibold">Browse by category</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={cat === "all"} onClick={() => setCat("all")} className={cx(pill(cat === "all"), "px-[18px]")}>All</button>
            {categories.map((c) => {
              const sel = cat === String(c.id), b = bubble(c.id, sel);
              return (
                <button key={c.id} type="button" aria-pressed={sel} onClick={() => setCat(sel ? "all" : String(c.id))} className={pill(sel)}>
                  <span aria-hidden="true" {...b}><Icon d={CAT_STYLE[c.id]?.icon ?? I.image} size={16} /></span>
                  {c.name_en}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-[clamp(26px,3vw,32px)] font-bold leading-tight tracking-[-0.02em]">{listTitle}</h2>
            <p aria-live="polite" className="m-0 text-sm text-muted">{list.length === 1 ? "1 vendor" : `${list.length} vendors`}</p>
          </div>
          {hasFilter ? (
            <button type="button" onClick={clearFilters} className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] border-[1.5px] border-ink bg-white px-4 text-sm font-semibold hover:bg-sand">Clear filters</button>
          ) : (
            <Link href="/vendors" className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-cobalt hover:text-cobalt-dark">See all <Icon d={I.arrow} size={18} /></Link>
          )}
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
          {list.map((v) => {
            const on = !!saved[v.id];
            return (
              <article key={v.id} className="g-card flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
                <CardTop catId={v.category_id} photo={v.photos?.[0]}>
                  <button type="button" aria-label={`${on ? "Remove" : "Save"} ${v.business_name}`} aria-pressed={on} onClick={() => toggleSave(v.id)}
                    className="absolute right-2.5 top-2.5 flex size-11 cursor-pointer items-center justify-center rounded-full border-none bg-white shadow-[0_2px_8px_rgba(18,18,18,.08)] active:scale-90">
                    <Icon d={I.heart} fill={on ? "#FF6FB5" : "none"} stroke={on ? "#AD4B7B" : "#121212"} />
                  </button>
                </CardTop>
                <div className="flex flex-1 flex-col gap-2 px-[18px] pb-[18px] pt-4">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex rounded-md px-2.5 py-0.5 text-xs font-semibold" style={famTag(v.category_id)}>{famOf(v.category_id).label}</span>
                    {v.verified && <span className="inline-flex rounded-md bg-[#D9F0E7] px-2.5 py-0.5 text-xs font-semibold text-[#0E6D49]">Verified</span>}
                    {v.review_count > 0 && <span className="inline-flex rounded-md bg-[#FFEADA] px-2.5 py-0.5 text-xs font-semibold text-[#AD5312]">★ {v.rating} ({v.review_count})</span>}
                  </div>
                  <h3 className="m-0 text-lg font-bold leading-snug tracking-[-0.01em]"><bdi>{v.business_name}</bdi></h3>
                  <p className="m-0 flex items-center gap-1.5 text-sm text-muted"><Icon d={I.pin} size={16} /><bdi>{v.city}</bdi> · {catName(v.category_id)}</p>
                  <Link href={`/vendors/${v.id}`} className="mt-auto inline-flex min-h-9 items-center gap-1.5 text-[15px] font-semibold text-cobalt hover:text-cobalt-dark">View profile <Icon d={I.arrow} size={16} /></Link>
                </div>
              </article>
            );
          })}
        </div>

        {list.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-sand px-6 py-12 text-center">
            <p className="m-0 text-lg font-semibold">No vendors match that yet.</p>
            <p className="m-0 text-[15px] text-muted">{hasFilter ? "Try another category, or clear your search to see everyone." : "Vendors are joining now. Check back soon, or list your own business."}</p>
            {hasFilter
              ? <button type="button" onClick={clearFilters} className="min-h-11 cursor-pointer rounded-[10px] bg-cobalt px-5 font-semibold text-white hover:bg-cobalt-dark">Show all vendors</button>
              : <Link href={listUrl} className="inline-flex min-h-11 items-center rounded-[10px] bg-cobalt px-5 font-semibold text-white hover:bg-cobalt-dark">List your business</Link>}
          </div>
        )}
      </section>

      {/* PLAN IT: event checklist */}
      <section id="plan" className="bg-sand">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-12 px-6 py-[88px]">
          <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-6">
            <div className="flex flex-col gap-4">
              <span className="text-xs font-semibold uppercase tracking-[.12em] text-cobalt-dark">Plan any event</span>
              <h2 className="m-0 text-[clamp(32px,4.4vw,44px)] font-bold leading-[1.08] tracking-[-0.025em]">Plan it. Find it.<br />Celebrate it.</h2>
              <p className="m-0 max-w-[460px] text-[17px] text-muted">Birthdays, launches, graduations, dinners and more. Answer three quick questions and Glimsey builds your vendor team. Tap any tile to add or remove it.</p>
            </div>
            {[
              { n: 1, id: "q-occ", label: "What's the occasion?", opts: EVENTS, val: occ, pick: (id: string) => { setOcc(id); setPicks({}); } },
              { n: 2, id: "q-guests", label: "How many guests?", opts: GUESTS, val: guests, pick: setGuests },
              { n: 3, id: "q-place", label: "Where will it be?", opts: PLACES, val: place, pick: setPlace },
            ].map((g) => (
              <div key={g.id} role="group" aria-labelledby={g.id} className="flex flex-col gap-2.5">
                <span id={g.id} className="flex items-center gap-2.5 font-semibold"><span aria-hidden="true" className={STEP}>{g.n}</span>{g.label}</span>
                <div className="flex flex-wrap gap-2">
                  {g.opts.map((o) => (
                    <button key={o.id} type="button" aria-pressed={g.val === o.id} onClick={() => g.pick(o.id)} className={ask(g.val === o.id)}>{o.label}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5 rounded-3xl border border-line bg-white p-7">
            <div className="flex flex-col gap-1">
              <h3 className="m-0 text-[22px] font-semibold leading-snug tracking-[-0.01em]">Your {occLower} vendor team</h3>
              <p aria-live="polite" className="m-0 text-sm text-muted">
                {n === 1 ? "1 vendor type" : `${n} vendor types`} · {GUESTS.find((o) => o.id === guests)!.label} guests · {PLACES.find((o) => o.id === place)!.label}
              </p>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {categories.map((c) => {
                const f = famOf(c.id), on = inTeam(c.id), sug = sugg.includes(c.id);
                return (
                  <button key={c.id} type="button" aria-pressed={on} onClick={() => setPicks({ ...picks, [c.id]: !on })}
                    className="g-chip flex min-h-[132px] cursor-pointer flex-col items-start gap-2 rounded-2xl p-3.5 text-left text-ink"
                    style={on ? { background: f.t50, border: `1.5px solid ${f.solid}` } : { background: "#fff", border: "1.5px dashed #B8B5AE" }}>
                    <span aria-hidden="true" className="flex size-10 items-center justify-center"
                      style={{ borderRadius: CAT_STYLE[c.id]?.fam === "jade" ? 10 : f.radius, ...(on ? { background: f.solid, color: f.on } : { background: "#F3F2EE", color: "#6B6862" }) }}>
                      <Icon d={CAT_STYLE[c.id]?.icon ?? I.image} />
                    </span>
                    <span className="text-[15px] font-semibold leading-tight">{c.name_en}</span>
                    <span className="mt-auto text-xs font-semibold" style={{ color: on ? f.t700 : "#6B6862" }}>{on ? "On your team" : sug ? "Suggested · tap to add" : "Tap to add"}</span>
                  </button>
                );
              })}
            </div>
            {n === 0 && <p className="m-0 rounded-xl bg-sand px-4 py-3.5 text-[15px] text-[#5C5A55]">Your team is empty. Tap a tile to add a vendor type.</p>}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <a href="#popular" onClick={() => { setCat("team"); setQ(""); }} className="inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-cobalt px-[22px] font-semibold text-white hover:bg-cobalt-dark">Find these vendors <Icon d={I.arrow} size={18} /></a>
              {Object.keys(picks).length > 0 && (
                <button type="button" onClick={() => setPicks({})} className="min-h-12 cursor-pointer rounded-[10px] border-[1.5px] border-ink bg-white px-[18px] text-[15px] font-semibold hover:bg-sand">Back to suggestions</button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FOR VENDORS */}
      <section id="vendors" className="relative overflow-hidden bg-cobalt text-white">
        <span aria-hidden="true" className="absolute -right-[120px] -top-[120px] size-[420px] rounded-bl-full bg-[#4C66FF]" />
        <span aria-hidden="true" className="absolute -bottom-[140px] -left-[100px] size-80 rounded-t-full bg-[#4C66FF]" />
        <div className="relative mx-auto flex max-w-[1200px] flex-col gap-10 px-6 py-24">
          <div className="flex flex-wrap items-end gap-x-16 gap-y-8">
            <div className="flex flex-[1_1_460px] flex-col gap-4">
              <span className="text-xs font-semibold uppercase tracking-[.12em] text-[#DDE2FF]">For vendors</span>
              <h2 className="m-0 text-[clamp(32px,4.4vw,44px)] font-bold leading-[1.08] tracking-[-0.025em]">List your business in a few minutes.</h2>
              <p className="m-0 max-w-[520px] text-[17px] text-[#DDE2FF]">Glimsey puts your work in front of people who are already planning an event. Try it below and watch your listing come together.</p>
            </div>
            <ol className="m-0 grid flex-[1_1_360px] list-none grid-cols-3 gap-4 p-0">
              {["Choose a category", "Add your details and work", "Get contacted directly"].map((t, i) => (
                <li key={t} className="flex flex-col gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-white text-sm font-bold text-cobalt">{i + 1}</span>
                  <span className="text-[15px] font-semibold leading-snug">{t}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-wrap gap-10 rounded-3xl bg-white p-8 text-ink shadow-[0_24px_48px_rgba(14,24,82,.25)]">
            <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-[18px]">
              <label className="flex flex-col gap-1.5 text-[15px] font-semibold">Business name
                <input type="text" value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="e.g. Noor Florals" className="min-h-12 rounded-[10px] border-[1.5px] border-line bg-white px-3.5 text-base font-normal placeholder:text-muted" />
              </label>
              <label className="flex flex-col gap-1.5 text-[15px] font-semibold">Area in Riyadh
                <input type="text" value={bizArea} onChange={(e) => setBizArea(e.target.value)} placeholder="e.g. Al Olaya" className="min-h-12 rounded-[10px] border-[1.5px] border-line bg-white px-3.5 text-base font-normal placeholder:text-muted" />
              </label>
              <div role="group" aria-label="Category" className="flex flex-col gap-2">
                <span className="text-[15px] font-semibold">Category</span>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => {
                    const sel = bizCat === c.id, b = bubble(c.id, sel);
                    return (
                      <button key={c.id} type="button" aria-pressed={sel} onClick={() => setBizCat(c.id)} className={pill(sel)}>
                        <span aria-hidden="true" {...b}><Icon d={CAT_STYLE[c.id]?.icon ?? I.image} size={16} /></span>
                        {c.name_en}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link href={listUrl} className="inline-flex min-h-12 items-center rounded-[10px] bg-tangerine px-6 font-semibold transition-colors hover:bg-[#D96816]">List your business</Link>
                <span className="text-sm text-muted">Takes a few minutes. You can add photos next.</span>
              </div>
            </div>

            <div className="flex min-w-0 max-w-[380px] flex-[1_1_300px] flex-col gap-3 rounded-[20px] bg-sand p-5">
              <span className="text-xs font-semibold uppercase tracking-[.12em] text-[#5C5A55]">Live preview</span>
              <article aria-live="polite" className="overflow-hidden rounded-2xl border border-line bg-white">
                <CardTop catId={bizCat} />
                <div className="flex flex-col gap-2 px-[18px] pb-[18px] pt-4">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex rounded-md px-2.5 py-0.5 text-xs font-semibold" style={famTag(bizCat)}>{famOf(bizCat).label}</span>
                    <span className="inline-flex rounded-md bg-[#FFE8F3] px-2.5 py-0.5 text-xs font-semibold text-[#AD4B7B]">New</span>
                  </div>
                  <h3 className="m-0 text-xl font-bold leading-snug tracking-[-0.01em]">{bizName.trim() || "Your business name"}</h3>
                  <p className="m-0 flex items-center gap-1.5 text-sm text-muted"><Icon d={I.pin} size={16} />{bizArea.trim() || "Your area"}, Riyadh · {catName(bizCat)}</p>
                  <span className="mt-1 flex min-h-11 items-center justify-center rounded-[10px] bg-cobalt text-[15px] font-semibold text-white">Contact vendor</span>
                </div>
              </article>
              <span className="text-[13px] text-[#5C5A55]">This is how people planning an event will see you.</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-ink text-[#F5F5F0]">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-12 px-6 pb-8 pt-16">
          <div className="flex flex-wrap justify-between gap-x-16 gap-y-10">
            <div className="flex flex-[1_1_320px] flex-col gap-[18px]">
              <div className="flex items-center gap-2"><Logo size={40} dark /><span className="text-[27px] font-bold leading-none tracking-[-0.035em]">glimsey</span></div>
              <p className="m-0 text-[22px] font-bold leading-tight tracking-[-0.02em]">Every event vendor. One place.</p>
              <p lang="ar" dir="rtl" className="m-0 text-left text-[22px] font-semibold leading-[1.7] text-[#A8A6A0]">كل مزوّدي الفعاليات في مكان واحد</p>
            </div>
            <div className="flex flex-wrap gap-x-16 gap-y-8 text-[15px]">
              {[
                { h: "Explore", links: [["Categories", "#popular"], ["Popular this week", "#popular"], ["Plan an event", "#plan"], ["Request quotes", "/requests/new"]] },
                { h: "Vendors", links: [["List your business", listUrl], ["Vendor sign in", "/login"]] },
                { h: "Glimsey", links: [["All vendors", "/vendors"], ["العربية", "/vendors"]] },
              ].map((col) => (
                <div key={col.h} className="flex flex-col gap-2.5">
                  <span className="text-xs font-semibold uppercase tracking-[.12em] text-[#A8A6A0]">{col.h}</span>
                  {col.links.map(([label, href]) => <Link key={label} href={href} className="text-[#F5F5F0] hover:underline">{label}</Link>)}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap justify-between gap-3 border-t border-[#2E2E33] pt-6 text-[13px] text-[#A8A6A0]">
            <span>© 2026 Glimsey · Riyadh</span>
            <span>glimsey.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
