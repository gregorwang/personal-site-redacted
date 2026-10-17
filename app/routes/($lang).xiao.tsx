import type { LinksFunction, MetaFunction, HeadersFunction } from "react-router";
import { useMemo } from "react";
import { useIntl, type IntlShape } from "react-intl";
import { GsapFillLink } from "~/components/ui/GsapFillLink";
import { BackHome } from "~/components/ui/BackHome";
import { imageSrcSet, resolveR2Image } from "~/lib/resolve-image";
import { getMetaIntl } from "~/utils/seo";

// ImageData type
interface ImageData {
  id: string | number;
  src: string;
  alt?: string;
}

// Types
interface XiaoPageData {
  xiaoimages: ImageData[];
  content: {
    title: string;
    subtitle: string;
    sections: {
      winterWheatIsland: {
        leftQuote: string;
        rightQuote: string;
      };
      autumnKites: {
        mainQuote: string;
      };
      philosophicalThoughts: {
        leftQuote: string;
        centerQuote: string;
        rightQuote: string;
      };
      footer: {
        disclaimerTitle: string;
        disclaimerMain: string;
        disclaimerSub: string;
        backHome: string;
        blessing: string;
        copyright: string;
      };
    };
  };
}

// Links function
// 实测桌面端最宽约 384px，手机端撑满（约 327px）
const XIAO_IMAGE_SIZES = "(min-width: 768px) 400px, 100vw";

export const links: LinksFunction = () => [];

// Meta function
export const meta: MetaFunction = ({ matches }) => {
  const { intl } = getMetaIntl(matches);
  return [
    { title: intl.formatMessage({ defaultMessage: "小岛哲思 - 镜头之外的思考与感悟" }) },
    { name: "description", content: intl.formatMessage({ defaultMessage: "关于光影、瞬间，关于那些被镜头捕捉的思考与感悟的个人独白" }) },
    { name: "keywords", content: intl.formatMessage({ defaultMessage: "小岛,哲思,摄影,感悟,思考,独白" }) },
  ];
};

// 页面内容全是静态文案 + 图片地址，在组件里组装，不需要 loader：客户端跳转时不发 .data 请求
function buildXiaoPageData(intl: IntlShape): XiaoPageData {
  // 原始图片数据
  const rawXiaoImages: ImageData[] = [
    { id: 1, src: 'Feedback/a.webp', alt: intl.formatMessage({ defaultMessage: "冬日小麦岛的夕阳" }) },
    { id: 2, src: 'Feedback/b.webp', alt: intl.formatMessage({ defaultMessage: "秋日风筝" }) },
    { id: 3, src: 'Feedback/c.webp', alt: intl.formatMessage({ defaultMessage: "秋日风景" }) },
    { id: 4, src: 'Feedback/d.webp', alt: intl.formatMessage({ defaultMessage: "画廊照片 1" }) },
    { id: 5, src: 'Feedback/e.webp', alt: intl.formatMessage({ defaultMessage: "画廊照片 2" }) },
    { id: 6, src: 'Feedback/f.webp', alt: intl.formatMessage({ defaultMessage: "画廊照片 3" }) }
  ];

  const xiaoimages = rawXiaoImages.map((img) => ({
    ...img,
    src: resolveR2Image(img.src),
  }));

  const pageData: XiaoPageData = {
    xiaoimages,
    content: {
      title: intl.formatMessage({ defaultMessage: "一切" }),
      subtitle: intl.formatMessage({ defaultMessage: "照片所表达的" }),
      sections: {
        winterWheatIsland: {
          leftQuote: intl.formatMessage({ defaultMessage: "拍摄于2023年11月29日，冬日的小麦岛寒风刺骨，却也因此少了人流的干扰，反而让我得以专注于取景与光影。那是夕阳西下的时刻，天空呈现出罕见的橙色，在多重光线的渐变中，云像线条一样柔和流动。" }),
          rightQuote: intl.formatMessage({ defaultMessage: "如今时间过去了很久，我已记不清当时的感受，但回头看这张照片，仍觉得那一刻的天空美得不真实，仿佛短暂逃离了庸常世界，置身于一个梦境之中。" })
        },
        autumnKites: {
          mainQuote: intl.formatMessage({ defaultMessage: "排成一线的风筝在空中轻轻摇曳，夕阳缓缓垂落在一座未完工的高楼之上。光线渐弱，仿佛力不从心，天地逐渐沉入昏暗之中，只留下一片灰蒙的草地，构成了这幅略显荒凉的画面。\n秋天，总是诗人最容易动情的季节。自古逢秋多寂寥，但也有人言\"秋日胜春朝\"。时空虽隔千年，我竟也与古人心意相通。前路未明，欢乐无从谈起。年仅二十五，却已感到生命之光如这落日般渐趋黯淡。" })
        },
        philosophicalThoughts: {
          leftQuote: intl.formatMessage({ defaultMessage: "看见美好，心中便悄然生出贪恋与不舍。唉，只能继续欺骗自己——装作无事，装作坚强。不知羞耻也好，狼狈也罢，活下去吧。" }),
          centerQuote: intl.formatMessage({ defaultMessage: "也许正是这一瞬间，我才真正领悟了那些年在书本中无法共情、无法理解的话语——为何尼采会在街头抱着一匹马痛哭。人，与动物并无本质区别。我与那匹马四目相对，它看懂了我，我也读懂了它。那是一种超越语言的共鸣，是被命运之神牵引、却无力挣脱的宿命感。\n此刻我终于明白，叶文洁是对的。她为三体人带路，并非背叛，而是一种清醒的决断。在这个充满荒谬与冷漠的世界里，毁灭或许不是灾难，而是一种终局的救赎。" }),
          rightQuote: intl.formatMessage({ defaultMessage: "时间，是地球上不断涌动的风与气流。它们风化岩石，使之一点点变小，化为尘沙，最终被吹散得无影无踪。人们常说时间会\"磨平\"一切，但那种磨平往往会留下痕迹，而现实中，大多数时候，时间带走的，是连痕迹都不曾留下的彻底消逝。\n没有人告诉我，这片土地曾发生过什么。而我，作为一个局外人，也没有兴趣或动机去探究它的过去。我只知道，随着时间的推移，事实终将湮灭，仿佛从未存在。" })
        },
        footer: {
          disclaimerTitle: intl.formatMessage({ defaultMessage: "声明" }),
          disclaimerMain: intl.formatMessage({ defaultMessage: "以上所有文案均为AI生成，不代表本人内心真实想法。" }),
          disclaimerSub: intl.formatMessage({ defaultMessage: "这些文字如流水般涌现，承载着算法的想象，却无法触及人心深处的真实。" }),
          backHome: intl.formatMessage({ defaultMessage: "回到首页" }),
          blessing: intl.formatMessage({ defaultMessage: "愿每个瞬间都值得被记录" }),
          copyright: intl.formatMessage({ defaultMessage: "用心记录生活的每一个瞬间" })
        }
      }
    }
  };

  return pageData;
}

