import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Youtube from "@tiptap/extension-youtube";
import { useEffect, useRef, useState, useCallback } from "react";

// 画像サイズプリセット。data-size 属性で出力し、CSS 側で width を割り当てる。
// TipTap v3 公式 Image 拡張に width / height 属性を追加。
// resize オプション (下の configure 側で enabled:true) で右下つまみが出て
// ドラッグでリサイズ → width 属性 (px integer) に保存される。
// HTML として保存され、公開ページの dangerouslySetInnerHTML でそのまま
// 効く (.column-body img { max-width:100% }) ので、編集と公開の見た目が
// 一致する。
const SizedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => {
          const w = el.getAttribute("width");
          return w ? Number(w) : null;
        },
        renderHTML: (attrs) =>
          attrs.width ? { width: String(attrs.width) } : {},
      },
      height: {
        default: null,
        parseHTML: (el) => {
          const h = el.getAttribute("height");
          return h ? Number(h) : null;
        },
        renderHTML: (attrs) =>
          attrs.height ? { height: String(attrs.height) } : {},
      },
    };
  },
});
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  Link2Off,
  Image as ImageIcon,
  Upload as UploadIcon,
  Youtube as YoutubeIcon,
  Music2,
  Undo,
  Redo,
  Code,
} from "lucide-react";
import { useFileUpload } from "~/hooks/useFileUpload";

interface Props {
  /** TipTap JSON document */
  initialContent?: Record<string, unknown> | null;
  /** Called whenever the editor content changes */
  onChange: (json: Record<string, unknown>, html: string) => void;
}

/**
 * Custom TipTap-compatible "TikTok" embed.
 * We render a placeholder div in the editor (data-tiktok-id) and
 * convert it to a proper TikTok blockquote+script in body_html on save.
 *
 * For simplicity we accept any of these inputs:
 *   - https://www.tiktok.com/@user/video/1234567890123456789
 *   - 1234567890123456789 (raw video id)
 * and store as a `<div data-tiktok-id="...">` block within HTML.
 *
 * On the public page we replace these with the official TikTok embed.
 */

