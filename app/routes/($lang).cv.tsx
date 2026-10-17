import type { LinksFunction, MetaFunction, HeadersFunction } from "react-router";
import { FormattedMessage, useIntl } from "react-intl";
import { Link, useLocale } from "~/components/common/LocaleLink";
import { BackHome } from "~/components/ui/BackHome";
import cvStyles from "~/styles/cv.css?url";
import { cvAvatarSource, cvProfile } from "~/data/cv";
import { CV_TEXT } from "~/data/i18n/cv";
import type { CvProfile } from "~/types/cv";
import { localized } from "~/lib/localized-content";
import { images } from "~/generated/image-manifest";
import { imageSrcSet, resolveR2Image } from "~/lib/resolve-image";
import { getMetaIntl, pageMeta } from "~/utils/seo";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: cvStyles },
  { rel: "preload", as: "image", href: images.cv_avatar ?? "https://cdn.xn--cckl9nsb.com/Feedback/person.webp" },
];

export const meta: MetaFunction = ({ matches }) => pageMeta.cv(getMetaIntl(matches));

// 简历内容是仓库里的静态数据（三语覆盖层一起打进包），不需要 loader：客户端跳转时不发 .data 请求
export const headers: HeadersFunction = () => ({ "Cache-Control": "public, max-age=300" });

const avatarSrc = resolveR2Image(cvAvatarSource);

function SidebarHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-xs font-medium tracking-[0.16em] text-primary-400">
      {children}
    </h2>
  );
}

function MainHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="ui-display-title border-b border-primary-200 pb-3.5 text-[28px] font-normal">
      {children}
    </h2>
  );
}

