import { useEffect } from "react";

import { isVideoElement } from "@excalidraw/element";

import type { ExcalidrawMediaElement } from "@excalidraw/element/types";

import { CloseIcon } from "./icons";

import "./MediaViewer.scss";

/**
 * Modal "lightbox" player for an audio/video node, opened from the node's
 * bottom-right expand button. Renders the media with full native controls
 * (progress, volume, fullscreen) over a dark backdrop. Closes on the backdrop,
 * the ✕ button, or Escape.
 */
export const MediaViewer = ({
  element,
  onClose,
}: {
  element: ExcalidrawMediaElement;
  onClose: () => void;
}) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  return (
    <div
      className="excalidraw__media-viewer"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="excalidraw__media-viewer__stage">
        <button
          type="button"
          className="excalidraw__media-viewer__close"
          aria-label="Close"
          title="Close"
          onClick={onClose}
        >
          {CloseIcon}
        </button>
        {isVideoElement(element) ? (
          <video
            className="excalidraw__media-viewer__video"
            src={element.src ?? undefined}
            poster={element.poster ?? undefined}
            controls
            autoPlay
            playsInline
          />
        ) : (
          <audio
            className="excalidraw__media-viewer__audio"
            src={element.src ?? undefined}
            controls
            autoPlay
          />
        )}
      </div>
    </div>
  );
};
