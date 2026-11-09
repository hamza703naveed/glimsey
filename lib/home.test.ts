import { test } from "node:test";
import assert from "node:assert/strict";
import { EVENTS, CAT_STYLE, suggest } from "./home.ts";

const dinner = EVENTS.find((e) => e.id === "dinner")!;
const corporate = EVENTS.find((e) => e.id === "corporate")!;

test("small events drop AV and planners", () => assert.deepEqual(suggest(corporate, "s", "in"), [1, 4, 7]));
test("large outdoor events add catering, planner, AV, security, tents", () =>
  assert.deepEqual(suggest(dinner, "l", "out"), [1, 4, 2, 5, 9, 12, 3]));
test("every event category exists", () => EVENTS.forEach((e) => e.cats.forEach((c) => assert.ok(CAT_STYLE[c]))));
