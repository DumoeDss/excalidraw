type ModalClaim = {
  logicalId: string;
  token: symbol;
  portal: HTMLElement;
  returnTarget: HTMLElement | null;
};

type IsolationSnapshot = {
  inert: boolean;
  ariaHidden: string | null;
};

type EditorModalState = {
  claims: ModalClaim[];
  isolation: Map<HTMLElement, IsolationSnapshot>;
  overflow: string;
  observer: MutationObserver | null;
};

const modalStates = new WeakMap<HTMLElement, EditorModalState>();
const modalChangeListeners = new WeakMap<HTMLElement, Set<() => void>>();

const notifyModalChange = (editor: HTMLElement) => {
  modalChangeListeners.get(editor)?.forEach((listener) => listener());
};

export const subscribeToModalChanges = (
  editor: HTMLElement,
  listener: () => void,
) => {
  let listeners = modalChangeListeners.get(editor);
  if (!listeners) {
    listeners = new Set();
    modalChangeListeners.set(editor, listeners);
  }
  listeners.add(listener);
  return () => {
    listeners?.delete(listener);
    if (listeners?.size === 0) {
      modalChangeListeners.delete(editor);
    }
  };
};

const restoreNode = (node: HTMLElement, snapshot: IsolationSnapshot) => {
  node.inert = snapshot.inert;
  if (snapshot.ariaHidden === null) {
    node.removeAttribute("aria-hidden");
  } else {
    node.setAttribute("aria-hidden", snapshot.ariaHidden);
  }
};

const updateIsolation = (editor: HTMLElement, state: EditorModalState) => {
  const topPortal = state.claims.at(-1)?.portal ?? null;
  for (const node of Array.from(editor.children)) {
    if (!(node instanceof HTMLElement)) {
      continue;
    }
    if (!state.isolation.has(node)) {
      state.isolation.set(node, {
        inert: !!node.inert,
        ariaHidden: node.getAttribute("aria-hidden"),
      });
    }
    const snapshot = state.isolation.get(node)!;
    if (
      node === topPortal ||
      node.classList.contains("excalidraw-tooltip-portal")
    ) {
      restoreNode(node, snapshot);
    } else {
      node.inert = true;
      node.setAttribute("aria-hidden", "true");
    }
  }
};

const restoreEditor = (editor: HTMLElement, state: EditorModalState) => {
  for (const [node, snapshot] of state.isolation) {
    if (node.isConnected) {
      restoreNode(node, snapshot);
    }
  }
  state.isolation.clear();
  state.observer?.disconnect();
  state.observer = null;
  editor.style.overflow = state.overflow;
  editor.removeAttribute("data-modal-open");
};

const isUsableFocusTarget = (target: HTMLElement | null) =>
  !!target &&
  target.isConnected &&
  !target.closest("[inert]") &&
  target.getClientRects().length > 0;

export const claimModal = ({
  editor,
  logicalId,
  portal,
  returnTarget,
}: {
  editor: HTMLElement;
  logicalId: string;
  portal: HTMLElement;
  returnTarget: HTMLElement | null;
}) => {
  const token = Symbol(logicalId);
  let state = modalStates.get(editor);
  if (!state) {
    state = {
      claims: [],
      isolation: new Map(),
      overflow: editor.style.overflow,
      observer: null,
    };
    modalStates.set(editor, state);
    state.observer = new MutationObserver(() =>
      updateIsolation(editor, state!),
    );
    state.observer.observe(editor, { childList: true });
    editor.style.overflow = "hidden";
    editor.setAttribute("data-modal-open", "true");
  }

  const replacement = state.claims.find(
    (claim) => claim.logicalId === logicalId,
  );
  if (replacement) {
    replacement.token = token;
    replacement.portal = portal;
  } else {
    state.claims.push({ logicalId, token, portal, returnTarget });
  }
  updateIsolation(editor, state);
  notifyModalChange(editor);

  return token;
};

export const isTopModalClaim = (editor: HTMLElement, token: symbol | null) =>
  modalStates.get(editor)?.claims.at(-1)?.token === token;

export const releaseModal = ({
  editor,
  token,
}: {
  editor: HTMLElement;
  token: symbol;
}) => {
  queueMicrotask(() => {
    const state = modalStates.get(editor);
    if (!state) {
      return;
    }
    const index = state.claims.findIndex((claim) => claim.token === token);
    if (index < 0) {
      return;
    }
    const [claim] = state.claims.splice(index, 1);
    if (state.claims.length > 0) {
      updateIsolation(editor, state);
    } else {
      restoreEditor(editor, state);
      modalStates.delete(editor);
    }
    notifyModalChange(editor);

    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      active.isConnected &&
      state.claims.some((entry) => entry.portal.contains(active))
    ) {
      return;
    }
    const remainingPortal = state.claims.at(-1)?.portal ?? null;
    const remainingModalTarget =
      remainingPortal?.querySelector<HTMLElement>(
        "[data-autofocus], button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1']), [role='dialog']",
      ) ?? remainingPortal;
    const fallback = isUsableFocusTarget(claim.returnTarget)
      ? claim.returnTarget
      : remainingModalTarget ?? editor;
    fallback?.focus({ preventScroll: true });
  });
};

export const getModalClaimCount = (editor: HTMLElement) =>
  modalStates.get(editor)?.claims.length ?? 0;
