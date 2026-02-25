"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useUser } from "../../lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Mark, Node, mergeAttributes } from "@tiptap/core";
import { supabase } from "../../lib/supabase";
import { safeGetAccessToken } from "../../lib/auth-session";
import { isLikelyHtml, stripHtmlToText } from "../../lib/content-text";
import "./submit.css";

const ARTICLE_TYPES = [
  { value: "reporting", label: "Reporting" },
  { value: "explainer", label: "Analysis" },
  { value: "perspective", label: "Voices" },
  { value: "letter", label: "Letter" },
];

type CommentItem = {
  id: string;
  text: string;
  excerpt: string;
};

type OutlineItem = {
  id: string;
  level: number;
  text: string;
};

type MediaItem = {
  id: string;
  file?: File | null;
  url: string;
  caption: string;
  uploading?: boolean;
  failed?: boolean;
};

type SelectionRange = {
  from: number;
  to: number;
};

type DraftSnapshot = {
  title: string;
  type: string;
  content: string;
  disclosure: string;
  contextBox: string;
  comments: CommentItem[];
  media: { url: string; caption: string }[];
};

const MAX_MEDIA = 1;

const createId = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_DRAFT: DraftSnapshot = {
  title: "",
  type: ARTICLE_TYPES[0].value,
  content: "",
  disclosure: "",
  contextBox: "",
  comments: [],
  media: [],
};

let cachedInitialDraft: DraftSnapshot | null = null;

function parseStoredDraft(): DraftSnapshot {
  if (typeof window === "undefined") return DEFAULT_DRAFT;
  try {
    const stored = window.localStorage.getItem("submit-draft-doc");
    if (!stored) return DEFAULT_DRAFT;
    const parsed = JSON.parse(stored) as {
      title?: unknown;
      type?: unknown;
      content?: unknown;
      disclosure?: unknown;
      contextBox?: unknown;
      comments?: unknown;
      media?: unknown;
    };

    const type = typeof parsed.type === "string" && ARTICLE_TYPES.some((item) => item.value === parsed.type)
      ? parsed.type
      : ARTICLE_TYPES[0].value;

    const comments = Array.isArray(parsed.comments)
      ? parsed.comments.filter((item): item is CommentItem => {
          if (!item || typeof item !== "object") return false;
          const value = item as Record<string, unknown>;
          return (
            typeof value.id === "string" &&
            typeof value.text === "string" &&
            typeof value.excerpt === "string"
          );
        })
      : [];

    const media = Array.isArray(parsed.media)
      ? parsed.media
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const value = item as Record<string, unknown>;
            if (typeof value.url !== "string") return null;
            return {
              url: value.url,
              caption: typeof value.caption === "string" ? value.caption : "",
            };
          })
          .filter((item): item is { url: string; caption: string } => item !== null)
      : [];

    return {
      title: typeof parsed.title === "string" ? parsed.title : "",
      type,
      content: typeof parsed.content === "string" ? parsed.content : "",
      disclosure: typeof parsed.disclosure === "string" ? parsed.disclosure : "",
      contextBox: typeof parsed.contextBox === "string" ? parsed.contextBox : "",
      comments,
      media,
    };
  } catch {
    return DEFAULT_DRAFT;
  }
}

function getInitialDraft(): DraftSnapshot {
  if (cachedInitialDraft) return cachedInitialDraft;
  cachedInitialDraft = parseStoredDraft();
  return cachedInitialDraft;
}

const CommentMark = Mark.create({
  name: "comment",
  addAttributes() {
    return {
      id: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-comment]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-comment": HTMLAttributes.id, class: "comment-mark" }), 0];
  },
});

const ImageBlock = Node.create({
  name: "imageBlock",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      caption: { default: "" },
      width: { default: "100%" },
    };
  },
  parseHTML() {
    return [{ tag: "figure[data-image-block]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes(HTMLAttributes, { "data-image-block": "true", style: `width:${HTMLAttributes.width || "100%"}` }),
      ["img", { src: HTMLAttributes.src, alt: "" }],
      ["figcaption", { "data-placeholder": "Caption (optional)" }, HTMLAttributes.caption || ""],
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView);
  },
});

