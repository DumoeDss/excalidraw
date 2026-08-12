export const createSettleOnce = <Args extends readonly unknown[]>(
  settle: (...args: Args) => void,
) => {
  let settled = false;
  return (...args: Args) => {
    if (settled) {
      return false;
    }
    settled = true;
    settle(...args);
    return true;
  };
};
