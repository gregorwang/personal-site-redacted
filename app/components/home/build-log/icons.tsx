import type { BuildLogTool } from "~/types/build-log";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.3 } as const;

export function FileIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" {...stroke} aria-hidden="true">
      <path d="M4 1.5h5.5L13 5v9.5H4z" />
      <path d="M9.5 1.5V5H13" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg className="bl-icon" viewBox="0 0 16 16" {...stroke} strokeWidth={1.2} aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M5.3 8.2l1.8 1.8 3.6-3.8" />
    </svg>
  );
}

export function SpinIcon() {
  return (
    <svg className="bl-icon bl-spin" viewBox="0 0 16 16" {...stroke} strokeWidth={1.4} strokeLinecap="round" aria-hidden="true">
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
    </svg>
  );
}

export function ChartIcon() {
  return (
    <svg className="bl-icon" viewBox="0 0 16 16" {...stroke} strokeWidth={1.2} aria-hidden="true">
      <path d="M3 13.5V8M6.5 13.5V4M10 13.5V6.5M13.5 13.5V2.5" />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" {...stroke} aria-hidden="true">
      <path d="M2 3.5l3 3 3-3" />
    </svg>
  );
}

export function ArrowUpIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" {...stroke} strokeWidth={1.5} aria-hidden="true">
      <path d="M6 10V2M2.5 5.5L6 2l3.5 3.5" />
    </svg>
  );
}

export function ToolIcon({ tool }: { tool: BuildLogTool }) {
  switch (tool) {
    case "claude":
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" {...stroke} strokeWidth={1.4} strokeLinecap="round" aria-hidden="true">
          <path d="M8 2v12M2.8 5l10.4 6M2.8 11l10.4-6" />
        </svg>
      );
    case "codex":
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" {...stroke} aria-hidden="true">
          <rect x="1.5" y="2.5" width="13" height="11" rx="2" />
          <path d="M4.5 6.5l2 1.5-2 1.5M8.5 10h3" />
        </svg>
      );
    case "cursor":
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" {...stroke} strokeLinejoin="round" aria-hidden="true">
          <path d="M3 2.5l9.5 5-4.2 1.2-1.6 4.3z" />
        </svg>
      );
  }
}

export function BrowserBarIcons({ url }: { url: string }) {
  return (
    <div className="bl-urlbar" aria-hidden="true">
      <span>
        <svg width="13" height="13" viewBox="0 0 16 16" {...stroke}><path d="M13 8H3M7 4L3 8l4 4" /></svg>
      </span>
      <span>
        <svg width="13" height="13" viewBox="0 0 16 16" {...stroke}><path d="M3 8h10M9 4l4 4-4 4" /></svg>
      </span>
      <span>
        <svg width="13" height="13" viewBox="0 0 16 16" {...stroke}><path d="M13 8a5 5 0 11-1.5-3.5M13 2.5v3h-3" /></svg>
      </span>
      <span className="bl-url">{url}</span>
      <span className="bl-url-end">
        <svg width="13" height="13" viewBox="0 0 16 16" {...stroke}><rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M10 3v10" /></svg>
      </span>
    </div>
  );
}
