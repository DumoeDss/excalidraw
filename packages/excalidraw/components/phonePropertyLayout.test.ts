import { planPhonePropertyLayout } from "./phonePropertyLayout";

const candidates = [
  { id: "stroke", width: 44 },
  { id: "fill", width: 44 },
  { id: "combined", width: 44, required: true },
  { id: "undo", width: 44, required: true },
  { id: "redo", width: 44, required: true },
  { id: "duplicate", width: 44 },
  { id: "delete", width: 44 },
] as const;

describe("phone property planning", () => {
  it("keeps an exact fit and combines the next trailing item at one pixel less", () => {
    const exact = 7 * 44 + 6 * 6 + 16;

    expect(
      planPhonePropertyLayout({
        candidates,
        availableWidth: exact,
        gap: 6,
        paddingInline: 16,
      }),
    ).toEqual({
      directIds: candidates.map((candidate) => candidate.id),
      combinedIds: [],
    });
    expect(
      planPhonePropertyLayout({
        candidates,
        availableWidth: exact - 1,
        gap: 6,
        paddingInline: 16,
      }),
    ).toEqual({
      directIds: ["stroke", "fill", "combined", "undo", "redo", "duplicate"],
      combinedIds: ["delete"],
    });
  });

  it("preserves stable order and the combined entry as width shrinks", () => {
    const plan = planPhonePropertyLayout({
      candidates,
      availableWidth: 230,
      gap: 6,
      paddingInline: 16,
    });

    expect(plan.directIds).toEqual(["combined", "undo", "redo"]);
    expect(plan.combinedIds).toEqual(["stroke", "fill", "duplicate", "delete"]);
  });

  it.each([0, -1])("uses a deterministic fallback at width %s", (width) => {
    expect(
      planPhonePropertyLayout({
        candidates,
        availableWidth: width,
        gap: 6,
        paddingInline: 16,
      }),
    ).toEqual({
      directIds: ["combined", "undo", "redo"],
      combinedIds: ["stroke", "fill", "duplicate", "delete"],
    });
  });
});
