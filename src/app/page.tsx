"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileHome } from "@/components/home/MobileHome";

export default function HomePage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("onboarded")) {
      router.replace("/onboarding");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null;

  return <MobileHome />;
}