function ImageBlockView({ node, updateAttributes }: { node: any; updateAttributes: (attrs: Record<string, string>) => void }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handle = () => {
      if (!wrapperRef.current) return;
      const width = Math.round(wrapperRef.current.getBoundingClientRect().width);
      updateAttributes({ width: `${width}px` });
    };
    window.addEventListener("mouseup", handle);
    return () => window.removeEventListener("mouseup", handle);
  }, [updateAttributes]);

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className="doc-image"
      style={{ width: node.attrs.width || "100%" }}
      data-image-block
    >
      <img src={node.attrs.src} alt="" />
      <input
        className="doc-image-caption"
        value={node.attrs.caption || ""}
        onChange={(e) => updateAttributes({ caption: e.target.value })}
        placeholder="Caption (optional)"
      />
      <div className="doc-image-resize" aria-hidden />
    </NodeViewWrapper>
  );
}

function Dropdown({
  label,
  children,
  onOpenChange,
}: {
  label: string;
  children: (close: () => void) => React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const triggerId = `${menuId}-trigger`;
  const ref = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (onOpenChange) onOpenChange(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)");
    first?.focus();
    const handler = (event: MouseEvent) => {
      if (!ref.current || !(event.target instanceof window.Node)) return;
      if (!ref.current.contains(event.target)) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <div className="doc-dropdown" ref={ref}>
      <button
        type="button"
        className="doc-dropdown-trigger"
        id={triggerId}
        ref={triggerRef}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
          }
        }}
      >
        <span>{label}</span>
        <span className="doc-caret" aria-hidden>v</span>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          className="doc-dropdown-menu"
          ref={menuRef}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
              triggerRef.current?.focus();
            }
          }}
        >
          {children(closeMenu)}
        </div>
      )}
    </div>
  );
}

