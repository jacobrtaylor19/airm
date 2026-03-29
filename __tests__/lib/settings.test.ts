import { describe, it, expect, vi, beforeEach } from "vitest";

// Create chainable mock for db
const mockWhere = vi.fn();
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));
const mockSet = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
const mockValues = vi.fn().mockResolvedValue(undefined);

vi.mock("@/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: vi.fn(() => ({ set: mockSet })),
    insert: vi.fn(() => ({ values: mockValues })),
  },
}));

vi.mock("@/db/schema", () => ({
  systemSettings: {
    key: "key",
    value: "value",
  },
}));

vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((v: string) => `encrypted:${v}`),
  decrypt: vi.fn((v: string) => v.replace("encrypted:", "")),
  isEncrypted: vi.fn((v: string) => v.startsWith("encrypted:")),
  isSensitiveKey: vi.fn(() => false),
}));

import { getSetting, setSetting } from "@/lib/settings";

describe("getSetting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the value when key exists", async () => {
    mockWhere.mockResolvedValueOnce([{ value: "hello" }]);
    const result = await getSetting("project.name");
    expect(result).toBe("hello");
  });

  it("returns null when key does not exist", async () => {
    mockWhere.mockResolvedValueOnce([]);
    const result = await getSetting("nonexistent.key");
    expect(result).toBeNull();
  });

  it("calls db.select with the correct chain", async () => {
    mockWhere.mockResolvedValueOnce([{ value: "test" }]);
    await getSetting("some.key");
    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
  });
});

describe("setSetting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts when key does not exist", async () => {
    // First select (getSetting-like check inside setSetting) returns no row
    mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValueOnce([]),
      })),
    });

    await setSetting("new.key", "new-value");
    expect(mockValues).toHaveBeenCalled();
  });

  it("updates when key already exists", async () => {
    // First select returns existing row
    mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValueOnce([{ key: "existing", value: "old" }]),
      })),
    });

    await setSetting("existing", "updated-value");
    expect(mockSet).toHaveBeenCalled();
  });
});
