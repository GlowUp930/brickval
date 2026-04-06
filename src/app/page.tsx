"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Hero } from "@/components/home/Hero";

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

  return <Hero />;
}
