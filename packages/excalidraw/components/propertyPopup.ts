import {
  claimFloatingSurfaceOwnership,
  createFloatingSurfaceOwnerClaim,
  isCurrentFloatingSurfaceOwner,
  releaseFloatingSurfaceOwnership,
  shouldCleanupFloatingSurface,
} from "./floatingSurface";

import type { AppState } from "../types";

export const PROPERTY_POPUP_IDENTITIES = [
  "compactStrokeStyles",
  "compactArrowProperties",
  "compactTextProperties",
  "compactOtherProperties",
] as const;

export type PropertyPopupIdentity = typeof PROPERTY_POPUP_IDENTITIES[number];

export type PropertyPopupOwnerClaim = ReturnType<
  typeof createFloatingSurfaceOwnerClaim
>;

const PROPERTY_POPUP_OWNER_SCOPE = "property-popup";

export const createPropertyPopupOwnerClaim = (): PropertyPopupOwnerClaim =>
  createFloatingSurfaceOwnerClaim();

export const claimPropertyPopupOwnership = (
  identity: PropertyPopupIdentity,
  claim: PropertyPopupOwnerClaim,
) => {
  claimFloatingSurfaceOwnership(PROPERTY_POPUP_OWNER_SCOPE, identity, claim);
};

export const isCurrentPropertyPopupOwner = (
  identity: PropertyPopupIdentity,
  claim: PropertyPopupOwnerClaim,
) => isCurrentFloatingSurfaceOwner(PROPERTY_POPUP_OWNER_SCOPE, identity, claim);

export const releasePropertyPopupOwnership = (
  identity: PropertyPopupIdentity,
  claim: PropertyPopupOwnerClaim,
) => {
  releaseFloatingSurfaceOwnership(PROPERTY_POPUP_OWNER_SCOPE, identity, claim);
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
) =>
  shouldCleanupFloatingSurface(
    PROPERTY_POPUP_OWNER_SCOPE,
    current,
    owned,
    claim,
  );
