"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { ReportModal } from "@/components/clicks/ReportModal";
import { useAuth } from "@/lib/auth-context";
import {
  getClickComments,
  postClickComment,
  deleteClickComment,
  CommentRateLimitError,
  type ClickComment,
} from "@/lib/real-clicks-social";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/** Comment thread (spec section 10) — plain chronological list, an input
 * at the bottom, and inline delete for your own comments. Loads once on
 * mount; a posted or deleted comment updates local state directly rather
 * than refetching the whole thread. */
export function CommentsSection({ clickId }: { clickId: string }) {
  const { user, requireAuth } = useAuth();
  const [comments, setComments] = useState<ClickComment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getClickComments(clickId, user?.id ?? null).then((data) => {
      if (!cancelled) setComments(data);
    });
    return () => {
      cancelled = true;
    };
  }, [clickId, user?.id]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    requireAuth("comment on this Click", async () => {
      if (!user) return;
      setPosting(true);
      setError(null);
      try {
        const comment = await postClickComment(clickId, user.id, trimmed);
        setComments((prev) => [...(prev ?? []), comment]);
        setDraft("");
      } catch (err) {
        setError(err instanceof CommentRateLimitError ? err.message : "Couldn't post your comment. Try again.");
      } finally {
        setPosting(false);
      }
    });
  }

  async function handleDelete(commentId: string) {
    setComments((prev) => (prev ? prev.filter((c) => c.id !== commentId) : prev));
    try {
      await deleteClickComment(commentId);
    } catch {
      // Reload on failure rather than leaving optimistic state wrong.
      const fresh = await getClickComments(clickId, user?.id ?? null);
      setComments(fresh);
    }
  }

  return (
    <div className="border-t border-border-divider pt-4">
      <h2 className="mb-3 text-[13px] font-bold">
        Comments{comments && comments.length > 0 ? ` (${comments.length})` : ""}
      </h2>

      {comments === null && <p className="text-[12.5px] text-text-tertiary">Loading comments…</p>}
      {comments !== null && comments.length === 0 && (
        <p className="text-[12.5px] text-text-tertiary">No comments yet — be the first to say something.</p>
      )}

      <div className="mb-4 flex flex-col gap-3.5">
        {comments?.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <Link href={`/profile/${c.author.id}`} className="flex-none">
              <Avatar avatarUrl={c.author.avatarUrl} initials={c.author.initials} size={30} />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5">
                <Link href={`/profile/${c.author.id}`} className="text-[12.5px] font-bold hover:underline">
                  {c.author.name}
                </Link>
                <span className="text-[10.5px] text-text-muted">{relativeTime(c.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-text-secondary">{c.content}</p>
              {c.isOwn ? (
                <button onClick={() => handleDelete(c.id)} className="mt-0.5 text-[11px] font-semibold text-text-muted hover:text-danger">
                  Delete
                </button>
              ) : (
                <button
                  onClick={() => requireAuth("report this comment", () => setReportingCommentId(c.id))}
                  className="mt-0.5 text-[11px] font-semibold text-text-muted hover:text-danger"
                >
                  Report
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          placeholder={user ? "Add a comment…" : "Sign in to comment"}
          className="flex-1 rounded-full border border-border-input px-3.5 py-2 text-[12.5px] focus:border-clicks-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={posting || !draft.trim()}
          className="rounded-full bg-clicks-primary px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-clicks-primary-dark disabled:opacity-50"
        >
          Post
        </button>
      </form>
      {error && <p className="mt-1.5 text-[11px] font-medium text-danger">{error}</p>}

      {reportingCommentId && (
        <ReportModal contentType="click_comment" contentId={reportingCommentId} onClose={() => setReportingCommentId(null)} />
      )}
    </div>
  );
}