function extractTikTokId(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d{10,}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/\/video\/(\d{10,})/);
  if (m) return m[1];
  return null;
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md transition-colors text-[13px] disabled:opacity-30 disabled:cursor-not-allowed ${
        active
          ? "bg-indigo-100 text-indigo-700"
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
      }`}
    >
      {children}
    </button>
  );
}

// 画像サイズプリセットボタン (4 段階) は撤去。
// TipTap v3 公式 resize ハンドル (画像をクリック → 右下つまみドラッグ)
// に置き換えた。サイズは width 属性 (px) として HTML に直接保存され、
// 公開ページの <img max-width:100% /> でそのまま反映される。

function Toolbar({ editor }: { editor: Editor }) {
  const { uploadFile, uploading, error: uploadError } = useFileUpload("article-body");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadPick = useCallback(
    async (file: File) => {
      const url = await uploadFile(file);
      // 初期 width は指定しない (= 原寸表示)。ユーザーが右下つまみで好きな
      // サイズに変える想定。max-width:100% で必ずカード幅以内に収まる。
      if (url) editor.chain().focus().setImage({ src: url, alt: "" }).run();
    },
    [editor, uploadFile],
  );

  const promptForLink = useCallback(() => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("リンクURLを入力", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url, target: "_blank", rel: "noopener noreferrer" })
      .run();
  }, [editor]);

  const insertImage = useCallback(() => {
    const url = window.prompt("画像URLを入力");
    if (!url) return;
    editor.chain().focus().setImage({ src: url, alt: "" }).run();
  }, [editor]);

  const insertYoutube = useCallback(() => {
    const url = window.prompt("YouTube URLまたは動画IDを入力");
    if (!url) return;
    editor.commands.setYoutubeVideo({ src: url, width: 640, height: 360 });
  }, [editor]);

  const insertTikTok = useCallback(() => {
    const url = window.prompt("TikTok URLまたは動画IDを入力");
    if (!url) return;
    const id = extractTikTokId(url);
    if (!id) {
      alert("有効なTikTok URLまたはIDを入力してください");
      return;
    }
    editor
      .chain()
      .focus()
      .insertContent(
        `<div data-tiktok-id="${id}" class="tiktok-embed-placeholder">[TikTok動画 #${id}]</div><p></p>`,
      )
      .run();
  }, [editor]);

  return (
    <div className="border-b border-stone-200 px-2 py-1.5 flex flex-wrap items-center gap-0.5 bg-stone-50/60 sticky top-0 z-10 rounded-t-lg">
      <ToolbarButton
        title="H1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="H2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="H3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="w-4 h-4" />
      </ToolbarButton>
      <span className="w-px h-5 bg-stone-200 mx-1" />
      <ToolbarButton
        title="太字"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="イタリック"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="取り消し線"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="コード"
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="w-4 h-4" />
      </ToolbarButton>
      <span className="w-px h-5 bg-stone-200 mx-1" />
      <ToolbarButton
        title="箇条書き"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="番号付きリスト"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="引用"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="w-4 h-4" />
      </ToolbarButton>
      <span className="w-px h-5 bg-stone-200 mx-1" />
      <ToolbarButton title="リンク" active={editor.isActive("link")} onClick={promptForLink}>
        <Link2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="リンク解除"
        disabled={!editor.isActive("link")}
        onClick={() => editor.chain().focus().unsetLink().run()}
      >
        <Link2Off className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="画像URLを貼り付け" onClick={insertImage}>
        <ImageIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title={uploading ? "アップロード中..." : "画像をアップロード (S3)"}
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadIcon className="w-4 h-4" />
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await handleUploadPick(file);
          e.target.value = ""; // 同じファイル再選択を許可
        }}
      />
      {/* 画像サイズ調整は TipTap v3 公式 resize ハンドルに置換 (画像クリック →
          右下つまみドラッグ)。ツールバーボタンは廃止。 */}
      <ToolbarButton title="YouTube埋め込み" onClick={insertYoutube}>
        <YoutubeIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="TikTok埋め込み" onClick={insertTikTok}>
        <Music2 className="w-4 h-4" />
      </ToolbarButton>
      <span className="w-px h-5 bg-stone-200 mx-1" />
      <ToolbarButton
        title="元に戻す"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="やり直し"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
}

