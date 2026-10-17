import type { LinksFunction, LoaderFunctionArgs, MetaFunction, HeadersFunction } from "react-router";
import { data, useLoaderData } from "react-router";
import { useIntl } from "react-intl";
import { useLocale } from "~/components/common/LocaleLink";
import { DEFAULT_LOCALE, localizePath } from "~/lib/i18n";
import { lazy, Suspense } from "react";
import styles from "~/styles/index-route.css?url";
import photoNetworkStyles from "~/styles/photo-network.css?url";
import Header from "~/components/ui/Header";
import HomeHero from "~/components/home/HomeHero";
import Faq from "~/components/ui/question";
import CreativeFooter from "~/components/home/creative-footer";
import ChangelogSection from "~/components/home/changelog-section";
import PhotoSection from "~/components/home/photo-section";
import { ClientOnly } from "~/components/common/ClientOnly";
import ViewportLazySection from "~/components/common/ViewportLazySection";
import { requestHasAuthSessionCookie } from "~/lib/auth.server";
import { HOME_SONGS } from "~/data/home-songs";
import TabShowcase from "~/components/home/tab-showcase";
import { forwardLoaderCacheControl } from "~/lib/cache-headers.server";
import { cdnUrl } from "~/lib/media-cdn";
import { getMetaIntl, pageMeta, SITE_URL } from "~/utils/seo";
import { getRouteLocale } from "~/lib/i18n.server";
import { getChangelogPreview } from "~/lib/updates.server";

// Lazy load below-the-fold components for better initial load performance
const VideoShowcase = lazy(() => import("~/components/home/video-showcase"));
const DonghuaSection = lazy(() => import("~/components/home/donghua"));
const BuildLogSection = lazy(() => import("~/components/home/build-log/BuildLogSection"));
const HomeGuestbook = lazy(() => import("~/components/messages/HomeGuestbook.client"));

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
  { rel: "stylesheet", href: photoNetworkStyles },
];

// 首页 loader 只放静态数据，不读 D1：留言由收音机滚到附近后自己向 /messages 取。
// 带 auth cookie 的请求 HTML 里有 root 注入的 session，所以仍然不能进共享缓存。
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
    return data({
        songs: HOME_SONGS,
        changelog: getChangelogPreview(getRouteLocale(params)),
    }, {
        headers: {
            "Cache-Control": requestHasAuthSessionCookie(request)
              ? "private, no-store"
              : "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
            Vary: "Cookie",
        }
    });
};

export const headers: HeadersFunction = forwardLoaderCacheControl;

export const meta: MetaFunction = ({ matches }) => {
  return pageMeta.home(getMetaIntl(matches));
};

export default function Index() {
  const { songs, changelog } = useLoaderData<typeof loader>();
  const pulseFallback = (className: string) => (
    <div className={`${className} bg-gradient-to-r from-primary-50 via-primary-100 to-primary-50 bg-[length:200%_100%] animate-pulse`} />
  );

  const intl = useIntl();
  const locale = useLocale();

  // JSON-LD 结构化数据 - 提升 SEO；英文页以拼音名为主名，url 指向当前语言的首页
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: locale === "en" ? "Wang Jiajun" : "汪家俊",
    alternateName: locale === "en" ? "汪家俊" : "Wang Jiajun",
    url: locale === DEFAULT_LOCALE ? SITE_URL : `${SITE_URL}${localizePath("/", locale)}`,
    image: cdnUrl("avatar.jpg"),
    jobTitle: intl.formatMessage({ defaultMessage: "全栈开发者", description: "首页 JSON-LD 结构化数据里的职位" }),
    worksFor: {
      "@type": "Organization",
      name: "腾讯云雀",
    },
    knowsAbout: [
      "Web Development",
      "Full Stack Development",
      "Photography",
      "Game Design",
      "TypeScript",
      "React",
      "Node.js",
      "Remix",
      "AI Integration"
    ],
    sameAs: [
      // 添加您的社交媒体链接
      "https://github.com/wangjiajun",
    ],
  };

  return (
    <div className="ui-footer-curtain">
      {/* JSON-LD 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="ui-footer-curtain-stage">
        <Header />
        <HomeHero />
        <main>
          {/* Tab Showcase Section - Tab 展示区域 */}
          {/* 手机首屏底部就能露出这一块，直接服务端渲染，不再等水合后懒加载 */}
          <TabShowcase songs={songs} />

          <ViewportLazySection fallback={pulseFallback("w-full min-h-[34rem] rounded-xl")}>
            <Suspense fallback={pulseFallback("w-full min-h-[34rem] rounded-xl")}>
              <DonghuaSection />
            </Suspense>
          </ViewportLazySection>

          {/* 构建记录：这个网站和 AI 一起做出来的真实记录 */}
          <ViewportLazySection fallback={pulseFallback("w-full min-h-[780px] rounded-xl")}>
            <Suspense fallback={pulseFallback("w-full min-h-[780px] rounded-xl")}>
              <BuildLogSection />
            </Suspense>
          </ViewportLazySection>

          {/* Video Showcase Section - 视频展示区域 */}
          <ViewportLazySection fallback={pulseFallback("w-full min-h-screen rounded-xl")}>
            <Suspense fallback={pulseFallback("w-full min-h-screen rounded-xl")}>
              <VideoShowcase />
            </Suspense>
          </ViewportLazySection>

          {/* Photo Section - 图片区域 */}
          <PhotoSection />

          {/* Changelog Section - 更新日志 */}
          <section className="py-24 bg-primary-50 dark:bg-primary-950">
              <div className="container mx-auto px-6">
                  <ChangelogSection updates={changelog} />
              </div>
          </section>

          {/* 留言板：收音机，每条留言是一个电台 */}
          <section className="py-24 bg-primary-50">
            <div className="container mx-auto px-6">
              <ClientOnly fallback={
                <div className="h-[640px] w-full bg-gradient-to-r from-primary-50 via-primary-100 to-primary-50 bg-[length:200%_100%] animate-pulse" />
              }>
                {() => (
                  <ViewportLazySection fallback={pulseFallback("h-[640px] w-full")} rootMargin="360px 0px">
                    <Suspense fallback={pulseFallback("h-[640px] w-full")}>
                      <HomeGuestbook fallback={pulseFallback("h-[640px] w-full")} />
                    </Suspense>
                  </ViewportLazySection>
                )}
              </ClientOnly>
            </div>
          </section>
          <Faq />
        </main>
      </div>
      <div className="ui-footer-reveal">
        <CreativeFooter />
      </div>
    </div>
  );
}
