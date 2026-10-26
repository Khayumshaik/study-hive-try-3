"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LogoutButton from "@/logoutButton";
import DirectMessages from "@/components/DirectMessages";
import LatticeFlight from "@/components/ui/lattice-flight";
import GlimmerVale from "@/components/ui/glimmer-vale";
import type { User } from "@supabase/supabase-js";
import {
  Home,
  Compass,
  MessageSquare,
  Settings,
  ChevronsLeft,
  Menu,
} from "lucide-react";

interface Post {
  id: string;
  author: string;
  handle: string;
  tag: string;
  timeAgo: string;
  content: string;
  imageUrl?: string;
  upvotes: number;
  userUpvoted: boolean;
  comments: {
    id: string;
    author: string;
    text: string;
    time: string;
  }[];
}

interface Community {
  id: string;
  name: string;
  category: string;
  description: string;
  membersCount: number;
  founder: string;
  joined: boolean;
}

let counter = 100;
function makeId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export default function StudyHivePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Active view tab
  const [activeTab, setActiveTab] = useState<"feed" | "spaces" | "messages">("feed");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [feedFilter, setFeedFilter] = useState<"RECENT" | "FOLLOWING" | "TRENDING">("RECENT");
  const [wallpaper, setWallpaper] = useState<"none" | "lattice" | "glimmer">("lattice");

  // Posts State (Cleared out dummy data)
  const [posts, setPosts] = useState<Post[]>([]);

  // Top "Add Post" Form State
  const [newPostText, setNewPostText] = useState("");
  const [newPostTag, setNewPostTag] = useState("General");
  const [newPostImage, setNewPostImage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comment input state
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");

  // Communities State (Cleared out dummy data)
  const [communities, setCommunities] = useState<Community[]>([]);

  // New Community Form State
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [communityName, setCommunityName] = useState("");
  const [communityCategory, setCommunityCategory] = useState("TECH");
  const [communityDesc, setCommunityDesc] = useState("");

  // Direct Messaging State (For the floating drawer if needed)
  const [activeChatRecipient, setActiveChatRecipient] = useState<string>("");
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);

  // Profile info state
  const [profileName, setProfileName] = useState("Loading...");
  const [profileHandle, setProfileHandle] = useState("loading");

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const handle = currentUser.email?.split("@")[0] || "student";
        const name = currentUser.user_metadata?.full_name || handle;
        const wp = currentUser.user_metadata?.wallpaper || "lattice";
        setProfileName(name);
        setProfileHandle(handle);
        setWallpaper(wp);
        setLoadingUser(false);
      } else {
        router.replace("/login");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const handle = currentUser.email?.split("@")[0] || "student";
        const name = currentUser.user_metadata?.full_name || handle;
        const wp = currentUser.user_metadata?.wallpaper || "lattice";
        setProfileName(name);
        setProfileHandle(handle);
        setWallpaper(wp);
        setLoadingUser(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const currentUserHandle = user?.email?.split("@")[0] || profileHandle;
  const currentUserName = profileName || user?.user_metadata?.full_name || currentUserHandle;

  // Handle Image File Upload for Post
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPostImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add Post Submit
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim() && !newPostImage) return;

    const createdPost: Post = {
      id: makeId("post"),
      author: currentUserName,
      handle: currentUserHandle,
      tag: newPostTag,
      timeAgo: "Just now",
      content: newPostText.trim(),
      imageUrl: newPostImage || undefined,
      upvotes: 0,
      userUpvoted: false,
      comments: [],
    };

    setPosts([createdPost, ...posts]);
    setNewPostText("");
    setNewPostImage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Toggle Upvote
  const handleUpvote = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const isUpvoted = p.userUpvoted;
          return {
            ...p,
            userUpvoted: !isUpvoted,
            upvotes: isUpvoted ? p.upvotes - 1 : p.upvotes + 1,
          };
        }
        return p;
      })
    );
  };

  // Add Comment
  const handleAddComment = (postId: string) => {
    if (!commentInput.trim()) return;

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            comments: [
              ...p.comments,
              {
                id: makeId("c"),
                author: currentUserHandle,
                text: commentInput.trim(),
                time: "Just now",
              },
            ],
          };
        }
        return p;
      })
    );
    setCommentInput("");
  };

  // Create Community
  const handleCreateCommunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityName.trim()) return;

    const newComm: Community = {
      id: makeId("comm"),
      name: communityName.trim(),
      category: communityCategory.toUpperCase(),
      description: communityDesc.trim() || "New public study community.",
      membersCount: 1,
      founder: currentUserHandle,
      joined: true,
    };

    setCommunities([newComm, ...communities]);
    setCommunityName("");
    setCommunityDesc("");
    setShowCreateCommunity(false);
  };

  // Join / Leave Community Toggle
  const handleToggleJoin = (commId: string) => {
    setCommunities((prev) =>
      prev.map((c) => {
        if (c.id === commId) {
          const isJoined = c.joined;
          return {
            ...c,
            joined: !isJoined,
            membersCount: isJoined ? c.membersCount - 1 : c.membersCount + 1,
          };
        }
        return c;
      })
    );
  };

  // Direct Message a user from anywhere
  const startDirectMessage = (handle: string) => {
    setActiveChatRecipient(handle);
    setIsChatDrawerOpen(true);
    setActiveTab("messages");
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-slate-400 text-sm">
        Loading StudyHive...
      </div>
    );
  }

  // Filter posts
  const displayedPosts =
    feedFilter === "TRENDING"
      ? [...posts].sort((a, b) => b.upvotes - a.upvotes)
      : posts;

  return (
    <div className="relative min-h-screen bg-black text-slate-100 flex font-sans antialiased">
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

      {/* LEFT NAVIGATION SIDEBAR */}
      <aside
        className={`transition-all duration-300 border-r border-[#262626] h-screen sticky top-0 flex flex-col justify-between bg-black select-none z-30 ${
          isSidebarOpen
            ? "w-16 md:w-60 py-5 px-3 md:px-4"
            : "w-0 overflow-hidden px-0 md:px-0 py-0 border-r-0"
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <div
              onClick={() => setActiveTab("feed")}
              className="flex items-center space-x-3 py-1 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-lg font-bold shrink-0">
                🐝
              </div>
              <span className="hidden md:inline font-bold text-lg text-white group-hover:text-indigo-400 transition-colors">
                StudyHive
              </span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              title="Hide sidebar"
              className="p-1 text-slate-500 hover:text-white rounded-lg hover:bg-[#1a1a1a] transition-colors cursor-pointer shrink-0"
            >
              <ChevronsLeft className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("feed")}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "feed" ? "bg-[#1f1f1f] text-white font-bold" : "text-slate-400 hover:text-white hover:bg-[#141414]"
              }`}
            >
              <Home className="w-5 h-5 shrink-0" />
              <span className="hidden md:inline">Home Feed</span>
            </button>

            <button
              onClick={() => setActiveTab("spaces")}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "spaces" ? "bg-[#1f1f1f] text-white font-bold" : "text-slate-400 hover:text-white hover:bg-[#141414]"
              }`}
            >
              <Compass className="w-5 h-5 shrink-0" />
              <span className="hidden md:inline">Communities</span>
            </button>

            <button
              onClick={() => setActiveTab("messages")}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "messages" ? "bg-[#1f1f1f] text-white font-bold" : "text-slate-400 hover:text-white hover:bg-[#141414]"
              }`}
            >
              <MessageSquare className="w-5 h-5 shrink-0 text-indigo-400" />
              <span className="hidden md:inline">Direct Messages</span>
            </button>

            <button
              onClick={() => router.push("/settings")}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-[#141414] transition-colors cursor-pointer"
            >
              <Settings className="w-5 h-5 shrink-0" />
              <span className="hidden md:inline">Profile Settings</span>
            </button>
          </nav>
        </div>

        <div className="border-t border-[#262626] pt-4 space-y-2">
          {user ? (
            <div className="space-y-2">
              <div
                onClick={() => router.push("/settings")}
                className="flex items-center space-x-2.5 px-2 py-1.5 rounded-xl cursor-pointer hover:bg-[#1a1a1a] transition-all group"
                title="Open Profile Settings Page"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-600/40 border border-indigo-500/50 flex items-center justify-center text-xs font-bold text-indigo-300 group-hover:border-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                  {currentUserHandle.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block truncate flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                      {profileName || currentUserHandle}
                    </p>
                    <span className="text-[11px] text-slate-400 group-hover:text-white transition-colors">⚙️</span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">@{currentUserHandle} • Profile Page</p>
                </div>
              </div>
              <LogoutButton className="hidden md:block w-full py-1.5 bg-[#1a1a1a] hover:bg-red-950/40 hover:text-red-400 text-xs rounded-lg transition-colors border border-transparent hover:border-red-500/30 cursor-pointer" />
            </div>
          ) : (
            <div className="space-y-2">
              <div
                onClick={() => router.push("/settings")}
                className="flex items-center space-x-2.5 px-2 py-1.5 rounded-xl cursor-pointer hover:bg-[#1a1a1a] transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-600/40 border border-indigo-500/50 flex items-center justify-center text-xs font-bold text-indigo-300">
                  G
                </div>
                <div className="hidden md:block truncate flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-white">{profileName || "Guest User"}</p>
                    <span className="text-[11px] text-slate-400">⚙️</span>
                  </div>
                  <p className="text-[10px] text-indigo-400">Profile Settings</p>
                </div>
              </div>
              <button
                onClick={() => router.push("/login")}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* CENTER & RIGHT CONTENT */}
      {activeTab === "messages" ? (
        <DirectMessages
          currentUserHandle={currentUserHandle}
          currentUserName={currentUserName}
          onBackToFeed={() => setActiveTab("feed")}
        />
      ) : (
        <>
          <div className="relative z-10 flex-1 flex justify-center overflow-y-auto max-h-screen">
            <main className="w-full max-w-2xl px-4 py-6 space-y-6">

          {/* TAB 1: FEED & HOME VIEW */}
          {activeTab === "feed" && (
            <>
              {/* TOP "ADD POST" COMPOSER */}
              <section className="bg-[#121212] border border-[#2a2a2a] rounded-2xl p-4 shadow-lg space-y-3">
                <div className="flex items-center justify-between border-b border-[#222] pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    ✍️ Create a Post (Text & Images)
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-slate-400">Tag:</span>
                    <select
                      value={newPostTag}
                      onChange={(e) => setNewPostTag(e.target.value)}
                      className="bg-black border border-[#333] text-xs text-slate-200 rounded-lg px-2 py-1 focus:outline-none"
                    >
                      <option value="General">General</option>
                      <option value="Tech">Tech</option>
                      <option value="Questions">Questions</option>
                      <option value="Joy">Joy</option>
                      <option value="Sadness">Sadness</option>
                      <option value="Wellness">Wellness</option>
                    </select>
                  </div>
                </div>

                <form onSubmit={handleCreatePost} className="space-y-3">
                  <textarea
                    rows={3}
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    placeholder="What's on your mind? Share notes, questions, or updates..."
                    className="w-full bg-black border border-[#2c2c2c] rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />

                  {newPostImage && (
                    <div className="relative rounded-xl overflow-hidden max-h-48 border border-slate-700 bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={newPostImage} alt="Attachment" className="w-full h-auto object-cover max-h-48" />
                      <button
                        type="button"
                        onClick={() => setNewPostImage("")}
                        className="absolute top-2 right-2 bg-black/80 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleImageFile}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-[#1c1c1c] hover:bg-[#282828] text-xs text-slate-300 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                      >
                        📷 Attach Local Image
                      </button>

                      <input
                        type="url"
                        value={newPostImage}
                        onChange={(e) => setNewPostImage(e.target.value)}
                        placeholder="Or paste image URL..."
                        className="hidden sm:inline-block bg-black border border-[#333] rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-600 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                    >
                      Publish Post ✨
                    </button>
                  </div>
                </form>
              </section>

              {/* Filter Tabs */}
              <div className="flex items-center space-x-2 bg-[#121212] p-1.5 rounded-xl border border-[#262626]">
                {(["RECENT", "FOLLOWING", "TRENDING"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setFeedFilter(filter)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      feedFilter === filter
                        ? "bg-white text-black shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Posts Feed */}
              <div className="space-y-4">
                {displayedPosts.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-[#262626] rounded-2xl p-6 text-slate-500 text-sm">
                    No posts yet. Use the form above to add a post!
                  </div>
                ) : (
                  displayedPosts.map((post) => (
                    <article
                      key={post.id}
                      className="bg-[#121212] border border-[#262626] rounded-2xl p-4 space-y-3 shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-400">
                            {post.author.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-white">{post.author}</span>
                              <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                                {post.tag}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              @{post.handle} • {post.timeAgo}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => startDirectMessage(post.handle)}
                          className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Message
                        </button>
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                        {post.content}
                      </p>

                      {post.imageUrl && (
                        <div className="rounded-xl overflow-hidden border border-[#282828] bg-black max-h-96">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.imageUrl}
                            alt="Post Media"
                            className="w-full h-auto object-cover max-h-96"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-[#222] text-xs text-slate-400">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => handleUpvote(post.id)}
                            className={`flex items-center space-x-1.5 transition-colors cursor-pointer ${
                              post.userUpvoted ? "text-indigo-400 font-bold" : "hover:text-white"
                            }`}
                          >
                            <span>⬆️</span>
                            <span>{post.upvotes}</span>
                          </button>

                          <button
                            onClick={() =>
                              setActiveCommentId(activeCommentId === post.id ? null : post.id)
                            }
                            className="flex items-center space-x-1.5 hover:text-white transition-colors cursor-pointer"
                          >
                            <span>💬</span>
                            <span>{post.comments.length} comments</span>
                          </button>
                        </div>

                        <button
                          onClick={() => alert("Post link copied!")}
                          className="hover:text-white transition-colors text-xs cursor-pointer"
                        >
                          Share
                        </button>
                      </div>

                      {activeCommentId === post.id && (
                        <div className="pt-2 border-t border-[#202020] space-y-2">
                          {post.comments.length > 0 && (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto">
                              {post.comments.map((c) => (
                                <div key={c.id} className="text-xs bg-black/60 p-2 rounded-lg border border-[#222]">
                                  <span className="font-bold text-slate-300">@{c.author}: </span>
                                  <span className="text-slate-300">{c.text}</span>
                                  <span className="block text-[9px] text-slate-500 mt-0.5">{c.time}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={commentInput}
                              onChange={(e) => setCommentInput(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleAddComment(post.id)}
                              placeholder="Write a comment..."
                              className="flex-1 bg-black border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                            <button
                              onClick={() => handleAddComment(post.id)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </>
          )}

          {/* TAB 2: COMMUNITIES (SPACES) */}
          {activeTab === "spaces" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
                <div>
                  <h2 className="text-lg font-bold text-white">Communities (Spaces)</h2>
                  <p className="text-xs text-slate-400">Join any community or create one</p>
                </div>
                <button
                  onClick={() => setShowCreateCommunity(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  + Create Community
                </button>
              </div>

              {showCreateCommunity && (
                <form
                  onSubmit={handleCreateCommunity}
                  className="bg-[#121212] border border-purple-500/40 rounded-2xl p-4 space-y-3"
                >
                  <h3 className="text-xs font-bold text-purple-400 uppercase">New Community Details</h3>
                  <input
                    type="text"
                    required
                    value={communityName}
                    onChange={(e) => setCommunityName(e.target.value)}
                    placeholder="Community Name (e.g. Next.js Builders)"
                    className="w-full bg-black border border-[#333] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="text"
                    value={communityCategory}
                    onChange={(e) => setCommunityCategory(e.target.value)}
                    placeholder="Category (e.g. TECH, MATH, GENERAL)"
                    className="w-full bg-black border border-[#333] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                  <textarea
                    rows={2}
                    value={communityDesc}
                    onChange={(e) => setCommunityDesc(e.target.value)}
                    placeholder="Description..."
                    className="w-full bg-black border border-[#333] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateCommunity(false)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Create Now
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {communities.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-[#262626] rounded-2xl p-6 text-slate-500 text-sm">
                    No communities yet. Create the first one!
                  </div>
                ) : (
                  communities.map((comm) => (
                    <div
                      key={comm.id}
                      className="bg-[#121212] border border-[#262626] rounded-2xl p-4 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold text-purple-400 bg-purple-950/40 border border-purple-500/30 px-2 py-0.5 rounded-md">
                            {comm.category}
                          </span>
                          <h4 className="text-sm font-bold text-white">{comm.name}</h4>
                        </div>
                        <p className="text-xs text-slate-400">{comm.description}</p>
                        <p className="text-[10px] text-slate-500">
                          {comm.membersCount} members • by @{comm.founder}
                        </p>
                      </div>

                      <button
                        onClick={() => handleToggleJoin(comm.id)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          comm.joined
                            ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                            : "bg-purple-600 hover:bg-purple-500 text-white"
                        }`}
                      >
                        {comm.joined ? "Joined ✓" : "Join"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      </>
      )}

      {/* Floating Open-Sidebar Button (when hidden) */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          title="Show sidebar"
          className="fixed top-4 left-4 z-40 bg-[#1a1a1a] hover:bg-[#262626] border border-[#333] text-slate-300 hover:text-white p-2 rounded-xl shadow-xl transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Floating Quick Messages Button */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => {
            setIsChatDrawerOpen(!isChatDrawerOpen);
            setActiveTab("messages");
          }}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-full shadow-xl transition-all cursor-pointer text-xs font-bold"
        >
          <span>💬</span>
          <span>Direct Messages</span>
        </button>
      </div>
    </div>
  );
}