import type { LinksFunction, MetaFunction, HeadersFunction } from "react-router";
import { LazyMotion, domAnimation } from "framer-motion";
import { useMemo } from "react";
import galleryStyles from "~/styles/gallery.css?url";
import { GsapFillLink } from "~/components/ui/GsapFillLink";
import { BackHome } from "~/components/ui/BackHome";
import { imageSrcSet, resolveR2Image } from "~/lib/resolve-image";
import { getMetaIntl, pageMeta } from "~/utils/seo";
import { FormattedMessage, useIntl, type IntlShape } from "react-intl";

// TypeScript 类型定义
interface ImageData {
  id: number;
  src: string;
  size: string;
  alt: string;
}

interface GalleryPageData {
  columns: ImageData[][];
  heroImage: { id: string; src: string; alt: string };
  content: {
    heroTitle: string;
    authorName: string;
    bioSubtitle: string;
    bioDescription: string;
    footer: { title: string; description: string; linkText: string };
  };
}

// 桌面三列（容器最宽 1800px，每列最多约 600px），768px 以下变成单列
const GALLERY_PHOTO_SIZES = "(max-width: 768px) 100vw, min(33vw, 600px)";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: galleryStyles },
];

// Meta 函数 - SEO优化
export const meta: MetaFunction = ({ matches }) => pageMeta.gallery(getMetaIntl(matches));

// 页面内容全是静态文案 + 图片地址（resolveR2Image 只查 manifest，不签 token），
// 在组件里组装，不需要 loader：客户端跳转时不发 .data 请求
function buildGalleryPageData(intl: IntlShape): GalleryPageData {
  // 原始图片数据配置 - 按列分组
  const rawColumns: ImageData[][] = [
    // 第一列
    [
      { id: 1, src: '/photos/photo-1.webp', size: 'large', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 1 }) },
      { id: 2, src: '/photos/photo-2.webp', size: 'small', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 2 }) },
      { id: 3, src: '/photos/photo-3.webp', size: 'small', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 3 }) },
      { id: 4, src: '/photos/photo-4.webp', size: 'small', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 4 }) },
      { id: 5, src: '/photos/photo-5.webp', size: 'small', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 5 }) },
      { id: 6, src: '/photos/photo-6.webp', size: 'small', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 6 }) },
      { id: 7, src: '/photos/photo-7.webp', size: 'small', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 7 }) },
      { id: 8, src: '/photos/photo-8.webp', size: 'small', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 8 }) },
      { id: 9, src: '/photos/photo-9.webp', size: 'large', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 9 }) },
    ],

    // 第二列
    [
      { id: 10, src: '/photos/photo-10.webp', size: 'small', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 10 }) },
      { id: 11, src: '/photos/photo-11.webp', size: 'small', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 11 }) },
      { id: 12, src: '/photos/photo-12.webp', size: 'small', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 12 }) },
      { id: 13, src: '/photos/photo-13.webp', size: 'small', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 13 }) },
      { id: 14, src: '/photos/photo-14.webp', size: 'large', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 14 }) },
      { id: 15, src: '/photos/photo-15.webp', size: 'small', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 15 }) },
      { id: 16, src: '/photos/photo-16.webp', size: 'small', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 16 }) },
      { id: 17, src: '/photos/photo-17.webp', size: 'large', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 17 }) },
      { id: 18, src: '/photos/photo-18.webp', size: 'small', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 18 }) },
    ],

    // 第三列
    [
      { id: 19, src: '/photos/photo-19.webp', size: 'small', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 19 }) },
      { id: 20, src: '/photos/photo-20.webp', size: 'small', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 20 }) },
      { id: 21, src: '/photos/photo-21.webp', size: 'large', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 21 }) },
      { id: 22, src: '/photos/photo-22.webp', size: 'large', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 22 }) },
      { id: 23, src: '/photos/photo-23.webp', size: 'small', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 23 }) },
      { id: 24, src: '/photos/photo-24.webp', size: 'small', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 24 }) },
      { id: 25, src: '/photos/photo-25.webp', size: 'small', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 25 }) },
      { id: 26, src: '/photos/photo-26.webp', size: 'small', alt: intl.formatMessage({ defaultMessage: "照片{n}描述" }, { n: 26 }) },
    ],
  ];

  const rawHeroImage = { id: 'hero', src: 'photos/ss.webp', alt: intl.formatMessage({ defaultMessage: "2023~2025，往日之影" }) };
  const columns = rawColumns.map((column) =>
    column.map((img) => ({
      ...img,
      src: resolveR2Image(img.src),
    })),
  );
  const heroImage = { ...rawHeroImage, src: resolveR2Image(rawHeroImage.src) };

  const content = {
    heroTitle: intl.formatMessage({ defaultMessage: "2023~2025，往日之影" }),
    authorName: intl.formatMessage({ defaultMessage: "汪家俊" }),
    bioSubtitle: intl.formatMessage({ defaultMessage: "自留" }),
    bioDescription:
      intl.formatMessage({ defaultMessage: "这里的照片，是我毕业之后来到青岛工作闲暇之余所拍的照片，其中也有一些照片是在家乡拍的，工作了几个月双十一，买了小米14，手机拍照效果很好激发了我在日常用手机记录的习惯，也在这里留下了很多的照片。由于微信朋友圈会把任何体积10M以上图片压缩成几百K，导致画质效果非常难看，所以你在这里能看见一些我从未分享过的照片。" }),
    footer: {
      title: intl.formatMessage({ defaultMessage: "镜头之外" }),
      description:
        intl.formatMessage({ defaultMessage: "照片背后，总有些话想说。关于光影，关于瞬间，关于那些被镜头捕捉的思考与感悟。" }),
      linkText: intl.formatMessage({ defaultMessage: "探索内心独白" }),
    },
  };

  const pageData: GalleryPageData = {
    columns,
    heroImage,
    content,
  };

  return pageData;
}

