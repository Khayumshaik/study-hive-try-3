"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AnimatedButton from "@/components/ui/animatedbutton";

export default function LoginPage() {
  const router = useRouter();
  const [entered, setEntered] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;

        if (data.user) {
          try {
            await supabase.from("profiles").insert({
              id: data.user.id,
              full_name: fullName,
            });
          } catch {
            // Profile table insert may depend on email verification or DB trigger
          }
        }
        setSuccessMsg(
          "Account created successfully! If email confirmation is enabled, check your inbox, or sign in now."
        );
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An error occurred during authentication.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-slate-950 overflow-hidden flex items-center justify-center font-sans">
      {/* 1. Subtle Retro Grid */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* 2. Floating Ambient Glow Orbs */}
      <div
        className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-indigo-500/20 rounded-full blur-[120px] mix-blend-screen animate-pulse"
        style={{ animationDuration: "4s" }}
      />
      <div
        className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-blue-500/20 rounded-full blur-[120px] mix-blend-screen animate-pulse"
        style={{ animationDuration: "6s", animationDelay: "1s" }}
      />
      <div
        className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-violet-500/10 rounded-full blur-[120px] mix-blend-screen animate-pulse"
        style={{ animationDuration: "5s", animationDelay: "2s" }}
      />

      {/* Main Content Area */}
      {!entered ? (
        /* Welcome Overlay */
        <div
          onClick={() => setEntered(true)}
          className="relative z-20 flex flex-col items-center justify-center cursor-pointer select-none group text-center p-6 w-full h-full transition-all duration-700"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 bg-indigo-900/30 border border-indigo-500/30 text-indigo-400 rounded-3xl mb-8 shadow-[0_0_40px_rgba(99,102,241,0.2)] group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 text-4xl">
            🐝
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white drop-shadow-lg mb-6">
            StudyHive
          </h1>
          <p className="text-slate-300 text-lg md:text-xl max-w-md font-light mb-10 drop-shadow">
            Collaborate, learn, and grow together.
          </p>
          <div className="px-8 py-4 rounded-full bg-slate-900/50 border border-slate-700 text-slate-300 text-sm tracking-wide font-medium shadow-lg backdrop-blur-md group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all animate-bounce">
            Click anywhere to enter ✨
          </div>
        </div>
      ) : (
        /* Login / Sign Up Form Card */
        <div className="relative z-10 w-full max-w-md bg-slate-900/80 border border-slate-800/80 p-8 rounded-3xl shadow-2xl backdrop-blur-xl animate-in zoom-in-95 fade-in duration-500 mx-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl mb-4 font-bold text-2xl shadow-inner">
              🐝
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {isSignUp ? "Create an Account" : "Welcome Back"}
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              {isSignUp
                ? "Join StudyHive to collaborate with peers"
                : "Sign in to access your study groups"}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            {isSignUp && (
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
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="pt-4">
              <AnimatedButton
                type="submit"
                disabled={loading}
                className="w-full py-4 text-base shadow-[0_0_20px_rgba(99,102,241,0.4)]"
              >
                {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
              </AnimatedButton>
            </div>
          </form>

          <div className="text-center mt-8 text-sm text-slate-400">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors hover:underline underline-offset-4 cursor-pointer"
            >
              {isSignUp ? "Log In" : "Create One"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
