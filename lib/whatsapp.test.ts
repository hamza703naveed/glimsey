import { test } from "node:test";
import assert from "node:assert/strict";
import { normaliseSaudiMobile } from "./whatsapp.ts";

test("normalises common Saudi mobile formats", () => {
  for (const n of ["0551234567", "551234567", "+966 55 123 4567", "00966551234567", "966551234567"]) {
    assert.equal(normaliseSaudiMobile(n), "966551234567");
  }
});

test("rejects non-mobile numbers", () => {
  for (const n of ["0112345678", "12345", "", "05512345678"]) assert.equal(normaliseSaudiMobile(n), null);
});
