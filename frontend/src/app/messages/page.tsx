"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DirectMessages from "@/components/DirectMessages";
import LogoutButton from "@/logoutButton";
import type { User } from "@supabase/supabase-js";
import {
  Home,
  Compass,
  MessageSquare,
  Settings,
} from "lucide-react";

export default function MessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setLoading(false);
      } else {
        router.replace("/login");
      }
    });
  }, [router]);

  const currentUserHandle = user?.email?.split("@")[0] || "student";
  const currentUserName = user?.user_metadata?.full_name || currentUserHandle;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Loading Messages...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased overflow-hidden">
      {/* 
        COLUMN 1: Far-left App Navigation Sidebar
      */}
      <aside className="w-16 md:w-60 border-r border-slate-800/80 h-screen sticky top-0 flex flex-col justify-between py-5 px-3 md:px-4 bg-slate-950 select-none z-30 shrink-0">
        <div className="space-y-6">
          {/* Logo */}
          <div
            onClick={() => router.push("/")}
            className="flex items-center space-x-3 px-2 py-1 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-lg font-bold">
              🐝
            </div>
            <span className="hidden md:inline font-bold text-lg text-white group-hover:text-indigo-400 transition-colors">
              StudyHive
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => router.push("/")}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <Home className="w-5 h-5 shrink-0" />
              <span className="hidden md:inline">Home Feed</span>
            </button>

            <button
              onClick={() => router.push("/")}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <Compass className="w-5 h-5 shrink-0" />
              <span className="hidden md:inline">Communities</span>
            </button>

            {/* Active Messages Button */}
            <div className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-bold bg-slate-900 text-white">
              <MessageSquare className="w-5 h-5 shrink-0 text-indigo-400" />
              <span className="hidden md:inline">Direct Messages</span>
            </div>

            <button
              onClick={() => router.push("/settings")}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <Settings className="w-5 h-5 shrink-0" />
              <span className="hidden md:inline">Profile Settings</span>
            </button>
          </nav>
        </div>

        {/* User Account / Logout */}
        <div className="border-t border-slate-800/80 pt-4 space-y-2">
          <div
            onClick={() => router.push("/settings")}
            className="flex items-center space-x-2.5 px-2 py-1.5 rounded-xl cursor-pointer hover:bg-slate-900 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600/40 border border-indigo-500/50 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
              {currentUserHandle.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block truncate flex-1">
              <p className="text-xs font-semibold text-white truncate">{currentUserName}</p>
              <p className="text-[10px] text-slate-500 truncate">@{currentUserHandle}</p>
            </div>
          </div>
          <LogoutButton className="hidden md:block w-full py-1.5 bg-slate-900 hover:bg-red-950/40 hover:text-red-400 text-xs rounded-lg transition-colors border border-transparent hover:border-red-500/30 cursor-pointer" />
        </div>
      </aside>

      {/* 
        COLUMN 2 & 3: Direct Messages Component (Chat List Pane + Active Chat Window)
      */}
      <DirectMessages
        currentUserHandle={currentUserHandle}
        currentUserName={currentUserName}
        onBackToFeed={() => router.push("/")}
      />
    </div>
  );
}

