"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";
import { ProfessionalDisclaimerGate } from "./professional-disclaimer-gate";
import {
  LockClosedIcon,
  PaperAirplaneIcon,
  SpinnerIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  CheckCircleIcon,
} from "./ui/icons";

type ViewerRole = "CLIENT" | "ATTORNEY";

type Message = {
  id: string;
  body: string;
  senderRole: "CLIENT" | "ATTORNEY" | "SYSTEM";
  createdAt: string;
  attachments?: Array<{
    id: string;
    fileName: string | null;
    url: string;
    mimeType: string | null;
    sizeBytes: number | null;
  }>;
};

type ChatPayload = {
  privacy: {
    revealClientIdentity: boolean;
    clientName: string;
    clientPhone: string;
    attorneyName: string;
  };
  disclaimer: {
    text: string;
    viewerAccepted: boolean;
  };
  safety?: {
    conversationStatus: "OPEN" | "CLOSED";
    blockedByMe: boolean;
    blockedByPeer: boolean;
    canSendMessages: boolean;
    myPendingReports: number;
    myBlacklistScope?: "CONVERSATION" | "GLOBAL" | null;
    peerBlacklistScope?: "CONVERSATION" | "GLOBAL" | null;
    myBlacklistExpiresAt?: string | null;
    peerBlacklistExpiresAt?: string | null;
  } | null;
  messages: Message[];
  readReceipts?: {
    viewer?: {
      userId: string;
      role: "CLIENT" | "ATTORNEY" | "ADMIN";
      lastReadAt?: string | null;
      lastReadMessageId?: string | null;
      lastSeenAt?: string | null;
    } | null;
    peer?: {
      userId: string;
      role: "CLIENT" | "ATTORNEY" | "ADMIN";
      lastReadAt?: string | null;
      lastReadMessageId?: string | null;
      lastSeenAt?: string | null;
    } | null;
  };
};

type ReportAttachment = {
  id: string;
  fileName: string | null;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
};

type WorkflowPayload = {
  workflow: {
    conversationId: string;
    caseId: string;
    caseCategory?: string | null;
    caseSubCategorySlug?: string | null;
    caseStateCode?: string | null;
    tags: Array<{ id: string; tag: string; note: string | null }>;
    reminders: Array<{ id: string; title: string; note: string | null; dueAt: string; status: string }>;
    checklist: Array<{ id: string; title: string; note: string | null; required: boolean; completed: boolean }>;
    summary: { overdueReminders: number; pendingChecklistRequired: number };
    suggestions: string[];
  };
  viewer: { role: string; canEditAttorneyTools: boolean };
};

const WORKFLOW_TAGS = [
  ["HIGH_INTENT", "高意向"],
  ["HIGH_RISK", "高风险"],
  ["MISSING_MATERIALS", "资料不全"],
  ["NEEDS_FOLLOWUP", "需跟进"],
  ["DISPUTE_RISK", "争议风险"],
] as const;

type Props = {
  conversationId: string;
  viewerRole: ViewerRole;
};

const ATTORNEY_QUICK_REPLIES = [
  {
    key: "first_contact",
    label: "首次接触",
    text: "您好，我已查看您提供的案件信息。为便于我更准确评估方案和费用，请您先补充关键事实时间线、现有材料和您最希望达成的结果。",
  },
  {
    key: "request_docs",
    label: "补件请求",
    text: "为继续评估，请补充以下材料：身份文件（可打码）、相关合同/通知、往来记录截图、重要日期信息。涉及隐私内容可先做遮挡处理。",
  },
  {
    key: "quote_explain",
    label: "报价解释",
    text: "我这份报价基于目前信息范围，包含初步分析与处理方案说明。若案件范围扩大（例如新增文书/出庭/翻译需求），费用与周期会相应调整。",
  },
  {
    key: "progress_update",
    label: "进度更新",
    text: "收到，我已记录你的最新补充信息。接下来我会根据材料更新判断并给出下一步建议，请保持此会话畅通，便于我及时跟进。",
  },
] as const;

type WorkflowSidebarProps = {
  workflow: WorkflowPayload | null;
  loading: boolean;
  error: string | null;
  msg: string | null;
  reminderTitle: string;
  setReminderTitle: (v: string) => void;
  reminderDueAt: string;
  setReminderDueAt: (v: string) => void;
  checklistTitle: string;
  setChecklistTitle: (v: string) => void;
  onToggleTag: (tag: string, enabled: boolean) => void;
  onAddReminder: () => void;
  onAddChecklist: () => void;
  onApplyTemplate: (replaceExisting?: boolean) => void;
  onPatchAction: (body: unknown) => Promise<void>;
  compact?: boolean;
};

