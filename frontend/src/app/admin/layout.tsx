"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../../store";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user } = useStore();
  const [isChecking, setIsChecking] = useState(true);

  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(useStore.persist.hasHydrated());
    const unsub = useStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    // Wait for Zustand hydration to finish on client
    if (!isAuthenticated || !user || user.role !== "Admin") {
      router.push("/login");
    } else {
      setIsChecking(false);
    }
  }, [hasHydrated, isAuthenticated, user, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#fbfaf2] text-[#1b1c18] flex flex-col justify-center items-center font-mono text-sm">
        <div className="flex items-center gap-3 bg-white brutalist-border p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded">
          <span className="w-5 h-5 border-2 border-black border-t-transparent animate-spin rounded-full"></span>
          <span className="font-bold">Establishing Admin Security Tunnel...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
