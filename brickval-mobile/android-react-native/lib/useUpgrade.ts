import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { getAuthToken } from "./api";
import {
  getNativeProStatus,
  getPaywallDiagnosticMessage,
  presentSuperwallUpgradeWithResult,
} from "./paywall";

export function useUpgrade() {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);

  const triggerUpgrade = useCallback(async () => {
    setIsUpgrading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        router.push({ pathname: "/account", params: { upgrade: "1" } });
        return;
      }

      if (await getNativeProStatus()) {
        return;
      }

      setShowDisclosure(true);
    } finally {
      setIsUpgrading(false);
    }
  }, []);

  const handleDisclosureContinue = useCallback(async () => {
    setShowDisclosure(false);
    setIsUpgrading(true);
    try {
      const result = await presentSuperwallUpgradeWithResult();
      if (result.status !== "presented") {
        Alert.alert("Upgrade unavailable", getPaywallDiagnosticMessage(result));
      }
    } finally {
      setIsUpgrading(false);
    }
  }, []);

  const handleDisclosureDismiss = useCallback(() => {
    setShowDisclosure(false);
  }, []);

  const openAccountForUpgrade = useCallback(() => {
    router.push({ pathname: "/account", params: { upgrade: "1" } });
  }, []);

  const openAccountForSignIn = useCallback(() => {
    router.push("/account");
  }, []);

  return {
    triggerUpgrade,
    openAccountForUpgrade,
    openAccountForSignIn,
    isUpgrading,
    showDisclosure,
    handleDisclosureContinue,
    handleDisclosureDismiss,
  };
}
