const presentationClaims = new WeakMap<HTMLElement, symbol>();

export const claimSidebarPresentation = (editor: HTMLElement) => {
  const token = Symbol("sidebar-presentation");
  presentationClaims.set(editor, token);
  return token;
};

export const isSidebarPresentationClaim = (
  editor: HTMLElement,
  token: symbol | null,
) => !!token && presentationClaims.get(editor) === token;

export const releaseSidebarPresentation = (
  editor: HTMLElement,
  token: symbol,
) => {
  if (presentationClaims.get(editor) !== token) {
    return false;
  }
  presentationClaims.delete(editor);
  return true;
};
