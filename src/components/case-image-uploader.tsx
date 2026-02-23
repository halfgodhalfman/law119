"use client";

import { useRef, useState } from "react";
import { SpinnerIcon, XMarkIcon } from "./ui/icons";

const MAX_IMAGES = 9;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"];

type LocalImage = {
  id: string; // temp local id
  file: File;
  previewUrl: string;
  status: "pending" | "uploading" | "done" | "error";
  errorMsg?: string;
  remoteId?: string; // id returned after upload
};

type Props = {
  caseId: string;
  onCountChange?: (count: number) => void;
};

export function CaseImageUploader({ caseId, onCountChange }: Props) {
  const [images, setImages] = useState<LocalImage[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const updateImage = (id: string, patch: Partial<LocalImage>) =>
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, ...patch } : img)));

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setGlobalError(null);

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setGlobalError(`最多上传 ${MAX_IMAGES} 张图片 / Maximum ${MAX_IMAGES} images.`);
      return;
    }

    const toAdd = Array.from(files).slice(0, remaining);

    // Validate
    for (const file of toAdd) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setGlobalError(`不支持的文件格式: ${file.name}。请上传 JPG / PNG / WEBP 图片。`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setGlobalError(`文件 "${file.name}" 超过 10MB 限制。`);
        return;
      }
    }

    // Create local previews
    const newImages: LocalImage[] = toAdd.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "pending",
    }));

    setImages((prev) => {
      const updated = [...prev, ...newImages];
      onCountChange?.(updated.length);
      return updated;
    });

    // Upload each file
    for (const img of newImages) {
      updateImage(img.id, { status: "uploading" });

      const formData = new FormData();
      formData.append("caseId", caseId);
      formData.append("images", img.file);

      try {
        const res = await fetch("/api/cases/upload-images", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();

        if (!res.ok) {
          updateImage(img.id, { status: "error", errorMsg: json?.error ?? "上传失败" });
        } else {
          updateImage(img.id, { status: "done" });
        }
      } catch {
        updateImage(img.id, { status: "error", errorMsg: "网络错误，请重试" });
      }
    }
  };

  const handleRemove = async (img: LocalImage) => {
    // Revoke object URL
    URL.revokeObjectURL(img.previewUrl);

    // If already uploaded, delete from server
    if (img.status === "done" && img.remoteId) {
      await fetch("/api/cases/upload-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: img.remoteId }),
      });
    }

    setImages((prev) => {
      const updated = prev.filter((i) => i.id !== img.id);
      onCountChange?.(updated.length);
      return updated;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    void handleFiles(e.dataTransfer.files);
  };

  const doneCount = images.filter((i) => i.status === "done").length;
  const uploadingCount = images.filter((i) => i.status === "uploading").length;
  const canAddMore = images.length < MAX_IMAGES;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700">
          案件图片（可选）/ Case Photos (Optional)
        </label>
        <span className="text-xs text-slate-400">
          {images.length} / {MAX_IMAGES} 张
        </span>
      </div>

      {/* Upload zone */}
      {canAddMore && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition-colors hover:border-amber-400 hover:bg-amber-50/40"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
            <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">
              点击或拖拽上传图片 / Click or drag to upload
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              JPG · PNG · WEBP · HEIC &nbsp;·&nbsp; 每张最大 10MB &nbsp;·&nbsp; 最多 {MAX_IMAGES} 张
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            multiple
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
            // Reset input so same file can be re-selected after removal
            onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
          />
        </div>
      )}

      {/* Error */}
      {globalError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {globalError}
        </div>
      )}

      {/* Upload status summary */}
      {uploadingCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-700">
          <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
          正在上传 {uploadingCount} 张图片... / Uploading {uploadingCount} image(s)...
        </div>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {images.map((img) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {/* Preview */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.previewUrl}
                alt="case photo"
                className="h-full w-full object-cover"
              />

              {/* Uploading overlay */}
              {img.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <SpinnerIcon className="h-6 w-6 animate-spin text-white" />
                </div>
              )}

              {/* Error overlay */}
              {img.status === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-rose-900/70 p-1">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <p className="text-center text-[9px] leading-tight text-white">{img.errorMsg}</p>
                </div>
              )}

              {/* Done checkmark */}
              {img.status === "done" && (
                <div className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                  <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              )}

              {/* Remove button */}
              {img.status !== "uploading" && (
                <button
                  type="button"
                  onClick={() => void handleRemove(img)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remove image"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tip */}
      {doneCount > 0 && (
        <p className="text-xs text-slate-400">
          已上传 {doneCount} 张 · 律师可在匹配后查看 / {doneCount} uploaded · Visible to matched attorneys
        </p>
      )}
    </div>
  );
}
