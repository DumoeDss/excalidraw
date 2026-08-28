import { newVideoElement } from "@excalidraw/element";

import type { ExcalidrawVideoElement } from "@excalidraw/element/types";

export const createNativeVideoFixture = () =>
  newVideoElement({
    x: 80,
    y: 60,
    width: 360,
    height: 204,
    src: "https://media.example.test/video/native-video.mp4",
    poster: "https://media.example.test/posters/native-video.webp",
    status: "saved",
    customData: {
      host: {
        sourceKey: "source-42",
        details: {
          labels: ["native", "video"],
        },
      },
    },
  });

export const getNativeVideoMetadata = (element: ExcalidrawVideoElement) => ({
  type: element.type,
  src: element.src,
  poster: element.poster,
  status: element.status,
  customData: element.customData,
});

export const getNativeVideoSnapshot = (element: ExcalidrawVideoElement) => ({
  ...getNativeVideoMetadata(element),
  x: element.x,
  y: element.y,
  width: element.width,
  height: element.height,
  isDeleted: element.isDeleted,
});
