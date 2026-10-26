"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus, Send, Search, MoreVertical, Smile, CheckCheck, 
  MessageSquareOff, UserPlus, X, Loader2, Image as ImageIcon, 
  Bookmark, Bell, User
} from "lucide-react";

export interface ChatUser {
  id: string;
  otherUserId: string;
  name: string;
  handle: string;
  avatar: string;
  initials: string;
  avatarBg: string;
  lastMessage: string;
  timestamp: string;
  isOnline: boolean;
  isSelfChat: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  sender: "me" | "them";
  text: string;
  created_at: string;
  imageUrl?: string;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  sender_name: string;
}

const bgColors = [
  "bg-gradient-to-tr from-purple-500 to-indigo-600",
  "bg-gradient-to-tr from-emerald-500 to-teal-600",
  "bg-gradient-to-tr from-amber-500 to-orange-600",
  "bg-gradient-to-tr from-blue-500 to-cyan-600",
  "bg-gradient-to-tr from-rose-500 to-pink-600",
];

const formatDateSeparator = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function DirectMessages({ currentUserHandle = "me" }: { currentUserHandle?: string; }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ChatUser[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>("");
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>({});

  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // This filters existing chats
  
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Search & Profile States
  const [isSearchingNewUser, setIsSearchingNewUser] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState(""); // This searches the database
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearchingDB, setIsSearchingDB] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<any | null>(null);

  // Friend Request States
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [showRequestsInbox, setShowRequestsInbox] = useState(false);
  const [requestStatusMsg, setRequestStatusMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const fetchPendingRequests = useCallback(async () => {
    if (!currentUserId) return;
    const { data: reqs } = await supabase.from('friend_requests').select('*').eq('receiver_id', currentUserId).eq('status', 'pending');
    if (reqs && reqs.length > 0) {
      const senderIds = reqs.map(r => r.sender_id);
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', senderIds);
      if (profiles) {
        const mapped = reqs.map(r => ({ id: r.id, sender_id: r.sender_id, sender_name: profiles.find(p => p.id === r.sender_id)?.full_name || "Unknown Student" }));
        setPendingRequests(mapped);
      }
    } else {
      setPendingRequests([]);
    }
  }, [currentUserId]);

  useEffect(() => { fetchPendingRequests(); }, [fetchPendingRequests]);

  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return;
    const { data: memberRows } = await supabase.from("channel_members").select("channel_id").eq("user_id", currentUserId);
    if (!memberRows || memberRows.length === 0) return;
    
    const channelIds = memberRows.map((m) => m.channel_id);
    const { data: allMembers } = await supabase.from("channel_members").select("channel_id, user_id, profiles(id, full_name)").in("channel_id", channelIds);
    if (!allMembers) return;

    const chatList = await Promise.all(channelIds.map(async (cid) => {
        const channelUsers = allMembers.filter(m => m.channel_id === cid);
        let peer = channelUsers.find(m => m.user_id !== currentUserId);
        let isSelfChat = false;
        
        if (!peer && channelUsers.some(m => m.user_id === currentUserId)) {
          peer = channelUsers.find(m => m.user_id === currentUserId);
          isSelfChat = true;
        }
        if (!peer) return null;

        const name = (peer as any).profiles?.full_name || "StudyHive Peer";
        const initials = name.substring(0, 2).toUpperCase();
        
        const { data: lastMsg } = await supabase.from("messages").select("content, created_at").eq("channel_id", cid).order("created_at", { ascending: false }).limit(1).maybeSingle();

        return {
          id: cid,
          otherUserId: peer.user_id,
          name: isSelfChat ? `${name} (You)` : name,
          handle: name.toLowerCase().replace(/\s/g, "_"),
          avatar: "",
          initials,
          avatarBg: bgColors[peer.user_id.charCodeAt(0) % bgColors.length], 
          lastMessage: lastMsg?.content || "New Conversation",
          timestamp: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
          isOnline: true,
          isSelfChat
        };
      })
    );
    setConversations(chatList.filter(Boolean) as ChatUser[]);
  }, [currentUserId]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (!activeChannelId || !currentUserId) return;
    const fetchMessages = async () => {
      const { data } = await supabase.from("messages").select("*").eq("channel_id", activeChannelId).order("created_at", { ascending: true });
      if (data) {
        const formatted = data.map((msg) => ({
          id: msg.id, senderId: msg.sender_id, sender: msg.sender_id === currentUserId ? "me" : "them",
          text: msg.content, created_at: msg.created_at, imageUrl: msg.image_url,
        }));
        setMessagesMap((prev) => ({ ...prev, [activeChannelId]: formatted as ChatMessage[] }));
      }
    };
    fetchMessages();

    const realtime = supabase.channel(`chat:${activeChannelId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${activeChannelId}` },
        (payload) => {
          const newMsg = payload.new as any;
          const formatted: ChatMessage = {
            id: newMsg.id, senderId: newMsg.sender_id, sender: newMsg.sender_id === currentUserId ? "me" : "them",
            text: newMsg.content, created_at: newMsg.created_at, imageUrl: newMsg.image_url,
          };
          setMessagesMap((prev) => {
             if (prev[activeChannelId]?.find(m => m.id === formatted.id)) return prev;
             return { ...prev, [activeChannelId]: [...(prev[activeChannelId] || []), formatted] };
          });
          setConversations((prev) => prev.map((c) => c.id === activeChannelId ? { ...c, lastMessage: newMsg.content, timestamp: "Just now" } : c));
        }
      ).subscribe();
    return () => { supabase.removeChannel(realtime); };
  }, [activeChannelId, currentUserId]);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messagesMap, activeChannelId, isUploading]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!userSearchQuery.trim()) {
        if (currentUserId) {
          const { data } = await supabase.from("profiles").select("*").eq("id", currentUserId).single();
          if (data) setUserSearchResults([data]);
        }
        return;
      }
      setIsSearchingDB(true);
      const { data, error } = await supabase.from("profiles").select("*").ilike("full_name", `%${userSearchQuery}%`).limit(5);
      if (!error && data) setUserSearchResults(data);
      setIsSearchingDB(false);
    };
    const debounce = setTimeout(fetchUsers, 400);
    return () => clearTimeout(debounce);
  }, [userSearchQuery, currentUserId]);

  const sendFriendRequest = async (receiverId: string) => {
    if (!currentUserId) return;
    setRequestStatusMsg("Sending...");
    
    if (receiverId === currentUserId) {
        startChatWithUser(viewingProfile);
        setViewingProfile(null);
        return;
    }

    const { error } = await supabase.from('friend_requests').insert({ sender_id: currentUserId, receiver_id: receiverId });
    if (error) {
        if (error.code === '23505') setRequestStatusMsg("Request already sent!");
        else setRequestStatusMsg("Failed to send.");
    } else {
        setRequestStatusMsg("Request Sent!");
        setTimeout(() => { setViewingProfile(null); setRequestStatusMsg(""); }, 1500);
    }
  };

  const acceptRequest = async (requestId: string, senderId: string) => {
    if (!currentUserId) return;
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
    const { data: channel } = await supabase.from("channels").insert({ type: "dm", created_by: currentUserId }).select().single();
    if (channel) {
        await supabase.from("channel_members").insert([{ channel_id: channel.id, user_id: currentUserId, role: "admin" }, { channel_id: channel.id, user_id: senderId, role: "member" }]);
    }
    await fetchPendingRequests();
    await fetchConversations();
    if (channel) setActiveChannelId(channel.id);
    setShowRequestsInbox(false);
  };

  const declineRequest = async (requestId: string) => {
    await supabase.from('friend_requests').update({ status: 'rejected' }).eq('id', requestId);
    fetchPendingRequests();
  };

  const startChatWithUser = async (dbUser: any) => {
    if (!currentUserId) return;
    const isSelf = dbUser.id === currentUserId;
    const existingChat = conversations.find((c) => isSelf ? c.isSelfChat : c.otherUserId === dbUser.id);
    
    if (existingChat) {
      setActiveChannelId(existingChat.id);
      setIsSearchingNewUser(false);
      setUserSearchQuery("");
      return;
    }
    
    const { data: channel } = await supabase.from("channels").insert({ type: "dm", created_by: currentUserId }).select().single();
    if (channel) {
        const membersToInsert = isSelf ? [{ channel_id: channel.id, user_id: currentUserId, role: "admin" }]
            : [{ channel_id: channel.id, user_id: currentUserId, role: "admin" }, { channel_id: channel.id, user_id: dbUser.id, role: "member" }];
        await supabase.from("channel_members").insert(membersToInsert);
        await fetchConversations();
        setActiveChannelId(channel.id);
    }
    setIsSearchingNewUser(false);
    setUserSearchQuery("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return alert("Image must be under 5MB");
      setAttachedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAttachedPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };
  const removeAttachment = () => { setAttachedFile(null); setAttachedPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !attachedFile) || !activeChannelId || !currentUserId || isUploading) return;
    let publicImageUrl = null;
    const messageText = inputText.trim();
    const optimisticId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = { id: optimisticId, senderId: currentUserId, sender: "me", text: messageText || "Sending image...", created_at: new Date().toISOString(), imageUrl: attachedPreview || undefined };
    setInputText("");
    setMessagesMap((prev) => ({ ...prev, [activeChannelId]: [...(prev[activeChannelId] || []), optimisticMsg] }));

    if (attachedFile) {
      setIsUploading(true);
      const fileExt = attachedFile.name.split('.').pop();
      const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from("chat-attachments").upload(fileName, attachedFile);
      if (!error && data) publicImageUrl = supabase.storage.from("chat-attachments").getPublicUrl(data.path).data.publicUrl;
      setIsUploading(false);
      removeAttachment();
    }
    await supabase.from("messages").insert({
      id: optimisticId.replace('temp-', ''), channel_id: activeChannelId, sender_id: currentUserId, content: messageText || "Shared an image", image_url: publicImageUrl,
    });
  };

  // Local filtering for the sidebar list
  const filteredConversations = conversations.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const activeUser = conversations.find((c) => c.id === activeChannelId);
  const activeMessages = activeChannelId ? messagesMap[activeChannelId] || [] : [];
  
  return (
    <div className="flex-1 flex h-screen bg-transparent text-slate-100 overflow-hidden font-sans relative">
      
      {/* SIDEBAR */}
      <div className="w-80 shrink-0 border-r border-slate-800/80 flex flex-col h-full bg-[#030303]/95 backdrop-blur-md relative z-20">
         <div className="p-4 pl-14 md:pl-4 border-b border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight">Direct Messages</h2>
            <div className="flex space-x-2">
                <button
                onClick={() => setShowRequestsInbox(true)}
                className="relative p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                title="Friend Requests"
                >
                <Bell className="w-4 h-4" />
                {pendingRequests.length > 0 && (
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#030303]"></span>
                )}
                </button>
                <button
                onClick={() => setIsSearchingNewUser(true)}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-md"
                title="New Message"
                >
                <UserPlus className="w-4 h-4" />
                </button>
            </div>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter active chats..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs focus:border-indigo-500 focus:outline-none text-white"
            />
          </div>
        </div>

        {/* Requests Inbox Overlay */}
        {showRequestsInbox && (
          <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-xl flex flex-col">
            <div className="p-4 pl-14 md:pl-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Friend Requests</h3>
              <button onClick={() => setShowRequestsInbox(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {pendingRequests.length === 0 ? (
                    <div className="text-center text-xs text-slate-500 mt-10">No pending requests.</div>
                ) : (
                    pendingRequests.map(req => (
                        <div key={req.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col space-y-3">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                                    {req.sender_name.substring(0,2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{req.sender_name}</p>
                                    <p className="text-xs text-slate-400">Wants to connect</p>
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                <button onClick={() => acceptRequest(req.id, req.sender_id)} className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors">Accept</button>
                                <button onClick={() => declineRequest(req.id)} className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors">Decline</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
          </div>
        )}

        {/* Database User Search Overlay */}
        {isSearchingNewUser && (
          <div className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-xl flex flex-col">
            <div className="p-4 pl-14 md:pl-4 border-b border-slate-800 flex items-center gap-2">
              <input autoFocus type="text" value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} placeholder="Search to add friends..." className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500" />
              <button onClick={() => { setIsSearchingNewUser(false); setViewingProfile(null); }} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {isSearchingDB ? (
                <div className="text-center text-xs text-slate-500 mt-4">Searching database...</div>
              ) : userSearchResults.length > 0 ? (
                userSearchResults.map((user) => {
                  const isMe = user.id === currentUserId;
                  return (
                    <div 
                      key={user.id} 
                      onClick={() => {
                        if (isMe) {
                          startChatWithUser(user);
                        } else {
                          setViewingProfile(user);
                        }
                      }} 
                      className="p-3 hover:bg-slate-800 rounded-xl cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                          {user.full_name?.substring(0, 2).toUpperCase() || "U"}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{user.full_name} {isMe && "(You)"}</div>
                          <div className="text-xs text-slate-400">{isMe ? "Saved Messages / Notes" : "View Profile"}</div>
                        </div>
                      </div>
                      {isMe && <Bookmark className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />}
                    </div>
                  );
                })
              ) : userSearchQuery ? (
                <div className="text-center text-xs text-slate-500 mt-4">No users found.</div>
              ) : (
                <div className="text-center text-xs text-slate-500 mt-4">Type a name to search existing accounts.</div>
              )}
            </div>
          </div>
        )}

        {/* Profile Viewing Modal */}
        {viewingProfile && (
            <div className="absolute inset-0 z-50 bg-slate-950/98 backdrop-blur-xl flex flex-col overflow-y-auto">
                <div className="sticky top-0 p-4 flex justify-end">
                    <button onClick={() => { setViewingProfile(null); setRequestStatusMsg(""); }} className="p-2 bg-slate-900 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                
                <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto p-6 pt-0 space-y-8 pb-20">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-xl shadow-indigo-500/20">
                            {viewingProfile.full_name?.substring(0, 2).toUpperCase() || "U"}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                                {viewingProfile.full_name} {viewingProfile.id === currentUserId && <span className="text-sm font-normal text-slate-500">(You)</span>}
                            </h2>
                            <p className="text-indigo-400 font-medium">@{viewingProfile.username || viewingProfile.full_name?.toLowerCase().replace(/\s/g, "_")}</p>
                        </div>

                        {requestStatusMsg ? (
                            <div className="px-6 py-2.5 bg-slate-800 rounded-xl text-sm font-medium text-white border border-slate-700">{requestStatusMsg}</div>
                        ) : (
                            <button 
                                onClick={() => sendFriendRequest(viewingProfile.id)}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-colors flex items-center space-x-2"
                            >
                                {viewingProfile.id === currentUserId ? (
                                    <><span>Open Saved Messages</span></>
                                ) : (
                                    <><UserPlus className="w-4 h-4"/> <span>Send Friend Request</span></>
                                )}
                            </button>
                        )}
                    </div>

                    <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 space-y-6">
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bio / Learning Goal</h3>
                            <p className="text-slate-200 text-sm leading-relaxed">
                                {viewingProfile.bio || "This student hasn't added a bio yet."}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Major / Field of Study</h3>
                                <p className="text-slate-200 text-sm">{viewingProfile.major || "Not specified"}</p>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">University / College</h3>
                                <p className="text-slate-200 text-sm">{viewingProfile.university || "Not specified"}</p>
                            </div>
                        </div>

                        {viewingProfile.github_url && (
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">GitHub / Portfolio</h3>
                                <a href={viewingProfile.github_url} target="_blank" rel="noreferrer" className="text-indigo-400 text-sm hover:underline">
                                    {viewingProfile.github_url}
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
          {filteredConversations.length === 0 ? (
            <div className="p-6 flex flex-col items-center justify-center text-center space-y-3 mt-10">
              <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                <MessageSquareOff className="w-5 h-5 text-slate-500" />
              </div>
              <div className="text-xs text-slate-400 max-w-[200px]">No active chats found.</div>
            </div>
          ) : (
            filteredConversations.map((chat) => (
             <div key={chat.id} onClick={() => setActiveChannelId(chat.id)} className={`p-4 flex items-center space-x-3 cursor-pointer transition-all ${chat.id === activeChannelId ? "bg-slate-800/80 border-l-2 border-indigo-500" : "hover:bg-slate-800/40"}`}>
             <div className={`w-12 h-12 rounded-full ${chat.avatarBg} flex items-center justify-center font-bold text-white shrink-0 relative`}>
               {chat.initials}
               {chat.isSelfChat && <div className="absolute -bottom-1 -right-1 bg-[#030303] rounded-full p-0.5"><Bookmark className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/20" /></div>}
             </div>
             <div className="flex-1 min-w-0">
               <div className="flex justify-between mb-1"><h3 className="text-sm font-semibold truncate text-white">{chat.name}</h3><span className="text-[10px] text-slate-500 shrink-0">{chat.timestamp}</span></div>
               <p className="text-xs text-slate-400 truncate">{chat.lastMessage}</p>
             </div>
           </div>
          ))
          )}
        </div>
      </div>

      {/* INSTAGRAM STYLE EMPTY STATE OR CHAT WINDOW */}
      {!activeUser ? (
        <div className="flex-1 flex flex-col h-full bg-[#0a0a0a]/95 backdrop-blur-md relative z-10 border-l border-slate-800/50 shadow-2xl items-center justify-center p-6 text-center">
            <div className="w-24 h-24 rounded-full border-2 border-slate-800 flex items-center justify-center mb-6 shadow-lg bg-slate-900/50">
                <Send className="w-10 h-10 text-white ml-2 transform rotate-12" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Your Messages</h2>
            <p className="text-sm text-slate-400 mb-8 max-w-sm">
                Send private photos and messages to a friend, or save notes and links for yourself.
            </p>
            <button 
                onClick={() => setIsSearchingNewUser(true)} 
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-md flex items-center gap-2"
            >
                Send Message
            </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full bg-[#0a0a0a]/95 backdrop-blur-md relative z-10 border-l border-slate-800/50 shadow-2xl">
            <div className="h-16 px-6 border-b border-slate-800/80 bg-[#0a0a0a] flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full ${activeUser.avatarBg} flex items-center justify-center font-bold text-white`}>{activeUser.initials}</div>
                <div>
                  <h3 className="font-bold text-white text-sm leading-tight">{activeUser.name}</h3>
                  <span className="text-xs text-emerald-400 font-medium">{activeUser.isSelfChat ? "Saved Messages" : "Online"}</span>
                </div>
              </div>
            </div>

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth no-scrollbar flex flex-col">
              {activeMessages.length === 0 && (
                <div className="m-auto flex flex-col items-center justify-center text-center text-slate-500 space-y-4 max-w-sm pb-10">
                  <div className={`w-24 h-24 rounded-full ${activeUser.avatarBg} flex items-center justify-center text-4xl font-bold text-white shadow-xl`}>{activeUser.initials}</div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{activeUser.isSelfChat ? "Space for your thoughts" : `Chat with ${activeUser.name}`}</h3>
                    <p className="text-sm text-slate-400">{activeUser.isSelfChat ? "Use this space to save links, draft ideas, or upload files that you want to keep handy across all your devices." : "This is the very beginning of your direct message history."}</p>
                  </div>
                </div>
              )}

              {activeMessages.map((msg, index) => {
                const isMe = msg.sender === "me";
                const prevMsg = activeMessages[index - 1];
                const isConsecutive = prevMsg && prevMsg.sender === msg.sender;
                const showDateSeparator = !prevMsg || formatDateSeparator(msg.created_at) !== formatDateSeparator(prevMsg.created_at);
                const timeString = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <React.Fragment key={msg.id}>
                    {showDateSeparator && <div className="flex justify-center my-6"><span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[10px] font-medium text-slate-400 uppercase tracking-wider">{formatDateSeparator(msg.created_at)}</span></div>}
                    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${isConsecutive && !showDateSeparator ? "mt-1" : "mt-4"}`}>
                      <div className="flex items-end max-w-[75%] gap-2">
                        {!isMe && (!isConsecutive || showDateSeparator) ? <div className={`w-8 h-8 rounded-full ${activeUser.avatarBg} flex items-center justify-center text-xs font-bold text-white shrink-0 mb-1`}>{activeUser.initials}</div> : !isMe && <div className="w-8 shrink-0" />}
                        <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          <div className={`px-4 py-2.5 text-[15px] shadow-sm ${isMe ? "bg-indigo-600 text-white rounded-2xl rounded-br-sm" : "bg-[#1c1c1c] border border-[#2a2a2a] text-slate-200 rounded-2xl rounded-bl-sm"}`}>
                            {msg.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={msg.imageUrl} alt="attachment" className="max-w-xs rounded-xl mb-2 object-cover border border-white/10" />
                            )}
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          </div>
                          <div className={`flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-500 ${isMe ? "justify-end" : "justify-start"}`}>
                            <span>{timeString}</span>{isMe && <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              {isUploading && <div className="flex justify-end"><div className="px-4 py-2 bg-indigo-600/50 rounded-2xl text-sm flex items-center gap-2 text-indigo-200"><Loader2 className="w-4 h-4 animate-spin" /> Uploading image...</div></div>}
            </div>

            <div className="p-4 bg-[#0a0a0a] border-t border-slate-800/80 z-10 shrink-0">
              {attachedPreview && (
                <div className="mb-3 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-between max-w-sm">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={attachedPreview} className="w-10 h-10 rounded object-cover" alt="preview" />
                    <span className="text-xs text-slate-300 truncate max-w-[200px]">{attachedFile?.name}</span>
                  </div>
                  <button onClick={removeAttachment} className="p-1 hover:bg-slate-800 rounded text-slate-400"><X className="w-4 h-4"/></button>
                </div>
              )}
              
              <form onSubmit={handleSendMessage} className="bg-[#141414] border border-[#2a2a2a] rounded-2xl px-2 py-2 flex items-end shadow-sm focus-within:border-indigo-500 transition-colors">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors mb-0.5"><ImageIcon className="w-5 h-5" /></button>
                <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder={activeUser.isSelfChat ? "Jot something down..." : "Type a message..."} className="bg-transparent focus:outline-none flex-1 text-sm text-white placeholder-slate-500 px-3 py-3 resize-none max-h-32 min-h-[44px]" rows={1} />
                <button type="submit" disabled={(!inputText.trim() && !attachedFile) || isUploading} className="p-2.5 bg-indigo-600 disabled:opacity-50 text-white rounded-xl hover:bg-indigo-500 transition-colors mb-0.5 ml-2">
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            </div>
        </div>
      )}
    </div>
  );
}