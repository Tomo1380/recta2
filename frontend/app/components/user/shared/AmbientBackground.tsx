/**
 * Desktop-only ambient background — sits behind the centered 430px mobile frame
 * and fills the viewport with the brand's dark-green base plus a few softly
 * blurred gold/pink orbs. On mobile widths the centered frame covers the entire
 * viewport, so the orbs are simply hidden from view (no media query needed).
 *
 * Render this once at the layout level. Marked aria-hidden + pointer-events:none
 * so it never participates in interaction or screen reader output.
 */
import { LUXE } from "~/lib/luxe-tokens";

export default function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{ background: LUXE.ambientBase }}
    >
      {/* Gold orb — upper left */}
      <span
        className="absolute rounded-full"
        style={{
          top: "10%",
          left: "-100px",
          width: 420,
          height: 420,
          background: "rgba(212,175,55,0.22)",
          filter: "blur(110px)",
        }}
      />
      {/* Gold orb — lower right */}
      <span
        className="absolute rounded-full"
        style={{
          bottom: "8%",
          right: "-120px",
          width: 460,
          height: 460,
          background: "rgba(212,175,55,0.18)",
          filter: "blur(110px)",
        }}
      />
      {/* Pink accent — upper right (closer to the frame so the color reads) */}
      <span
        className="absolute rounded-full"
        style={{
          top: "32%",
          right: "8%",
          width: 360,
          height: 360,
          background: "rgba(200,96,128,0.14)",
          filter: "blur(130px)",
        }}
      />
      {/* Subtle gold accent — left middle, breaks the dark left column */}
      <span
        className="absolute rounded-full"
        style={{
          top: "55%",
          left: "6%",
          width: 320,
          height: 320,
          background: "rgba(212,175,55,0.10)",
          filter: "blur(120px)",
        }}
      />
    </div>
  );
}
