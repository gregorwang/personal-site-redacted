import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"

// 交互与尺寸对齐 openai.com 文章页视频播放器：
// 鼠标在画面里移动时显示中心大图标 + 底栏，静止 3s 或移出画面即全部淡出（与播放/暂停无关）；
// 进入视口静音自动播放；底栏 8px 白色进度条、24px 按钮 / 16px 图标、14px 时间。
const IDLE_HIDE_DELAY = 3000
const KEY_SEEK_STEP = 5
const PLAYBACK_RATES = [1, 1.25, 1.5, 2, 0.75] as const

const CONTROLS_FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'

// 缓动渐变：比线性 from-black/50 过渡更柔和，底部不会出现一条明显的分界线
const CONTROLS_GRADIENT =
  "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.494) 8.1%, rgba(0,0,0,0.475) 15.5%, rgba(0,0,0,0.447) 22.5%, rgba(0,0,0,0.41) 29%, rgba(0,0,0,0.373) 35.3%, rgba(0,0,0,0.325) 41.2%, rgba(0,0,0,0.275) 47.1%, rgba(0,0,0,0.224) 52.9%, rgba(0,0,0,0.176) 58.8%, rgba(0,0,0,0.13) 64.7%, rgba(0,0,0,0.086) 71%, rgba(0,0,0,0.05) 77.5%, rgba(0,0,0,0.024) 84.5%, rgba(0,0,0,0.008) 91.9%, rgba(0,0,0,0) 100%)"

const ICON_PATHS = {
  play: "M4.848 4.69a1.167 1.167 0 0 1 1.8-.98l5.125 3.31c.711.46.711 1.5 0 1.96l-5.125 3.31a1.167 1.167 0 0 1-1.8-.98z",
  pause:
    "M5.9 3.917c.653 0 1.183.53 1.183 1.183v5.8c0 .653-.53 1.184-1.183 1.184H4.767c-.654 0-1.184-.53-1.184-1.184V5.1c0-.653.53-1.183 1.184-1.183zm5.334 0c.653 0 1.183.53 1.183 1.183v5.8c0 .653-.53 1.183-1.183 1.184H10.1c-.654 0-1.184-.53-1.184-1.184V5.1c0-.653.53-1.183 1.184-1.183z",
  speaker:
    "M6.334 2.038c1.29-.921 3.082.001 3.082 1.587v8.67c0 1.586-1.792 2.508-3.083 1.586L3.76 12.043H2.667A2.083 2.083 0 0 1 .583 9.96v-4c0-1.15.933-2.084 2.084-2.084H3.76zm6.477 2.092a.75.75 0 0 1 1.06.014c2.06 2.12 2.061 5.592 0 7.712a.75.75 0 0 1-1.076-1.045c1.495-1.538 1.495-4.084 0-5.621a.75.75 0 0 1 .016-1.06M10.652 4.993a.75.75 0 0 1 1.055.112c1.393 1.722 1.389 4.07 0 5.788a.75.75 0 1 1-1.167-.944c.946-1.168.948-2.73 0-3.9a.75.75 0 0 1 .112-1.056",
  speakerSlash:
    "M1.47 1.47a.75.75 0 0 1 1.06 0l12 12a.75.75 0 1 1-1.06 1.06l-.777-.776a1.946 1.946 0 0 1-2.506.537l-4.05-2.25H5A2.083 2.083 0 0 1 2.917 9.96v-4c0-.55.213-1.05.56-1.421L1.47 2.53a.75.75 0 0 1 0-1.06m8.716.157c1.3-.722 2.897.218 2.897 1.705v5.481a.75.75 0 0 1-1.286.525L7.037 4.47a.75.75 0 0 1 .17-1.179z",
  expand:
    "M2.665 8.59a.75.75 0 0 1 .75.75v2.2l2.411-2.412a.75.75 0 1 1 1.061 1.06l-2.398 2.399h2.174a.75.75 0 0 1 0 1.5H2.766a.85.85 0 0 1-.85-.85V9.34a.75.75 0 0 1 .75-.75m10.569-6.671c.469 0 .85.38.85.85v3.897a.75.75 0 0 1-1.5 0V4.468l-2.41 2.41a.75.75 0 0 1-1.061-1.06l2.399-2.399H9.337a.75.75 0 1 1 0-1.5z",
  collapse:
    "M6.483 8.582c.515 0 .933.419.934.934v3.816a.75.75 0 1 1-1.5 0v-2.196l-3.052 3.06a.75.75 0 0 1-1.063-1.059l3.048-3.055H2.667a.75.75 0 0 1 0-1.5zm6.652-6.778a.75.75 0 0 1 1.063 1.059l-3.043 3.053h2.179a.75.75 0 0 1 0 1.5H9.517a.934.934 0 0 1-.934-.933V2.666a.75.75 0 0 1 1.5 0v2.2z",
  ellipsis:
    "M3.478 6.59a1.417 1.417 0 1 1-1.555 1.555L1.917 8l.006-.145a1.42 1.42 0 0 1 1.41-1.272zm4.667 0A1.418 1.418 0 1 1 6.59 8.145L6.584 8l.006-.145A1.42 1.42 0 0 1 8 6.583zm4.666 0a1.417 1.417 0 1 1-1.554 1.555L11.25 8l.007-.145a1.42 1.42 0 0 1 1.41-1.272z",
} as const