function WorkflowSidebarContent({
  workflow,
  loading,
  error,
  msg,
  reminderTitle,
  setReminderTitle,
  reminderDueAt,
  setReminderDueAt,
  checklistTitle,
  setChecklistTitle,
  onToggleTag,
  onAddReminder,
  onAddChecklist,
  onApplyTemplate,
  onPatchAction,
  compact = false,
}: WorkflowSidebarProps) {
  const canEdit = workflow?.viewer.canEditAttorneyTools ?? false;
  const listGap = compact ? "space-y-2" : "space-y-3";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workflow</p>
            <h3 className="text-sm font-semibold text-slate-900">律师工作流</h3>
          </div>
          {!canEdit && (
            <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-600">
              只读
            </span>
          )}
        </div>
        {workflow?.workflow.summary && (
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
              逾期提醒 {workflow.workflow.summary.overdueReminders}
            </span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">
              待补件 {workflow.workflow.summary.pendingChecklistRequired}
            </span>
          </div>
        )}
        {workflow?.workflow.suggestions?.length ? (
          <ul className="mt-2 list-disc pl-4 text-[11px] text-slate-600">
            {workflow.workflow.suggestions.slice(0, compact ? 2 : 4).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {msg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {msg}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </div>
      )}
      {loading && <p className="text-xs text-slate-500">工作流加载中...</p>}

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <h4 className="text-xs font-semibold text-slate-700">会话标签</h4>
        <div className="mt-2 flex flex-wrap gap-2">
          {WORKFLOW_TAGS.map(([key, label]) => {
            const active = workflow?.workflow.tags.some((t) => t.tag === key) ?? false;
            return (
              <button
                key={key}
                type="button"
                disabled={!canEdit}
                onClick={() => onToggleTag(key, !active)}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold text-slate-700">跟进提醒</h4>
          <span className="text-[10px] text-slate-500">
            {workflow?.workflow.reminders.filter((r) => r.status === "OPEN").length ?? 0} 条未完成
          </span>
        </div>
        {canEdit && (
          <div className="mt-2 space-y-2">
            <input
              value={reminderTitle}
              onChange={(e) => setReminderTitle(e.target.value)}
              placeholder="新增提醒标题"
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
            />
            <input
              type="datetime-local"
              value={reminderDueAt}
              onChange={(e) => setReminderDueAt(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={onAddReminder}
              className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              新增提醒
            </button>
          </div>
        )}
        <div className={`mt-3 ${listGap}`}>
          {(workflow?.workflow.reminders ?? []).slice(0, compact ? 3 : 8).map((r) => (
            <div key={r.id} className="rounded-md border border-slate-200 p-2">
              <p className="text-xs font-medium text-slate-900">{r.title}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {new Date(r.dueAt).toLocaleString()} · {r.status}
              </p>
              {canEdit && (
                <div className="mt-1.5 flex gap-2">
                  {r.status !== "DONE" && (
                    <button
                      type="button"
                      onClick={() => void onPatchAction({ type: "reminder", id: r.id, status: "DONE" })}
                      className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700"
                    >
                      完成
                    </button>
                  )}
                  {r.status !== "DISMISSED" && (
                    <button
                      type="button"
                      onClick={() => void onPatchAction({ type: "reminder", id: r.id, status: "DISMISSED" })}
                      className="rounded border border-slate-300 px-2 py-0.5 text-[10px] text-slate-700"
                    >
                      忽略
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {(workflow?.workflow.reminders?.length ?? 0) === 0 && (
            <p className="text-xs text-slate-500">暂无提醒</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold text-slate-700">补件清单</h4>
          <span className="text-[10px] text-slate-500">
            {workflow?.workflow.checklist.filter((c) => !c.completed).length ?? 0} 项待处理
          </span>
        </div>
        <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-2 text-[11px] text-blue-800">
          {workflow?.workflow.caseCategory
            ? `案件类型：${workflow.workflow.caseCategory}，可一键生成补件模板。`
            : "未识别案件类型，可生成通用补件模板。"}
          {canEdit && (
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onApplyTemplate(false)}
                className="rounded border border-blue-300 bg-white px-2 py-1 text-[10px] text-blue-800"
              >
                生成模板（保留现有）
              </button>
              <button
                type="button"
                onClick={() => onApplyTemplate(true)}
                className="rounded border border-blue-300 bg-blue-600 px-2 py-1 text-[10px] text-white"
              >
                重建模板（覆盖现有）
              </button>
            </div>
          )}
        </div>
        {canEdit && (
          <div className="mt-2 flex gap-2">
            <input
              value={checklistTitle}
              onChange={(e) => setChecklistTitle(e.target.value)}
              placeholder="新增补件项"
              className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={onAddChecklist}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              添加
            </button>
          </div>
        )}
        <div className={`mt-3 ${listGap}`}>
          {(workflow?.workflow.checklist ?? []).slice(0, compact ? 4 : 10).map((item) => (
            <label
              key={item.id}
              className={`flex items-start justify-between gap-2 rounded-md border p-2 ${
                item.completed ? "border-emerald-200 bg-emerald-50" : "border-slate-200"
              }`}
            >
              <div className="min-w-0">
                <p className={`text-xs ${item.completed ? "line-through text-emerald-800" : "text-slate-900"}`}>
                  {item.title}
                </p>
                <p className="text-[10px] text-slate-500">{item.required ? "必需材料" : "可选材料"}</p>
              </div>
              <input
                type="checkbox"
                checked={item.completed}
                disabled={!canEdit}
                onChange={(e) =>
                  void onPatchAction({ type: "checklist", id: item.id, completed: e.target.checked })
                }
              />
            </label>
          ))}
          {(workflow?.workflow.checklist?.length ?? 0) === 0 && (
            <p className="text-xs text-slate-500">暂无补件项</p>
          )}
        </div>
      </section>
    </div>
  );
}

export function RealtimeChat({ conversationId, viewerRole }: Props) {
  const [payload, setPayload] = useState<ChatPayload | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ── Voice recording state ────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [hasMediaRecorder, setHasMediaRecorder] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [acceptingConsultation, setAcceptingConsultation] = useState(false);
  const [acceptingDisclaimer, setAcceptingDisclaimer] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<
    "HARASSMENT" | "SPAM" | "FRAUD" | "THREAT" | "INAPPROPRIATE" | "PRIVACY" | "OTHER"
  >("HARASSMENT");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  const [reportMessagePreview, setReportMessagePreview] = useState<string | null>(null);
  const [reportAttachments, setReportAttachments] = useState<ReportAttachment[]>([]);
  const [reportUploading, setReportUploading] = useState(false);
  const [blacklistSubmitting, setBlacklistSubmitting] = useState<null | "block" | "unblock">(null);
  const [blockScope, setBlockScope] = useState<"CONVERSATION" | "GLOBAL">("CONVERSATION");
  const [blockDuration, setBlockDuration] = useState<"PERMANENT" | "24H" | "7D">("PERMANENT");
  const [workflow, setWorkflow] = useState<WorkflowPayload | null>(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [workflowMsg, setWorkflowMsg] = useState<string | null>(null);
  const [workflowPanelOpen, setWorkflowPanelOpen] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDueAt, setReminderDueAt] = useState("");
  const [checklistTitle, setChecklistTitle] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selfRole = useMemo(() => (viewerRole === "CLIENT" ? "CLIENT" : "ATTORNEY"), [viewerRole]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    const res = await fetch(`/api/conversations/${conversationId}/messages`, { cache: "no-store" });
    if (!res.ok) {
      setError("Failed to load chat.");
      return;
    }
    const json = await res.json();
    setPayload(json);
  };

  const loadWorkflow = async () => {
    setWorkflowLoading(true);
    setWorkflowError(null);
    const res = await fetch(`/api/conversations/${conversationId}/workflow`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setWorkflow(null);
      setWorkflowError(json?.error ?? "Failed to load workflow.");
      setWorkflowLoading(false);
      return;
    }
    setWorkflow(json);
    setWorkflowLoading(false);
  };

  useEffect(() => {
    void loadMessages();
    void loadWorkflow();
  }, [conversationId, viewerRole]);

  useEffect(() => {
    scrollToBottom();
  }, [payload?.messages]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ChatMessage",
          filter: `conversationId=eq.${conversationId}`,
        },
        (event) => {
          const row = event.new as Message;
          setPayload((prev) => {
            if (!prev) return prev;
            if (prev.messages.some((m) => m.id === row.id)) return prev;
            return { ...prev, messages: [...prev.messages, row] };
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const postWorkflowAction = async (body: unknown) => {
    const r = await fetch(`/api/conversations/${conversationId}/workflow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error ?? "工作流操作失败");
    await loadWorkflow();
  };

  const patchWorkflowAction = async (body: unknown) => {
    const r = await fetch(`/api/conversations/${conversationId}/workflow`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error ?? "工作流操作失败");
    await loadWorkflow();
  };

  const uploadFiles = useCallback(async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    const res = await fetch(`/api/conversations/${conversationId}/chat-attachments`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.attachments.map((a: { id: string }) => a.id);
  }, [conversationId]);

  // ── MediaRecorder availability (browser-only check) ──────────────────────
  useEffect(() => {
    setHasMediaRecorder(typeof window !== "undefined" && "MediaRecorder" in window);
  }, []);

  // ── Voice recording helpers ───────────────────────────────────────────────
  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        if (blob.size === 0) return;

        setTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");
          const res = await fetch("/api/ai/transcribe", {
            method: "POST",
            body: formData,
          });
          const json = (await res.json().catch(() => ({ text: "" }))) as { text?: string };
          if (json.text && json.text.trim()) {
            setInput((prev) => (prev ? `${prev} ${json.text}` : (json.text ?? "")));
          }
        } catch {
          // Silently fall through if transcription fails
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
    } catch {
      // Microphone access denied or unavailable
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !payload?.disclaimer.viewerAccepted || payload?.safety?.canSendMessages === false || acceptingDisclaimer) return;
    setSending(true);
    setError(null);

    let attachmentIds: string[] | undefined;
    if (pendingFiles.length > 0) {
      try {
        setUploadingFiles(true);
        attachmentIds = await uploadFiles(pendingFiles);
      } catch {
        setError("附件上传失败，请重试。");
        setSending(false);
        setUploadingFiles(false);
        return;
      } finally {
        setUploadingFiles(false);
      }
    }

    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: input,
        ...(attachmentIds && attachmentIds.length > 0 ? { attachmentIds } : {}),
      }),
    });

    setSending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to send message.");
      return;
    }
    setInput("");
    setPendingFiles([]);
  };

  const submitReport = async () => {
    setReportSubmitting(true);
    setError(null);
    const res = await fetch(`/api/conversations/${conversationId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: reportCategory,
        details: reportDetails.trim() || undefined,
        messageId: reportMessageId ?? undefined,
        attachmentIds: reportAttachments.map((a) => a.id),
      }),
    });
    setReportSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to submit report.");
      return;
    }
    setReportOpen(false);
    setReportDetails("");
    setReportMessageId(null);
    setReportMessagePreview(null);
    setReportAttachments([]);
    await loadMessages();
  };

  const uploadReportEvidence = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setReportUploading(true);
    setError(null);
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append("files", file));
      const res = await fetch(`/api/conversations/${conversationId}/report-attachments`, {
        method: "POST",
        body: form,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "上传失败");
      setReportAttachments((prev) => [...prev, ...((body?.items as ReportAttachment[]) ?? [])]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败");
    } finally {
      setReportUploading(false);
    }
  };

  const removeReportEvidence = async (attachmentId: string) => {
    setError(null);
    const res = await fetch(`/api/conversations/${conversationId}/report-attachments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attachmentId }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setError(body?.error ?? "删除附件失败");
      return;
    }
    setReportAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  const toggleBlacklist = async (action: "block" | "unblock") => {
    setBlacklistSubmitting(action);
    setError(null);
    const res = await fetch(`/api/conversations/${conversationId}/blacklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        scope: action === "block" ? blockScope : undefined,
        duration: action === "block" ? blockDuration : undefined,
        reason: action === "block" ? "用户在会话中主动拉黑" : undefined,
      }),
    });
    setBlacklistSubmitting(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to update blacklist.");
      return;
    }
    await loadMessages();
  };

  const openReportForMessage = (message: Message) => {
    setReportMessageId(message.id);
    setReportMessagePreview(message.body.slice(0, 200));
    setReportOpen(true);
  };

  const acceptConsultation = async () => {
    setAcceptingConsultation(true);
    const res = await fetch(`/api/conversations/${conversationId}/accept-consultation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setAcceptingConsultation(false);
    if (!res.ok) {
      setError("Failed to accept consultation.");
      return;
    }
    await loadMessages();
  };

  const toggleWorkflowTag = async (tag: string, enabled: boolean) => {
    try {
      setWorkflowMsg(null);
      await postWorkflowAction({ type: "tag", tag, enabled });
      setWorkflowMsg("标签已更新");
    } catch (e) {
      setWorkflowMsg(e instanceof Error ? e.message : "操作失败");
    }
  };

  const addWorkflowReminder = async () => {
    if (!reminderTitle.trim() || !reminderDueAt) return;
    try {
      setWorkflowMsg(null);
      await postWorkflowAction({
        type: "reminder",
        title: reminderTitle.trim(),
        dueAt: new Date(reminderDueAt).toISOString(),
      });
      setReminderTitle("");
      setReminderDueAt("");
      setWorkflowMsg("已创建跟进提醒");
    } catch (e) {
      setWorkflowMsg(e instanceof Error ? e.message : "操作失败");
    }
  };

  const addWorkflowChecklist = async () => {
    if (!checklistTitle.trim()) return;
    try {
      setWorkflowMsg(null);
      await postWorkflowAction({
        type: "checklist",
        title: checklistTitle.trim(),
        required: true,
      });
      setChecklistTitle("");
      setWorkflowMsg("已新增补件项");
    } catch (e) {
      setWorkflowMsg(e instanceof Error ? e.message : "操作失败");
    }
  };

  const applyChecklistTemplate = async (replaceExisting = false) => {
    try {
      setWorkflowMsg(null);
      await postWorkflowAction({
        type: "checklist_template",
        category: workflow?.workflow.caseCategory ?? undefined,
        replaceExisting,
      });
      setWorkflowMsg(replaceExisting ? "已按案件类型重建补件模板" : "已按案件类型生成补件模板");
    } catch (e) {
      setWorkflowMsg(e instanceof Error ? e.message : "生成模板失败");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  };

  const peerName =
    viewerRole === "ATTORNEY"
      ? payload?.privacy.clientName ?? "Client"
      : payload?.privacy.attorneyName ?? "Attorney";
  const myUnreadCount = useMemo(() => {
    const lastReadId = payload?.readReceipts?.viewer?.lastReadMessageId;
    if (!payload || !lastReadId) return 0;
    const idx = payload.messages.findIndex((m) => m.id === lastReadId);
    if (idx < 0) return 0;
    return payload.messages.slice(idx + 1).filter((m) => m.senderRole !== selfRole && m.senderRole !== "SYSTEM").length;
  }, [payload, selfRole]);
  const latestNonSystem = [...(payload?.messages ?? [])].reverse().find((m) => m.senderRole !== "SYSTEM");
  const waitingState =
    latestNonSystem?.senderRole === selfRole ? "待客户回复" : latestNonSystem ? "待我回复" : "暂无消息";

  const applyQuickReply = (templateText: string) => {
    setInput((prev) => (prev.trim() ? `${prev}\n${templateText}` : templateText));
  };

  // Loading state
  if (!payload) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-900">
        <SpinnerIcon className="h-8 w-8 animate-spin text-amber-500" />
        <p className="mt-3 text-sm text-slate-400">Loading conversation... / 加载中...</p>
      </div>
    );
  }

  const peerReadMessageId = payload.readReceipts?.peer?.lastReadMessageId ?? null;
  const peerReadIndex = peerReadMessageId ? payload.messages.findIndex((m) => m.id === peerReadMessageId) : -1;
  const lastSelfReadMessageId =
    peerReadIndex >= 0
      ? (() => {
          for (let i = peerReadIndex; i >= 0; i -= 1) {
            const msg = payload.messages[i];
            if (msg.senderRole === selfRole) return msg.id;
          }
          return null;
        })()
      : null;

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* ── Fixed Header ── */}
      <header className="flex-shrink-0 bg-slate-900 px-4 py-3 shadow-lg">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
          {/* Avatar */}
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-600 text-white">
            <UserCircleIcon className="h-6 w-6" />
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white">{peerName}</p>
            <div className="flex items-center gap-1.5">
              <LockClosedIcon className="h-3 w-3 text-emerald-400" />
              <span className="text-xs text-slate-400">
                Anonymous Consultation / 匿名法律咨询
              </span>
            </div>
          </div>

          {/* Shield badge */}
          <div className="flex-shrink-0">
            <ShieldCheckIcon className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="hidden md:flex flex-shrink-0 items-center gap-2 text-[10px] text-slate-300">
            <span className="rounded-full border border-slate-700 px-2 py-0.5">{waitingState}</span>
            <span className="rounded-full border border-slate-700 px-2 py-0.5">未读 {myUnreadCount}</span>
            {payload.readReceipts?.peer?.lastReadAt && (
              <span className="rounded-full border border-slate-700 px-2 py-0.5">
                对方已读 {formatTime(payload.readReceipts.peer.lastReadAt)}
              </span>
            )}
          </div>
          <div className="flex-shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
            >
              举报
            </button>
            <button
              type="button"
              disabled={blacklistSubmitting !== null}
              onClick={() => void toggleBlacklist(payload?.safety?.blockedByMe ? "unblock" : "block")}
              className={`rounded-md px-2 py-1 text-[11px] ${
                payload?.safety?.blockedByMe
                  ? "border border-emerald-700 text-emerald-300 hover:bg-emerald-900/20"
                  : "border border-rose-700 text-rose-300 hover:bg-rose-900/20"
              } disabled:opacity-50`}
            >
              {blacklistSubmitting
                ? "处理中..."
                : payload?.safety?.blockedByMe
                  ? "解除黑名单"
                  : "加入黑名单"}
            </button>
            {!payload?.safety?.blockedByMe && (
              <>
                <select
                  value={blockScope}
                  onChange={(e) => setBlockScope(e.target.value as "CONVERSATION" | "GLOBAL")}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                >
                  <option value="CONVERSATION">仅本会话禁言</option>
                  <option value="GLOBAL">全平台拉黑</option>
                </select>
                <select
                  value={blockDuration}
                  onChange={(e) => setBlockDuration(e.target.value as "PERMANENT" | "24H" | "7D")}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                >
                  <option value="PERMANENT">永久</option>
                  <option value="24H">24h</option>
                  <option value="7D">7d</option>
                </select>
              </>
            )}
          </div>
        </div>
      </header>

      {payload.safety && (payload.safety.blockedByMe || payload.safety.blockedByPeer || payload.safety.conversationStatus !== "OPEN") && (
        <div className={`flex-shrink-0 border-b px-4 py-2 ${
          payload.safety.blockedByMe || payload.safety.blockedByPeer ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-100"
        }`}>
          <div className="mx-auto max-w-3xl text-xs">
            {payload.safety.blockedByMe && <p className="text-rose-800">你已将对方加入黑名单（{payload.safety.myBlacklistScope === "GLOBAL" ? "全平台拉黑" : "仅本会话禁言"}{payload.safety.myBlacklistExpiresAt ? `，到期：${formatDateTime(payload.safety.myBlacklistExpiresAt)}` : "，永久"}），当前会话消息发送已暂停。可点击“解除黑名单”恢复。</p>}
            {!payload.safety.blockedByMe && payload.safety.blockedByPeer && <p className="text-rose-800">对方已限制与你通信（{payload.safety.peerBlacklistScope === "GLOBAL" ? "全平台拉黑" : "仅本会话禁言"}{payload.safety.peerBlacklistExpiresAt ? `，到期：${formatDateTime(payload.safety.peerBlacklistExpiresAt)}` : "，永久"}），当前无法继续发送消息。你仍可向平台举报。</p>}
            {payload.safety.conversationStatus !== "OPEN" && <p className="text-slate-700">该会话已关闭，不能继续发送消息。</p>}
            {payload.safety.myPendingReports > 0 && <p className="text-slate-600 mt-1">你有 {payload.safety.myPendingReports} 条举报正在处理。</p>}
          </div>
        </div>
      )}

      {/* ── Disclaimer Gate (inline banner) ── */}
      {!payload.disclaimer.viewerAccepted && (
        <div className="flex-shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-3">
          <div className="mx-auto max-w-3xl">
            <ProfessionalDisclaimerGate
              conversationId={conversationId}
              text={payload.disclaimer.text}
              accepted={payload.disclaimer.viewerAccepted}
              onAccepted={async () => {
                setAcceptingDisclaimer(true);
                try {
                  setPayload((prev) =>
                    prev
                      ? {
                          ...prev,
                          disclaimer: {
                            ...prev.disclaimer,
                            viewerAccepted: true,
                          },
                        }
                      : prev,
                  );
                  await loadMessages();
                } finally {
                  setAcceptingDisclaimer(false);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* ── Identity Reveal Banner (client only, before acceptance) ── */}
      {viewerRole === "CLIENT" && !payload.privacy.revealClientIdentity && (
        <div className="flex-shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-900">
                Share your contact information / 分享您的联系方式
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                Reveal your name and phone to the attorney to proceed with formal representation.
              </p>
            </div>
            <button
              type="button"
              onClick={acceptConsultation}
              disabled={acceptingConsultation}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-60 transition-colors"
            >
              {acceptingConsultation ? (
                <SpinnerIcon className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircleIcon className="h-4 w-4" />
              )}
              Accept Consultation / 接受咨询
            </button>
          </div>
        </div>
      )}

      {/* ── Identity revealed confirmation ── */}
      {viewerRole === "CLIENT" && payload.privacy.revealClientIdentity && (
        <div className="flex-shrink-0 border-b border-emerald-200 bg-emerald-50 px-4 py-2">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 flex-shrink-0 text-emerald-600" />
            <p className="text-xs text-emerald-800">
              Contact shared with attorney · Phone:{" "}
              <span className="font-medium">{payload.privacy.clientPhone}</span>
            </p>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
            <div className="mx-auto flex max-w-3xl items-center justify-between">
              <p className="text-xs font-semibold text-slate-600">律师工作流侧栏</p>
              <button
                type="button"
                onClick={() => setWorkflowPanelOpen((v) => !v)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
              >
                {workflowPanelOpen ? "收起" : "展开"}
              </button>
            </div>
          </div>

          {workflowPanelOpen && (
            <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
              <div className="mx-auto max-w-3xl">
                <WorkflowSidebarContent
                  workflow={workflow}
                  loading={workflowLoading}
                  error={workflowError}
                  msg={workflowMsg}
                  reminderTitle={reminderTitle}
                  setReminderTitle={setReminderTitle}
                  reminderDueAt={reminderDueAt}
                  setReminderDueAt={setReminderDueAt}
                  checklistTitle={checklistTitle}
                  setChecklistTitle={setChecklistTitle}
                  onToggleTag={toggleWorkflowTag}
                  onAddReminder={addWorkflowReminder}
              onAddChecklist={addWorkflowChecklist}
              onApplyTemplate={applyChecklistTemplate}
              onPatchAction={patchWorkflowAction}
              compact
                />
              </div>
            </div>
          )}

          {/* ── Scrollable Message Area ── */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
              {payload.messages.length === 0 && (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-200">
                    <LockClosedIcon className="h-7 w-7 text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">No messages yet / 暂无消息</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Send a message to start the consultation. / 发送消息开始咨询。
                  </p>
                </div>
              )}

              {payload.messages.map((message) => {
                const isSelf = message.senderRole === selfRole;
                const isSystem = message.senderRole === "SYSTEM";

                if (isSystem) {
                  return (
                    <div key={message.id} className="flex justify-center">
                      <div className="rounded-full bg-slate-200 px-4 py-1.5 text-xs text-slate-600">
                        {message.body}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={message.id}
                    className={`flex items-end gap-2 ${isSelf ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className={`mb-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                        isSelf ? "bg-slate-700" : "bg-amber-600"
                      }`}
                    >
                      {isSelf ? (viewerRole === "CLIENT" ? "C" : "A") : viewerRole === "CLIENT" ? "A" : "C"}
                    </div>
                    <div
                      className={`max-w-[72%] rounded-2xl px-4 py-2.5 shadow-sm ${
                        isSelf
                          ? "rounded-tr-sm bg-slate-900 text-white"
                          : "rounded-tl-sm border border-slate-200 bg-white text-slate-900"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((att) =>
                            att.mimeType?.startsWith("image/") ? (
                              <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer">
                                <img src={att.url} alt={att.fileName || "image"} className="max-w-[240px] rounded-lg" loading="lazy" />
                              </a>
                            ) : (
                              <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs hover:bg-gray-50">
                                <span>&#128206;</span> {att.fileName || "file"} {att.sizeBytes ? `(${(att.sizeBytes / 1024).toFixed(1)} KB)` : ""}
                              </a>
                            ),
                          )}
                        </div>
                      )}
                      <p className="mt-1 text-right text-[10px] text-slate-400">{formatTime(message.createdAt)}</p>
                      {isSelf && lastSelfReadMessageId === message.id && (
                        <p className="mt-0.5 text-right text-[10px] text-emerald-300">已读</p>
                      )}
                      <div className="mt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => openReportForMessage(message)}
                          className={`text-[10px] underline ${isSelf ? "text-slate-300" : "text-slate-500 hover:text-slate-700"}`}
                        >
                          举报此消息
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* ── Fixed Input Area ── */}
          <div className="flex-shrink-0 border-t border-slate-200 bg-white px-4 py-3">
            <div className="mx-auto max-w-3xl">
              {error && (
                <div className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  {error}
                </div>
              )}
              {viewerRole === "ATTORNEY" && (
                <>
                  <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                    法律边界提示：在双方正式完成委托确认前，此会话用于初步沟通与信息收集，不当然构成正式代理关系或最终法律意见。
                  </div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-slate-500">快速回复模板：</span>
                    {ATTORNEY_QUICK_REPLIES.map((tpl) => (
                      <button
                        key={tpl.key}
                        type="button"
                        onClick={() => applyQuickReply(tpl.text)}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                  沟通状态：{waitingState}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                  会话未读：{myUnreadCount}
                </span>
                {payload.readReceipts?.peer?.lastReadMessageId && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                    对方已读到某条消息
                  </span>
                )}
              </div>
              {pendingFiles.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2 rounded-lg border border-slate-200 px-3 py-2">
                  {pendingFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs">
                      <span className="max-w-[120px] truncate">{f.name}</span>
                      <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">&times;</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-3">
                <textarea
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!payload.disclaimer.viewerAccepted || sending || acceptingDisclaimer || payload.safety?.canSendMessages === false}
                  className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  placeholder={
                    payload.safety?.canSendMessages === false
                      ? "当前会话已被限制发送（黑名单或会话关闭）。"
                      : acceptingDisclaimer
                        ? "免责声明确认同步中，请稍候..."
                      : payload.disclaimer.viewerAccepted
                        ? "Type a message… (Enter to send, Shift+Enter for new line) / 输入消息（Enter 发送）"
                        : "Please accept the disclaimer above to start messaging. / 请先接受免责声明。"
                  }
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                    e.currentTarget.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!payload.disclaimer.viewerAccepted || sending || acceptingDisclaimer || payload.safety?.canSendMessages === false}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-slate-300 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  title="上传附件"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                </button>
                {/* 🎤 Voice recording button */}
                {hasMediaRecorder && (
                  <button
                    type="button"
                    disabled={sending || acceptingDisclaimer || transcribing || payload.safety?.canSendMessages === false}
                    onClick={isRecording ? stopRecording : () => void startRecording()}
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                      isRecording ? "animate-pulse bg-red-600 hover:bg-red-500"
                        : transcribing ? "cursor-wait bg-amber-500"
                        : "bg-slate-600 hover:bg-slate-500"
                    }`}
                    aria-label={isRecording ? "停止录音 Stop recording" : "语音输入 Voice input"}
                    title={isRecording ? "点击停止录音并转文字" : transcribing ? "正在转文字..." : "语音输入（点击录音，再次点击停止）"}
                  >
                    {transcribing ? (
                      <SpinnerIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="text-base leading-none" aria-hidden>{isRecording ? "⏹" : "🎤"}</span>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={sending || uploadingFiles || acceptingDisclaimer || !input.trim() || !payload.disclaimer.viewerAccepted || payload.safety?.canSendMessages === false}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Send message"
                >
                  {sending || uploadingFiles ? (
                    <SpinnerIcon className="h-5 w-5 animate-spin" />
                  ) : (
                    <PaperAirplaneIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
          <p className="mt-1.5 text-center text-[10px] text-slate-400">
            This is a confidential consultation channel · 本频道受保密协议保护
          </p>
          {payload.readReceipts?.peer?.lastReadAt && (
            <p className="mt-1 text-center text-[10px] text-slate-500">
              对方已读时间：{formatDateTime(payload.readReceipts.peer.lastReadAt)}
            </p>
          )}
        </div>
      </div>
        </div>

        <aside className="hidden w-[360px] flex-shrink-0 border-l border-slate-200 bg-white lg:block">
          <div className="h-full overflow-y-auto p-4">
            <WorkflowSidebarContent
              workflow={workflow}
              loading={workflowLoading}
              error={workflowError}
              msg={workflowMsg}
              reminderTitle={reminderTitle}
              setReminderTitle={setReminderTitle}
              reminderDueAt={reminderDueAt}
              setReminderDueAt={setReminderDueAt}
              checklistTitle={checklistTitle}
              setChecklistTitle={setChecklistTitle}
              onToggleTag={toggleWorkflowTag}
              onAddReminder={addWorkflowReminder}
              onAddChecklist={addWorkflowChecklist}
              onApplyTemplate={applyChecklistTemplate}
              onPatchAction={patchWorkflowAction}
            />
          </div>
        </aside>
      </div>

      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">向平台举报该会话</h3>
            <p className="mt-1 text-sm text-slate-500">平台会审核举报并可采取警告、拉黑、关闭会话等处理。</p>
            <div className="mt-4 space-y-3">
              {reportMessageId && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-800">已绑定举报消息</p>
                  <p className="mt-1 text-xs text-amber-700 break-all">Message ID: {reportMessageId}</p>
                  <p className="mt-1 text-xs text-amber-700 line-clamp-3">{reportMessagePreview ?? ""}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setReportMessageId(null);
                      setReportMessagePreview(null);
                    }}
                    className="mt-2 text-xs underline text-amber-700"
                  >
                    改为举报整个会话
                  </button>
                </div>
              )}
              <label className="block text-sm">
                <span className="mb-1 block text-slate-700">举报类型</span>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value as typeof reportCategory)}
                >
                  <option value="HARASSMENT">骚扰 / Harassment</option>
                  <option value="SPAM">垃圾消息 / Spam</option>
                  <option value="FRAUD">诈骗 / Fraud</option>
                  <option value="THREAT">威胁 / Threat</option>
                  <option value="INAPPROPRIATE">不当内容 / Inappropriate</option>
                  <option value="PRIVACY">隐私问题 / Privacy</option>
                  <option value="OTHER">其他 / Other</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-700">补充说明（可选）</span>
                <textarea
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="请描述问题发生时间、具体内容、希望平台如何处理..."
                />
              </label>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700">证据附件（截图 / PDF）</p>
                  <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50">
                    {reportUploading ? "上传中..." : "上传附件"}
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      className="hidden"
                      disabled={reportUploading}
                      onChange={(e) => {
                        void uploadReportEvidence(e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
                <p className="mt-1 text-xs text-slate-500">最多 5 个文件，单个不超过 15MB。提交举报前可删除。</p>
                {reportAttachments.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {reportAttachments.map((att) => (
                      <div key={att.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-xs">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-700">{att.fileName || att.id}</p>
                          <p className="text-slate-500">
                            {(att.mimeType ?? "file")} · {att.sizeBytes ? `${(att.sizeBytes / 1024).toFixed(1)} KB` : "-"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={att.url} target="_blank" rel="noreferrer" className="underline text-slate-600">预览</a>
                          <button type="button" onClick={() => void removeReportEvidence(att.id)} className="text-rose-600 underline">删除</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">暂无附件</p>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setReportOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">取消</button>
              <button type="button" onClick={() => void submitReport()} disabled={reportSubmitting} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50">
                {reportSubmitting ? "提交中..." : "提交举报"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
