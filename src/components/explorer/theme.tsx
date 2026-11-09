import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useId, useState } from "react";

export type ThemeChoice = "light" | "dark" | "system";

const KEY = "theme";

export function readTheme(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  const saved = window.localStorage.getItem(KEY);
  if (saved === "light" || saved === "dark" || saved === "system") return saved;
  return "system";
}

export function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(choice: ThemeChoice) {
  const dark = choice === "dark" || (choice === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const next = readTheme();
    setChoice(next);
    applyTheme(next);
    setResolved(document.documentElement.classList.contains("dark") ? "dark" : "light");
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = readTheme();
      if (current === "system") {
        applyTheme("system");
        setResolved(document.documentElement.classList.contains("dark") ? "dark" : "light");
      }
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  function choose(next: ThemeChoice) {
    setChoice(next);
    window.localStorage.setItem(KEY, next);
    applyTheme(next);
    setResolved(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }

  return { choice, resolved, choose };
}

const OPTIONS: { id: ThemeChoice; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

export function ThemeMenu() {
  const { choice, resolved, choose } = useTheme();
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={resolved === "dark" ? "Theme is dark. Change theme." : "Theme is light. Change theme."}
        title="Color theme"
        onClick={() => setOpen((value) => !value)}
        className="grid size-9 place-items-center rounded-lg border border-line bg-canvas text-ink"
      >
        {resolved === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-30 mt-1 w-36 rounded-lg border border-line bg-surface p-1 shadow-sm"
        >
          {OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitemradio"
              aria-checked={choice === option.id}
              onClick={() => {
                choose(option.id);
                setOpen(false);
              }}
              className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-semibold hover:bg-canvas"
            >
              {option.id === "light" ? <Sun className="size-3.5" /> : null}
              {option.id === "dark" ? <Moon className="size-3.5" /> : null}
              {option.id === "system" ? <Monitor className="size-3.5" /> : null}
              {option.label}
              {choice === option.id ? <span className="ml-auto text-xs text-primary">On</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
