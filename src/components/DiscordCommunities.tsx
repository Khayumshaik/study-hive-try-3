"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Hash,
  Volume2,
  VolumeX,
  Shield,
  Megaphone,
  Users,
  Pin,
  Check,
  ChevronDown,
  ChevronRight,
  Smile,
  Paperclip,
  Send,
  Mic,
  MicOff,
  Headphones,
  Plus,
  X,
  Search,
  Bell,
  Lock,
  Settings,
  LogOut,
  ArrowLeft,
  Radio,
  Share2,
  Compass,
  MessageSquare,
  Trash2,
  CornerUpLeft,
  AtSign,
  Flame,
  ThumbsUp,
  Heart,
  PlusCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export interface ChannelMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderHandle: string;
  senderAvatarBg?: string;
  content: string;
  timestamp: string;
  reactions?: Record<string, number>;
  userReactions?: string[];
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  };
  imageUrl?: string;
}

export interface CommunityChannel {
  id: string;
  name: string;
  category: string;
  type: "text" | "voice" | "rules" | "announcement";
  topic?: string;
  isLocked?: boolean;
}

export interface CommunityCategory {
  id: string;
  name: string;
  collapsed?: boolean;
}

export interface CommunityMember {
  id: string;
  name: string;
  handle: string;
  role: "owner" | "admin" | "member";
  isOnline: boolean;
  avatarBg?: string;
  statusText?: string;
}

export interface Community {
  id: string;
  name: string;
  iconEmoji?: string;
  iconBg?: string;
  ownerId: string;
  ownerHandle: string;
  created_at: string;
  rulesAcknowledged?: boolean;
  categories: CommunityCategory[];
  channels: CommunityChannel[];
  members: CommunityMember[];
}

const STORAGE_SERVERS_KEY = "studyhive_discord_real_servers_v1";
const STORAGE_MSGS_KEY = "studyhive_discord_real_msgs_v1";

interface DiscordCommunitiesProps {
  currentUserHandle?: string;
  currentUserName?: string;
  onBackToFeed?: () => void;
  onNavigate?: (tab: "feed" | "messages" | "settings") => void;
}

