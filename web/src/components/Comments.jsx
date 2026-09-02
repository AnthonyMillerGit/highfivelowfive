import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { relativeTime } from "../lib/format";
import Monogram from "./Monogram";
import CommentComposer from "./CommentComposer";
import Spinner from "./Spinner";

/** Counts what a reader would actually see: tombstones are structure, not
 *  comments, so they do not add to the total. */
function countLive(roots) {
  return roots.reduce(
    (n, c) => n + (c.deleted ? 0 : 1) + c.replies.length,
    0
  );
}

function Comment({ comment, currentUser, onReply, onDelete, isReply = false }) {
  const [replying, setReplying] = useState(false);

  if (comment.deleted) {
    return (
      <div className="flex gap-3">
        <span className="mt-1 h-8 w-8 shrink-0 rounded-md border border-dashed border-wire" />
        <p className="py-1.5 text-sm italic text-muted">This comment was removed.</p>
      </div>
    );
  }

  const isMine = currentUser?.username === comment.author.username;

  return (
    <div className="flex gap-3">
      <Monogram username={comment.author.username} tone={isMine ? "high" : "muted"} />

      <div className="flex grow flex-col gap-1.5">
        <div className="flex items-baseline gap-2.5">
          <Link
            to={`/u/${comment.author.username}`}
            className="font-mono text-xs text-chalk transition-colors hover:text-high"
          >
            @{comment.author.username}
          </Link>
          <span className="font-mono text-[11px] text-muted">
            {relativeTime(comment.created_at)}
          </span>
        </div>

        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-chalk">
          {comment.body}
        </p>

        <div className="flex gap-4">
          {currentUser && !isReply && (
            <button
              onClick={() => setReplying((v) => !v)}
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted
                         transition-colors hover:text-chalk"
            >
              {replying ? "Cancel" : "Reply"}
            </button>
          )}
          {isMine && (
            <button
              onClick={() => onDelete(comment.id)}
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted
                         transition-colors hover:text-low"
            >
              Remove
            </button>
          )}
        </div>

        {replying && (
          <div className="mt-2">
            <CommentComposer
              autoFocus
              placeholder={`Reply to @${comment.author.username}`}
              submitLabel="Post reply"
              onCancel={() => setReplying(false)}
              onSubmit={async (body) => {
                await onReply(body, comment.id);
                setReplying(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Comments({ listId }) {
  const { user } = useAuth();
  const [roots, setRoots] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/api/lists/${listId}/comments`).then(setRoots).catch((e) => setError(e.message));
  }, [listId]);

  // Refetching after a write is deliberate: the server decides where a reply
  // actually lands (it flattens replies-to-replies), so guessing locally would
  // put it in the wrong place until the next reload.
  async function reload() {
    setRoots(await api(`/api/lists/${listId}/comments`));
  }

  async function post(body, parentId = null) {
    await api(`/api/lists/${listId}/comments`, {
      method: "POST",
      body: { body, parent_id: parentId },
    });
    await reload();
  }

  async function remove(commentId) {
    await api(`/api/comments/${commentId}`, { method: "DELETE" });
    await reload();
  }

  if (error) return <p className="text-sm text-low">{error}</p>;
  if (!roots) return <Spinner label="Loading comments" />;

  const total = countLive(roots);

  return (
    <section className="mt-11">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
        {total} {total === 1 ? "comment" : "comments"}
      </h2>

      <div className="mt-4">
        {user ? (
          <CommentComposer
            placeholder="Add your take, or make the case for what is missing"
            onSubmit={(body) => post(body)}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-wire p-5">
            <p className="text-sm text-muted">
              <Link to="/login" className="text-high underline underline-offset-4">
                Sign in
              </Link>{" "}
              to join the argument.
            </p>
          </div>
        )}
      </div>

      <div className="mt-7 flex flex-col gap-6">
        {roots.map((c) => (
          <div key={c.id} className="flex flex-col gap-6">
            <Comment
              comment={c}
              currentUser={user}
              onReply={post}
              onDelete={remove}
            />
            {c.replies.length > 0 && (
              <div className="ml-11 flex flex-col gap-6 border-l border-wire pl-5">
                {c.replies.map((rep) => (
                  <Comment
                    key={rep.id}
                    comment={rep}
                    currentUser={user}
                    onReply={post}
                    onDelete={remove}
                    isReply
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
