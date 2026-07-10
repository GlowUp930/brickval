import type { ReactNode } from "react";
import { Text, type TextStyle } from "react-native";
import "./expo-symbols.css";

export type SFSymbol = string;
export type AndroidSymbol = string;

type SymbolName = string | { ios?: string; android?: string; web?: string };

const IOS_TO_MATERIAL: Record<string, string> = {
  "archivebox": "inventory_2",
  "archivebox.fill": "inventory_2",
  "bolt.fill": "flash_on",
  "bolt.slash": "flash_off",
  "camera.fill": "photo_camera",
  "gearshape": "settings",
  "gearshape.fill": "settings",
  "number.square": "tag",
  "person.crop.circle.fill": "account_circle",
  "photo.on.rectangle": "photo_library",
  "plus": "add",
  "viewfinder": "document_scanner",
  "viewfinder.circle.fill": "document_scanner",
};

export function SymbolView({
  name,
  size = 24,
  tintColor = "currentColor",
  fallback,
  style,
}: {
  name: SymbolName;
  size?: number;
  tintColor?: string;
  fallback?: ReactNode;
  style?: TextStyle;
}) {
  const source = typeof name === "string" ? name : name.web ?? name.android ?? name.ios;
  const symbol = source ? IOS_TO_MATERIAL[source] ?? source : null;

  if (!symbol) return fallback ?? null;

  return (
    <Text
      aria-hidden
      style={[
        {
          color: tintColor,
          fontFamily: "BrickVal Material Symbols",
          fontSize: size,
          fontWeight: "400",
          height: size,
          lineHeight: size,
          width: size,
        },
        style,
      ]}
    >
      {symbol}
    </Text>
  );
}
