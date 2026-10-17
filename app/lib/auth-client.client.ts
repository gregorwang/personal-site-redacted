import { createAuthClient } from "better-auth/react";
import { magicLinkClient, oneTapClient } from "better-auth/client/plugins";

const googleClientId = typeof window !== "undefined" ? window.ENV?.GOOGLE_CLIENT_ID || "" : "";
const configuredAppUrl = typeof window !== "undefined" ? window.ENV?.APP_URL || "" : "";

function getClientAuthBaseURL() {
  if (typeof window === "undefined") {
    return "http://localhost:3000";
  }

  if (configuredAppUrl) {
    return new URL(configuredAppUrl).origin;
  }

  return window.location.origin;
}

export const authClient = createAuthClient({
  baseURL: getClientAuthBaseURL(),
  plugins: [
    magicLinkClient(),
    oneTapClient({
      clientId: googleClientId,
      autoSelect: false,
      cancelOnTapOutside: true,
      uxMode: "popup",
      context: "signin",
      additionalOptions: {
        use_fedcm_for_prompt: true,
      },
    }),
  ],
});

export const { signIn, signOut, signUp, useSession } = authClient;

declare global {
  interface Window {
    ENV?: {
      GOOGLE_CLIENT_ID?: string;
      APP_URL?: string;
    };
  }
}
