import { test } from "node:test";
import assert from "node:assert/strict";
import { safePath } from "./constants.ts";

test("safePath keeps same-site paths and blocks other sites", () => {
  assert.equal(safePath("/vendors/1?x=1"), "/vendors/1?x=1");
  for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "", null, undefined, "evil.com"]) assert.equal(safePath(bad), "/");
});
