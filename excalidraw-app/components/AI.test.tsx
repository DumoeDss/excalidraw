import { render, screen } from "@testing-library/react";

import { AIComponents } from "./AI";

const state = vi.hoisted(() => ({
  dialogProps: null as null | Record<string, unknown>,
  streamFetch: vi.fn(async () => ({ rateLimits: null })),
}));
const persistenceAdapter = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
}));

vi.mock("@excalidraw/excalidraw", () => ({
  DiagramToCodePlugin: () => <div data-testid="diagram-to-code-plugin" />,
  TTDDialog: (props: Record<string, unknown>) => {
    state.dialogProps = props;
    return <div data-testid="host-ttd-dialog" />;
  },
  TTDStreamFetch: state.streamFetch,
  exportToBlob: vi.fn(),
  getNonDeletedElements: (elements: unknown[]) => elements,
  getTextFromElements: vi.fn(() => ""),
  MIME_TYPES: { jpg: "image/jpeg" },
}));
vi.mock("../data/TTDStorage", () => ({
  TTDIndexedDBAdapter: persistenceAdapter,
}));

describe("AIComponents host adapter", () => {
  beforeEach(() => {
    state.dialogProps = null;
    state.streamFetch.mockClear();
  });

  it("passes persistence through and keeps submission at the host owner", async () => {
    render(
      <AIComponents
        excalidrawAPI={
          {
            getAppState: vi.fn(() => ({})),
            getFiles: vi.fn(() => ({})),
          } as never
        }
      />,
    );

    expect(screen.getByTestId("diagram-to-code-plugin")).toBeInTheDocument();
    expect(screen.getByTestId("host-ttd-dialog")).toBeInTheDocument();
    expect(state.dialogProps?.persistenceAdapter).toBe(persistenceAdapter);

    const onTextSubmit = state.dialogProps?.onTextSubmit as (props: {
      messages: unknown[];
      onChunk: () => void;
      onStreamCreated: () => void;
      signal: AbortSignal;
    }) => Promise<unknown>;
    const props = {
      messages: [],
      onChunk: vi.fn(),
      onStreamCreated: vi.fn(),
      signal: new AbortController().signal,
    };
    await onTextSubmit(props);

    expect(state.streamFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: props.messages,
        onChunk: props.onChunk,
        onStreamCreated: props.onStreamCreated,
        signal: props.signal,
        extractRateLimits: true,
      }),
    );
  });
});
