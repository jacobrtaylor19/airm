import { describe, it, expect } from "vitest";
import { scrubString, scrubNullableString, scrubJson } from "@/lib/integration/pii-scrub";

describe("scrubString", () => {
  it("redacts a single email and reports a match", () => {
    const r = scrubString("Contact alice.smith+filter@example.com for details");
    expect(r.value).toBe("Contact <redacted-email> for details");
    expect(r.hadMatch).toBe(true);
  });

  it("redacts multiple emails", () => {
    const r = scrubString("a@b.co and c@d.co both reported it");
    expect(r.value).toBe("<redacted-email> and <redacted-email> both reported it");
    expect(r.hadMatch).toBe(true);
  });

  it("redacts a NANP phone number with parens and dashes", () => {
    const r = scrubString("Call (415) 555-1234 today");
    expect(r.value).toBe("Call <redacted-phone> today");
    expect(r.hadMatch).toBe(true);
  });

  it("redacts a +1 phone number", () => {
    const r = scrubString("ring +1 415 555 1234 please");
    expect(r.value).toContain("<redacted-phone>");
    expect(r.hadMatch).toBe(true);
  });

  it("leaves clean text alone and reports no match", () => {
    const r = scrubString("ECONNRESET reading source role permissions");
    expect(r.value).toBe("ECONNRESET reading source role permissions");
    expect(r.hadMatch).toBe(false);
  });

  it("does not match obvious non-NANP digit runs (4-digit ID)", () => {
    const r = scrubString("Job 1843 failed");
    expect(r.hadMatch).toBe(false);
  });
});

describe("scrubNullableString", () => {
  it("returns null untouched", () => {
    const r = scrubNullableString(null);
    expect(r.value).toBeNull();
    expect(r.hadMatch).toBe(false);
  });

  it("scrubs non-null", () => {
    const r = scrubNullableString("a@b.co");
    expect(r.value).toBe("<redacted-email>");
    expect(r.hadMatch).toBe(true);
  });
});

describe("scrubJson", () => {
  it("scrubs strings nested in objects", () => {
    const r = scrubJson({ reportedBy: "user@example.com", count: 5 });
    expect(r.value).toEqual({ reportedBy: "<redacted-email>", count: 5 });
    expect(r.hadMatch).toBe(true);
  });

  it("scrubs strings inside arrays", () => {
    const r = scrubJson(["plain", "x@y.co", 7]);
    expect(r.value).toEqual(["plain", "<redacted-email>", 7]);
    expect(r.hadMatch).toBe(true);
  });

  it("walks nested objects + arrays", () => {
    const input = {
      level1: {
        list: [{ contact: "a@b.co" }, { ok: "no pii" }],
        clean: 42,
      },
    };
    const r = scrubJson(input);
    expect(r.value).toEqual({
      level1: {
        list: [{ contact: "<redacted-email>" }, { ok: "no pii" }],
        clean: 42,
      },
    });
    expect(r.hadMatch).toBe(true);
  });

  it("returns null/undefined unchanged", () => {
    expect(scrubJson(null).value).toBeNull();
    expect(scrubJson(undefined).value).toBeUndefined();
    expect(scrubJson(null).hadMatch).toBe(false);
  });

  it("reports no match on a clean object", () => {
    const r = scrubJson({ jobId: 1843, status: "ok" });
    expect(r.hadMatch).toBe(false);
  });
});