export const headers: HeadersFunction = () => ({ "Cache-Control": "public, max-age=1740, s-maxage=1740" });

export default function Gallery() {
  const intl = useIntl();
  const { columns, heroImage, content } = useMemo(() => buildGalleryPageData(intl), [intl]);

  return (
    <LazyMotion features={domAnimation}>
      <main className="min-h-screen bg-primary-50">
        <BackHome />
        {/* Hero Image Section */}
        <div className="w-full my-0 relative h-96 overflow-hidden group">
          <img
            src={heroImage.src}
            srcSet={imageSrcSet(heroImage.src)}
            sizes="100vw"
            alt={heroImage.alt}
            className="ui-media-hover h-full w-full rounded-lg object-cover object-center shadow-md"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <h1 className="ui-display-hero text-white text-4xl md:text-6xl drop-shadow-lg">
              {content.heroTitle}
            </h1>
          </div>
        </div>

        {/* Author Bio Section */}
        <div className="content-area max-w-4xl mx-auto my-16 px-5">
          <h2 className="ui-display-title text-4xl mb-6 text-primary-950">
            {content.authorName}
          </h2>
          <div className="bio-section">
            <h3 className="ui-section-label text-primary-950/70 mb-2">
              {content.bioSubtitle}
            </h3>
            <p className="ui-body-text text-base text-primary-950/70 text-justify">
              {content.bioDescription}
            </p>
          </div>
        </div>

        {/* Gallery Grid Section */}
        <div className="gallery-container">
          <h2 className="gallery-title"><FormattedMessage defaultMessage="摄影作品集" /></h2>
          <div className="gallery-grid">
            {columns.map((column, columnIndex) => (
              <div key={columnIndex} className="gallery-column">
                {column.map((photo) => (
                  <div
                    key={photo.id}
                    className={`gallery-item ${photo.size} group`}
                  >
                    <img
                      src={photo.src}
                      srcSet={imageSrcSet(photo.src)}
                      sizes={GALLERY_PHOTO_SIZES}
                      alt={photo.alt}
                      loading="lazy"
                      className="ui-media-hover"
                      onError={() => console.error('Image failed to load:', photo.src)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Footer CTA Section */}
        <div className="footer-section bg-gradient-to-br from-primary-50 to-primary-100 py-20 px-5 text-center mt-16">
          <div className="footer-content max-w-2xl mx-auto">
            <div className="w-16 h-1 bg-gradient-to-r from-accent to-accent-hover mx-auto mb-8 rounded" />
            <h2 className="ui-display-title text-3xl text-primary-950 mb-5">
              {content.footer.title}
            </h2>
            <p className="ui-quote-text text-base text-primary-950/70 mb-10">
              {content.footer.description}
            </p>
            <div>
              <GsapFillLink
                to="/xiao"
                className="ui-button-primary"
              >
                <span>{content.footer.linkText}</span>
                <svg
                  className="ui-button-icon h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 17L17 7M17 7H7M17 7V17"
                  />
                </svg>
              </GsapFillLink>
            </div>
          </div>
        </div>
      </main>
    </LazyMotion>
  );
}
