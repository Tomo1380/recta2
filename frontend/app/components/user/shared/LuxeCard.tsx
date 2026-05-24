/**
 * Brand-standard card surface: white background, soft luxe shadow, hairline
 * border, 2xl radius. Use anywhere a panel/card needs to read as part of the
 * same visual family as the TopPage pickup cards.
 */
import type {
  CSSProperties,
  HTMLAttributes,
  ReactNode,
} from "react";
import { LUXE } from "~/lib/luxe-tokens";

interface LuxeCardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  style?: CSSProperties;
}

export default function LuxeCard({
  className = "",
  style,
  children,
  ...rest
}: LuxeCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white ${className}`.trim()}
      style={{
        boxShadow: LUXE.cardShadow,
        border: LUXE.cardBorder,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