// 中心大图标用裁到图形边界的 viewBox，保证 54/80px 时图形本身撑满
const CENTER_VIEWBOX = {
  play: "4.445 0.8 8.266 14.4",
  pause: "3.134 0.922 9.732 14.156",
} as const

interface VideoPlayerProps {
  src: string
  title: string
  poster?: string
  /** 内联播放时容器比例。视频以 cover 填满，可用来裁掉片源自带的电影黑边；全屏时恢复完整画面。 */
  aspectRatio?: string
  /** 元数据加载前展示的时长（秒），preload="none" 时避免显示 00:00。 */
  durationHint?: number
  captionsSrc: string
  /** 进入视口后静音自动播放（prefers-reduced-motion 时不自动播放）。 */
  autoPlayInView?: boolean
  loop?: boolean
  className?: string
}

type FullscreenCapableVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void }

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00"
  const total = Math.floor(seconds)
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function VideoPlayer({
  src,
  title,
  poster,
  aspectRatio = "16 / 9",
  durationHint = 0,
  captionsSrc,
  autoPlayInView = true,
  loop = true,
  className = "",
}: VideoPlayerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const idleTimerRef = useRef<number | null>(null)
  const copiedTimerRef = useRef<number | null>(null)
  const scrubTrackRef = useRef<HTMLDivElement | null>(null)
  // 用户主动暂停后，滚出再滚回视口不自动恢复播放
  const userPausedRef = useRef(false)

  const intl = useIntl()
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [isMuted, setIsMuted] = useState(autoPlayInView)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [currentSecond, setCurrentSecond] = useState(0)
  const [duration, setDuration] = useState(durationHint)

  const getDuration = useCallback(() => {
    const video = videoRef.current
    if (video && Number.isFinite(video.duration) && video.duration > 0) return video.duration
    return durationHint
  }, [durationHint])

  // 进度直接写 DOM（桌面 / 移动两条进度条），避免每帧触发 React 渲染；时间文字只在整秒变化时更新
  const paintProgress = useCallback(
    (time: number) => {
      const total = getDuration()
      const percent = total > 0 ? clamp01(time / total) * 100 : 0
      rootRef.current?.querySelectorAll<HTMLElement>("[data-progress-fill]").forEach((fill) => {
        fill.style.width = `${percent}%`
      })
      setCurrentSecond(Math.floor(time))
    },
    [getDuration],
  )

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }, [])

  const activate = useCallback(() => {
    setIsActive(true)
    clearIdleTimer()
    idleTimerRef.current = window.setTimeout(() => setIsActive(false), IDLE_HIDE_DELAY)
  }, [clearIdleTimer])

  const deactivate = useCallback(() => {
    clearIdleTimer()
    setIsActive(false)
  }, [clearIdleTimer])

  useEffect(
    () => () => {
      clearIdleTimer()
      if (copiedTimerRef.current !== null) window.clearTimeout(copiedTimerRef.current)
    },
    [clearIdleTimer],
  )

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === rootRef.current)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  useEffect(() => {
    const root = rootRef.current
    const video = videoRef.current
    if (!autoPlayInView || !root || !video) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (userPausedRef.current || !video.paused) return
          video.muted = true
          // 浏览器拒绝自动播放时停在封面，中心播放键保持可见
          video.play().catch(() => undefined)
        } else if (!video.paused) {
          video.pause()
        }
      },
      { threshold: 0.5 },
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [autoPlayInView])

  // 播放中用 rAF 平滑推进进度条（timeupdate 只有约 4Hz，会一跳一跳）
  useEffect(() => {
    if (!isPlaying) return
    let frame = 0
    const tick = () => {
      const video = videoRef.current
      if (video && !scrubTrackRef.current) paintProgress(video.currentTime)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isPlaying, paintProgress])

  useEffect(() => {
    if (!menuOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [menuOpen])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused || video.ended) {
      userPausedRef.current = false
      video.play().catch(() => undefined)
    } else {
      userPausedRef.current = true
      video.pause()
    }
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
  }, [])

  const toggleFullscreen = useCallback(() => {
    const root = rootRef.current
    const video = videoRef.current as FullscreenCapableVideo | null
    if (!root || !video) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined)
      return
    }
    if (typeof root.requestFullscreen === "function") {
      root.requestFullscreen().catch(() => undefined)
      return
    }
    // iOS Safari 不支持元素全屏，只能交给系统播放器
    video.webkitEnterFullscreen?.()
  }, [])

  const cyclePlaybackRate = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const index = PLAYBACK_RATES.indexOf(video.playbackRate as (typeof PLAYBACK_RATES)[number])
    video.playbackRate = PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length]
  }, [])

  const copyLink = useCallback(() => {
    navigator.clipboard
      .writeText(src)
      .then(() => {
        setLinkCopied(true)
        if (copiedTimerRef.current !== null) window.clearTimeout(copiedTimerRef.current)
        copiedTimerRef.current = window.setTimeout(() => setLinkCopied(false), 1600)
      })
      .catch(() => undefined)
  }, [src])

  const seekTo = useCallback(
    (time: number) => {
      const video = videoRef.current
      const total = getDuration()
      if (!video || total <= 0) return
      const target = clamp01(time / total) * total
      video.currentTime = target
      paintProgress(target)
    },
    [getDuration, paintProgress],
  )

  const seekFromPointer = (track: HTMLDivElement, clientX: number) => {
    const rect = track.getBoundingClientRect()
    if (rect.width <= 0) return
    seekTo(clamp01((clientX - rect.left) / rect.width) * getDuration())
  }

  const handleTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    scrubTrackRef.current = event.currentTarget
    setIsScrubbing(true)
    seekFromPointer(event.currentTarget, event.clientX)
  }

  const handleTrackPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (scrubTrackRef.current === event.currentTarget) seekFromPointer(event.currentTarget, event.clientX)
  }

  const endScrub = (event: React.PointerEvent<HTMLDivElement>) => {
    if (scrubTrackRef.current !== event.currentTarget) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    scrubTrackRef.current = null
    setIsScrubbing(false)
    activate()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video || event.altKey || event.ctrlKey || event.metaKey) return
    const isButton = (event.target as HTMLElement).tagName === "BUTTON"

    switch (event.key) {
      case " ":
        // 按钮自带空格激活，交给按钮自己处理，避免切换两次
        if (isButton) return
        event.preventDefault()
        togglePlay()
        break
      case "k":
        event.preventDefault()
        togglePlay()
        break
      case "m":
        event.preventDefault()
        toggleMute()
        break
      case "f":
        event.preventDefault()
        toggleFullscreen()
        break
      case "ArrowLeft":
        event.preventDefault()
        seekTo(video.currentTime - KEY_SEEK_STEP)
        break
      case "ArrowRight":
        event.preventDefault()
        seekTo(video.currentTime + KEY_SEEK_STEP)
        break
      default:
        return
    }
    activate()
  }

  // 还没播过（自动播放被拒或减少动态效果）时常驻显示，让人知道这是个视频
  const overlayVisible = isActive || menuOpen || isScrubbing || !hasStarted
  const totalSeconds = duration || durationHint
  const centerIcon = isPlaying ? "pause" : "play"

  const renderTrack = (label: string) => (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.floor(totalSeconds)}
      aria-valuenow={currentSecond}
      aria-valuetext={`${formatTime(currentSecond)} / ${formatTime(totalSeconds)}`}
      className="relative h-2 w-full cursor-pointer touch-none overflow-hidden rounded-[6px] bg-white/40 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      onPointerDown={handleTrackPointerDown}
      onPointerMove={handleTrackPointerMove}
      onPointerUp={endScrub}
      onPointerCancel={endScrub}
    >
      <div data-progress-fill className="h-2 bg-white" style={{ width: "0%" }} />
    </div>
  )

  return (
    // 键盘快捷键挂在外层，接收内部按钮 / 进度条冒泡上来的按键
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={rootRef}
      role="region"
      aria-label={intl.formatMessage({ defaultMessage: "{title} 视频播放器" }, { title })}
      className={`relative flex overflow-hidden bg-black outline-none select-none ${
        isFullscreen ? "h-full w-full" : "w-full"
      } ${className}`}
      style={isFullscreen ? undefined : { aspectRatio }}
      onPointerMove={activate}
      onPointerDown={activate}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse" && !scrubTrackRef.current) deactivate()
      }}
      onFocus={activate}
      onKeyDown={handleKeyDown}
    >
      <video
        ref={videoRef}
        src={src}
        preload="none"
        playsInline
        muted={autoPlayInView}
        loop={loop}
        title={title}
        className={`pointer-events-none absolute inset-0 h-full w-full ${isFullscreen ? "object-contain" : "object-cover"}`}
        onPlay={() => {
          setHasStarted(true)
          setIsPlaying(true)
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={(event) => paintProgress(event.currentTarget.duration)}
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration)
          setIsMuted(event.currentTarget.muted)
        }}
        onDurationChange={(event) => {
          if (Number.isFinite(event.currentTarget.duration)) setDuration(event.currentTarget.duration)
        }}
        onTimeUpdate={(event) => {
          // 暂停状态下的跳转没有 rAF 驱动，靠 timeupdate 同步
          if (!isPlaying && !scrubTrackRef.current) paintProgress(event.currentTarget.currentTime)
        }}
        onVolumeChange={(event) => setIsMuted(event.currentTarget.muted)}
        onRateChange={(event) => setPlaybackRate(event.currentTarget.playbackRate)}
      >
        <track kind="captions" src={captionsSrc} srcLang="en" label="English captions" />
        <FormattedMessage defaultMessage="您的浏览器不支持视频播放。" />
      </video>

      {poster ? (
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-500 motion-reduce:transition-none ${
            hasStarted ? "opacity-0" : "opacity-100"
          }`}
        />
      ) : null}

      {/* 整个画面就是播放 / 暂停热区；中心大图标随底栏一起显隐 */}
      <button
        type="button"
        aria-label={isPlaying ? intl.formatMessage({ defaultMessage: "暂停视频" }) : intl.formatMessage({ defaultMessage: "播放视频" })}
        className={`absolute inset-0 z-[1] flex h-full w-full items-center justify-center text-white transition-opacity duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] focus-visible:outline-none ${
          overlayVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      >
        <svg
          viewBox={CENTER_VIEWBOX[centerIcon]}
          fill="none"
          aria-hidden="true"
          className="h-[54px] w-[54px] opacity-90 md:h-20 md:w-20"
        >
          <path fill="currentColor" d={ICON_PATHS[centerIcon]} />
        </svg>
      </button>

      <div
        data-player-controls
        className={`absolute inset-x-0 bottom-0 z-[1] flex flex-col items-center justify-between gap-3 p-2 text-[14px] font-medium leading-[14px] text-white transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:p-5 ${
          overlayVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ background: CONTROLS_GRADIENT, fontFamily: CONTROLS_FONT }}
      >
        <div className="flex w-full md:hidden">{renderTrack(intl.formatMessage({ defaultMessage: "播放进度" }))}</div>

        <div className="flex w-full items-center justify-start gap-4">
          <ControlButton label={isPlaying ? intl.formatMessage({ defaultMessage: "暂停视频" }) : intl.formatMessage({ defaultMessage: "播放视频" })} path={ICON_PATHS[centerIcon]} onClick={togglePlay} />

          <p className="tabular-nums">
            {formatTime(currentSecond)}
            <span className="ms-1 before:me-1 before:content-['|']">{formatTime(totalSeconds)}</span>
          </p>

          <div className="flex-1">
            <div className="hidden md:block">{renderTrack(intl.formatMessage({ defaultMessage: "播放进度" }))}</div>
          </div>

          <ControlButton
            label={isMuted ? intl.formatMessage({ defaultMessage: "取消视频静音" }) : intl.formatMessage({ defaultMessage: "视频静音" })}
            path={isMuted ? ICON_PATHS.speakerSlash : ICON_PATHS.speaker}
            onClick={toggleMute}
          />

          <ControlButton
            label={isFullscreen ? intl.formatMessage({ defaultMessage: "退出全屏" }) : intl.formatMessage({ defaultMessage: "全屏" })}
            path={isFullscreen ? ICON_PATHS.collapse : ICON_PATHS.expand}
            onClick={toggleFullscreen}
          />

          <div ref={menuRef} className="relative">
            {menuOpen ? (
              <div className="absolute bottom-8 right-0 flex min-w-[130px] flex-col rounded-[6px] bg-black/80 px-1 py-2 backdrop-blur-3xl">
                <button type="button" className="p-2 text-start" onClick={cyclePlaybackRate}>
                  <div className="flex justify-between leading-none">
                    {intl.formatMessage({ defaultMessage: "速度", description: "视频播放速度菜单项" })}
                    <span className="ms-1 text-white/45">{playbackRate === 1 ? intl.formatMessage({ defaultMessage: "正常", description: "1 倍播放速度" }) : `${playbackRate}×`}</span>
                  </div>
                </button>
                <button type="button" className="p-2 text-start" onClick={copyLink}>
                  <div className="flex leading-none">{linkCopied ? intl.formatMessage({ defaultMessage: "已复制" }) : intl.formatMessage({ defaultMessage: "复制链接" })}</div>
                </button>
              </div>
            ) : null}
            <ControlButton
              label={intl.formatMessage({ defaultMessage: "视频设置" })}
              path={ICON_PATHS.ellipsis}
              onClick={() => setMenuOpen((open) => !open)}
              ariaExpanded={menuOpen}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

interface ControlButtonProps {
  label: string
  path: string
  onClick: () => void
  ariaExpanded?: boolean
}

function ControlButton({ label, path, onClick, ariaExpanded }: ControlButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={ariaExpanded}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white outline-offset-2 transition duration-200 ease-linear focus-visible:outline focus-visible:outline-2 focus-visible:outline-white [&>svg]:transition-opacity [&>svg]:duration-200 hover:[&>svg]:opacity-60"
      onClick={onClick}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path fill="currentColor" d={path} />
      </svg>
    </button>
  )
}