export default function CVPage() {
  const profile = localized<CvProfile>(useLocale(), cvProfile, CV_TEXT);
  const { experience, training } = profile;
  const intl = useIntl();

  return (
    <div className="cv-sans relative min-h-screen overflow-hidden bg-[#f1ede2] px-6 py-16 font-light text-primary-950 lg:py-[72px]">
      <BackHome />
      {/* 流体背景：缓慢漂移的色块 + 细噪点 */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="cv-blob cv-blob--clay" />
        <div className="cv-blob cv-blob--slate" />
        <div className="cv-blob cv-blob--sand" />
        <div className="cv-blob cv-blob--ink" />
      </div>
      <svg aria-hidden="true" className="pointer-events-none fixed inset-0 h-full w-full opacity-[0.16] mix-blend-multiply">
        <filter id="cv-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#cv-grain)" />
      </svg>

      <div className="relative mx-auto grid max-w-[1200px] overflow-hidden rounded-[18px] border border-white/70 bg-[#fffdf8]/[0.92] shadow-[0_30px_90px_rgba(65,45,35,0.16)] lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* 侧栏：身份、技能、认证、兴趣 */}
        <aside aria-label={intl.formatMessage({ defaultMessage: "个人信息", description: "简历页侧栏的无障碍标签" })} className="flex flex-col gap-10 bg-primary-900 px-10 py-12 text-primary-200">
          <div className="flex flex-col gap-5">
            <img
              src={avatarSrc}
              srcSet={imageSrcSet(avatarSrc)}
              sizes="144px"
              alt={profile.photoAlt}
              width={144}
              height={144}
              loading="eager"
              decoding="async"
              className="h-36 w-36 rounded-full border-[3px] border-primary-800 bg-primary-800 object-cover"
            />
            <div className="flex flex-col gap-1.5">
              <h1 className="ui-display-title text-[40px] font-normal tracking-[0.06em] text-primary-50">
                {profile.name}
              </h1>
              <p className="text-[15px] text-[#e8a184]">{profile.title}</p>
            </div>
          </div>

          <dl className="flex flex-col gap-3.5 text-sm">
            {profile.facts.map((fact) => (
              <div key={fact.label} className="flex justify-between gap-4 border-b border-primary-800 pb-3">
                <dt className="text-primary-400">{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>

          <section aria-labelledby="cv-skills" className="flex flex-col gap-3.5">
            <SidebarHeading id="cv-skills"><FormattedMessage defaultMessage="技能树" description="简历页侧栏小标题" /></SidebarHeading>
            <ul className="flex flex-wrap gap-2 text-[13px]">
              {profile.skills.map((skill) => (
                <li
                  key={skill.name}
                  className={
                    skill.level === "proficient"
                      ? "rounded-full bg-primary-800 px-3 py-1.5 text-primary-50"
                      : "rounded-full border border-primary-700 px-3 py-1.5 text-primary-300"
                  }
                >
                  {skill.name}
                </li>
              ))}
            </ul>
            <p className="text-xs text-primary-400"><FormattedMessage defaultMessage="实心为精通，描边为熟悉" description="简历页技能标签的图例说明" /></p>
          </section>

          <section aria-labelledby="cv-certificates" className="flex flex-col gap-2.5">
            <SidebarHeading id="cv-certificates"><FormattedMessage defaultMessage="认证徽章" description="简历页侧栏小标题" /></SidebarHeading>
            {profile.certificates.map((certificate) => (
              <p key={certificate} className="text-[15px]">
                {certificate}
              </p>
            ))}
          </section>

          <section aria-labelledby="cv-hobbies" className="flex flex-col gap-3">
            <SidebarHeading id="cv-hobbies"><FormattedMessage defaultMessage="个人探索" description="简历页侧栏小标题" /></SidebarHeading>
            <ul className="flex flex-col gap-2.5 text-sm leading-relaxed">
              {profile.hobbies.map((hobby) => {
                const label = (
                  <>
                    <span className="text-primary-50">{hobby.name}</span>
                    <span className="text-primary-400"> · {hobby.detail}</span>
                  </>
                );
                return (
                  <li key={hobby.name}>
                    {hobby.href ? (
                      <Link
                        to={hobby.href}
                        className="group inline-flex flex-wrap items-baseline transition-colors duration-[var(--motion-base)]"
                      >
                        {label}
                        <span aria-hidden="true" className="ml-1.5 text-[#e8a184] opacity-0 transition-opacity duration-[var(--motion-base)] group-hover:opacity-100 group-focus-visible:opacity-100">
                          →
                        </span>
                      </Link>
                    ) : (
                      label
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>

        {/* 主栏：履历、修行、宣言 */}
        <main className="flex flex-col gap-12 px-8 py-14 lg:px-16">
          <section aria-labelledby="cv-experience" className="flex flex-col gap-6">
            <MainHeading id="cv-experience"><FormattedMessage defaultMessage="冒险履历" description="简历页主栏标题（工作经历，褪色者人设）" /></MainHeading>
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-medium">{experience.organization}</h3>
                <p className="text-[15px] text-primary-700">
                  {experience.role} · {experience.department}
                </p>
              </div>
              <span className="whitespace-nowrap rounded-full bg-primary-100 px-3 py-1 text-[13px] text-primary-800">
                {experience.period}
              </span>
            </div>
            <ol className="flex flex-col gap-7 border-l border-primary-300 pl-6">
              {experience.chapters.map((chapter) => (
                <li key={chapter.date} className="relative flex flex-col gap-2.5">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[30px] top-1.5 h-[11px] w-[11px] rounded-full border-2 border-[#fffdf8] bg-accent"
                  />
                  <p className="text-[13px] font-medium text-primary-700">{chapter.date}</p>
                  <p className="text-[15px] leading-[1.8]">{chapter.summary}</p>
                  <ul className="list-disc pl-[18px] text-sm leading-[1.9] text-primary-800">
                    {chapter.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="cv-training" className="flex flex-col gap-[18px]">
            <MainHeading id="cv-training"><FormattedMessage defaultMessage="修行经历" description="简历页主栏标题（实习经历，褪色者人设）" /></MainHeading>
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-medium">{training.title}</h3>
              <p className="text-[15px] text-primary-700">{training.place}</p>
            </div>
            <ul className="list-disc gap-x-10 pl-[18px] text-sm leading-[1.9] text-primary-800 lg:columns-2">
              {training.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="cv-manifesto" className="flex flex-col gap-[18px]">
            <MainHeading id="cv-manifesto"><FormattedMessage defaultMessage="褪色者宣言" description="简历页主栏标题（自我评价，褪色者人设）" /></MainHeading>
            <p className="ui-body-text text-[17px] leading-loose text-primary-900">{profile.manifesto}</p>
          </section>
        </main>
      </div>
    </div>
  );
}
