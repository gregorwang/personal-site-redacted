import type React from "react"
import { FormattedMessage, useIntl } from "react-intl";
import { MotionMusicGateway } from "~/components/ui/MotionMusicGateway"
import { NetEaseStylePlayer } from "~/components/music/NetEaseStylePlayer"
import { NetEaseMusicLogo, NETEASE_MUSIC_HOME } from "~/components/music/NetEaseMusicLogo"
import { useState, useRef, useEffect } from "react"
import { imageSrcSet, resolveImage } from "~/lib/resolve-image"
import type { HomeSong } from "~/data/home-songs"
import { loadHomeLyrics } from "~/lib/home-lyrics.client"
import type { LyricLine } from "~/types/lyrics"

const TAB_BG_SRC = resolveImage("asset_85923e7")

interface Position {
  x: number
  y: number
}

interface TabShowcaseProps {
  songs: HomeSong[]
}

export default function TabShowcase({ songs }: TabShowcaseProps) {
  const intl = useIntl()
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 })
  const [isMobile, setIsMobile] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0)
  const [currentSongIndex, setCurrentSongIndex] = useState(0)
  const [showPlaylist, setShowPlaylist] = useState(false)
  const [lyrics, setLyrics] = useState<LyricLine[]>([])

  const containerRef = useRef<HTMLDivElement>(null)
  const windowRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const lyricsContainerRef = useRef<HTMLDivElement>(null)
  const lyricsListRef = useRef<HTMLDivElement>(null)

  const currentSong = songs[currentSongIndex]

  // 加载歌词
  useEffect(() => {
    let cancelled = false
    setLyrics([])
    setCurrentLyricIndex(0)

    void loadHomeLyrics(currentSong.lyricsId).then((lines) => {
      if (!cancelled) {
        setLyrics(lines)
      }
    })

    return () => {
      cancelled = true
    }
  }, [currentSong.lyricsId])

  // 高频同步 audio.currentTime 以驱动平滑逐词流光 (60 FPS)
  useEffect(() => {
    if (!isPlaying) return
    let rafId: number
    const loop = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime)
      }
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [isPlaying])

  // 根据当前时间计算高亮歌词行索引
  useEffect(() => {
    if (lyrics.length === 0) return

    let index = -1
    for (let i = 0; i < lyrics.length; i++) {
      const line = lyrics[i]
      const start = line.start ?? line.time ?? 0
      const end =
        line.end ??
        (i + 1 < lyrics.length
          ? (lyrics[i + 1].start ?? lyrics[i + 1].time ?? start + 3)
          : start + 3)

      if (currentTime >= start && currentTime < end) {
        index = i
        break
      } else if (currentTime < start && index === -1 && i > 0) {
        index = i - 1
        break
      }
    }

    if (
      index === -1 &&
      lyrics.length > 0 &&
      currentTime >=
        (lyrics[lyrics.length - 1].end ?? lyrics[lyrics.length - 1].start ?? 0)
    ) {
      index = lyrics.length - 1
    }

    if (index !== -1 && index !== currentLyricIndex) {
      setCurrentLyricIndex(index)
    }
  }, [currentTime, lyrics, currentLyricIndex])

  // 歌词行切换时平滑居中滚动
  useEffect(() => {
    if (lyrics.length === 0) return

    let rafId = 0
    rafId = requestAnimationFrame(() => {
      const container = lyricsContainerRef.current
      const lyricsList = lyricsListRef.current
      if (!container || !lyricsList) return

      const currentElement = lyricsList.children[currentLyricIndex] as
        | HTMLElement
        | undefined
      if (!currentElement) return

      const containerHeight = container.clientHeight
      const elementTop = currentElement.offsetTop
      const elementHeight = currentElement.clientHeight
      const scrollTop = elementTop - containerHeight / 2 + elementHeight / 2
      container.scrollTo({ top: scrollTop, behavior: "smooth" })
    })

    return () => cancelAnimationFrame(rafId)
  }, [currentLyricIndex, lyrics.length])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return
    const target = e.target as HTMLElement
    if (target.closest("[data-no-drag]")) return

    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isMobile) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        void audioRef.current.play()
      }
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      const maxTime = Number.isFinite(duration) ? Math.max(duration, 0) : 0
      const nextTime = Math.min(Math.max(time, 0), maxTime)
      audioRef.current.currentTime = nextTime
      setCurrentTime(nextTime)
    }
  }

  const handleLyricClick = (time: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = time
    setCurrentTime(time)
    void audioRef.current.play()
  }

  // Song navigation functions
  const playNextSong = () => {
    setCurrentSongIndex((prev) => (prev + 1) % songs.length)
    setCurrentTime(0)
    if (audioRef.current) {
      setTimeout(() => {
        void audioRef.current?.play()
      }, 100)
    }
  }

  const playPreviousSong = () => {
    setCurrentSongIndex((prev) => (prev - 1 + songs.length) % songs.length)
    setCurrentTime(0)
    if (audioRef.current) {
      setTimeout(() => {
        void audioRef.current?.play()
      }, 100)
    }
  }

  // Auto-play next song when current song ends
  const handleSongEnded = () => {
    setIsPlaying(false)
    playNextSong()
  }

  // Reset playback when song changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load()
      setCurrentTime(0)
      setCurrentLyricIndex(0)
    }
  }, [currentSongIndex])

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-x-clip bg-primary-50 py-16 md:py-20"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      role="presentation"
    >
      {/* Layer 1: White background */}
      <div className="absolute inset-0 bg-primary-50" />

      {/* Content layout with max-width container and padding */}
      <div className="relative z-10 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20">
          <div className="relative w-full flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            {/* Left side - Text content */}
            <div className="w-full lg:w-2/5 flex-shrink-0">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-primary-950">
                    <span className="bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">
                      <FormattedMessage defaultMessage="夺心之声" />
                    </span>
                  </h2>
                  <div className="w-16 h-1 bg-gradient-to-r from-accent to-accent-hover rounded-full"></div>
                  <div className="flex items-start gap-2 pt-2 max-w-sm">
                    <a
                      href={NETEASE_MUSIC_HOME}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 shrink-0 transition-opacity hover:opacity-80"
                      title={intl.formatMessage({ defaultMessage: "前往网易云音乐" })}
                    >
                      <NetEaseMusicLogo className="h-4 w-4" />
                      <span className="sr-only"><FormattedMessage defaultMessage="网易云音乐" /></span>
                    </a>
                    <p className="text-xs leading-relaxed text-primary-950/45">
                      <FormattedMessage
                        defaultMessage="本站播放器接入<link>网易云音乐</link>官方外链音源，正版试听展示。点击播放器内封面或曲名，前往网易云享受更高音质与完整功能。"
                        values={{
                          link: (chunks) => (
                            <a
                              href={NETEASE_MUSIC_HOME}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mx-0.5 text-[#c62f2f] transition-colors hover:underline"
                            >
                              {chunks}
                            </a>
                          ),
                        }}
                      />
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-base lg:text-lg text-primary-950/70 leading-relaxed max-w-sm">
                    <FormattedMessage
                      defaultMessage="2500+ 首歌曲，750+ 位艺术家。<br></br>从 FELT 到 Vivienne，每首歌都是一段故事。"
                      values={{ br: () => <br /> }}
                    />
                  </p>
                  {/* Subtle scroll indicator */}
                  <MotionMusicGateway />
                </div>
              </div>
            </div>

            {/* Right side - Window with background */}
            <div className="relative w-full lg:w-3/5 flex-shrink-0 flex items-center justify-center">
              {/* Background painting - contained within the right side, not full width */}
              <div className="absolute -inset-8 -right-16 lg:-inset-12 lg:-right-24 xl:-inset-16 xl:-right-32 bg-gradient-to-b from-primary-100 to-primary-50 rounded-l-3xl overflow-hidden">
                <div className="absolute inset-0 w-full h-full overflow-hidden">
                  <img
                    src={TAB_BG_SRC}
                    srcSet={imageSrcSet(TAB_BG_SRC)}
                    sizes="100vw"
                    alt="Stone texture background"
                    className="absolute inset-0 w-full h-full object-cover"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-primary-50/5 pointer-events-none" />
                </div>
              </div>

              {/* Floating content container - positioned relative to right side container */}
              <div className="relative z-20 flex items-start gap-3">
                {/* Main player */}
                <div
                  ref={windowRef}
                  className={`relative ${
                    !isMobile ? "cursor-grab" : ""
                  } ${isDragging ? "cursor-grabbing" : ""}`}
                  style={
                    !isMobile
                      ? {
                          transform: `translate(${position.x}px, ${position.y}px)`,
                          width: "480px",
                          height: "400px",
                        }
                      : {
                          width: "100%",
                          maxWidth: "480px",
                          height: "400px",
                        }
                  }
                  onMouseDown={handleMouseDown}
                  role="presentation"
                >
                  {/* Lyrics scrolling area */}
                  <div
                    ref={lyricsContainerRef}
                    className="relative mb-2 h-[calc(100%-98px)] w-full overflow-y-auto overflow-x-hidden rounded-t-lg bg-gradient-to-b from-primary-100 to-primary-50"
                    style={{ scrollBehavior: "smooth" }}
                    data-no-drag
                  >
                    <div ref={lyricsListRef} className="w-full px-6 py-8">
                      {lyrics.map((lyric, index) => {
                        const isCurrentLine = index === currentLyricIndex
                        const isPassedLine = index < currentLyricIndex
                        const hasWords = Boolean(lyric.words && lyric.words.length > 0)

                        return (
                          <div
                            key={index}
                            onClick={() =>
                              handleLyricClick(lyric.start ?? lyric.time ?? 0)
                            }
                            className={`mb-4 block w-full cursor-pointer text-left transition-[transform,opacity] duration-300 ease-out ${
                              isCurrentLine
                                ? "scale-[1.02] opacity-100"
                                : isPassedLine
                                  ? "opacity-45 hover:opacity-70"
                                  : "opacity-70 hover:opacity-90"
                            }`}
                          >
                            {/* 原文行（支持 YRC 逐词/逐字平滑流光染色） */}
                            <div className="text-sm font-medium leading-relaxed tracking-wide">
                              {isCurrentLine && hasWords ? (
                                lyric.words!.map((word, wIdx) => {
                                  const isPassed = currentTime >= word.end
                                  const isPending = currentTime < word.start
                                  const progress = isPassed
                                    ? 1
                                    : isPending
                                      ? 0
                                      : (currentTime - word.start) /
                                        (word.duration || 0.001)
                                  const fillPercent = (
                                    Math.max(0, Math.min(1, progress)) * 100
                                  ).toFixed(1)

                                  return (
                                    <span
                                      key={wIdx}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleLyricClick(word.start)
                                      }}
                                      className="inline-block whitespace-pre-wrap transition-[color] duration-75 cursor-pointer"
                                      style={{
                                        backgroundImage: `linear-gradient(90deg, #d97757 0%, #d97757 ${fillPercent}%, rgba(20, 20, 19, 0.38) ${fillPercent}%, rgba(20, 20, 19, 0.38) 100%)`,
                                        WebkitBackgroundClip: "text",
                                        backgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        color: "transparent",
                                      }}
                                    >
                                      {word.text}
                                    </span>
                                  )
                                })
                              ) : (
                                <span
                                  className={
                                    isCurrentLine
                                      ? "font-semibold text-accent"
                                      : isPassedLine
                                        ? "text-primary-950/45"
                                        : "text-primary-950/75"
                                  }
                                >
                                  {lyric.text}
                                </span>
                              )}
                            </div>

                            {/* 中文翻译行 */}
                            {lyric.translation && (
                              <div
                                className={`mt-0.5 text-xs leading-relaxed transition-colors duration-200 ${
                                  isCurrentLine
                                    ? "font-medium text-[#c96442]"
                                    : "text-primary-950/40"
                                }`}
                              >
                                {lyric.translation}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <NetEaseStylePlayer
                    songId={currentSong.id}
                    title={currentSong.title}
                    artist={currentSong.artist}
                    coverUrl={currentSong.coverUrl}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    currentIndex={currentSongIndex}
                    totalSongs={songs.length}
                    showPlaylist={showPlaylist}
                    onTogglePlay={togglePlay}
                    onSeek={handleSeek}
                    onPrevious={playPreviousSong}
                    onNext={playNextSong}
                    onTogglePlaylist={() => setShowPlaylist(!showPlaylist)}
                  />

                  {/* Hidden audio element */}
                  <audio
                    ref={audioRef}
                    src={currentSong.url}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleSongEnded}
                    aria-label={intl.formatMessage({ defaultMessage: "音乐播放器" })}
                    preload="metadata"
                  >
                    <track kind="captions" />
                  </audio>
                </div>

                {/* Playlist panel */}
                {showPlaylist && (
                  <div
                    className="flex h-[400px] w-64 flex-col overflow-hidden rounded-lg border border-primary-100 bg-primary-50 shadow-lg"
                    data-no-drag
                  >
                    <div className="px-4 py-3 bg-primary-100 border-b border-primary-200">
                      <h3 className="text-sm font-semibold text-primary-950"><FormattedMessage defaultMessage="播放列表" /></h3>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {songs.map((song, index) => (
                        <button
                          key={song.id}
                          type="button"
                          onClick={() => {
                            setCurrentSongIndex(index)
                            setCurrentTime(0)
                            setTimeout(() => {
                              void audioRef.current?.play()
                            }, 100)
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-primary-100 transition-colors border-b border-primary-100/50 ${
                            index === currentSongIndex ? 'bg-accent/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {index === currentSongIndex && (
                              <svg className="w-3 h-3 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-primary-950 truncate">
                                {song.artist}
                              </p>
                              <p className="text-xs text-primary-950/60 truncate">
                                {song.title}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
