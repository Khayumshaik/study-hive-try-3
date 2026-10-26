"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LogoutButton from "@/logoutButton";
import LatticeFlight from "@/components/ui/lattice-flight";
import GlimmerVale from "@/components/ui/glimmer-vale";
import type { User } from "@supabase/supabase-js";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [major, setMajor] = useState("Computer Science");
  const [university, setUniversity] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [wallpaper, setWallpaper] = useState<"none" | "lattice" | "glimmer">("lattice");
  const [allowOpenDMs, setAllowOpenDMs] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);

  // Password Update
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Status feedback
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "privacy">("profile");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const userHandle = currentUser.email?.split("@")[0] || "student";
        const metaName = currentUser.user_metadata?.full_name || userHandle;
        setFullName(metaName);
        setHandle(userHandle);
        setBio(currentUser.user_metadata?.bio || "Student at StudyHive | Collaborating & learning.");
        setMajor(currentUser.user_metadata?.major || "Computer Science");
        setUniversity(currentUser.user_metadata?.university || "University Campus");
        setWallpaper(currentUser.user_metadata?.wallpaper || "lattice");
        setLoading(false);
      } else {
        router.replace("/login");
      }
    });
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      if (user) {
        await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            bio,
            major,
            university,
            wallpaper,
            allowOpenDMs,
          },
        });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      alert("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg("Password must be at least 6 characters long.");
      return;
    }

    setPasswordLoading(true);
    setPasswordMsg("");
    try {
      if (user) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) throw error;
        setPasswordMsg("✓ Password updated successfully!");
        setNewPassword("");
      } else {
        setPasswordMsg("Please sign in to update your password.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update password.";
      setPasswordMsg(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-slate-400 text-sm">
        Loading Profile Settings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-slate-100 flex font-sans antialiased relative">
      {/* WALLPAPER BACKGROUND */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {wallpaper === "lattice" && (
          <LatticeFlight
            background="#000000"
            baseColor="rgb(0, 255, 255)"
            density={307}
            speed={27}
            thickness={4}
            fog={100}
            distance={3}
          />
        )}
        {wallpaper === "glimmer" && (
          <GlimmerVale 
            speed={50}
            scale={100}
            density={60}
            sparkle={50}
          />
        )}
      </div>

      {/* Left Navigation Bar (Consistent with Home Page) */}
      <aside className="w-16 md:w-60 border-r border-[#262626] h-screen sticky top-0 flex flex-col justify-between py-5 px-3 md:px-4 bg-black select-none z-30">
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
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-[#141414] transition-colors cursor-pointer"
            >
              <span>🏠</span>
              <span className="hidden md:inline">Back to Feed</span>
            </button>

            <button
              onClick={() => router.push("/")}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-[#141414] transition-colors cursor-pointer"
            >
              <span>🪐</span>
              <span className="hidden md:inline">Communities</span>
            </button>

            <button
              onClick={() => router.push("/")}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-[#141414] transition-colors cursor-pointer"
            >
              <span>💬</span>
              <span className="hidden md:inline">Direct Messages</span>
            </button>

            {/* Active Settings Pill */}
            <div className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-bold bg-[#1f1f1f] text-white">
              <span>⚙️</span>
              <span className="hidden md:inline">Profile Settings</span>
            </div>
          </nav>
        </div>

        {/* User Card */}
        <div className="border-t border-[#262626] pt-4 space-y-2">
          <div className="flex items-center space-x-2 px-1">
            <div className="w-7 h-7 rounded-full bg-indigo-600/40 border border-indigo-500/50 flex items-center justify-center text-xs font-bold text-indigo-300">
              {handle.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block truncate">
              <p className="text-xs font-semibold text-white truncate">{handle}</p>
              <p className="text-[10px] text-slate-500">Settings Active</p>
            </div>
          </div>
          <LogoutButton className="hidden md:block w-full py-1.5 bg-[#1a1a1a] hover:bg-red-950/40 hover:text-red-400 text-xs rounded-lg transition-colors border border-transparent hover:border-red-500/30 cursor-pointer" />
        </div>
      </aside>

      {/* Main Settings Content */}
      <main className="relative z-10 flex-1 overflow-y-auto max-h-screen py-8 px-4 sm:px-8 max-w-4xl">
        <div className="space-y-6">
          {/* Top Header & Breadcrumb */}
          <div className="flex items-center justify-between border-b border-[#262626] pb-5">
            <div>
              <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
                <span onClick={() => router.push("/")} className="hover:text-indigo-400 cursor-pointer">
                  StudyHive
                </span>
                <span>/</span>
                <span className="text-slate-300">Profile Settings</span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Account & Profile Settings</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage your public information, academic details, and messaging preferences.
              </p>
            </div>

            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#252525] text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-[#333] transition-colors cursor-pointer"
            >
              ← Back to Feed
            </button>
          </div>

          {/* Profile Badge Hero Card */}
          <div className="bg-[#121212] border border-[#262626] rounded-2xl p-6 flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5 shadow-xl">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 p-[3px] shadow-lg shadow-indigo-600/30">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-3xl font-black text-white">
                {handle.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                <h2 className="text-lg font-bold text-white">{fullName || handle}</h2>
                <span className="text-xs text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 px-2.5 py-0.5 rounded-full inline-block">
                  @{handle}
                </span>
              </div>
              <p className="text-xs text-slate-400">{user?.email || "Guest Mode (Local)"}</p>
              <p className="text-xs text-slate-300 pt-1 leading-relaxed max-w-lg">{bio}</p>
            </div>
          </div>

          {/* Settings Section Tabs */}
          <div className="flex items-center space-x-2 border-b border-[#262626] pb-2">
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                activeTab === "profile"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-[#161616]"
              }`}
            >
              General Profile
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                activeTab === "security"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-[#161616]"
              }`}
            >
              Password & Security
            </button>
            <button
              onClick={() => setActiveTab("privacy")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                activeTab === "privacy"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-[#161616]"
              }`}
            >
              Privacy & Messaging
            </button>
          </div>

          {/* TAB 1: GENERAL PROFILE */}
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className="bg-[#121212] border border-[#262626] rounded-2xl p-6 space-y-5 shadow-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Shaik Khayum"
                    className="w-full bg-black border border-[#333] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Username Handle
                  </label>
                  <div className="flex items-center bg-black border border-[#333] rounded-xl px-3 py-3 text-xs text-white">
                    <span className="text-slate-500 mr-1.5">@</span>
                    <input
                      type="text"
                      required
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="handle"
                      className="flex-1 bg-transparent focus:outline-none text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Bio / Learning Goal
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a short intro, what you are studying, or your goals..."
                  className="w-full bg-black border border-[#333] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Major / Field of Study
                  </label>
                  <input
                    type="text"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    placeholder="e.g. Computer Science, Mathematics"
                    className="w-full bg-black border border-[#333] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    University / College
                  </label>
                  <input
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="e.g. State University"
                    className="w-full bg-black border border-[#333] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  GitHub or Portfolio (Optional)
                </label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full bg-black border border-[#333] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Dashboard Wallpaper
                </label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {[
                    { id: "none", name: "No Wallpaper", icon: "🚫" },
                    { id: "lattice", name: "Lattice Flight", icon: "🕸️" },
                    { id: "glimmer", name: "Glimmer Vale", icon: "✨" },
                  ].map((wp) => (
                    <button
                      key={wp.id}
                      type="button"
                      onClick={() => setWallpaper(wp.id as any)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                        wallpaper === wp.id
                          ? "bg-indigo-600/20 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                          : "bg-black border-[#333] hover:border-slate-500"
                      }`}
                    >
                      <span className="text-xl mb-1">{wp.icon}</span>
                      <span className="text-[10px] font-bold text-slate-300">{wp.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {saveSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold text-center">
                  ✓ Profile changes saved successfully!
                </div>
              )}

              <div className="flex items-center justify-end pt-3 border-t border-[#262626]">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving Changes..." : "Save Profile"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: PASSWORD & SECURITY */}
          {activeTab === "security" && (
            <div className="bg-[#121212] border border-[#262626] rounded-2xl p-6 space-y-6 shadow-lg">
              <div>
                <h3 className="text-sm font-bold text-white">Email Address</h3>
                <p className="text-xs text-slate-400 mt-0.5">Your primary login and communication email.</p>
                <div className="mt-2 p-3 bg-black border border-[#333] rounded-xl text-xs text-slate-300 flex items-center justify-between">
                  <span>{user?.email || "guest@studyhive.local"}</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                    Verified
                  </span>
                </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4 pt-4 border-t border-[#262626]">
                <div>
                  <h3 className="text-sm font-bold text-white">Change Password</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Update your account password with at least 6 characters.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black border border-[#333] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {passwordMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium ${
                      passwordMsg.startsWith("✓")
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                        : "bg-red-500/10 border border-red-500/30 text-red-400"
                    }`}
                  >
                    {passwordMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {passwordLoading ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: PRIVACY & MESSAGING */}
          {activeTab === "privacy" && (
            <div className="bg-[#121212] border border-[#262626] rounded-2xl p-6 space-y-5 shadow-lg">
              <div>
                <h3 className="text-sm font-bold text-white">Direct Messaging Privacy</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Control who can reach out to you directly across StudyHive.
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-black rounded-xl border border-[#262626]">
                <div>
                  <p className="text-xs font-bold text-white">Open Direct Messages</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Allow other students to message you directly without friend requests or prior approval.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={allowOpenDMs}
                  onChange={(e) => setAllowOpenDMs(e.target.checked)}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-black rounded-xl border border-[#262626]">
                <div>
                  <p className="text-xs font-bold text-white">Active Status Indicator</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Display a green dot when you are online studying in live rooms.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={showOnlineStatus}
                  onChange={(e) => setShowOnlineStatus(e.target.checked)}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-red-400">Account Session</p>
                  <p className="text-[10px] text-slate-500">Sign out from this device</p>
                </div>
                <LogoutButton className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl cursor-pointer" />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

