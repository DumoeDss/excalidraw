import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { useExcalidrawContainer } from "./App";
import { CloseIcon } from "./icons";
import { IconButton } from "./IconButton";

import "./Toast.scss";

import type { CSSProperties, ReactNode } from "react";

const DEFAULT_TOAST_TIMEOUT = 5000;
const BOTTOM_RESERVATION_SELECTOR =
  '[data-viewport-ui="bottom"], [data-toast-reservation="bottom"]';

export const getToastBottomReservation = (editor: HTMLElement) => {
  const editorRect = editor.getBoundingClientRect();
  const ownerWindow = editor.ownerDocument.defaultView;
  let reservationTop: number | null = null;

  for (const node of editor.querySelectorAll<HTMLElement>(
    BOTTOM_RESERVATION_SELECTOR,
  )) {
    const rect = node.getBoundingClientRect();
    const styles = ownerWindow?.getComputedStyle(node);
    if (
      styles?.display === "none" ||
      styles?.visibility === "hidden" ||
      rect.width <= 0 ||
      rect.height <= 0 ||
      rect.bottom <= editorRect.top ||
      rect.top >= editorRect.bottom
    ) {
      continue;
    }
    reservationTop =
      reservationTop === null ? rect.top : Math.min(reservationTop, rect.top);
  }

  return reservationTop === null
    ? 0
    : Math.max(0, editorRect.bottom - reservationTop);
};

const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="Toast__progress-bar">
    <div
      className="Toast__progress-bar-fill"
      style={{
        width: `${Math.min(100, Math.max(0, Math.round(progress * 100)))}%`,
      }}
    />
  </div>
);

export type ToastInput = {
  message: ReactNode;
  closable?: boolean;
  duration?: number;
};

const ToastComponent = ({
  message,
  onClose,
  closable = false,
  duration = DEFAULT_TOAST_TIMEOUT,
  style,
  paused = false,
}: ToastInput & {
  onClose: () => void;
  style?: CSSProperties;
  paused?: boolean;
}) => {
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const remainingRef = useRef(duration);
  const dismissedRef = useRef(false);
  const [locallyPaused, setLocallyPaused] = useState(false);
  const shouldAutoClose = duration !== Infinity;

  const dismiss = useCallback(() => {
    if (dismissedRef.current) {
      return;
    }
    dismissedRef.current = true;
    onClose();
  }, [onClose]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      remainingRef.current = Math.max(
        0,
        remainingRef.current - (performance.now() - startedAtRef.current),
      );
    }
  }, []);

  const scheduleTimeout = useCallback(() => {
    if (!shouldAutoClose || dismissedRef.current || remainingRef.current <= 0) {
      return;
    }
    startedAtRef.current = performance.now();
    timerRef.current = window.setTimeout(dismiss, remainingRef.current);
  }, [dismiss, shouldAutoClose]);

  useEffect(() => {
    remainingRef.current = duration;
    dismissedRef.current = false;
  }, [duration, message]);

  useEffect(() => {
    if (!shouldAutoClose || paused || locallyPaused) {
      clearTimer();
      return;
    }
    scheduleTimeout();
    return clearTimer;
  }, [clearTimer, locallyPaused, paused, scheduleTimeout, shouldAutoClose]);

  return (
    <div
      className="Toast"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      onPointerEnter={() => setLocallyPaused(true)}
      onPointerLeave={() => setLocallyPaused(false)}
      onFocusCapture={() => setLocallyPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setLocallyPaused(false);
        }
      }}
      style={style}
    >
      <div className="Toast__message">{message}</div>
      {closable && (
        <IconButton
          icon={CloseIcon}
          aria-label="close"
          type="icon"
          onClick={dismiss}
          className="close"
        />
      )}
    </div>
  );
};

type ToastEntry = ToastInput & { id: number; key: string };

const getToastKey = (toast: ToastInput) =>
  `${
    typeof toast.message === "string" ? toast.message : String(toast.message)
  }:${toast.closable ?? false}:${toast.duration ?? DEFAULT_TOAST_TIMEOUT}`;

export const ToastRegion = ({
  toast,
  onConsume,
  subscribe,
}: {
  toast: ToastInput | null;
  onConsume: (toast: ToastInput) => void;
  subscribe?: (callback: (toast: ToastInput) => void) => () => void;
}) => {
  const { container: editor } = useExcalidrawContainer();
  const nextIdRef = useRef(1);
  const rootRef = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<ToastEntry[]>([]);
  const [pageHidden, setPageHidden] = useState(
    document.visibilityState === "hidden",
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [bottomReservation, setBottomReservation] = useState(0);

  const enqueue = useCallback((nextToast: ToastInput) => {
    const key = getToastKey(nextToast);
    setEntries((current) => {
      if (current.some((entry) => entry.key === key)) {
        return current;
      }
      return [...current, { ...nextToast, key, id: nextIdRef.current++ }];
    });
  }, []);

  useEffect(() => subscribe?.(enqueue), [enqueue, subscribe]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    enqueue(toast);
    onConsume(toast);
  }, [enqueue, onConsume, toast]);

  useEffect(() => {
    const onVisibilityChange = () =>
      setPageHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useLayoutEffect(() => {
    if (!editor) {
      return;
    }
    const update = () => setModalOpen(editor.hasAttribute("data-modal-open"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(editor, {
      attributes: true,
      attributeFilter: ["data-modal-open"],
    });
    return () => observer.disconnect();
  }, [editor]);

  useLayoutEffect(() => {
    if (!editor) {
      setBottomReservation(0);
      return;
    }

    const observedLeaves = new Set<Element>();
    let resizeObserver: ResizeObserver | null = null;
    const observeLeaves = () => {
      for (const node of editor.querySelectorAll<HTMLElement>(
        BOTTOM_RESERVATION_SELECTOR,
      )) {
        if (!observedLeaves.has(node)) {
          observedLeaves.add(node);
          resizeObserver?.observe(node);
        }
      }
    };
    const update = () => {
      observeLeaves();
      const nextReservation = getToastBottomReservation(editor);
      setBottomReservation((current) =>
        current === nextReservation ? current : nextReservation,
      );
    };

    resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    resizeObserver?.observe(editor);
    update();
    const deferredUpdate = editor.ownerDocument.defaultView?.setTimeout(
      update,
      0,
    );
    const mutationObserver = new MutationObserver(update);
    mutationObserver.observe(editor, {
      attributeFilter: [
        "aria-hidden",
        "class",
        "data-toast-reservation",
        "data-viewport-ui",
        "hidden",
        "style",
      ],
      attributes: true,
      childList: true,
      subtree: true,
    });

    return () => {
      if (deferredUpdate !== undefined) {
        editor.ownerDocument.defaultView?.clearTimeout(deferredUpdate);
      }
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
    };
  }, [editor]);

  const visible = entries.slice(0, 2);
  if (entries.length === 0) {
    return null;
  }

  return (
    <div
      className="ToastRegion"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      ref={rootRef}
      style={
        {
          "--toast-bottom-reservation": `${bottomReservation}px`,
        } as CSSProperties
      }
    >
      {visible.map((entry) => (
        <ToastComponent
          key={entry.id}
          message={entry.message}
          closable={entry.closable}
          duration={entry.duration}
          paused={pageHidden || modalOpen}
          onClose={() => {
            setEntries((current) =>
              current.filter((candidate) => candidate.id !== entry.id),
            );
          }}
        />
      ))}
    </div>
  );
};

export const Toast = Object.assign(ToastComponent, {
  ProgressBar,
  Region: ToastRegion,
});
