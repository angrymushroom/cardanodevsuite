"use client";

import { useState } from "react";
import { MessageSquarePlus, X, Send, CheckCircle } from "lucide-react";

type FeedbackType = "feature" | "bug" | "general";

const FEEDBACK_TYPES: { value: FeedbackType; label: string }[] = [
  { value: "feature", label: "功能建议" },
  { value: "bug", label: "Bug 反馈" },
  { value: "general", label: "其他" },
];

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("feature");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError("请填写反馈内容");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message: message.trim(), email: email.trim() }),
      });
      if (!res.ok) throw new Error("提交失败");
      setSubmitted(true);
      setMessage("");
      setEmail("");
    } catch {
      setError("提交失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setSubmitted(false);
      setError("");
    }, 300);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
        aria-label="Submit feedback"
      >
        <MessageSquarePlus size={16} />
        <span>反馈</span>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={handleClose}
        />
      )}

      {/* Modal */}
      <div
        className={`fixed bottom-20 right-6 z-50 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl transition-all duration-200 ${
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-700">
          <div>
            <p className="text-slate-100 font-semibold text-sm">产品反馈</p>
            <p className="text-slate-400 text-xs mt-0.5">帮助我们做得更好</p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        {submitted ? (
          /* Success state */
          <div className="flex flex-col items-center justify-center py-8 px-4 gap-3">
            <CheckCircle size={36} className="text-emerald-400" />
            <p className="text-slate-100 font-medium text-sm">感谢你的反馈！</p>
            <p className="text-slate-400 text-xs text-center">我们会认真参考每一条建议</p>
            <button
              onClick={handleClose}
              className="mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              关闭
            </button>
          </div>
        ) : (
          /* Form */
          <div className="p-4 flex flex-col gap-3">
            {/* Type selector */}
            <div className="flex gap-2">
              {FEEDBACK_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                    type === t.value
                      ? "bg-violet-600 border-violet-500 text-white"
                      : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Message */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="描述你的想法或遇到的问题..."
              rows={4}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:border-violet-500 transition-colors"
            />

            {/* Email (optional) */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="邮箱（可选，便于我们回复你）"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />

            {error && <p className="text-red-400 text-xs">{error}</p>}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              <Send size={14} />
              {submitting ? "提交中..." : "提交反馈"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
