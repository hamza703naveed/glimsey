// Homepage data: the four colour families, how the 12 database categories map onto them, and event → vendor team.
export type FamKey = "cobalt" | "tangerine" | "rose" | "jade";

export const FAM: Record<FamKey, { label: string; hint: string; solid: string; t50: string; t100: string; t200: string; t700: string; on: string; radius: string }> = {
  cobalt: { label: "Venues & planning", hint: "Halls, outdoor spaces, planners", solid: "#2D4BFF", t50: "#EEF1FF", t100: "#DDE2FF", t200: "#BCC5FF", t700: "#1F33AD", on: "#FFFFFF", radius: "100% 0 0 0" },
  tangerine: { label: "Food & drink", hint: "Catering, cakes, sweets", solid: "#FF7A1A", t50: "#FFF4ED", t100: "#FFEADA", t200: "#FFD4B6", t700: "#AD5312", on: "#121212", radius: "50%" },
  rose: { label: "Décor & styling", hint: "Flowers, décor, invitations", solid: "#FF6FB5", t50: "#FFF3F9", t100: "#FFE8F3", t200: "#FFD1E7", t700: "#AD4B7B", on: "#121212", radius: "50% 50% 0 0" },
  jade: { label: "Entertainment & media", hint: "", solid: "#14A06C", t50: "#ECF7F3", t100: "#D9F0E7", t200: "#B4E1D0", t700: "#0E6D49", on: "#121212", radius: "22%" },
};

// Keyed by categories.id in supabase/schema.sql.
export const CAT_STYLE: Record<number, { fam: FamKey; icon: string }> = {
  1: { fam: "cobalt", icon: "M4 20h16M6 20v-9a6 6 0 0 1 12 0v9M10 20v-4a2 2 0 0 1 4 0v4" },
  2: { fam: "rose", icon: "M12 13v8M12 18c-1.5-.2-3-1-4-2.5M8 4l2 2 2-3 2 3 2-2v5a4 4 0 0 1-8 0z" },
  3: { fam: "cobalt", icon: "M3 20h18M5 20l7-15 7 15M12 5v15" },
  4: { fam: "tangerine", icon: "M3 18h18M5 18a7 7 0 0 1 14 0M12 11V8M10 8h4" },
  5: { fam: "cobalt", icon: "M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM8 3v4M16 3v4M4 10h16M9 15l2 2 4-4" },
  6: { fam: "rose", icon: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" },
  7: { fam: "jade", icon: "M6 7h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3zM9 7l1.5-3h3L15 7M8.5 13.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0" },
  8: { fam: "jade", icon: "M4.5 18a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M14.5 16a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M9.5 18V6l10-2v12" },
  9: { fam: "jade", icon: "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM9 14a3 3 0 1 0 6 0a3 3 0 1 0-6 0M11 7.5a1 1 0 1 0 2 0a1 1 0 1 0-2 0" },
  10: { fam: "cobalt", icon: "M3 16V9l2-4h10l4 4h2v7h-2M7 16h8M5.5 16a2 2 0 1 0 0 .01M17.5 16a2 2 0 1 0 0 .01" },
  11: { fam: "rose", icon: "M5 6h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM3 8l9 6 9-6" },
  12: { fam: "cobalt", icon: "M12 3l8 3v6c0 5-3.5 8-8 9c-4.5-1-8-4-8-9V6z" },
};

export const EVENTS = [
  { id: "birthday", label: "Birthday", cats: [1, 4, 2, 7, 8] },
  { id: "corporate", label: "Corporate event", cats: [1, 5, 4, 7, 9] },
  { id: "graduation", label: "Graduation", cats: [1, 4, 7, 9] },
  { id: "launch", label: "Product launch", cats: [1, 5, 4, 11, 7, 9] },
  { id: "eid", label: "Eid gathering", cats: [1, 4, 2, 11] },
  { id: "engagement", label: "Engagement", cats: [1, 4, 2, 6, 7, 8] },
  { id: "wedding", label: "Wedding", cats: [1, 5, 4, 2, 6, 11, 7, 8, 9, 3] },
  { id: "babyshower", label: "Baby shower", cats: [1, 4, 2, 11, 7] },
  { id: "dinner", label: "Private dinner", cats: [1, 4, 2] },
  { id: "other", label: "Something else", cats: [1, 4, 7] },
];
export type EventDef = (typeof EVENTS)[number];
export const HERO_EVENTS = ["birthday", "corporate", "graduation", "launch", "eid", "wedding"];
export const GUESTS = [{ id: "s", label: "Up to 30" }, { id: "m", label: "30–150" }, { id: "l", label: "150+" }];
export const PLACES = [{ id: "in", label: "Indoors" }, { id: "out", label: "Outdoors" }, { id: "tbd", label: "Not sure yet" }];

// Starting mix per occasion; guest count and setting adjust it.
export function suggest(ev: EventDef, guests: string, place: string): number[] {
  let set = [...ev.cats];
  const add = (id: number) => { if (!set.includes(id)) set.push(id); };
  if (guests === "s") set = set.filter((id) => id !== 9 && id !== 5); // no AV crew or planner for small gatherings
  if (guests === "l") { add(4); add(5); add(9); add(12); }
  if (place === "out") { add(9); add(3); } // outdoor events bring their own sound, tents and furniture
  return set;
}
