"use client";

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Send,
  Search,
  MoreVertical,
  Smile,
  CheckCheck,
  MessageSquareOff,
  UserPlus,
  X
} from "lucide-react";

export interface ChatUser {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  initials: string;
  avatarBg: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  isOnline: boolean;
}

export interface ChatMessage {
  id: string;
  sender: "me" | "them";
  text: string;
  timestamp: string;
  imageUrl?: string;
}

interface DirectMessagesProps {
  currentUserHandle?: string;
  currentUserName?: string;
  onBackToFeed?: () => void;
}

// Generate random colors for avatars
const bgColors = [
  "bg-gradient-to-tr from-purple-500 to-indigo-600",
  "bg-gradient-to-tr from-emerald-500 to-teal-600",
  "bg-gradient-to-tr from-amber-500 to-orange-600",
  "bg-gradient-to-tr from-blue-500 to-cyan-600",
  "bg-gradient-to-tr from-rose-500 to-pink-600",
];

let msgCounter = 100;
function createMessageId(): string {
  msgCounter += 1;
  return `msg-${msgCounter}`;
}

export default function DirectMessages({
  currentUserHandle = "me",
}: DirectMessagesProps) {
  const [conversations, setConversations] = useState<ChatUser[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(`studyhive:dm:${currentUserHandle}`);
      const parsed = raw ? JSON.parse(raw) : { conversations: [] };
      return Array.isArray(parsed.conversations) ? parsed.conversations : [];
    } catch {
      return [];
    }
  });

  const [activeUserId, setActiveUserId] = useState<string>("");
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(`studyhive:dm:${currentUserHandle}`);
      const parsed = raw ? JSON.parse(raw) : { messagesMap: {} };
      return parsed.messagesMap && typeof parsed.messagesMap === "object" ? parsed.messagesMap : {};
    } catch {
      return {};
    }
  });

  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  
  // Real User Search State
  const [isSearchingNewUser, setIsSearchingNewUser] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearchingDB, setIsSearchingDB] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        `studyhive:dm:${currentUserHandle}`,
        JSON.stringify({ conversations, messagesMap })
      );
    } catch {}
  }, [conversations, messagesMap, currentUserHandle]);

  const activeUser = conversations.find((c) => c.id === activeUserId) || null;
  const activeMessages = activeUser ? messagesMap[activeUser.id] || [] : [];

  // Scroll to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [activeMessages.length, activeUserId]);

  // Search actual Supabase Users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!userSearchQuery.trim()) {
        setUserSearchResults([]);
        return;
      }
      setIsSearchingDB(true);
      
      // Query the 'profiles' table created during signup
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', `%${userSearchQuery}%`)
        .limit(5);

      if (!error && data) {
        // Don't show ourselves in the search
        setUserSearchResults(data.filter(u => u.full_name !== currentUserHandle));
      }
      setIsSearchingDB(false);
    };

    const debounce = setTimeout(fetchUsers, 500);
    return () => clearTimeout(debounce);
  }, [userSearchQuery, currentUserHandle]);

  // Start new chat with real user
  const startChatWithUser = (dbUser: any) => {
    const existingChat = conversations.find(c => c.id === dbUser.id);
    
    if (existingChat) {
      setActiveUserId(existingChat.id);
    } else {
      const name = dbUser.full_name || "Unknown User";
      const initials = name.substring(0, 2).toUpperCase();
      const randomBg = bgColors[Math.floor(Math.random() * bgColors.length)];

      const newChatUser: ChatUser = {
        id: dbUser.id,
        name: name,
        handle: name.toLowerCase().replace(/\s/g, '_'),
        avatar: "",
        initials: initials,
        avatarBg: randomBg,
        lastMessage: "New Conversation",
        timestamp: "Now",
        unreadCount: 0,
        isOnline: false,
      };

      setConversations(prev => [newChatUser, ...prev]);
      setActiveUserId(dbUser.id);
    }
    
    setIsSearchingNewUser(false);
    setUserSearchQuery("");
  };

  // Handle Send Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachedImage || !activeUser) return;

    const newMsg: ChatMessage = {
      id: createMessageId(),
      sender: "me",
      text: inputText.trim(),
      timestamp: "Just now",
      imageUrl: attachedImage || undefined,
    };

    setMessagesMap((prev) => ({
      ...prev,
      [activeUser.id]: [...(prev[activeUser.id] || []), newMsg],
    }));

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeUser.id
          ? { ...c, lastMessage: inputText.trim() || "Sent an image", timestamp: "Just now", unreadCount: 0 }
          : c
      )
    );

    setInputText("");
    setAttachedImage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAttachedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 
        ========================================================================
        COLUMN 2: CHAT LIST PANE
        ========================================================================
      */}
      <div className="w-80 shrink-0 border-r border-slate-800/80 bg-slate-950 flex flex-col h-full select-none relative">
        <div className="p-4 border-b border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight">Direct Messages</h2>
            <button 
              onClick={() => setIsSearchingNewUser(true)}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-md"
              title="New Message"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter conversations..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Database User Search Overlay */}
        {isSearchingNewUser && (
          <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search real users by name..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <button 
                onClick={() => setIsSearchingNewUser(false)}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {isSearchingDB ? (
                <div className="text-center text-xs text-slate-500 mt-4">Searching database...</div>
              ) : userSearchResults.length > 0 ? (
                userSearchResults.map(user => (
                  <div 
                    key={user.id} 
                    onClick={() => startChatWithUser(user)}
                    className="p-3 hover:bg-slate-800 rounded-xl cursor-pointer flex items-center gap-3 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                      {user.full_name?.substring(0, 2).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{user.full_name}</div>
                      <div className="text-xs text-slate-400">Click to start chatting</div>
                    </div>
                  </div>
                ))
              ) : userSearchQuery ? (
                <div className="text-center text-xs text-slate-500 mt-4">No users found.</div>
              ) : (
                <div className="text-center text-xs text-slate-500 mt-4">Type a name to search existing accounts.</div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto divide-y divide-slate-850 no-scrollbar">
          {filteredConversations.length === 0 ? (
            <div className="p-6 flex flex-col items-center justify-center text-center space-y-3 mt-10">
              <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                 <MessageSquareOff className="w-5 h-5 text-slate-500" />
              </div>
              <div className="text-xs text-slate-400 max-w-[200px]">
                No active chats. Click the + button above to find someone!
              </div>
            </div>
          ) : (
            filteredConversations.map((chat) => {
              const isActive = chat.id === activeUserId;
              return (
                <div
                  key={chat.id}
                  onClick={() => {
                    setActiveUserId(chat.id);
                    setConversations((prev) =>
                      prev.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c))
                    );
                  }}
                  className={`p-3.5 flex items-center space-x-3 cursor-pointer transition-all ${
                    isActive
                      ? "bg-slate-800/80 border-l-2 border-indigo-500"
                      : "hover:bg-slate-800/50"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full ${chat.avatarBg} flex items-center justify-center text-sm font-bold text-white shadow-md`}
                    >
                      {chat.initials}
                    </div>
                    {chat.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3
                        className={`text-sm truncate font-semibold ${
                          isActive ? "text-white" : "text-slate-200"
                        }`}
                      >
                        {chat.name}
                      </h3>
                      <span className="text-[11px] text-slate-500 shrink-0 ml-1">
                        {chat.timestamp}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400 truncate max-w-[170px]">
                        {chat.lastMessage}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 
        ========================================================================
        COLUMN 3: ACTIVE CHAT WINDOW 
        ========================================================================
      */}
      <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
        
        {!activeUser ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
             <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center shadow-lg">
                <Send className="w-8 h-8 text-indigo-500/50 ml-1" />
             </div>
             <p className="text-sm font-semibold text-slate-300">Your Messages</p>
             <p className="text-xs text-slate-500">Select a conversation to start chatting.</p>
          </div>
        ) : (
          <>
            <div className="h-16 px-6 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center space-x-3.5">
                <div className="relative">
                  <div
                    className={`w-10 h-10 rounded-full ${activeUser.avatarBg} flex items-center justify-center text-sm font-bold text-white shadow-md`}
                  >
                    {activeUser.initials}
                  </div>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-white text-sm">{activeUser.name}</h3>
                    <span className="text-[11px] text-slate-500 font-normal">
                      @{activeUser.handle}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1 text-slate-400">
                <button
                  className="p-2 hover:text-white hover:bg-slate-800/70 rounded-full transition-colors cursor-pointer"
                  title="More Options"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-950 no-scrollbar"
            >
              {activeMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
                  <div
                    className={`w-16 h-16 rounded-full ${activeUser.avatarBg} flex items-center justify-center text-2xl font-bold text-white shadow-xl mb-2`}
                  >
                    {activeUser.initials}
                  </div>
                  <p className="text-sm font-semibold text-white">This is the start of your chat with {activeUser.name}</p>
                </div>
              ) : (
                activeMessages.map((msg) => {
                  const isMe = msg.sender === "me";

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end space-x-2 ${
                        isMe ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isMe && (
                        <div
                          className={`w-8 h-8 rounded-full ${activeUser.avatarBg} flex items-center justify-center text-xs font-bold text-white shrink-0 mb-1 shadow-sm`}
                          title={activeUser.name}
                        >
                          {activeUser.initials}
                        </div>
                      )}

                      <div
                        className={`flex flex-col ${
                          isMe ? "items-end" : "items-start"
                        } max-w-[70%]`}
                      >
                        <div
                          className={`px-4 py-2.5 text-sm shadow-md break-words ${
                            isMe
                              ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm"
                              : "bg-slate-800 text-slate-200 rounded-2xl rounded-tl-sm"
                          }`}
                        >
                          <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                          {msg.imageUrl && (
                            <div className="mt-2 rounded-xl overflow-hidden max-h-56 bg-black border border-white/10">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={msg.imageUrl} alt="Attachment" className="w-full h-auto object-cover max-h-56" />
                            </div>
                          )}
                        </div>
                        <div
                          className={`flex items-center space-x-1 text-[10px] text-slate-500 mt-1 px-1 ${
                            isMe ? "justify-end" : "justify-start"
                          }`}
                        >
                          <span>{msg.timestamp}</span>
                          {isMe && <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {attachedImage && (
              <div className="px-6 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={attachedImage} alt="Upload preview" className="w-12 h-12 rounded-lg object-cover border border-slate-700" />
                  <span className="text-xs text-slate-300">Image attached</span>
                </div>
                <button onClick={() => setAttachedImage(null)} className="text-xs text-red-400 hover:text-red-300 p-1">Remove</button>
              </div>
            )}

            <div className="p-4 border-t border-slate-800/80 bg-slate-950 shrink-0">
              <form
                onSubmit={handleSendMessage}
                className="bg-slate-900 border border-slate-700 rounded-full px-4 py-2 flex items-center shadow-lg transition-all focus-within:border-indigo-500"
              >
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0" >
                  <Plus className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Message @${activeUser.handle}...`}
                  className="bg-transparent focus:outline-none flex-1 text-sm text-white placeholder-slate-400 px-3"
                />
                <button type="button" onClick={() => setInputText((prev) => prev + " 🐝")} className="p-1 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer shrink-0 mr-1 hidden sm:inline-block">
                  <Smile className="w-4 h-4" />
                </button>
                <button type="submit" disabled={!inputText.trim() && !attachedImage} className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-full transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center cursor-pointer shrink-0">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}