export default function SubmitArticlePage() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get("edit") || "";
  const initialDraft = useMemo(() => getInitialDraft(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState(initialDraft.title);
  const [type, setType] = useState(initialDraft.type);
  const [content, setContent] = useState(initialDraft.content);
  const [contentText, setContentText] = useState(stripHtmlToText(initialDraft.content));
  const [disclosure, setDisclosure] = useState(initialDraft.disclosure);
  const [contextBox, setContextBox] = useState(initialDraft.contextBox);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionNotice, setSubmissionNotice] = useState<{
    title: string;
    detail: string;
    tone: "success" | "error";
  } | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>(initialDraft.comments);
  const [autosaveStatus, setAutosaveStatus] = useState("Not saved");
  const [media, setMedia] = useState<MediaItem[]>(
    initialDraft.media
      .slice(0, MAX_MEDIA)
      .map((item) => ({ id: createId(), url: item.url, caption: item.caption, uploading: false, failed: false }))
  );
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [commentComposerOpen, setCommentComposerOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [pendingCommentRange, setPendingCommentRange] = useState<SelectionRange | null>(null);

  const isUploadedMediaUrl = useCallback((value: string) => /^https?:\/\//i.test(value), []);

  function getSubmissionStatusLabel(status?: string): string {
    if (status === "published" || status === "approved") return "Published";
    if (status === "pending_ai_review") return "Under review";
    if (status === "needs_revision") return "Needs revision";
    if (status === "rejected") return "Not accepted";
    return "Submitted";
  }

  const buildMediaPayload = useCallback(
    (items: MediaItem[]) =>
      items
        .filter((item) => isUploadedMediaUrl(item.url))
        .slice(0, MAX_MEDIA)
        .map((item) => ({ url: item.url, caption: item.caption })),
    [isUploadedMediaUrl]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Start writing your story..." }),
      CommentMark,
      ImageBlock,
    ],
    editorProps: {
      attributes: {
        class: "doc-editor-content",
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files || []).filter((file) => file.type.startsWith("image/"));
        if (!files.length) return false;
        event.preventDefault();
        void handleMediaFiles(files);
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      setContent(current.getHTML());
      setContentText(current.getText());
      refreshOutline(current);
    },
  });

  const wordCount = useMemo(() => {
    const text = (contentText || "").replace(/\s+/g, " ").trim();
    if (!text) return 0;
    return text.split(" ").length;
  }, [contentText]);

  const readMinutes = Math.max(1, Math.ceil(wordCount / 220));

  const setEditorFromStoredContent = useCallback((value: string) => {
    if (!editor) return;
    const source = (value || "").trim();
    if (!source) {
      editor.commands.setContent("", false);
      return;
    }

    if (isLikelyHtml(source)) {
      editor.commands.setContent(source, false);
      return;
    }

    const lines = source.split(/\r?\n/);
    const paragraphNodes = lines.map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    }));
    editor.commands.setContent({ type: "doc", content: paragraphNodes }, false);
  }, [editor]);

  useEffect(() => {
    if (editId || !initialDraft.content) return;
    setEditorFromStoredContent(initialDraft.content);
  }, [editId, initialDraft.content, setEditorFromStoredContent]);

  useEffect(() => {
    if (!editId || !user?.id) return;
    async function loadEdit() {
      const { data: article } = await supabase
        .from("articles")
        .select("id, title, type, content, disclosure, context_box")
        .eq("id", editId)
        .eq("author_id", user.id)
        .single();
      if (!article) return;
      setTitle(article.title || "");
      setType(article.type || ARTICLE_TYPES[0].value);
      setContent(article.content || "");
      setContentText(stripHtmlToText(article.content || ""));
      setDisclosure(article.disclosure || "");
      setContextBox(article.context_box || "");
      setEditorFromStoredContent(article.content || "");

      const { data: mediaRows } = await supabase
        .from("article_media")
        .select("id, url, caption")
        .eq("article_id", editId)
        .order("sort_order", { ascending: true });
      if (mediaRows) {
        setMedia(
          mediaRows
            .slice(0, MAX_MEDIA)
            .map((item: any) => ({ id: item.id, url: item.url, caption: item.caption || "", uploading: false, failed: false }))
        );
      }
    }
    loadEdit();
  }, [editId, setEditorFromStoredContent, user?.id]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const payload = {
        title,
        type,
        content,
        disclosure,
        contextBox,
        comments,
        media: buildMediaPayload(media),
      };
      window.localStorage.setItem("submit-draft-doc", JSON.stringify(payload));
      const hasSubstantiveContent = (contentText || "").trim().length > 0;
      if (hasSubstantiveContent || title.trim()) {
        setAutosaveStatus("Saved just now");
        window.setTimeout(() => setAutosaveStatus("Saved"), 1200);
      }
    }, 600);
    return () => window.clearTimeout(id);
  }, [title, type, content, contentText, disclosure, contextBox, comments, media, buildMediaPayload]);

  function refreshOutline(current: any) {
    if (!current) return;
    const root = current.view.dom as HTMLElement;
    const headings = Array.from(root.querySelectorAll("h2, h3")) as HTMLElement[];
    const next: OutlineItem[] = headings.map((heading) => {
      let id = heading.getAttribute("data-outline");
      if (!id) {
        id = createId();
        heading.setAttribute("data-outline", id);
      }
      return {
        id,
        level: heading.tagName === "H2" ? 2 : 3,
        text: heading.textContent?.trim() || "Untitled",
      };
    });
    setOutline(next);
  }

  function logAction(action: string) {
    void action;
  }

  function runCommand(action: string, runner: () => boolean) {
    if (!editor) return;
    const result = runner();
    logAction(action);
    if (!result) return;
  }

  function addComment() {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    setPendingCommentRange({ from, to });
    setCommentDraft("");
    setCommentComposerOpen(true);
  }

  function submitComment() {
    if (!editor || !pendingCommentRange || !commentDraft.trim()) return;
    const { from, to } = pendingCommentRange;
    const id = createId();
    const excerpt = editor.state.doc.textBetween(from, to, " ").slice(0, 48) || "Comment";
    editor
      .chain()
      .focus()
      .setTextSelection({ from, to })
      .setMark("comment", { id })
      .run();
    setComments((prev) => [...prev, { id, text: commentDraft.trim(), excerpt }]);
    setCommentComposerOpen(false);
    setCommentDraft("");
    setPendingCommentRange(null);
    logAction("comment");
  }

  function insertImageAtCursor(url: string, caption: string) {
    if (!editor || !url) return;
    const chain = editor.chain();
    if (!editor.isFocused) {
      chain.focus("end");
    } else {
      chain.focus();
    }
    chain.insertContent({ type: "imageBlock", attrs: { src: url, caption } }).run();
    logAction("image");
  }

  async function uploadMediaFile(file: File) {
    const token = await safeGetAccessToken();
    if (!token) {
      throw new Error("Please sign in again.");
    }

    const body = new FormData();
    body.append("file", file);

    const response = await fetch("/api/uploadArticleImage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body,
    });

    const text = await response.text();
    let payload: { error?: string; url?: string } = {};
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = {};
      }
    }

    if (!response.ok || !payload.url) {
      throw new Error(payload.error || "Image upload failed.");
    }

    return payload.url;
  }

  async function handleMediaFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!list.length) return;
    setMediaError(null);
    const file = list[0];
    const id = createId();
    const previewUrl = URL.createObjectURL(file);
    const previousCaption = media[0]?.caption || "";
    setMedia([{ id, file, url: previewUrl, caption: previousCaption, uploading: true, failed: false }]);

    try {
      const url = await uploadMediaFile(file);
      setMedia((prev) => prev.map((item) => (item.id === id ? { ...item, url, uploading: false, failed: false } : item)));
    } catch (err) {
      console.error(err);
      setMedia((prev) => prev.map((item) => (item.id === id ? { ...item, uploading: false, failed: true } : item)));
      setMediaError("Upload failed. Check the article-media bucket permissions.");
    }
  }

  function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    void handleMediaFiles(e.target.files);
    e.target.value = "";
  }

  function handleMediaDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.dataTransfer.files) void handleMediaFiles(e.dataTransfer.files);
  }

  function removeMedia(id: string) {
    setMedia((prev) => prev.filter((item) => item.id !== id));
  }

  function updateMediaCaption(id: string, caption: string) {
    setMedia((prev) => prev.map((item) => (item.id === id ? { ...item, caption } : item)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSubmissionNotice(null);
    setDraftSaved(false);
    if (!user) {
      setError("You must be logged in to submit.");
      setLoading(false);
      return;
    }
    if (!title.trim() || !type || !contentText.trim()) {
      setError("Title, type, and content are required.");
      setLoading(false);
      return;
    }

    if (media.some((item) => item.uploading)) {
      setError("Image is still uploading. Please wait a moment and submit again.");
      setLoading(false);
      return;
    }

    if (media.some((item) => item.failed)) {
      setError("Image upload failed. Remove the image or upload a new one before submitting.");
      setLoading(false);
      return;
    }

    if (media.some((item) => item.url && !isUploadedMediaUrl(item.url))) {
      setError("Image is not ready yet. Please re-upload the image before submitting.");
      setLoading(false);
      return;
    }

    const mediaPayload = buildMediaPayload(media);

    try {
      const token = await safeGetAccessToken();
      if (!token) {
        setLoading(false);
        setError("Please sign in again.");
        return;
      }

      const response = await fetch(editId ? "/api/updateArticle" : "/api/submitArticle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          articleId: editId || undefined,
          title,
          type,
          content,
          disclosure: disclosure || null,
          contextBox: contextBox || null,
          media: mediaPayload,
        }),
      });

      const text = await response.text();
      setLoading(false);

      let data: {
        error?: string;
        message?: string;
        reviewError?: string | null;
        article?: {
          id: string;
          status?: string;
          ai_feedback?: string | null;
        };
      };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setError(response.ok ? "Invalid response" : "Something went wrong. Please try again.");
        return;
      }

      if (!response.ok) {
        setError(data.error || "Failed to submit article");
        return;
      }

      const statusLabel = getSubmissionStatusLabel(data.article?.status);
      const aiFeedback = (data.article?.ai_feedback || "").trim();
      const detailParts = [
        data.message || `Your article status is: ${statusLabel}.`,
        aiFeedback ? `Feedback: ${aiFeedback}` : "",
        data.reviewError ? `Review note: ${data.reviewError}` : "",
      ].filter(Boolean);
      setSubmissionNotice({
        title: statusLabel,
        detail: detailParts.join(" "),
        tone: data.article?.status === "rejected" || data.article?.status === "needs_revision" ? "error" : "success",
      });
      setTitle("");
      setContent("");
      setContentText("");
      setDisclosure("");
      setContextBox("");
      setComments([]);
      setMedia([]);
      editor?.commands.setContent("", false);
      window.localStorage.removeItem("submit-draft-doc");
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Failed to submit article");
    }
  }

  function handleSaveDraft() {
      const payload = {
      title,
      type,
      content,
      disclosure,
      contextBox,
      comments,
      media: buildMediaPayload(media),
    };
    window.localStorage.setItem("submit-draft-doc", JSON.stringify(payload));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center py-32">
        <div className="text-center max-w-md">
          <p className="text-body text-charcoal-muted mb-6">You must be logged in to submit articles.</p>
          <button onClick={() => router.push("/login")} className="btn-primary">
            Go to login
          </button>
        </div>
      </main>
    );
  }

  const canToggleBold = editor ? editor.can().chain().focus().toggleBold().run() : false;
  const canToggleItalic = editor ? editor.can().chain().focus().toggleItalic().run() : false;
  const canToggleH2 = editor ? editor.can().chain().focus().toggleHeading({ level: 2 }).run() : false;
  const canToggleH3 = editor ? editor.can().chain().focus().toggleHeading({ level: 3 }).run() : false;
  const canToggleQuote = editor ? editor.can().chain().focus().toggleBlockquote().run() : false;
  const canDivider = editor ? editor.can().chain().focus().setHorizontalRule().run() : false;

  return (
    <main className="doc-page">
      <div className={`outline-panel ${outlineOpen ? "is-open" : ""}`}>
        <div className="outline-header">
          <p>Outline</p>
          <button type="button" onClick={() => setOutlineOpen((prev) => !prev)}>
            {outlineOpen ? "Hide" : "Show"}
          </button>
        </div>
        {outlineOpen && (
          <div className="outline-list">
            {outline.length === 0 && <p className="outline-empty">Add headings to see outline.</p>}
            {outline.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`outline-item level-${item.level}`}
                onClick={() => {
                  const el = editor?.view.dom.querySelector(`[data-outline='${item.id}']`);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                {item.text}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="doc-shell">
        <header className="doc-header">
          <p className="doc-kicker">Draft - Not published</p>
          <input
            className="doc-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled document"
            aria-label="Article title"
          />
          <div className="doc-meta">
            <span>{wordCount} words</span>
            <span>{readMinutes} min read</span>
            <span>{autosaveStatus}</span>
          </div>
        </header>

        <div className="doc-toolbar">
          <div className="doc-toolbar-left">
            <Dropdown label="Format">
              {(close) => (
                <div className="doc-menu-group">
                  <button
                    type="button"
                    className={`doc-menu-item ${editor?.isActive("paragraph") ? "is-active" : ""}`}
                    role="menuitem"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (!editor) return;
                      runCommand("paragraph", () => editor.chain().focus().setParagraph().run());
                      close();
                    }}
                  >
                    <span className="menu-check" aria-hidden>&#10003;</span>
                    <span className="menu-label">Normal text</span>
                    <span className="menu-shortcut" />
                  </button>
                  <button
                    type="button"
                    className={`doc-menu-item ${editor?.isActive("heading", { level: 2 }) ? "is-active" : ""}`}
                    disabled={!canToggleH2}
                    role="menuitem"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (!editor) return;
                      runCommand("h2", () => editor.chain().focus().toggleHeading({ level: 2 }).run());
                      close();
                    }}
                  >
                    <span className="menu-check" aria-hidden>&#10003;</span>
                    <span className="menu-label">Heading 2</span>
                    <span className="menu-shortcut">Ctrl+2</span>
                  </button>
                  <button
                    type="button"
                    className={`doc-menu-item ${editor?.isActive("heading", { level: 3 }) ? "is-active" : ""}`}
                    disabled={!canToggleH3}
                    role="menuitem"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (!editor) return;
                      runCommand("h3", () => editor.chain().focus().toggleHeading({ level: 3 }).run());
                      close();
                    }}
                  >
                    <span className="menu-check" aria-hidden>&#10003;</span>
                    <span className="menu-label">Heading 3</span>
                    <span className="menu-shortcut">Ctrl+3</span>
                  </button>
                  <button
                    type="button"
                    className={`doc-menu-item ${editor?.isActive("blockquote") ? "is-active" : ""}`}
                    disabled={!canToggleQuote}
                    role="menuitem"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (!editor) return;
                      runCommand("quote", () => editor.chain().focus().toggleBlockquote().run());
                      close();
                    }}
                  >
                    <span className="menu-check" aria-hidden>&#10003;</span>
                    <span className="menu-label">Quote</span>
                    <span className="menu-shortcut" />
                  </button>
                  <button
                    type="button"
                    className="doc-menu-item"
                    disabled={!canDivider}
                    role="menuitem"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (!editor) return;
                      runCommand("divider", () => editor.chain().focus().setHorizontalRule().run());
                      close();
                    }}
                  >
                    <span className="menu-check" aria-hidden>&#10003;</span>
                    <span className="menu-label">Divider</span>
                    <span className="menu-shortcut" />
                  </button>
                  <button
                    type="button"
                    className={`doc-menu-item ${editor?.isActive("bold") ? "is-active" : ""}`}
                    disabled={!canToggleBold}
                    role="menuitem"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (!editor) return;
                      runCommand("bold", () => editor.chain().focus().toggleBold().run());
                      close();
                    }}
                  >
                    <span className="menu-check" aria-hidden>&#10003;</span>
                    <span className="menu-label">Bold</span>
                    <span className="menu-shortcut">Ctrl+B</span>
                  </button>
                  <button
                    type="button"
                    className={`doc-menu-item ${editor?.isActive("italic") ? "is-active" : ""}`}
                    disabled={!canToggleItalic}
                    role="menuitem"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (!editor) return;
                      runCommand("italic", () => editor.chain().focus().toggleItalic().run());
                      close();
                    }}
                  >
                    <span className="menu-check" aria-hidden>&#10003;</span>
                    <span className="menu-label">Italic</span>
                    <span className="menu-shortcut">Ctrl+I</span>
                  </button>
                  <button
                    type="button"
                    className={`doc-menu-item ${editor?.isActive("link") ? "is-active" : ""}`}
                    role="menuitem"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (!editor) return;
                      setLinkValue(editor.getAttributes("link").href || "");
                      setLinkOpen(true);
                      close();
                    }}
                  >
                    <span className="menu-check" aria-hidden>&#10003;</span>
                    <span className="menu-label">Link</span>
                    <span className="menu-shortcut">Ctrl+K</span>
                  </button>
                </div>
              )}
            </Dropdown>

            <Dropdown label="Insert">
              {(close) => (
                <div className="doc-menu-group">
                  <button
                    type="button"
                    className="doc-menu-item"
                    role="menuitem"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      addComment();
                      close();
                    }}
                  >
                    <span className="menu-label">Comment</span>
                    <span className="menu-shortcut" />
                  </button>
                </div>
              )}
            </Dropdown>

          </div>

          <div className="doc-toolbar-right">
            <span>{wordCount} words</span>
            <span>{autosaveStatus}</span>
          </div>
        </div>

        {linkOpen && (
          <div className="doc-link-popover">
            <input
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              placeholder="Paste link"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (!editor) return;
                if (linkValue) {
                  runCommand("link", () => editor.chain().focus().extendMarkRange("link").setLink({ href: linkValue }).run());
                } else {
                  runCommand("unlink", () => editor.chain().focus().unsetLink().run());
                }
                setLinkOpen(false);
              }}
            >
              Apply
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (!editor) return;
                runCommand("unlink", () => editor.chain().focus().unsetLink().run());
                setLinkValue("");
                setLinkOpen(false);
              }}
            >
              Remove
            </button>
          </div>
        )}

        {commentComposerOpen && (
          <div className="doc-link-popover" role="dialog" aria-label="Add comment">
            <input
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Comment for editors"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={submitComment}
              disabled={!commentDraft.trim()}
            >
              Add
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setCommentComposerOpen(false);
                setCommentDraft("");
                setPendingCommentRange(null);
              }}
            >
              Cancel
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="doc-body">
          <div className="doc-field">
            <label className="doc-label">Article type</label>
            <select
              className="doc-select"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
            >
              {ARTICLE_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="doc-editor">
            <EditorContent
              editor={editor}
              onKeyDown={(event) => {
                if (!editor) return;
                if (!event.metaKey && !event.ctrlKey) return;
                const key = event.key.toLowerCase();
                if (key === "b") {
                  event.preventDefault();
                  runCommand("bold", () => editor.chain().focus().toggleBold().run());
                } else if (key === "i") {
                  event.preventDefault();
                  runCommand("italic", () => editor.chain().focus().toggleItalic().run());
                } else if (key === "k") {
                  event.preventDefault();
                  setLinkValue(editor.getAttributes("link").href || "");
                  setLinkOpen(true);
                } else if (key === "2") {
                  event.preventDefault();
                  runCommand("h2", () => editor.chain().focus().toggleHeading({ level: 2 }).run());
                } else if (key === "3") {
                  event.preventDefault();
                  runCommand("h3", () => editor.chain().focus().toggleHeading({ level: 3 }).run());
                }
              }}
            />
          </div>

          <div className="doc-field">
            <label className="doc-label">Article image</label>
            <p className="doc-description">Attach one image for this article (optional).</p>
            <div
              className="doc-media-drop"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleMediaDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleMediaChange}
              />
              <div>
                <strong>Drag and drop or click to upload</strong>
                <span>One image</span>
              </div>
              <button type="button" onClick={() => fileInputRef.current?.click()}>
                Choose image
              </button>
            </div>
            {mediaError && <p className="text-sm text-urgency mt-2">{mediaError}</p>}

            {media.length > 0 && (
              <div className="doc-media-grid">
                {media.map((item) => (
                  <div key={item.id} className="doc-media-card">
                    <div className="doc-media-preview" style={{ backgroundImage: `url(${item.url})` }} />
                    <input
                      className="doc-media-caption"
                      value={item.caption}
                      onChange={(e) => updateMediaCaption(item.id, e.target.value)}
                      placeholder="Caption (optional)"
                    />
                    <div className="doc-media-actions">
                      <span className="doc-media-status">
                        {item.uploading ? "Uploading..." : item.failed ? "Upload failed" : "Ready"}
                      </span>
                      <button type="button" onClick={() => removeMedia(item.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="doc-field">
            <label className="doc-label">Context (optional)</label>
            <input
              className="doc-input"
              value={contextBox}
              onChange={(e) => setContextBox(e.target.value)}
              placeholder="Brief context for readers..."
            />
          </div>

          <div className="doc-field">
            <label className="doc-label">Disclosure (optional)</label>
            <input
              className="doc-input"
              value={disclosure}
              onChange={(e) => setDisclosure(e.target.value)}
              placeholder="Any disclosures or conflicts of interest..."
            />
          </div>

          <div className="doc-actions">
            <button type="button" className="btn-secondary" onClick={handleSaveDraft}>
              Save Draft
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Submitting..." : "Submit for Review"}
            </button>
          </div>

          {draftSaved && <div className="doc-alert">Draft saved locally.</div>}
          {submissionNotice && (
            <div className={`doc-alert ${submissionNotice.tone === "success" ? "success" : "error"}`}>
              <strong>{submissionNotice.title}</strong>
              <span className="block mt-1">{submissionNotice.detail}</span>
              <button type="button" className="btn-secondary mt-3" onClick={() => router.push("/my-articles")}>
                View in My Articles
              </button>
            </div>
          )}
          {error && <div className="doc-alert error">{error}</div>}
        </form>
      </div>

      <aside className="comment-panel">
        <div className="comment-header">Comments</div>
        {comments.length === 0 && <p className="comment-empty">No comments yet.</p>}
        {comments.map((comment) => (
          <button
            type="button"
            key={comment.id}
            className="comment-bubble"
            onClick={() => {
              const el = editor?.view.dom.querySelector(`[data-comment='${comment.id}']`);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            <strong>{comment.excerpt}</strong>
            <span>{comment.text}</span>
          </button>
        ))}
      </aside>
    </main>
  );
}
