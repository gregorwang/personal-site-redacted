import type { KeyboardEvent, MouseEvent } from "react"
import { useIntl, FormattedMessage } from "react-intl";
import { NetEaseMusicLogo } from "./NetEaseMusicLogo"

export function neteaseSongUrl(songId: string) {
  return `https://music.163.com/song?id=${songId}`
}

interface NetEaseStylePlayerProps {
  songId: string
  title: string
  artist: string
  coverUrl?: string
  isPlaying: boolean
  currentTime: number
  duration: number
  currentIndex: number
  totalSongs: number
  showPlaylist: boolean
  onTogglePlay: () => void
  onSeek: (time: number) => void
  onPrevious: () => void
  onNext: () => void
  onTogglePlaylist: () => void
}

function formatTime(time: number) {
  if (!Number.isFinite(time) || time < 0) return "00:00"
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

export function NetEaseStylePlayer({
  songId,
  title,
  artist,
  coverUrl,
  isPlaying,
  currentTime,
  duration,
  currentIndex,
  totalSongs,
  showPlaylist,
  onTogglePlay,
  onSeek,
  onPrevious,
  onNext,
  onTogglePlaylist,
}: NetEaseStylePlayerProps) {
  const intl = useIntl();
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0
  const safeCurrentTime = Math.min(Math.max(currentTime, 0), safeDuration)
  const progress = safeDuration > 0 ? (safeCurrentTime / safeDuration) * 100 : 0
  const songPageUrl = neteaseSongUrl(songId)

  const seekTo = (time: number) => {
    if (safeDuration === 0) return
    onSeek(Math.min(Math.max(time, 0), safeDuration))
  }

  const handleProgressClick = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0
    seekTo(ratio * safeDuration)
  }

  const handleProgressKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let nextTime: number | null = null

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        nextTime = safeCurrentTime - 5
        break
      case "ArrowRight":
      case "ArrowUp":
        nextTime = safeCurrentTime + 5
        break
      case "Home":
        nextTime = 0
        break
      case "End":
        nextTime = safeDuration
        break
      default:
        return
    }

    event.preventDefault()
    seekTo(nextTime)
  }

  return (
    <div
      className="w-full overflow-hidden rounded-b-lg border border-[#dcdcdc] bg-[#f7f7f7] shadow-md"
      data-no-drag
    >
      {/* NetEase-style top progress */}
      <div
        className="group relative h-[3px] cursor-pointer bg-[#e1e1e1]"
        onClick={handleProgressClick}
        onKeyDown={handleProgressKeyDown}
        role="slider"
        tabIndex={0}
        aria-label={intl.formatMessage({ defaultMessage: "播放进度" })}
        aria-valuemin={0}
        aria-valuemax={safeDuration}
        aria-valuenow={safeCurrentTime}
        aria-valuetext={`${formatTime(safeCurrentTime)} / ${formatTime(safeDuration)}`}
        aria-disabled={safeDuration === 0}
      >
        <div
          className="h-full bg-[#c62f2f] transition-[width] duration-150 ease-linear"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#c62f2f] opacity-0 shadow transition-opacity group-hover:opacity-100"
          style={{ left: `calc(${progress}% - 5px)` }}
        />
      </div>

      <div className="flex h-[72px] items-center gap-2 px-2.5">
        {/* Album cover → opens NetEase */}
        <a
          href={songPageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative shrink-0 overflow-hidden rounded-sm shadow-sm"
          title={intl.formatMessage({ defaultMessage: "在网易云音乐打开" })}
        >
          {coverUrl ? (
            <img
              // 网易云图床支持 ?param=宽y高 裁切：原图 800×800 约 130KB，100×100 约 4KB（50px × 2 倍屏）
              src={`${coverUrl}?param=100y100`}
              alt={`${artist} - ${title}`}
              className="h-[50px] w-[50px] object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-[50px] w-[50px] items-center justify-center bg-[#e8e8e8] text-[#c62f2f]">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
              </svg>
            </div>
          )}
        </a>

        {/* Song meta → opens NetEase */}
        <div className="min-w-0 flex-1">
          <a
            href={songPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-[13px] font-normal leading-tight text-[#333] hover:text-[#c62f2f]"
            title={title}
          >
            {title}
          </a>
          <a
            href={songPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-[11px] leading-tight text-[#888] hover:text-[#c62f2f]"
            title={artist}
          >
            {artist}
          </a>
          <p className="mt-0.5 text-[10px] tabular-nums text-[#bbb]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </p>
        </div>

        {/* Functional controls (wired to local audio) */}
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onPrevious}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#666] transition-colors hover:bg-[#ebebeb] hover:text-[#333]"
            aria-label={intl.formatMessage({ defaultMessage: "上一首" })}
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c62f2f] text-white shadow-sm transition-colors hover:bg-[#b32727]"
            aria-label={isPlaying ? intl.formatMessage({ defaultMessage: "暂停" }) : intl.formatMessage({ defaultMessage: "播放" })}
          >
            {isPlaying ? (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg className="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#666] transition-colors hover:bg-[#ebebeb] hover:text-[#333]"
            aria-label={intl.formatMessage({ defaultMessage: "下一首" })}
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>

          <span className="w-7 text-center text-[10px] font-medium tabular-nums text-[#c62f2f]">
            {currentIndex + 1}/{totalSongs}
          </span>

          <button
            type="button"
            onClick={onTogglePlaylist}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
              showPlaylist
                ? "bg-[#fdeaea] text-[#c62f2f]"
                : "text-[#666] hover:bg-[#ebebeb] hover:text-[#333]"
            }`}
            aria-label={intl.formatMessage({ defaultMessage: "播放列表" })}
            aria-pressed={showPlaylist}
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 border-t border-[#ececec] px-2.5 py-1">
        <a
          href={songPageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[9px] text-[#bbb] transition-colors hover:text-[#c62f2f]"
          title={intl.formatMessage({ defaultMessage: "在网易云音乐打开，享受更高音质" })}
        >
          <NetEaseMusicLogo className="h-3 w-3" />
          <span><FormattedMessage defaultMessage="网易云音乐" /></span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  )
}
