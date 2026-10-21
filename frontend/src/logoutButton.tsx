"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LogoutButtonProps {
  className?: string;
}

export default function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={
        className ||
        "px-4 py-2 bg-red-600/90 hover:bg-red-600 text-white text-sm font-medium rounded-xl shadow-lg transition-colors cursor-pointer disabled:opacity-50"
      }
    >
      {loading ? "Signing Out..." : "Log Out"}
    </button>
  );
}