export const headers: HeadersFunction = () => ({ "Cache-Control": "public, max-age=300" });

export default function XiaoPage() {
  const intl = useIntl();
  const { xiaoimages, content } = useMemo(() => buildXiaoPageData(intl), [intl]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-100 to-primary-50 dark:from-primary-950 dark:via-primary-950/95 dark:to-primary-950">
      <BackHome />
      <div className="container mx-auto px-6 py-16 lg:px-8">
        {/* Title Section */}
        <div className="text-center mb-20">
          <h1 className="ui-display-hero text-5xl md:text-6xl lg:text-7xl text-primary-950 dark:text-primary-50 mb-6">
            {content.subtitle}
            <span className="block text-accent dark:text-accent mt-2">
              {content.title}
            </span>
          </h1>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-accent to-transparent mx-auto"></div>
        </div>


        {/* Section 1: Winter Wheat Island */}
        <section className="mb-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-4 space-y-6">
              <blockquote className="ui-quote-text border-l-4 border-accent pl-6 text-primary-950/70 dark:text-primary-50/70 text-base">
                {content.sections.winterWheatIsland.leftQuote}
              </blockquote>
            </div>

            <div className="lg:col-span-4 relative group">
              <div className="relative overflow-hidden rounded-2xl shadow-2xl transition-transform duration-300 group-hover:scale-105">
                <img
                  src={xiaoimages[0]?.src}
                  srcSet={imageSrcSet(xiaoimages[0]?.src ?? "")}
                  sizes={XIAO_IMAGE_SIZES}
                  alt={xiaoimages[0]?.alt}
                  className="w-full h-80 object-cover"
                  loading="eager"
                  onError={() => console.error('Image failed to load:', xiaoimages[0]?.src)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <blockquote className="ui-quote-text border-l-4 border-accent pl-6 text-primary-950/70 dark:text-primary-50/70 text-base">
                {content.sections.winterWheatIsland.rightQuote}
              </blockquote>
            </div>
          </div>
        </section>

        {/* Section 2: Autumn Kites */}
        <section className="mb-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-4 relative group order-2 lg:order-1">
              <div className="ui-media-frame ui-media-hover relative overflow-hidden rounded-2xl">
                <img
                  src={xiaoimages[1]?.src}
                  srcSet={imageSrcSet(xiaoimages[1]?.src ?? "")}
                  sizes={XIAO_IMAGE_SIZES}
                  alt={xiaoimages[1]?.alt}
                  className="w-full h-80 object-cover"
                  loading="lazy"
                  onError={() => console.error('Image failed to load:', xiaoimages[1]?.src)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6 order-1 lg:order-2">
              <blockquote className="ui-quote-text border-none bg-primary-100/50 dark:bg-primary-950/80 backdrop-blur-sm rounded-xl p-8 shadow-lg text-primary-950/70 dark:text-primary-50/70 text-center text-base">
                {content.sections.autumnKites.mainQuote}
              </blockquote>
            </div>

            <div className="lg:col-span-4 relative group order-3">
              <div className="ui-media-frame ui-media-hover relative overflow-hidden rounded-2xl">
                <img
                  src={xiaoimages[2]?.src}
                  srcSet={imageSrcSet(xiaoimages[2]?.src ?? "")}
                  sizes={XIAO_IMAGE_SIZES}
                  alt={xiaoimages[2]?.alt}
                  className="w-full h-80 object-cover"
                  loading="lazy"
                  onError={() => console.error('Image failed to load:', xiaoimages[2]?.src)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-expo-out"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Philosophical Thoughts */}
        <section className="mb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-primary-50/70 to-primary-100/70 dark:from-primary-950/70 dark:to-primary-950/90 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-primary-950/10 dark:border-primary-50/10">
                <p className="ui-quote-text text-primary-950/70 dark:text-primary-50/70 text-base">
                  {content.sections.philosophicalThoughts.leftQuote}
                </p>
              </div>
            </div>

            <div className="space-y-6 md:-mt-8">
              <div className="bg-gradient-to-br from-accent/10 to-accent/5 dark:from-accent/20 dark:to-accent/10 backdrop-blur-sm rounded-xl p-8 shadow-xl border border-accent/30 dark:border-accent/40">
                <p className="ui-quote-text text-primary-950/70 dark:text-primary-50/70 text-base">
                  {content.sections.philosophicalThoughts.centerQuote}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-primary-100/80 to-primary-50/80 dark:from-primary-950/80 dark:to-primary-950/95 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-primary-950/10 dark:border-primary-50/10">
                <p className="ui-quote-text text-primary-950/70 dark:text-primary-50/70 text-base">
                  {content.sections.philosophicalThoughts.rightQuote}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Photo Gallery */}
        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
            <div className="relative group">
              <div className="ui-media-frame ui-media-hover relative overflow-hidden rounded-2xl">
                <img
                  src={xiaoimages[3]?.src}
                  srcSet={imageSrcSet(xiaoimages[3]?.src ?? "")}
                  sizes={XIAO_IMAGE_SIZES}
                  alt={xiaoimages[3]?.alt}
                  className="w-full h-96 object-cover"
                  loading="lazy"
                  onError={() => console.error('Image failed to load:', xiaoimages[3]?.src)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-expo-out"></div>
              </div>
            </div>

            <div className="relative group md:-mt-12">
              <div className="ui-media-frame ui-media-hover relative overflow-hidden rounded-2xl">
                <img
                  src={xiaoimages[4]?.src}
                  srcSet={imageSrcSet(xiaoimages[4]?.src ?? "")}
                  sizes={XIAO_IMAGE_SIZES}
                  alt={xiaoimages[4]?.alt}
                  className="w-full h-96 object-cover"
                  loading="lazy"
                  onError={() => console.error('Image failed to load:', xiaoimages[4]?.src)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-expo-out"></div>
              </div>
            </div>

            <div className="relative group">
              <div className="ui-media-frame ui-media-hover relative overflow-hidden rounded-2xl">
                <img
                  src={xiaoimages[5]?.src}
                  srcSet={imageSrcSet(xiaoimages[5]?.src ?? "")}
                  sizes={XIAO_IMAGE_SIZES}
                  alt={xiaoimages[5]?.alt}
                  className="w-full h-96 object-cover"
                  loading="lazy"
                  onError={() => console.error('Image failed to load:', xiaoimages[5]?.src)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-expo-out"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Decorative Line */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-accent to-transparent mt-20" />

        {/* Footer */}
        <footer className="mt-24 mb-16">
          <div className="text-center space-y-8">
            <div className="bg-gradient-to-r from-primary-50/80 via-primary-100/90 to-primary-50/80 dark:from-primary-950/50 dark:via-primary-950/60 dark:to-primary-950/50 backdrop-blur-sm rounded-2xl p-8 mx-auto max-w-4xl border border-primary-950/10 dark:border-primary-50/10 shadow-lg">
              <div className="flex items-center justify-center mb-4">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse mr-3"></div>
                <span className="ui-section-label text-primary-950/60 dark:text-primary-50/60">
                  {content.sections.footer.disclaimerTitle}
                </span>
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse ml-3"></div>
              </div>
              <p className="ui-quote-text text-base md:text-lg text-primary-950/70 dark:text-primary-50/70">
                {content.sections.footer.disclaimerMain}
              </p>
              <p className="ui-meta-text text-sm text-primary-950/50 dark:text-primary-50/50 mt-4">
                {content.sections.footer.disclaimerSub}
              </p>
            </div>

            <div className="flex flex-col items-center space-y-6">
              <GsapFillLink
                to="/"
                className="ui-button-primary px-8 py-4 text-sm"
              >
                <svg className="w-5 h-5 mr-3 transition-transform duration-300 group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
                <span>{content.sections.footer.backHome}</span>
                <div className="ml-3 w-2 h-2 bg-white/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </GsapFillLink>

              <p className="ui-meta-text text-sm text-primary-950/40 dark:text-primary-50/40">
                {content.sections.footer.blessing}
              </p>
            </div>

            <div className="pt-8 border-t border-primary-950/10 dark:border-primary-50/10">
              <p className="ui-meta-text text-xs text-primary-950/40 dark:text-primary-50/40">
                © {new Date().getFullYear()} · {content.sections.footer.copyright}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
