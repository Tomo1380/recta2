import { useEffect, useRef } from "react";

declare global {
  interface Window {
    twttr?: {
      widgets?: {
        load: (target?: HTMLElement) => void;
      };
    };
  }
}

interface XPostEmbedProps {
  /** Numeric post id (the "/status/{id}" segment of the URL) */
  postId: string;
  /** Author handle (the "@" name without the @) */
  authorHandle: string;
  /** Optional className applied to the container */
  className?: string;
}

let widgetsScriptLoaded = false;
let widgetsScriptPromise: Promise<void> | null = null;

function loadWidgetsScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (widgetsScriptLoaded || window.twttr?.widgets) return Promise.resolve();
  if (widgetsScriptPromise) return widgetsScriptPromise;

  widgetsScriptPromise = new Promise<void>((resolve) => {
    const existing = document.getElementById("twitter-wjs") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => {
        widgetsScriptLoaded = true;
        resolve();
      });
      if (window.twttr?.widgets) {
        widgetsScriptLoaded = true;
        resolve();
      }
      return;
    }
    const s = document.createElement("script");
    s.id = "twitter-wjs";
    s.src = "https://platform.twitter.com/widgets.js";
    s.async = true;
    s.onload = () => {
      widgetsScriptLoaded = true;
      resolve();
    };
    document.body.appendChild(s);
  });

  return widgetsScriptPromise;
}

/**
 * Renders an embedded X (formerly Twitter) post inline. Uses the official
 * widgets.js pipeline — `<blockquote class="twitter-tweet">` markup gets
 * rewritten into an iframe by Twitter's script after `widgets.load()` fires.
 *
 * The widgets.js name is preserved by the Twitter/X SDK; only user-visible
 * text uses the new "X / ポスト" terminology.
 */
export default function XPostEmbed({ postId, authorHandle, className }: XPostEmbedProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadWidgetsScript().then(() => {
      if (cancelled) return;
      const target = ref.current;
      if (!target || !window.twttr?.widgets) return;
      window.twttr.widgets.load(target);
    });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  return (
    <div ref={ref} className={className}>
      <blockquote
        className="twitter-tweet"
        data-conversation="none"
        data-dnt="true"
      >
        <a href={`https://x.com/${authorHandle}/status/${postId}`}>
          Xのポストを表示
        </a>
      </blockquote>
    </div>
  );
}
