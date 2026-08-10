import type { AppState } from "../types";

export const PROPERTY_POPUP_IDENTITIES = [
  "compactStrokeStyles",
  "compactArrowProperties",
  "compactTextProperties",
  "compactOtherProperties",
] as const;

export type PropertyPopupIdentity = typeof PROPERTY_POPUP_IDENTITIES[number];

export type PropertyPopupOwnerClaim = symbol;

const currentOwnerClaims = new Map<
  PropertyPopupIdentity,
  PropertyPopupOwnerClaim
>();

export const createPropertyPopupOwnerClaim = (): PropertyPopupOwnerClaim =>
  Symbol("property-popup-owner");

export const claimPropertyPopupOwnership = (
  identity: PropertyPopupIdentity,
  claim: PropertyPopupOwnerClaim,
) => {
  currentOwnerClaims.set(identity, claim);
};

export const isCurrentPropertyPopupOwner = (
  identity: PropertyPopupIdentity,
  claim: PropertyPopupOwnerClaim,
) => currentOwnerClaims.get(identity) === claim;

export const releasePropertyPopupOwnership = (
  identity: PropertyPopupIdentity,
  claim: PropertyPopupOwnerClaim,
) => {
  if (isCurrentPropertyPopupOwner(identity, claim)) {
    currentOwnerClaims.delete(identity);
  }
};

export const isOwnedPropertyPopup = (
  popup: AppState["openPopup"],
): popup is PropertyPopupIdentity =>
  PROPERTY_POPUP_IDENTITIES.includes(popup as PropertyPopupIdentity);

export const getPropertyPopupTransition = (
  current: AppState["openPopup"],
  identity: PropertyPopupIdentity,
  open: boolean,
): AppState["openPopup"] =>
  open ? identity : current === identity ? null : current;

export const shouldClearOwnedPropertyPopup = (
  current: AppState["openPopup"],
  owned: PropertyPopupIdentity,
  claim: PropertyPopupOwnerClaim,
) => current === owned && isCurrentPropertyPopupOwner(owned, claim);