export default function DiscordCommunities({
  currentUserHandle = "student",
  currentUserName = "Student User",
  onBackToFeed,
  onNavigate,
}: DiscordCommunitiesProps) {
  // Communities state — start with empty (NO FAKE COMMUNITIES)
  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeCommunityId, setActiveCommunityId] = useState<string>("");
  const [activeChannelId, setActiveChannelId] = useState<string>("");

  // Messages state — NO FAKE MESSAGES
  const [messagesMap, setMessagesMap] = useState<Record<string, ChannelMessage[]>>({});
  const [messageInput, setMessageInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChannelMessage | null>(null);
  const [attachedImage, setAttachedImage] = useState<string>("");
  const [showImageModal, setShowImageModal] = useState(false);

  // Modals & Popouts
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [targetCategory, setTargetCategory] = useState("Community");
  const [showServerDropdown, setShowServerDropdown] = useState(false);
  const [showMembersSidebar, setShowMembersSidebar] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Verification modal for rules
  const [showRulesVerificationModal, setShowRulesVerificationModal] = useState(false);

  // Voice state
  const [connectedVoiceRoom, setConnectedVoiceRoom] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  // Forms
  const [newServerName, setNewServerName] = useState("");
  const [newServerEmoji, setNewServerEmoji] = useState("📚");
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"text" | "voice">("text");

  // Search in server
  const [searchQuery, setSearchQuery] = useState("");

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load real saved data on mount
  useEffect(() => {
    try {
      const savedServers = localStorage.getItem(STORAGE_SERVERS_KEY);
      if (savedServers) {
        const parsed: Community[] = JSON.parse(savedServers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCommunities(parsed);
          setActiveCommunityId(parsed[0].id);
          if (parsed[0].channels.length > 0) {
            setActiveChannelId(parsed[0].channels[0].id);
          }
        }
      }

      const savedMsgs = localStorage.getItem(STORAGE_MSGS_KEY);
      if (savedMsgs) {
        const parsedMsgs = JSON.parse(savedMsgs);
        if (parsedMsgs && typeof parsedMsgs === "object") {
          setMessagesMap(parsedMsgs);
        }
      }
    } catch {}

    // Also fetch any real registered profiles from Supabase to list in members
    supabase
      .from("profiles")
      .select("id, full_name")
      .then(({ data }) => {
        if (data && data.length > 0) {
          // If we have real registered profiles, add them as real members to active servers
          setCommunities((prev) =>
            prev.map((c) => {
              const existingIds = new Set(c.members.map((m) => m.id));
              const newMembers: CommunityMember[] = data
                .filter((p) => !existingIds.has(p.id))
                .map((p) => ({
                  id: p.id,
                  name: p.full_name || "Student",
                  handle: p.full_name?.toLowerCase().replace(/\s+/g, "_") || "student",
                  role: "member",
                  isOnline: true,
                  avatarBg: "bg-[#5865f2]",
                }));
              return { ...c, members: [...c.members, ...newMembers] };
            })
          );
        }
      })
      .catch(() => {});
  }, []);

  const saveCommunities = (data: Community[]) => {
    setCommunities(data);
    try {
      localStorage.setItem(STORAGE_SERVERS_KEY, JSON.stringify(data));
    } catch {}
  };

  const saveMessages = (updater: (prev: Record<string, ChannelMessage[]>) => Record<string, ChannelMessage[]>) => {
    setMessagesMap((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_MSGS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const activeCommunity = communities.find((c) => c.id === activeCommunityId) || null;
  const activeChannel = activeCommunity?.channels.find((ch) => ch.id === activeChannelId) || null;

  // Auto-switch channel if active channel is not in active community
  useEffect(() => {
    if (activeCommunity) {
      const exists = activeCommunity.channels.some((ch) => ch.id === activeChannelId);
      if (!exists && activeCommunity.channels.length > 0) {
        setActiveChannelId(activeCommunity.channels[0].id);
      }
    }
  }, [activeCommunityId, activeCommunity, activeChannelId]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChannelId, messagesMap]);

  // Template Creator (1-click authentic Discord study server like Screenshot 1)
  const handleCreateTemplateServer = (name: string, emoji: string) => {
    const serverId = `srv-${Date.now()}`;
    const defaultCategories: CommunityCategory[] = [
      { id: "cat-start", name: "👉 Start here" },
      { id: "cat-help", name: "❓ Technical Help" },
      { id: "cat-comm", name: "💬 Community" },
      { id: "cat-voice", name: "🔊 Voice Channels" },
    ];

    const defaultChannels: CommunityChannel[] = [
      { id: `${serverId}-rules`, name: "📋-rules", category: "👉 Start here", type: "rules", topic: "Community rules & academic integrity guidelines" },
      { id: `${serverId}-announcement`, name: "📢-announcement", category: "👉 Start here", type: "announcement", topic: "Official study group announcements and updates" },
      { id: `${serverId}-welcome`, name: "🤝-welcome", category: "👉 Start here", type: "text", topic: "Welcome to the server! Say hi and meet everyone" },
      { id: `${serverId}-dev-questions`, name: "⁉️-dev-questions", category: "❓ Technical Help", type: "text", topic: "Ask coding, math, or homework questions here" },
      { id: `${serverId}-introductions`, name: "🤝-introductions", category: "💬 Community", type: "text", topic: "Introduce yourself, what you are studying, and projects you love" },
      { id: `${serverId}-general`, name: "💬-general", category: "💬 Community", type: "text", topic: "Casual chat, study coffee breaks, and daily check-ins" },
      { id: `${serverId}-resources`, name: "📚-resources", category: "💬 Community", type: "text", topic: "Shared cheat sheets, lecture summaries, and textbook notes" },
      { id: `${serverId}-study-room-1`, name: "Study Room 1", category: "🔊 Voice Channels", type: "voice", topic: "Focus study room with peer video/audio" },
      { id: `${serverId}-lounge`, name: "Lounge & Chill", category: "🔊 Voice Channels", type: "voice", topic: "Casual voice chat during breaks" },
    ];

    const newCommunity: Community = {
      id: serverId,
      name,
      iconEmoji: emoji,
      iconBg: "bg-[#5865f2]",
      ownerId: currentUserHandle,
      ownerHandle: currentUserHandle,
      created_at: new Date().toISOString(),
      rulesAcknowledged: true,
      categories: defaultCategories,
      channels: defaultChannels,
      members: [
        {
          id: currentUserHandle,
          name: currentUserName,
          handle: currentUserHandle,
          role: "owner",
          isOnline: true,
          avatarBg: "bg-[#5865f2]",
          statusText: "Server Owner 👑",
        },
      ],
    };

    saveCommunities([newCommunity, ...communities]);
    setActiveCommunityId(newCommunity.id);
    setActiveChannelId(defaultChannels[4].id); // Open #introductions like in Screenshot 1
    setShowCreateModal(false);
    showToast(`Created "${newCommunity.name}"! 🚀`);
  };

  // Custom Create Server
  const handleCreateCustomServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName.trim()) return;
    handleCreateTemplateServer(newServerName.trim(), newServerEmoji.trim() || "🐝");
    setNewServerName("");
  };

  // Create Channel inside Active Community
  const handleCreateChannelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !activeCommunity) return;

    const formattedName = newChannelName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const newChan: CommunityChannel = {
      id: `${activeCommunity.id}-${formattedName}-${Date.now().toString().slice(-4)}`,
      name: formattedName,
      category: targetCategory,
      type: newChannelType,
      topic: `Discussions in #${formattedName}`,
    };

    const updated = communities.map((c) => {
      if (c.id === activeCommunity.id) {
        return {
          ...c,
          channels: [...c.channels, newChan],
        };
      }
      return c;
    });

    saveCommunities(updated);
    setActiveChannelId(newChan.id);
    setShowCreateChannelModal(false);
    setNewChannelName("");
    showToast(`Created #${newChan.name}!`);
  };

  // Send Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() && !attachedImage.trim()) return;
    if (!activeChannel) return;

    const newMsg: ChannelMessage = {
      id: `msg-${Date.now()}`,
      channelId: activeChannel.id,
      senderId: currentUserHandle,
      senderName: currentUserName,
      senderHandle: currentUserHandle,
      senderAvatarBg: "bg-[#5865f2]",
      content: messageInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.senderName,
            content: replyingTo.content,
          }
        : undefined,
      imageUrl: attachedImage || undefined,
      reactions: {},
      userReactions: [],
    };

    saveMessages((prev) => ({
      ...prev,
      [activeChannel.id]: [...(prev[activeChannel.id] || []), newMsg],
    }));

    setMessageInput("");
    setReplyingTo(null);
    setAttachedImage("");
    setShowEmojiPicker(false);
  };

  // Toggle Reaction on a message
  const handleToggleReaction = (msgId: string, emoji: string) => {
    if (!activeChannel) return;
    saveMessages((prev) => {
      const channelMsgs = prev[activeChannel.id] || [];
      const updated = channelMsgs.map((m) => {
        if (m.id !== msgId) return m;
        const currentCount = m.reactions?.[emoji] || 0;
        const userHasReacted = m.userReactions?.includes(emoji);

        const newReactions = { ...(m.reactions || {}) };
        let newUserReactions = [...(m.userReactions || [])];

        if (userHasReacted) {
          if (currentCount <= 1) delete newReactions[emoji];
          else newReactions[emoji] = currentCount - 1;
          newUserReactions = newUserReactions.filter((r) => r !== emoji);
        } else {
          newReactions[emoji] = currentCount + 1;
          newUserReactions.push(emoji);
        }

        return {
          ...m,
          reactions: newReactions,
          userReactions: newUserReactions,
        };
      });

      return {
        ...prev,
        [activeChannel.id]: updated,
      };
    });
  };

  // Complete rules verification
  const handleCompleteRules = () => {
    if (!activeCommunity) return;
    const updated = communities.map((c) => {
      if (c.id === activeCommunity.id) {
        return { ...c, rulesAcknowledged: true };
      }
      return c;
    });
    saveCommunities(updated);
    setShowRulesVerificationModal(false);
    showToast("Verification complete! You can now participate in all channels. 🎉");
  };

  // Delete Server
  const handleDeleteServer = (id: string) => {
    if (!confirm("Are you sure you want to delete this server?")) return;
    const remaining = communities.filter((c) => c.id !== id);
    saveCommunities(remaining);
    if (remaining.length > 0) {
      setActiveCommunityId(remaining[0].id);
      if (remaining[0].channels.length > 0) {
        setActiveChannelId(remaining[0].channels[0].id);
      }
    } else {
      setActiveCommunityId("");
      setActiveChannelId("");
    }
    showToast("Server deleted.");
  };

  const channelMessages = (activeChannel && messagesMap[activeChannel.id]) || [];

  return (
    <div className="h-screen w-screen flex bg-[#1e1f22] text-[#dbdee1] overflow-hidden select-none font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-[#5865f2] text-white px-4 py-2 rounded-lg shadow-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-top-3">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          COLUMN 1: DISCORD SERVER RAIL (72px, #1e1f22)
      ========================================================================= */}
      <div className="w-[72px] shrink-0 bg-[#1e1f22] flex flex-col items-center py-3 space-y-2 z-30 border-r border-[#151618]">
        {/* StudyHive Home / Feed Icon (Takes user back to Feed) */}
        <div className="relative group flex items-center justify-center w-full">
          <div className="absolute -left-1 w-1 bg-white rounded-r-full h-0 group-hover:h-5 transition-all duration-200" />
          <button
            onClick={onBackToFeed}
            title="StudyHive Home Feed"
            className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-[#313338] hover:bg-[#5865f2] text-white flex items-center justify-center text-xl transition-all duration-200 cursor-pointer shadow-md group"
          >
            🐝
          </button>
        </div>

        <div className="w-8 h-[2px] bg-[#35363c] rounded-full mx-auto" />

        {/* Server List */}
        <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center space-y-2 px-2 scrollbar-none">
          {communities.map((comm) => {
            const isActive = comm.id === activeCommunityId;
            return (
              <div key={comm.id} className="relative group flex items-center justify-center w-full">
                {/* Active white pill on left edge */}
                <div
                  className={`absolute -left-1 w-1 bg-white rounded-r-full transition-all duration-200 ${
                    isActive ? "h-10" : "h-0 group-hover:h-5"
                  }`}
                />

                <button
                  onClick={() => {
                    setActiveCommunityId(comm.id);
                    if (comm.channels.length > 0) {
                      setActiveChannelId(comm.channels[0].id);
                    }
                  }}
                  title={comm.name}
                  className={`w-12 h-12 flex items-center justify-center text-xl font-bold transition-all duration-200 cursor-pointer shadow-md ${
                    isActive
                      ? "rounded-[16px] bg-[#5865f2] text-white"
                      : "rounded-[24px] hover:rounded-[16px] bg-[#313338] hover:bg-[#5865f2] text-[#dbdee1] hover:text-white"
                  }`}
                >
                  {comm.iconEmoji || comm.name.substring(0, 2).toUpperCase()}
                </button>
              </div>
            );
          })}

          {/* Add a Server Button (+) */}
          <div className="relative group flex items-center justify-center w-full pt-1">
            <button
              onClick={() => setShowCreateModal(true)}
              title="Add a Server"
              className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-[#313338] hover:bg-[#23a55a] text-[#23a55a] hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          IF NO SERVERS CREATED YET: SHOW AUTHENTIC DISCORD SERVER LAUNCHER
      ========================================================================= */}
      {communities.length === 0 ? (
        <div className="flex-1 bg-[#313338] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-[#2b2d31] border border-[#3f4147] flex items-center justify-center text-4xl mb-4 shadow-xl">
            🏛️
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Create Your First Study Server</h2>
          <p className="text-sm text-[#949ba4] max-w-md mb-6 leading-relaxed">
            Your server is where you and your study groups hang out. Create channels for rules, announcements, homework help, and voice study sessions!
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleCreateTemplateServer("PayPal Developer", "💻")}
              className="px-6 py-3 bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold text-sm rounded-lg shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>⚡ Start with Developer Server (1-Click)</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-[#2b2d31] hover:bg-[#35373c] text-white font-semibold text-sm rounded-lg border border-[#3f4147] transition-all cursor-pointer"
            >
              <span>+ Create My Own Server</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* =========================================================================
              COLUMN 2: CHANNEL SIDEBAR (240px, #2b2d31)
          ========================================================================= */}
          <div className="w-60 shrink-0 bg-[#2b2d31] flex flex-col relative select-none">
            {/* Server Header Dropdown */}
            <div className="h-12 border-b border-[#1f2023] px-4 flex items-center justify-between hover:bg-[#35373c] transition-colors cursor-pointer relative"
              onClick={() => setShowServerDropdown(!showServerDropdown)}
            >
              <div className="flex items-center space-x-2 truncate">
                <span className="text-lg">{activeCommunity?.iconEmoji || "📚"}</span>
                <span className="text-sm font-bold text-white truncate">
                  {activeCommunity?.name}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-[#949ba4] shrink-0" />

              {/* Server Menu Dropdown */}
              {showServerDropdown && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-12 left-2 right-2 bg-[#111214] border border-[#232428] rounded-md p-1.5 shadow-2xl z-50 text-xs space-y-0.5 animate-in fade-in duration-100"
                >
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      showToast("Invite link copied to clipboard!");
                      setShowServerDropdown(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded text-[#949ba4] hover:text-[#5865f2] hover:bg-[#5865f2]/10 transition-colors cursor-pointer"
                  >
                    <span>Invite People</span>
                    <Share2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setTargetCategory("Community");
                      setShowCreateChannelModal(true);
                      setShowServerDropdown(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors cursor-pointer"
                  >
                    <span>Create Channel</span>
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-[1px] bg-[#232428] my-1" />

                  {activeCommunity?.ownerId === currentUserHandle && (
                    <button
                      onClick={() => {
                        handleDeleteServer(activeCommunity.id);
                        setShowServerDropdown(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded text-[#da373c] hover:bg-[#da373c]/10 transition-colors cursor-pointer"
                    >
                      <span>Delete Server</span>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Channels List */}
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin scrollbar-thumb-[#1a1b1e]">
              {(activeCommunity?.categories || []).map((cat) => {
                const catChannels = (activeCommunity?.channels || []).filter(
                  (ch) => ch.category === cat.name
                );

                return (
                  <div key={cat.id} className="space-y-0.5">
                    {/* Category Title */}
                    <div className="flex items-center justify-between px-1 text-[11px] font-bold text-[#949ba4] uppercase tracking-wider group cursor-pointer hover:text-white">
                      <span className="flex items-center space-x-1 truncate">
                        <ChevronDown className="w-3 h-3 text-[#949ba4] shrink-0" />
                        <span className="truncate">{cat.name}</span>
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetCategory(cat.name);
                          setShowCreateChannelModal(true);
                        }}
                        title="Create Channel"
                        className="opacity-0 group-hover:opacity-100 hover:text-white p-0.5 rounded cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Channels inside this category */}
                    <div className="space-y-[2px] pt-0.5">
                      {catChannels.map((channel) => {
                        const isActive = channel.id === activeChannelId;
                        const isVoice = channel.type === "voice";
                        const isConnected = connectedVoiceRoom === channel.id;

                        return (
                          <div
                            key={channel.id}
                            onClick={() => {
                              if (isVoice) {
                                if (isConnected) {
                                  setConnectedVoiceRoom(null);
                                  showToast(`Disconnected from ${channel.name}`);
                                } else {
                                  setConnectedVoiceRoom(channel.id);
                                  showToast(`Connected to ${channel.name} 🎙️`);
                                }
                              } else {
                                setActiveChannelId(channel.id);
                              }
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                              isActive
                                ? "bg-[#404249] text-white"
                                : "text-[#949ba4] hover:text-[#dbdee1] hover:bg-[#35373c]"
                            }`}
                          >
                            <div className="flex items-center space-x-1.5 truncate">
                              {channel.type === "rules" ? (
                                <Shield className="w-4 h-4 text-[#f0b232] shrink-0" />
                              ) : channel.type === "announcement" ? (
                                <Megaphone className="w-4 h-4 text-[#5865f2] shrink-0" />
                              ) : isVoice ? (
                                <Volume2
                                  className={`w-4 h-4 shrink-0 ${
                                    isConnected ? "text-[#23a55a] animate-pulse" : "text-[#949ba4]"
                                  }`}
                                />
                              ) : (
                                <Hash className="w-4 h-4 text-[#80848e] shrink-0" />
                              )}
                              <span className="truncate">{channel.name}</span>
                            </div>

                            {isVoice && isConnected && (
                              <span className="text-[9px] bg-[#23a55a]/20 text-[#23a55a] px-1 rounded font-bold">
                                RTC
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Voice Connected Tray (If in voice) */}
            {connectedVoiceRoom && (
              <div className="h-12 bg-[#232428] border-t border-[#1f2023] px-3 flex items-center justify-between">
                <div className="flex items-center space-x-2 truncate">
                  <Radio className="w-4 h-4 text-[#23a55a] animate-pulse shrink-0" />
                  <div className="truncate">
                    <p className="text-[11px] font-bold text-[#23a55a] truncate">Voice Connected</p>
                    <p className="text-[9px] text-[#949ba4]">RTC 24ms</p>
                  </div>
                </div>
                <button
                  onClick={() => setConnectedVoiceRoom(null)}
                  title="Disconnect"
                  className="p-1 hover:text-[#da373c] rounded cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Bottom User Bar (Exact Discord Format from Screenshot 1) */}
            <div className="h-14 bg-[#232428] px-2 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center space-x-2 truncate flex-1 mr-1">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-[#5865f2] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {currentUserHandle.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#23a55a] rounded-full border-2 border-[#232428]" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate leading-tight">
                    {currentUserName || currentUserHandle}
                  </p>
                  <p className="text-[10px] text-[#949ba4] truncate">Online</p>
                </div>
              </div>

              <div className="flex items-center space-x-0.5 text-[#b5bac1]">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  title={isMuted ? "Unmute" : "Mute"}
                  className={`p-1.5 rounded hover:bg-[#35373c] hover:text-white cursor-pointer ${
                    isMuted ? "text-[#da373c]" : ""
                  }`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsDeafened(!isDeafened)}
                  title={isDeafened ? "Undeafen" : "Deafen"}
                  className={`p-1.5 rounded hover:bg-[#35373c] hover:text-white cursor-pointer ${
                    isDeafened ? "text-[#da373c]" : ""
                  }`}
                >
                  {isDeafened ? <VolumeX className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => onNavigate?.("settings")}
                  title="User Settings"
                  className="p-1.5 rounded hover:bg-[#35373c] hover:text-white cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              COLUMN 3: MAIN CHAT PANE (FLEX-1, #313338)
          ========================================================================= */}
          <div className="flex-1 flex flex-col bg-[#313338] relative min-w-0">
            {/* Channel Top Header (Exact Discord Format from Screenshot 1) */}
            <div className="h-12 border-b border-[#1f2023] px-4 flex items-center justify-between shrink-0 bg-[#313338] z-10">
              <div className="flex items-center space-x-2 truncate">
                <Hash className="w-5 h-5 text-[#80848e] shrink-0" />
                <span className="text-sm font-bold text-white truncate">
                  {activeChannel?.name || "welcome"}
                </span>
                {activeChannel?.topic && (
                  <>
                    <span className="text-[#4e5058] hidden sm:inline">|</span>
                    <span className="text-xs text-[#949ba4] truncate max-w-sm hidden sm:inline">
                      {activeChannel.topic}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-3 text-[#b5bac1]">
                {/* Search in server */}
                <div className="hidden md:flex items-center bg-[#1e1f22] px-2 py-1 rounded text-xs text-[#dbdee1]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search`}
                    className="bg-transparent text-xs text-white placeholder-[#949ba4] focus:outline-none w-28 focus:w-40 transition-all"
                  />
                  <Search className="w-3.5 h-3.5 text-[#949ba4]" />
                </div>

                <button
                  onClick={() => setShowMembersSidebar(!showMembersSidebar)}
                  title="Toggle Member List"
                  className={`p-1 hover:text-white cursor-pointer ${
                    showMembersSidebar ? "text-white" : "text-[#949ba4]"
                  }`}
                >
                  <Users className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Stream (Clean vertical stream, identical to Discord Screenshot 1) */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin scrollbar-thumb-[#1a1b1e]">
              {/* Channel Welcome Header */}
              <div className="pt-4 pb-2 border-b border-[#3f4147]/50 space-y-1">
                <div className="w-16 h-16 rounded-full bg-[#2b2d31] flex items-center justify-center text-3xl mb-2">
                  <Hash className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Welcome to #{activeChannel?.name}!</h2>
                <p className="text-xs text-[#949ba4]">
                  {activeChannel?.topic || `This is the start of the #${activeChannel?.name} channel.`}
                </p>
              </div>

              {/* Message List */}
              {channelMessages.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#949ba4]">
                  No messages yet. Send the first message in #{activeChannel?.name}!
                </div>
              ) : (
                channelMessages
                  .filter((m) =>
                    searchQuery ? m.content.toLowerCase().includes(searchQuery.toLowerCase()) : true
                  )
                  .map((msg) => (
                    <div
                      key={msg.id}
                      className="group flex items-start space-x-4 hover:bg-[#2e3035] -mx-4 px-4 py-1.5 transition-colors relative"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-[#5865f2] text-white flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                        {msg.senderName.charAt(0).toUpperCase()}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Reply reference preview (if replying) */}
                        {msg.replyTo && (
                          <div className="flex items-center space-x-1 text-[11px] text-[#b5bac1] mb-1">
                            <CornerUpLeft className="w-3 h-3 text-[#949ba4]" />
                            <span className="font-bold text-[#f2a900]">@{msg.replyTo.senderName}</span>
                            <span className="truncate max-w-md italic opacity-75">{msg.replyTo.content}</span>
                          </div>
                        )}

                        {/* Author row */}
                        <div className="flex items-baseline space-x-2">
                          <span className="font-semibold text-sm text-white hover:underline cursor-pointer">
                            {msg.senderName}
                          </span>
                          <span className="text-[10px] text-[#949ba4]">{msg.timestamp}</span>
                        </div>

                        {/* Message body */}
                        <div className="text-sm text-[#dbdee1] leading-relaxed whitespace-pre-wrap select-text mt-0.5">
                          {msg.content}
                        </div>

                        {/* Attached Image if any */}
                        {msg.imageUrl && (
                          <div className="mt-2 max-w-sm rounded-lg overflow-hidden border border-[#3f4147]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={msg.imageUrl} alt="attachment" className="w-full h-auto object-cover" />
                          </div>
                        )}

                        {/* Reactions Pills */}
                        {Object.keys(msg.reactions || {}).length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            {Object.entries(msg.reactions || {}).map(([emoji, count]) => (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                  msg.userReactions?.includes(emoji)
                                    ? "bg-[#3c4270] border-[#5865f2] text-[#c9cdfb]"
                                    : "bg-[#2b2d31] border-[#3f4147] text-[#dbdee1] hover:bg-[#35373c]"
                                }`}
                              >
                                <span>{emoji}</span>
                                <span>{count}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Hover Action Toolbar */}
                      <div className="absolute right-4 -top-3 hidden group-hover:flex items-center bg-[#313338] border border-[#232428] rounded-md shadow-lg px-1 py-0.5 space-x-1 text-[#b5bac1]">
                        <button
                          onClick={() => handleToggleReaction(msg.id, "👍")}
                          title="Thumbs Up"
                          className="p-1 hover:text-white hover:bg-[#35373c] rounded cursor-pointer"
                        >
                          👍
                        </button>
                        <button
                          onClick={() => handleToggleReaction(msg.id, "🔥")}
                          title="Fire"
                          className="p-1 hover:text-white hover:bg-[#35373c] rounded cursor-pointer"
                        >
                          🔥
                        </button>
                        <button
                          onClick={() => setReplyingTo(msg)}
                          title="Reply"
                          className="p-1 hover:text-white hover:bg-[#35373c] rounded cursor-pointer"
                        >
                          <CornerUpLeft className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* =========================================================================
                BOTTOM AREA: VERIFICATION BAR OR CHAT INPUT BAR (Matches Screenshot 1)
            ========================================================================= */}
            {!activeCommunity?.rulesAcknowledged ? (
              /* The Discord Verification bar from Screenshot 1 */
              <div className="bg-[#2b2d31] border-t border-[#1f2023] p-3 px-4 flex items-center justify-between select-none">
                <span className="text-xs text-[#dbdee1]">
                  You must complete a few more steps before you can talk.
                </span>
                <button
                  onClick={() => setShowRulesVerificationModal(true)}
                  className="px-4 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-semibold rounded-md shadow transition-colors cursor-pointer"
                >
                  Complete
                </button>
              </div>
            ) : (
              /* Real Discord Chat Input Bar */
              <div className="p-3 bg-[#313338] shrink-0">
                {/* Replying banner */}
                {replyingTo && (
                  <div className="flex items-center justify-between bg-[#2b2d31] px-3 py-1.5 rounded-t-lg text-xs text-[#b5bac1] border-b border-[#383a40]">
                    <span>
                      Replying to <span className="font-bold text-white">@{replyingTo.senderName}</span>
                    </span>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <form
                  onSubmit={handleSendMessage}
                  className={`bg-[#383a40] rounded-lg px-4 py-2.5 flex items-center space-x-3 shadow-inner ${
                    replyingTo ? "rounded-t-none" : ""
                  }`}
                >
                  {/* Upload button (+) */}
                  <button
                    type="button"
                    onClick={() => setShowImageModal(true)}
                    title="Attach Image"
                    className="w-6 h-6 rounded-full bg-[#4e5058] hover:bg-[#dbdee1] hover:text-[#313338] text-[#dbdee1] flex items-center justify-center cursor-pointer transition-colors shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={`Message #${activeChannel?.name || "general"}`}
                    className="bg-transparent flex-1 text-sm text-[#dbdee1] placeholder-[#80848e] focus:outline-none"
                  />

                  {/* Emoji Picker Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="text-[#b5bac1] hover:text-white cursor-pointer"
                    >
                      <Smile className="w-5 h-5" />
                    </button>

                    {showEmojiPicker && (
                      <div className="absolute bottom-10 right-0 bg-[#2b2d31] border border-[#1f2023] rounded-lg p-2 shadow-2xl z-40 flex items-center space-x-1.5 text-lg">
                        {["👍", "🔥", "🚀", "❤️", "🎉", "🧠", "💡"].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setMessageInput((prev) => prev + " " + emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="hover:scale-125 transition-transform p-1 cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!messageInput.trim() && !attachedImage.trim()}
                    className="text-[#5865f2] disabled:opacity-30 hover:text-white transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* =========================================================================
              COLUMN 4: MEMBER LIST SIDEBAR (240px, #2b2d31, Toggleable)
          ========================================================================= */}
          {showMembersSidebar && (
            <div className="w-60 shrink-0 bg-[#2b2d31] border-l border-[#1f2023] p-4 overflow-y-auto select-none hidden lg:block">
              {/* Online Section */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[#949ba4] uppercase tracking-wider px-2">
                  Online — {activeCommunity?.members.filter((m) => m.isOnline).length || 1}
                </span>

                {activeCommunity?.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center space-x-2.5 px-2 py-1.5 rounded hover:bg-[#35373c] cursor-pointer transition-colors group"
                  >
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-[#5865f2] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#23a55a] rounded-full border-2 border-[#2b2d31]" />
                    </div>

                    <div className="truncate flex-1">
                      <div className="flex items-center space-x-1">
                        <span className="text-xs font-semibold text-[#dbdee1] group-hover:text-white truncate">
                          {member.name}
                        </span>
                        {member.role === "owner" && (
                          <span title="Server Owner" className="text-xs">
                            👑
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#949ba4] truncate">
                        {member.statusText || `@${member.handle}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          MODAL: CREATE SERVER
      ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#313338] border border-[#232428] w-full max-w-md rounded-lg p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Create Your Server</h3>
                <p className="text-xs text-[#949ba4]">
                  Give your study group a name and an icon. You can always change it later.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#949ba4] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomServer} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[#b5bac1] uppercase">Server Name</label>
                <input
                  type="text"
                  required
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="e.g. PayPal Developer Hackathon"
                  className="w-full bg-[#1e1f22] border border-[#232428] rounded p-2 text-sm text-white focus:outline-none focus:border-[#5865f2] mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#b5bac1] uppercase">Server Icon Emoji</label>
                <input
                  type="text"
                  value={newServerEmoji}
                  onChange={(e) => setNewServerEmoji(e.target.value)}
                  placeholder="e.g. 💻, 🚀, 📚, 📐"
                  className="w-full bg-[#1e1f22] border border-[#232428] rounded p-2 text-base text-white focus:outline-none focus:border-[#5865f2] mt-1 text-center"
                />
              </div>

              <div className="pt-2 border-t border-[#3f4147] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleCreateTemplateServer("Developer Study Group", "💻")}
                  className="text-xs text-[#5865f2] hover:underline"
                >
                  ⚡ Use Study Template
                </button>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs text-[#dbdee1] hover:underline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-semibold rounded shadow transition-colors cursor-pointer"
                  >
                    Create Server
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CREATE CHANNEL
      ========================================================================= */}
      {showCreateChannelModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateChannelSubmit}
            className="bg-[#313338] border border-[#232428] w-full max-w-sm rounded-lg p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-100"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create Channel</h3>
              <button
                type="button"
                onClick={() => setShowCreateChannelModal(false)}
                className="text-[#949ba4] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#b5bac1] uppercase">Channel Type</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setNewChannelType("text")}
                    className={`py-2 px-3 rounded flex items-center justify-center space-x-2 text-xs font-semibold border ${
                      newChannelType === "text"
                        ? "bg-[#404249] border-[#5865f2] text-white"
                        : "bg-[#2b2d31] border-transparent text-[#949ba4] hover:bg-[#35373c]"
                    }`}
                  >
                    <Hash className="w-4 h-4" />
                    <span>Text</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewChannelType("voice")}
                    className={`py-2 px-3 rounded flex items-center justify-center space-x-2 text-xs font-semibold border ${
                      newChannelType === "voice"
                        ? "bg-[#404249] border-[#5865f2] text-white"
                        : "bg-[#2b2d31] border-transparent text-[#949ba4] hover:bg-[#35373c]"
                    }`}
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Voice</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#b5bac1] uppercase">Channel Name</label>
                <div className="flex items-center bg-[#1e1f22] border border-[#232428] rounded px-3 py-2 mt-1">
                  <span className="text-[#80848e] text-xs mr-1">#</span>
                  <input
                    type="text"
                    required
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="new-channel"
                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#3f4147] flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowCreateChannelModal(false)}
                className="px-4 py-2 text-xs text-[#dbdee1] hover:underline"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-semibold rounded shadow transition-colors cursor-pointer"
              >
                Create Channel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODAL: RULES & VERIFICATION MODAL
      ========================================================================= */}
      {showRulesVerificationModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#313338] border border-[#232428] w-full max-w-md rounded-lg p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-100">
            <div className="flex items-center space-x-2 text-white">
              <Shield className="w-6 h-6 text-[#f0b232]" />
              <h3 className="text-base font-bold">Community Rules & Verification</h3>
            </div>

            <div className="space-y-3 text-xs text-[#dbdee1] bg-[#2b2d31] p-4 rounded-lg border border-[#3f4147]">
              <p>
                <strong>1. Academic Integrity:</strong> No sharing of unauthorized exam materials or plagiarism.
              </p>
              <p>
                <strong>2. Mutual Respect:</strong> Treat all students with respect and kindness. Zero toxicity.
              </p>
              <p>
                <strong>3. Channel Topics:</strong> Keep discussions relevant to the appropriate channels.
              </p>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setShowRulesVerificationModal(false)}
                className="px-4 py-2 text-xs text-[#dbdee1] hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteRules}
                className="px-5 py-2 bg-[#23a55a] hover:bg-[#1a8545] text-white text-xs font-bold rounded shadow transition-colors cursor-pointer"
              >
                I Agree & Verify ✅
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ATTACH IMAGE
      ========================================================================= */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#313338] border border-[#232428] w-full max-w-sm rounded-lg p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Attach Image</h3>
            <input
              type="url"
              value={attachedImage}
              onChange={(e) => setAttachedImage(e.target.value)}
              placeholder="Paste Image URL (e.g. https://...)"
              className="w-full bg-[#1e1f22] border border-[#232428] rounded p-2 text-xs text-white focus:outline-none focus:border-[#5865f2]"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowImageModal(false)}
                className="px-3 py-1.5 text-xs text-[#dbdee1]"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowImageModal(false)}
                className="px-4 py-1.5 bg-[#5865f2] text-white text-xs font-semibold rounded"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