export function ArticleEditor({ initialContent, onChange }: Props) {
  const [mounted, setMounted] = useState(false);

  // TipTap requires a DOM, so we delay editor mount to client side only
  useEffect(() => {
    setMounted(true);
  }, []);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        // TipTap v3 公式の resize 機能。画像にカーソルが乗ると右下に
        // つまみが出てドラッグでサイズ変更。aspect ratio は常時固定して
        // 縦横比が崩れないようにする。最小幅は 80px。
        SizedImage.configure({
          inline: false,
          allowBase64: false,
          resize: {
            enabled: true,
            alwaysPreserveAspectRatio: true,
            minWidth: 80,
            directions: ["bottom-right"],
          },
        }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        }),
        Youtube.configure({
          inline: false,
          width: 640,
          height: 360,
          modestBranding: true,
        }),
      ],
      content: initialContent ?? { type: "doc", content: [{ type: "paragraph" }] },
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class:
            "prose prose-stone max-w-none px-4 py-4 focus:outline-none min-h-[420px] text-[14px] leading-relaxed",
        },
      },
      onUpdate({ editor }) {
        onChange(editor.getJSON() as Record<string, unknown>, editor.getHTML());
      },
    },
    [],
  );

  // If parent passes a different initialContent (after async load),
  // sync once when content first arrives.
  useEffect(() => {
    if (!editor || !initialContent) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) === JSON.stringify(initialContent)) return;
    editor.commands.setContent(
      initialContent as Parameters<typeof editor.commands.setContent>[0],
      { emitUpdate: false },
    );
    // We intentionally only respond to identity changes of initialContent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, initialContent]);

  if (!mounted || !editor) {
    return (
      <div className="border border-stone-200 rounded-lg bg-white min-h-[460px] animate-pulse" />
    );
  }

  return (
    <div className="border border-stone-200 rounded-lg bg-white">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      {/* エディタ用 CSS — 公開ページ (column-detail.tsx の .column-body) と
          同じスタイルに揃えて WYSIWYG 度を高める。font-size / line-height /
          h2 の金色下線 / 画像サイズ / iframe 16:9 等は公開ページと同期。
          font-family まで完全に揃えるとフォント読み込みが重いので近似で OK。 */}
      <style>{`
        .tiktok-embed-placeholder {
          background: #fef3c7;
          border: 1px dashed #f59e0b;
          color: #92400e;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          margin: 12px 0;
        }
        .ProseMirror { font-size: 14.5px; line-height: 1.85; color: #1b2528; }
        .ProseMirror p { margin: 0.9em 0; }
        .ProseMirror h1 { font-size: 1.4rem; font-weight: 700; margin: 1.6em 0 0.6em; line-height: 1.4; }
        .ProseMirror h2 {
          font-size: 1.2rem; font-weight: 700; margin: 1.4em 0 0.5em; line-height: 1.45;
          border-bottom: 2px solid #D4AF37; padding-bottom: 0.3em;
        }
        .ProseMirror h3 { font-size: 1.05rem; font-weight: 700; margin: 1.2em 0 0.4em; }
        .ProseMirror ul { list-style: disc; padding-left: 1.4em; margin: 0.8em 0; }
        .ProseMirror ol { list-style: decimal; padding-left: 1.4em; margin: 0.8em 0; }
        .ProseMirror li { margin: 0.3em 0; }
        .ProseMirror blockquote {
          border-left: 3px solid #D4AF37;
          padding: 0.4em 0 0.4em 1em;
          color: rgba(27,37,40,.7);
          font-style: italic;
          margin: 1em 0;
          background: rgba(212,175,55,.06);
          border-radius: 0 8px 8px 0;
        }
        .ProseMirror a { color: #4f46e5; text-decoration: underline; }
        .ProseMirror code { background: #f5f5f4; padding: 1px 6px; border-radius: 4px; font-size: 0.9em; }
        .ProseMirror strong { font-weight: 700; }
        /* 画像: 中央寄せ + 角丸 + max-width:100% で必ずカード幅以内。
           新規はリサイズハンドルで width 属性を直接書き込む。旧 data-size
           プリセットの記事は後方互換で width が無い時だけ CSS で当てる。 */
        .ProseMirror img {
          display: block;
          margin: 1em auto;
          border-radius: 12px;
          max-width: 100%;
          height: auto;
        }
        .ProseMirror img[data-size="small"]:not([width])  { width: 200px; }
        .ProseMirror img[data-size="medium"]:not([width]) { width: 360px; }
        .ProseMirror img[data-size="large"]:not([width])  { width: 560px; }
        .ProseMirror img[data-size="full"]:not([width])   { width: 100%; }
        /* 選択中の画像にうっすら枠を付けて「これが選ばれてるよ」を示す。
           リサイズハンドル (右下つまみ) はこの選択枠に重ねて TipTap が描画。 */
        .ProseMirror img.ProseMirror-selectednode {
          outline: 2px solid #4f46e5;
          outline-offset: 2px;
        }
        .ProseMirror iframe {
          width: 100%; max-width: 640px; aspect-ratio: 16 / 9;
          border-radius: 12px; margin: 1em auto; height: auto; display: block;
        }
      `}</style>
    </div>
  );
}

export default ArticleEditor;
