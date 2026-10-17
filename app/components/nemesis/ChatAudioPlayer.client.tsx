import { useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { NemesisIcon } from "~/components/nemesis/chat/NemesisIcon";
import type { AudioAttachment } from "~/types/chat";

type ChatAudioPlayerProps = {
  attachment: AudioAttachment;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function ChatAudioPlayer({ attachment }: ChatAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const intl = useIntl();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const previewSeconds = attachment.previewDurationMs / 1000;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const handleEnded = () => {
      setIsPlaying(false);
    };
    const handlePause = () => {
      setIsPlaying(false);
    };
    const handlePlay = () => {
      setIsPlaying(true);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      return;
    }

    try {
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const nextTime = Number(event.target.value);
    if (!audio || previewSeconds <= 0 || !Number.isFinite(nextTime)) {
      return;
    }

    audio.currentTime = Math.min(previewSeconds, Math.max(0, nextTime));
    setCurrentTime(audio.currentTime);
  };

  const progress = previewSeconds > 0 ? Math.min(100, (currentTime / previewSeconds) * 100) : 0;

  return (
    <div className="nm-audio nm-rise">
      {/* Instrumental preview; no caption track available from Apple preview API */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={attachment.previewUrl} preload="none" />

      <div className="nm-audio-head">
        <img
          src={attachment.artworkUrl}
          alt=""
          width={56}
          height={56}
          loading="lazy"
          decoding="async"
          className="nm-art"
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <a
            href={attachment.trackViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="nm-audio-title nm-trunc"
          >
            {attachment.title}
          </a>
          <span className="nm-audio-artist nm-trunc">{attachment.artist}</span>
          <span className="nm-audio-src">
            <span className={`nm-eq${isPlaying ? " on" : ""}`} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <FormattedMessage defaultMessage="Apple Music 官方 30 秒试听" description="Nemesis 音乐卡片：音源说明" />
          </span>
        </div>
        <button
          type="button"
          onClick={togglePlay}
          className="nm-play"
          aria-label={isPlaying ? intl.formatMessage({ defaultMessage: "暂停试听", description: "Nemesis 音乐卡片：暂停按钮" }) : intl.formatMessage({ defaultMessage: "播放试听", description: "Nemesis 音乐卡片：播放按钮" })}
        >
          {isPlaying ? <NemesisIcon name="pause" /> : <NemesisIcon name="play" className="nm-play-icon" />}
        </button>
      </div>

      <div className="nm-audio-bar">
        <span className="nm-time">{formatTime(currentTime)}</span>
        <div className="nm-track">
          <span className="nm-track-fill" style={{ width: `${progress}%` }} />
          <input
            className="nm-range"
            type="range"
            min={0}
            max={previewSeconds}
            step={0.25}
            value={Math.min(currentTime, previewSeconds)}
            onChange={handleSeek}
            aria-label={intl.formatMessage({ defaultMessage: "试听进度", description: "Nemesis 音乐卡片：进度条的无障碍标签" })}
            aria-valuetext={`${formatTime(currentTime)} / ${formatTime(previewSeconds)}`}
          />
          <span className="nm-track-focus" />
        </div>
        <span className="nm-time">{formatTime(previewSeconds)}</span>
      </div>

      <div className="nm-audio-badge">
        <span><FormattedMessage defaultMessage="试听来自 Apple Music 正版音源，仅供推广。" description="Nemesis 音乐卡片底部版权说明" /></span>
        <a href={attachment.trackViewUrl} target="_blank" rel="noopener noreferrer" aria-label="Listen on Apple Music">
          <img
            src="/badges/listen-on-apple-music.svg"
            alt="Listen on Apple Music"
            height={26}
            style={{ display: "block", height: 26, width: "auto" }}
          />
        </a>
      </div>
    </div>
  );
}
