"use client";

import React, { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Image as ImageIcon, Upload, X, Loader2, Sparkles, Check } from "lucide-react";

interface WallpaperSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | null;
  onSelectWallpaper: (type: string, url?: string) => void;
  activeWallpaper: string;
}

export default function WallpaperSelectorModal({
  isOpen,
  onClose,
  currentUserId,
  onSelectWallpaper,
  activeWallpaper,
}: WallpaperSelectorModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Wallpaper image must be under 10MB");
      return;
    }

    setIsUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `wallpaper-${currentUserId}-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("wallpapers")
      .upload(fileName, file, { upsert: true });

    if (error) {
      alert("Failed to upload wallpaper: " + error.message);
      setIsUploading(false);
      return;
    }

    const { data: publicData } = supabase.storage
      .from("wallpapers")
      .getPublicUrl(data.path);

    const publicUrl = publicData.publicUrl;

    // Save choice to database profile
    await supabase
      .from("profiles")
      .update({
        custom_wallpaper_url: publicUrl,
        wallpaper_type: "custom",
      })
      .eq("id", currentUserId);

    setPreviewUrl(publicUrl);
    setIsUploading(false);
    onSelectWallpaper("custom", publicUrl);
  };

  const handleSelectPreset = async (presetType: string) => {
    onSelectWallpaper(presetType);
    if (currentUserId) {
      await supabase
        .from("profiles")
        .update({ wallpaper_type: presetType })
        .eq("id", currentUserId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-slate-800 rounded-3xl max-w-lg w-full p-6 relative shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <ImageIcon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Dashboard Wallpaper</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wallpaper Presets Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Preset 1: No Wallpaper */}
          <button
            onClick={() => handleSelectPreset("none")}
            className={`h-24 rounded-2xl border flex flex-col items-center justify-center transition-all ${
              activeWallpaper === "none"
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
            }`}
          >
            <div className="w-6 h-6 rounded-full border-2 border-slate-600 mb-2 flex items-center justify-center">
              {activeWallpaper === "none" && <Check className="w-3.5 h-3.5 text-indigo-400" />}
            </div>
            <span className="text-xs font-semibold text-slate-300">None</span>
          </button>

          {/* Preset 2: Lattice Flight */}
          <button
            onClick={() => handleSelectPreset("lattice")}
            className={`h-24 rounded-2xl border relative overflow-hidden flex flex-col items-center justify-center transition-all ${
              activeWallpaper === "lattice"
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
            }`}
          >
            <Sparkles className="w-5 h-5 text-emerald-400 mb-1" />
            <span className="text-xs font-semibold text-slate-300">Lattice Flight</span>
            {activeWallpaper === "lattice" && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500" />
            )}
          </button>

          {/* Preset 3: Glimmer Vale */}
          <button
            onClick={() => handleSelectPreset("glimmer")}
            className={`h-24 rounded-2xl border relative overflow-hidden flex flex-col items-center justify-center transition-all ${
              activeWallpaper === "glimmer"
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
            }`}
          >
            <Sparkles className="w-5 h-5 text-purple-400 mb-1" />
            <span className="text-xs font-semibold text-slate-300">Glimmer Vale</span>
            {activeWallpaper === "glimmer" && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500" />
            )}
          </button>
        </div>

        {/* Custom Image Upload Dropzone */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Upload Custom Wallpaper
          </label>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleCustomUpload}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-900/30 group"
          >
            {isUploading ? (
              <div className="flex items-center space-x-2 text-indigo-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Uploading image...</span>
              </div>
            ) : previewUrl || activeWallpaper === "custom" ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-full h-24 rounded-xl overflow-hidden border border-slate-700">
                  <img
                    src={previewUrl || ""}
                    alt="Custom Wallpaper"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-xs text-indigo-400 font-semibold group-hover:underline">
                  Click to replace image
                </span>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 transition-colors mb-2" />
                <p className="text-sm font-semibold text-slate-300">
                  Click to upload wallpaper
                </p>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG, or WEBP up to 10MB</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}