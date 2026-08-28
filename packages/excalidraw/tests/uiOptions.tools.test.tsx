import { fireEvent, queryByTestId } from "@testing-library/react";

import { Excalidraw } from "../index";

import { render } from "./test-utils";

const openUploadTools = (container: HTMLElement) => {
  const uploadGroup = queryByTestId(container, "toolbar-upload-group");
  if (uploadGroup) {
    fireEvent.click(uploadGroup);
    return;
  }

  fireEvent.click(queryByTestId(container, "toolbar-overflow-trigger")!);
};

describe("UIOptions.tools media uploads", () => {
  it("hides disabled video and audio upload tools", async () => {
    const { container } = await render(
      <Excalidraw
        UIOptions={{
          tools: { image: true, video: false, audio: false },
        }}
      />,
    );

    openUploadTools(container);

    expect(queryByTestId(container, "toolbar-image")).not.toBeNull();
    expect(queryByTestId(container, "toolbar-video")).toBeNull();
    expect(queryByTestId(container, "toolbar-audio")).toBeNull();
  });

  it("shows explicitly enabled video and audio upload tools", async () => {
    const { container } = await render(
      <Excalidraw
        UIOptions={{
          tools: { image: true, video: true, audio: true },
        }}
      />,
    );

    openUploadTools(container);

    expect(queryByTestId(container, "toolbar-video")).not.toBeNull();
    expect(queryByTestId(container, "toolbar-audio")).not.toBeNull();
  });

  it("shows video and audio upload tools by default", async () => {
    const { container } = await render(<Excalidraw />);

    openUploadTools(container);

    expect(queryByTestId(container, "toolbar-video")).not.toBeNull();
    expect(queryByTestId(container, "toolbar-audio")).not.toBeNull();
  });
});
