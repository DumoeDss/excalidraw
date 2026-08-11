import { useCallback, useEffect, useRef } from "react";

export type FloatingSurfaceOwnerClaim = symbol;

const claimsByScope = new Map<string, Map<string, FloatingSurfaceOwnerClaim>>();

const getScopeClaims = (scope: string) => {
  let claims = claimsByScope.get(scope);
  if (!claims) {
    claims = new Map();
    claimsByScope.set(scope, claims);
  }
  return claims;
};

export const createFloatingSurfaceOwnerClaim = (): FloatingSurfaceOwnerClaim =>
  Symbol("floating-surface-owner");

export const claimFloatingSurfaceOwnership = (
  scope: string,
  identity: string,
  claim: FloatingSurfaceOwnerClaim,
) => {
  getScopeClaims(scope).set(identity, claim);
};

export const isCurrentFloatingSurfaceOwner = (
  scope: string,
  identity: string,
  claim: FloatingSurfaceOwnerClaim,
) => claimsByScope.get(scope)?.get(identity) === claim;

export const releaseFloatingSurfaceOwnership = (
  scope: string,
  identity: string,
  claim: FloatingSurfaceOwnerClaim,
) => {
  const claims = claimsByScope.get(scope);
  if (claims?.get(identity) !== claim) {
    return;
  }
  claims.delete(identity);
  if (!claims.size) {
    claimsByScope.delete(scope);
  }
};

export const shouldCleanupFloatingSurface = (
  scope: string,
  currentIdentity: string | null,
  ownedIdentity: string,
  claim: FloatingSurfaceOwnerClaim,
) =>
  currentIdentity === ownedIdentity &&
  isCurrentFloatingSurfaceOwner(scope, ownedIdentity, claim);

/**
 * Binds an adapter-owned controlled state to the shared claim protocol. It
 * does not create a state store: the adapter remains the state authority.
 */
export const useFloatingSurfaceOwner = ({
  scope,
  identity,
  open,
  eligible = true,
  onOpenChange,
}: {
  scope: string;
  identity: string;
  open: boolean;
  eligible?: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const claimRef = useRef(createFloatingSurfaceOwnerClaim());
  const openRef = useRef(open);
  const onOpenChangeRef = useRef(onOpenChange);
  const scheduledFocusRef = useRef<number | null>(null);
  openRef.current = open;
  onOpenChangeRef.current = onOpenChange;

  const cancelScheduledFocus = useCallback(() => {
    if (scheduledFocusRef.current != null) {
      cancelAnimationFrame(scheduledFocusRef.current);
      scheduledFocusRef.current = null;
    }
  }, []);

  const scheduleFocus = useCallback(
    (focus: () => void) => {
      cancelScheduledFocus();
      const claim = claimRef.current;
      scheduledFocusRef.current = requestAnimationFrame(() => {
        scheduledFocusRef.current = null;
        if (isCurrentFloatingSurfaceOwner(scope, identity, claim)) {
          focus();
        }
      });
    },
    [cancelScheduledFocus, identity, scope],
  );
  const markClosed = useCallback(() => {
    openRef.current = false;
    cancelScheduledFocus();
  }, [cancelScheduledFocus]);

  useEffect(() => {
    if (!open) {
      cancelScheduledFocus();
      return;
    }

    const claim = createFloatingSurfaceOwnerClaim();
    claimRef.current = claim;
    claimFloatingSurfaceOwnership(scope, identity, claim);

    return () => {
      cancelScheduledFocus();
      queueMicrotask(() => {
        if (
          openRef.current &&
          isCurrentFloatingSurfaceOwner(scope, identity, claim)
        ) {
          onOpenChangeRef.current(false);
        }
        releaseFloatingSurfaceOwnership(scope, identity, claim);
      });
    };
  }, [cancelScheduledFocus, identity, open, scope]);

  useEffect(() => {
    if (open && !eligible) {
      onOpenChangeRef.current(false);
    }
  }, [eligible, open]);

  return {
    cancelScheduledFocus,
    claim: claimRef.current,
    markClosed,
    scheduleFocus,
  };
};
