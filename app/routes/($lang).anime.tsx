import type { LinksFunction, MetaFunction, HeadersFunction } from "react-router";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { BackHome } from "~/components/ui/BackHome";
import { cdnUrl } from "~/lib/media-cdn";
import { resolveImage } from "~/lib/resolve-image";
import { getMetaIntl, pageMeta } from "~/utils/seo";
import { FormattedMessage, useIntl, type IntlShape } from "react-intl";
// Replaced heroicons with simple symbols for better performance

// Types
interface AnimeItem {
  id: number;
  name: string;
  rating: string;
  url: string | null;
}

interface AnimePageData {
  content: {
    title: string;
    subtitle: string;
    description: string;
    ranksTitle: string;
  };
  animeList: AnimeItem[];
}

// 视频开头 0.5 秒是黑场：poster 用第 0.6 秒的画面，视频也从 0.6 秒开始播，
// 圆形转场展开时直接是画面，poster → 视频之间也没有跳变
const VIDEO_START = 0.6;
const videoSrc = `${cdnUrl("you.mp4")}#t=${VIDEO_START}`;
const posterSrc = resolveImage("anime_poster");

// Links function
export const links: LinksFunction = () => (posterSrc ? [{ rel: "preload", as: "image", href: posterSrc }] : []);

// Meta function
export const meta: MetaFunction = ({ matches }) => pageMeta.anime(getMetaIntl(matches));

// 页面内容全是静态文案，在组件里组装，不需要 loader：客户端跳转时不发 .data 请求
function buildAnimePageData(intl: IntlShape): AnimePageData {
  return {
    content: {
      title: intl.formatMessage({ defaultMessage: "最喜欢的动漫" }),
      subtitle: intl.formatMessage({ defaultMessage: "人生中一部分时间由他们陪伴我度过" }),
      description: intl.formatMessage({ defaultMessage: "这些动漫作品不仅仅是娱乐，更是陪伴我成长的重要回忆。每一部都有着独特的魅力和深刻的内涵。" }),
      ranksTitle: intl.formatMessage({ defaultMessage: "我的动漫排行榜" }),
    },
    animeList: [
      { id: 1, name: intl.formatMessage({ defaultMessage: "从零开始的异世界生活" }), rating: '10.0', url: null },
      { id: 2, name: intl.formatMessage({ defaultMessage: "火影忍者" }), rating: '9.5', url: null },
      { id: 3, name: intl.formatMessage({ defaultMessage: "进击的巨人" }), rating: '9.8', url: null },
      { id: 4, name: intl.formatMessage({ defaultMessage: "鬼灭之刃" }), rating: '9.3', url: null },
      { id: 5, name: intl.formatMessage({ defaultMessage: "斩！赤红之瞳" }), rating: '9.9', url: null },
      { id: 6, name: intl.formatMessage({ defaultMessage: "来自多彩世界的明天" }), rating: '9.7', url: null },
      { id: 7, name: intl.formatMessage({ defaultMessage: "擅长作弄的高木同学" }), rating: '9.5', url: null },
      { id: 8, name: intl.formatMessage({ defaultMessage: "猫和老鼠" }), rating: '10.0', url: null },
      { id: 9, name: intl.formatMessage({ defaultMessage: "Fate系列" }), rating: '9.0', url: null },
      { id: 10, name: intl.formatMessage({ defaultMessage: "雾山五行" }), rating: '9.7', url: null },
      { id: 11, name: intl.formatMessage({ defaultMessage: "灵笼" }), rating: '9.8', url: null }
    ],
  };
}

export const headers: HeadersFunction = () => ({ "Cache-Control": "public, max-age=300, stale-while-revalidate=600" });

