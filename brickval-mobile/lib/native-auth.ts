import { getClerkInstance } from "@clerk/expo";
import { Platform, TurboModuleRegistry, type TurboModule } from "react-native";
import { CLERK_PUBLISHABLE_KEY, safeTokenCache } from "./clerk";

const CLERK_CLIENT_JWT_KEY = "__clerk_client_jwt";

interface NativeClerkModule extends TurboModule {
  presentAuth(options: { mode: "signInOrUp"; dismissable: boolean }): Promise<{
    cancelled?: boolean;
    sessionId?: string | null;
    session?: { id?: string | null };
  } | null>;
  getClientToken(): Promise<string | null>;
}

type ClerkWithInternals = ReturnType<typeof getClerkInstance> & {
  __internal_reloadInitialResources?: () => Promise<void>;
};

const NativeClerk =
  Platform.OS === "ios" || Platform.OS === "android"
    ? TurboModuleRegistry.get<NativeClerkModule>("ClerkExpo")
    : null;

export async function presentNativeAuth(): Promise<"signed-in" | "cancelled" | "unavailable"> {
  if (!NativeClerk?.presentAuth) return "unavailable";

  const result = await NativeClerk.presentAuth({ mode: "signInOrUp", dismissable: true });
  const sessionId = result?.sessionId ?? result?.session?.id ?? null;
  if (result?.cancelled || !sessionId) return "cancelled";

  try {
    const nativeClientToken = await NativeClerk.getClientToken?.();
    if (nativeClientToken) {
      await safeTokenCache?.saveToken(CLERK_CLIENT_JWT_KEY, nativeClientToken);
    }
  } catch (error) {
    console.warn("Native auth token could not be cached; continuing with active session.", error);
  }

  const clerk = getClerkInstance({
    publishableKey: CLERK_PUBLISHABLE_KEY,
    tokenCache: safeTokenCache,
  }) as ClerkWithInternals;
  await clerk.__internal_reloadInitialResources?.();
  await clerk.setActive?.({ session: sessionId });

  return "signed-in";
}
