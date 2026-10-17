const ICON_PATHS = {
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h10" />,
  compose: <path d="M12 20h8M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />,
  trash: <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9.5" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
      <path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  regenerate: (
    <>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 4.5V11h-6.5" />
    </>
  ),
  flag: <path d="M5 21V4.5M5 4.5h11l-2 4 2 4H5" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5v.01" />
    </>
  ),
  send: <path d="M12 19V5M6 11l6-6 6 6" />,
  skip: <path d="M5 6l7 6-7 6M13 6l7 6-7 6" />,
} as const;

const FILLED_ICON_PATHS = {
  stop: <rect x="5" y="5" width="14" height="14" rx="3" />,
  play: <path d="M8 5.5v13l11-6.5z" />,
  pause: (
    <>
      <rect x="6.5" y="5" width="4" height="14" rx="1" />
      <rect x="13.5" y="5" width="4" height="14" rx="1" />
    </>
  ),
} as const;

export type NemesisIconName = keyof typeof ICON_PATHS | keyof typeof FILLED_ICON_PATHS;

type NemesisIconProps = {
  name: NemesisIconName;
  small?: boolean;
  className?: string;
};

export function NemesisIcon({ name, small = false, className }: NemesisIconProps) {
  const isFilled = name in FILLED_ICON_PATHS;
  const classes = ["nm-ic", small ? "sm" : "", isFilled ? "fill" : "", className ?? ""].filter(Boolean).join(" ");

  return (
    <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
      {isFilled
        ? FILLED_ICON_PATHS[name as keyof typeof FILLED_ICON_PATHS]
        : ICON_PATHS[name as keyof typeof ICON_PATHS]}
    </svg>
  );
}
