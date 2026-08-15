import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { EditorJotaiProvider } from "@excalidraw/excalidraw/editor-jotai";

import { ActiveRoomDialog, ShareDialogPicker } from "./ShareDialog";

vi.mock("./QRCode", () => ({ QRCode: () => <div data-testid="qr-code" /> }));

const collabAPI = {
  getUsername: vi.fn(() => "Ada"),
  setUsername: vi.fn(),
  startCollaboration: vi.fn(),
  stopCollaboration: vi.fn(),
  isCollaborating: vi.fn(() => false),
  setCollabError: vi.fn(),
};

const renderDialog = (dialog: React.ReactNode) =>
  render(<EditorJotaiProvider>{dialog}</EditorJotaiProvider>);

describe("ShareDialog app-content adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps collaboration-only actions and hides export actions", () => {
    renderDialog(
      <ShareDialogPicker
        collabAPI={collabAPI as never}
        handleClose={vi.fn()}
        onExportToBackend={vi.fn()}
        type="collaborationOnly"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start session/i }));
    expect(collabAPI.startCollaboration).toHaveBeenCalledWith(null);
    expect(
      screen.queryByRole("button", { name: /export/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: /actions/i })).toBeInTheDocument();
  });

  it("keeps share export callback and close ordering", async () => {
    const onExportToBackend = vi.fn(async () => {});
    const handleClose = vi.fn();

    renderDialog(
      <ShareDialogPicker
        collabAPI={collabAPI as never}
        handleClose={handleClose}
        onExportToBackend={onExportToBackend}
        type="share"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    await waitFor(() => expect(onExportToBackend).toHaveBeenCalledTimes(1));
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("group", { name: /actions/i })).toHaveLength(2);
  });

  it("preserves active-room fields, QR content, and stop flow", () => {
    const handleClose = vi.fn();

    renderDialog(
      <ActiveRoomDialog
        activeRoomLink="https://example.test/room"
        collabAPI={collabAPI as never}
        handleClose={handleClose}
      />,
    );

    expect(screen.getByPlaceholderText("Your name")).toHaveValue("Ada");
    expect(
      screen
        .getAllByRole("textbox")
        .find((input) => input.hasAttribute("readonly")),
    ).toHaveValue("https://example.test/room");
    expect(screen.getByTestId("qr-code")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /stop session/i }));
    expect(collabAPI.stopCollaboration).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
