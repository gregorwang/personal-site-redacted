import { useEffect } from "react";
import { authClient } from "~/lib/auth-client.client";
import { withLoginSuccessMarker } from "~/lib/auth-return";

interface GoogleOneTapProps {
  enabled: boolean;
  returnTo: string;
  appUrl?: string;
  debug?: boolean;
}

function debugOneTap(enabled: boolean | undefined, reason: string, detail?: unknown) {
  if (!enabled) return;
  console.info(`[Auth] Google One Tap skipped: ${reason}`, detail ?? "");
}

export default function GoogleOneTap({ enabled, returnTo, appUrl, debug = false }: GoogleOneTapProps) {
  useEffect(() => {
    if (!enabled) {
      debugOneTap(debug, "missing-google-client-id");
      return;
    }

    if (appUrl) {
      try {
        const expectedOrigin = new URL(appUrl).origin;
        if (expectedOrigin !== window.location.origin) {
          debugOneTap(debug, "origin-mismatch", { expectedOrigin, actualOrigin: window.location.origin });
          return;
        }
      } catch (error) {
        debugOneTap(debug, "invalid-app-url", error);
        return;
      }
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;

      authClient.oneTap({
        callbackURL: withLoginSuccessMarker(returnTo),
      }).catch((error) => {
        console.info("[Auth] Google One Tap unavailable", error);
      });
    }, 900);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [appUrl, debug, enabled, returnTo]);

  return null;
}
