interface NetEaseMusicLogoProps {
  className?: string
}

/** NetEase Cloud Music brand mark (inline SVG, no external asset). */
export function NetEaseMusicLogo({ className = "h-4 w-4" }: NetEaseMusicLogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="12" fill="#C62F2F" />
      <path
        d="M7.5 15.2V8.8c0-.5.4-.9.9-.9h1.1c.5 0 .9.4.9.9v3.1l3.2-2.1c.4-.3 1-.1 1.2.3l.6 1c.2.4 0 .9-.4 1.1l-2.5 1.6 2.5 1.6c.4.2.6.7.4 1.1l-.6 1c-.2.4-.8.6-1.2.3l-3.2-2.1v3.1c0 .5-.4.9-.9.9H8.4c-.5 0-.9-.4-.9-.9z"
        fill="white"
      />
    </svg>
  )
}

export const NETEASE_MUSIC_HOME = "https://music.163.com/"
