export type RestoreFailure = { label: string; error: string };

export class RestoreStack {
  private entries: { label: string; restore: () => void | Promise<void> }[] =
    [];
  private registeredEntries = 0;

  push(label: string, restore: () => void | Promise<void>) {
    this.entries.push({ label, restore });
    this.registeredEntries += 1;
  }

  hasRegisteredEntries() {
    return this.registeredEntries > 0;
  }

  async restore(): Promise<RestoreFailure[]> {
    const failures: RestoreFailure[] = [];
    while (this.entries.length) {
      const entry = this.entries.pop()!;
      try {
        await entry.restore();
      } catch (error) {
        failures.push({
          label: entry.label,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return failures;
  }
}

type LifecycleOptions<T> = {
  setup: (stack: RestoreStack) => Promise<void>;
  run: (stack: RestoreStack) => Promise<T>;
  verifyRestored?: () => Promise<void>;
  close: () => Promise<unknown>;
  enumerate: () => Promise<unknown>;
};

type LifecycleResult<T> = {
  value: T | undefined;
  primaryError: unknown;
  cleanupFailures: RestoreFailure[];
  restorationVerificationAttempted: boolean;
  closeSucceeded: boolean;
  closeObservation: unknown;
  enumerationSucceeded: boolean;
  enumerationObservation: unknown;
};

export const runWithLifecycle = async <T>({
  setup,
  run,
  verifyRestored,
  close,
  enumerate,
}: LifecycleOptions<T>): Promise<LifecycleResult<T>> => {
  const stack = new RestoreStack();
  let value: T | undefined;
  let primaryError: unknown;
  let closeObservation: unknown;
  let enumerationObservation: unknown;
  let restorationVerificationAttempted = false;
  let closeSucceeded = false;
  let enumerationSucceeded = false;
  try {
    await setup(stack);
    value = await run(stack);
  } catch (error) {
    primaryError = error;
  }
  const cleanupFailures = await stack.restore();
  if (verifyRestored && stack.hasRegisteredEntries()) {
    restorationVerificationAttempted = true;
    try {
      await verifyRestored();
    } catch (error) {
      cleanupFailures.push({
        label: "post-restore-verification",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  try {
    closeObservation = await close();
    closeSucceeded = true;
  } catch (error) {
    cleanupFailures.push({
      label: "target-close",
      error: error instanceof Error ? error.message : String(error),
    });
  }
  try {
    enumerationObservation = await enumerate();
    enumerationSucceeded = true;
  } catch (error) {
    cleanupFailures.push({
      label: "target-enumeration",
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return {
    value,
    primaryError,
    cleanupFailures,
    restorationVerificationAttempted,
    closeSucceeded,
    closeObservation,
    enumerationSucceeded,
    enumerationObservation,
  };
};

export const runWithLifecycleAndPublish = async <T>({
  publish,
  ...lifecycle
}: LifecycleOptions<T> & {
  publish: (result: LifecycleResult<T>) => Promise<void>;
}) => {
  const result = await runWithLifecycle(lifecycle);
  await publish(result);
  return result;
};
