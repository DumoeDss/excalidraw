import { vi } from "vitest";

import { createSettleOnce } from "./settleOnce";

describe("settle once", () => {
  it("settles only the first decision", () => {
    const settle = vi.fn();
    const decide = createSettleOnce(settle);

    expect(decide("confirm")).toBe(true);
    expect(decide("cancel")).toBe(false);
    expect(settle).toHaveBeenCalledTimes(1);
    expect(settle).toHaveBeenCalledWith("confirm");
  });
});