export default function AnimePage() {
  const intl = useIntl();
  const { content, animeList } = useMemo(() => buildAnimePageData(intl), [intl]);

  // State management
  const [isMenuActive, setIsMenuActive] = useState(false);
  // 和 <video muted> 的 SSR 属性一致：先静音，客户端能有声时再打开（以 volumechange 为准同步）
  const [isMuted, setIsMuted] = useState(true);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const showcaseRef = useRef<HTMLDivElement>(null);

  // 防抖的菜单切换
  const toggleMenu = useCallback(() => {
    setIsMenuActive(prev => !prev);
  }, []);

  // 能有声就有声：站内点击进来时，那次点击就是文档的用户激活，浏览器允许直接有声播放。
  // 直接打开 / 刷新 / 外链进入没有激活，或 Safari 按媒体参与度拒绝 → 退回静音，左下角给「开声音」按钮。
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (navigator.userActivation?.hasBeenActive !== true) return;

    video.muted = false;
    video.volume = 0.8;
    video.play().catch(() => {
      video.muted = true;
      return video.play().catch(() => {
        /* 静音自动播放也被拒绝时保留 poster */
      });
    });
  }, []);

  // 当侧边栏开启/关闭导致视频区域可能离开视口时，尝试恢复视频播放
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // 如果视频被浏览器自动暂停（通常因为不可见），稍后尝试恢复播放
    if (video.paused) {
      // 等待过渡动画大致结束后再调用 play，以避免 play() 被立即暂停
      const timer = setTimeout(() => {
        video.play().catch(() => {
          /* 在某些浏览器策略下 play 可能被拒绝，这里静默处理 */
        });
      }, 400); // 与 CSS transition 500ms 保持接近，但略短一些
      return () => clearTimeout(timer);
    }
  }, [isMenuActive]);

  // 在点击事件里切换声音，任何浏览器都允许有声播放
  const toggleSound = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.muted) {
      video.muted = false;
      video.volume = 0.8;
      video.play().catch(() => {
        video.muted = true;
      });
    } else {
      video.muted = true;
    }
  }, []);

  const handleVideoErrorEvent = useCallback((error: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error('❌ 视频加载失败:', error);
  }, []);

  // 键盘事件处理
  const handleKeydown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        if (isMenuActive) {
          setIsMenuActive(false);
        }
        break;
      case ' ':
        if (event.target === document.body) {
          event.preventDefault();
          toggleMenu();
        }
        break;
    }
  }, [isMenuActive, toggleMenu]);

  // 生命周期
  useEffect(() => {
    // 添加键盘事件监听
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [handleKeydown]);

  // 离开页面时暂停视频
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      video?.pause();
    };
  }, []);

  const soundLabel = isMuted
    ? intl.formatMessage({ defaultMessage: "开声音", description: "番剧页背景视频：取消静音的按钮" })
    : intl.formatMessage({ defaultMessage: "静音", description: "番剧页背景视频：静音的按钮" });

  return (
    <div className="anime-page relative w-full min-h-screen overflow-x-hidden font-sans bg-black">
      {/* 主展示区域 */}
      <section
        ref={showcaseRef}
        className={`absolute right-0 w-full min-h-screen px-6 py-24 md:px-24 flex justify-between items-center bg-black text-white z-20 transition-[right] duration-500 ease-expo-out ${
          isMenuActive ? 'md:right-80 right-full' : ''
        }`}
      >
        {/* 头部导航 */}
        <header className="absolute top-0 left-0 w-full p-6 md:p-10 z-50 flex justify-end">
          <button
            type="button"
            onClick={toggleMenu}
            className={`w-12 h-12 md:w-15 md:h-15 rounded-full cursor-pointer transition-[transform,background-color] duration-300 ease-expo-out hover:bg-white/10 focus:outline-2 focus:outline-white focus:outline-offset-4 flex items-center justify-center ${
              isMenuActive ? 'rotate-180' : ''
            }`}
            aria-label={isMenuActive ? intl.formatMessage({ defaultMessage: "关闭菜单" }) : intl.formatMessage({ defaultMessage: "打开菜单" })}
          >
            {isMenuActive ? (
              <span className="w-6 h-6 md:w-8 md:h-8 text-white text-xl md:text-2xl flex items-center justify-center">✕</span>
            ) : (
              <span className="w-6 h-6 md:w-8 md:h-8 text-white text-xl md:text-2xl flex items-center justify-center">☰</span>
            )}
          </button>
        </header>

        {/* 背景视频：SSR 保留 muted autoPlay playsInline，保证首帧和静音自动播放一定成功；有声在客户端切 */}
        <video
          ref={videoRef}
          src={videoSrc}
          poster={posterSrc || undefined}
          className="absolute top-0 left-0 w-full h-full object-cover opacity-80 -z-10"
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          onVolumeChange={(event) => setIsMuted(event.currentTarget.muted)}
          onError={handleVideoErrorEvent}
        />

        {/* 主要文本内容 */}
        <div className="relative z-10 max-w-4xl">
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-bold uppercase leading-tight tracking-tight mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            {content.title}
          </h1>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold uppercase leading-tight tracking-tight mb-6 text-gray-200">
            {content.subtitle}
          </h2>
          <p className="text-base md:text-lg leading-relaxed my-5 max-w-2xl text-gray-300">
            {content.description}
          </p>
        </div>
      </section>

      {/* 动漫排行榜侧边栏 */}
      <aside
        className={`fixed top-0 w-80 md:w-80 h-screen bg-gradient-to-b from-primary-50 to-primary-100 backdrop-blur-md transition-[right] duration-500 ease-expo-out z-30 overflow-y-auto shadow-2xl ${
          isMenuActive ? 'right-0' : '-right-80'
        }`}
      >
        <div className="p-6 md:p-8 h-full flex flex-col">
          <h3 className="text-xl md:text-2xl font-semibold leading-tight tracking-tight text-primary-950 mb-6 md:mb-8 text-center border-b-2 border-accent/30 pb-4">
            {content.ranksTitle}
          </h3>
          <ul className="list-none p-0 m-0 flex-1 space-y-3">
            {animeList.map((anime, index) => {
              const rankContent = (
                <>
                  <span className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-[#d97757] to-[#c96442] text-white rounded-full font-bold text-xs md:text-sm flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm md:text-base font-medium">
                    {anime.name}
                  </span>
                  <span className="text-xs md:text-sm text-accent font-semibold">
                    {anime.rating}
                  </span>
                </>
              );

              return (
                <li key={anime.id} className="mb-3">
                  {anime.url ? (
                    <a
                      href={anime.url}
                      className="ui-card-interactive flex items-center gap-3 bg-white p-3 text-primary-950 md:gap-4 md:p-4"
                    >
                      {rankContent}
                    </a>
                  ) : (
                    <div className="ui-card-interactive flex cursor-default items-center gap-3 bg-white p-3 text-primary-950 opacity-80 md:gap-4 md:p-4">
                      {rankContent}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      <BackHome />

      {/* 声音开关 */}
      <div className="fixed bottom-6 left-6 z-30 flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSound}
          aria-label={soundLabel}
          aria-pressed={!isMuted}
          className="rounded-full border border-white/30 bg-black/40 px-3 py-2 text-sm text-white transition-colors duration-300 ease-expo-out hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          <span aria-hidden="true">{isMuted ? "🔇" : "🔊"}</span> {soundLabel}
        </button>
      </div>
    </div>
  );
}
