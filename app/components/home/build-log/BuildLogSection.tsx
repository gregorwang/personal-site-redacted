import { useCallback, useEffect, useRef, useState } from "react";
import { defineMessage, defineMessages, useIntl, type MessageTag } from "react-intl";
import { useLocale } from "~/components/common/LocaleLink";
import { BUILD_LOG_TOUR } from "~/data/build-log";
import { buildLogStats } from "~/generated/build-log-stats";
import { imageSrcSet, resolveImage } from "~/lib/resolve-image";
import { BuildLogDesktop, COMMIT_TASK } from "./BuildLogDesktop";
import { StageWindow } from "./StageWindow";
// 样式跟着这个懒加载的区块一起下载，不挡首页首屏
import "~/styles/build-log.css";

const messages = defineMessages({
  title: { defaultMessage: "构建记录", description: "首页构建记录区块标题" },
  originalNote: { defaultMessage: "对话保留中文原文。", description: "非中文页面上提示对话没有翻译" },
  windowTitle: { defaultMessage: "wangjiajun.space — 构建记录", description: "构建记录主窗口标题" },
  logFoot: { defaultMessage: "亮着的提交点一下，左边会跳到对应任务", description: "git log 小窗底部说明" },
  openTask: { defaultMessage: "在构建记录里打开", description: "git log 小窗：可跳转的提交" },
});

// 带占位符的文案用 defineMessage 单独声明参数类型（同 hero-messages.ts），漏传参数会在编译期报错
const kickerMessage = defineMessage<{ count: number; b: MessageTag }>({ defaultMessage: "这个网站 2024 年 5 月开始做，GitHub 上留下了 <b>{count} 次提交</b>，大部分是我和 AI 一起写的。下面是其中几次的原始记录：我当时怎么说的，它怎么回的，最后改了哪些代码。",
    description: "首页构建记录区块导语", });
const logMoreMessage = defineMessage<{ count: number }>({ defaultMessage: "… 共 {count} 次提交", description: "git log 小窗末尾" });

const WALL_SRC = resolveImage("internal_brand_023");

export default function BuildLogSection() {
  const intl = useIntl();
  const locale = useLocale();
  const stageRef = useRef<HTMLDivElement>(null);
  const zRef = useRef(20);
  const raise = useCallback(() => ++zRef.current, []);
  const [started, setStarted] = useState(false);
  const [tourActive, setTourActive] = useState(true);
  const [selectedId, setSelectedId] = useState(BUILD_LOG_TOUR[0][1]);

  // 进入视口才开始巡演，不在屏幕外白跑
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const stopTour = () => setTourActive(false);
  const commits = buildLogStats.recentCommits;

  return (
    <section className="relative overflow-x-hidden bg-primary-50 py-16 md:py-24">
      <div className="relative mx-auto w-full max-w-7xl px-4 md:px-8">
        <header className="mb-8 flex flex-col gap-3 md:mb-10">
          <h2 className="ui-display-title text-4xl leading-normal text-primary-950 md:text-5xl">{intl.formatMessage(messages.title)}</h2>
          <p className="max-w-2xl text-[15px] leading-8 text-primary-950/60">
            {intl.formatMessage(kickerMessage, {
              count: buildLogStats.commitTotal,
              b: (chunks) => (
                <b key="b" className="font-medium text-primary-950">
                  {chunks}
                </b>
              ),
            })}
            {locale !== "zh" && ` ${intl.formatMessage(messages.originalNote)}`}
          </p>
        </header>

        <div className="bl bl-stage" ref={stageRef}>
          <img className="bl-wall" src={WALL_SRC} srcSet={imageSrcSet(WALL_SRC)} sizes="(max-width: 1280px) 100vw, 1216px" alt="" loading="lazy" decoding="async" />

          <div onPointerDownCapture={stopTour}>
            <StageWindow
              stageRef={stageRef}
              title={intl.formatMessage(messages.windowTitle)}
              width={1060}
              height={600}
              x={45}
              y={47}
              raise={raise}
              className="bl-main"
              bodyClassName="bl-main-body"
            >
              <BuildLogDesktop started={started} tourActive={tourActive} selectedId={selectedId} onSelect={setSelectedId} />
            </StageWindow>

            <StageWindow
              stageRef={stageRef}
              title="git log --oneline"
              width={380}
              height={250}
              x={84.5}
              y={79}
              raise={raise}
              initialZ={15}
              className="bl-log"
            >
              <div className="bl-log-list">
                {commits.map((c) => {
                  const taskId = COMMIT_TASK[c.hash];
                  const content = (
                    <>
                      <b>{c.hash}</b> {c.date.slice(5)} {c.subject}
                    </>
                  );
                  return taskId ? (
                    <button key={c.hash} type="button" className="bl-log-row" title={intl.formatMessage(messages.openTask)} onClick={() => setSelectedId(taskId)}>
                      {content}
                    </button>
                  ) : (
                    <div key={c.hash} className="bl-log-row">
                      {content}
                    </div>
                  );
                })}
                <div className="bl-log-row">{intl.formatMessage(logMoreMessage, { count: buildLogStats.commitTotal })}</div>
              </div>
              <div className="bl-log-foot">{intl.formatMessage(messages.logFoot)}</div>
            </StageWindow>
          </div>
        </div>
      </div>
    </section>
  );
}
