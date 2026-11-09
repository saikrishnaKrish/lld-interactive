import clsx from "clsx";
import type { CSSProperties } from "react";
import type { DiagramObject } from "@/data/types";
import { entityMatches, hoverTokenFor, parseSnippet, type Role } from "./roles";

const ROLE_BADGE: Record<Role, string> = {
  client: "bg-role-client text-on-primary",
  creator: "bg-role-creator text-on-primary",
  product: "bg-role-product text-on-primary",
};

const ROLE_FRAME: Record<Role, string> = {
  client: "role-client",
  creator: "role-creator",
  product: "role-product",
};

export function CodeView({
  snippet,
  objects,
  hoveredEntityId,
  hoveredAlsoId,
  onHover,
}: {
  snippet: string;
  objects: DiagramObject[];
  hoveredEntityId: string | null;
  hoveredAlsoId: string | null;
  onHover: (id: string | null, also?: string | null) => void;
}) {
  const blocks = parseSnippet(snippet, objects);

  return (
    <div className="mt-2 space-y-2">
      {blocks.map((block) => {
        const token = block.name ? hoverTokenFor(block.name, objects) : "";
        const hot =
          Boolean(block.name) &&
          objects.some(
            (object) =>
              (entityMatches(object, hoveredEntityId) || entityMatches(object, hoveredAlsoId)) &&
              (entityMatches(object, block.name) || object.id === token),
          );
        const lines = block.code.split("\n");
        const marked = block.marks.some(Boolean);
        return (
          <article
            key={`${block.name}-${block.code.slice(0, 24)}`}
            onMouseEnter={() => token && onHover(token)}
            onMouseLeave={() => onHover(null)}
            className={clsx(
              "rounded-lg border px-3 py-2 font-mono text-xs leading-relaxed",
              ROLE_FRAME[block.role],
              hot && "role-hot",
            )}
            style={{ "--role": `var(--color-role-${block.role})` } as CSSProperties}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <span className={clsx("rounded-full px-1.5 py-0.5 font-semibold tracking-wide", ROLE_BADGE[block.role])}>
                {block.badge}
              </span>
              {block.name ? <span className="font-semibold text-ink">{block.name}</span> : null}
            </div>
            <div>
              {lines.map((line, index) => {
                const mark = block.marks[index];
                return (
                  <div key={`${block.name}-${index}`} className="flex gap-2">
                    {marked ? (
                      <span
                        aria-hidden={mark ? undefined : true}
                        className={clsx(
                          "mt-0.5 inline-flex h-fit w-20 shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold tracking-wide",
                          mark ? ROLE_BADGE[mark.role] : "opacity-0",
                        )}
                      >
                        {mark?.badge ?? ""}
                      </span>
                    ) : null}
                    <code className="min-w-0 whitespace-pre text-ink">{line || " "}</code>
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}
