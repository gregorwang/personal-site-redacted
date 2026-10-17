import { Fragment, useEffect, useState } from "react";
import { defineMessages, useIntl, type IntlShape, type MessageDescriptor } from "react-intl";
import { useLocale } from "~/components/common/LocaleLink";
import { DEFAULT_LOCALE } from "~/lib/i18n";
import type { NemesisProgressStep, NemesisProgressStepId } from "~/types/nemesis-sse";

type NemesisThinkingBubbleProps = {
  steps: NemesisProgressStep[];
};

const STEP_NAMES = defineMessages({
  guard: { defaultMessage: "理解", description: "Nemesis 思考轨迹节点：理解问题" },
  route: { defaultMessage: "选路", description: "Nemesis 思考轨迹节点：选择模型" },
  generate: { defaultMessage: "生成", description: "Nemesis 思考轨迹节点：生成回复" },
}) satisfies Record<NemesisProgressStepId, MessageDescriptor>;

// 服务端 status 事件的文案是中文（含模型名、失败原因等细节），中文页面直接用；
// 其它语言按步骤和状态换成本地化的通用文案，模型名仍放在 detail 里。
const STEP_LABELS = defineMessages({
  guardRunning: { defaultMessage: "正在理解你的问题…", description: "Nemesis 思考状态" },
  guardDone: { defaultMessage: "已理解问题", description: "Nemesis 思考状态" },
  routeRunning: { defaultMessage: "正在选择模型…", description: "Nemesis 思考状态" },
  routeDone: { defaultMessage: "已选择模型", description: "Nemesis 思考状态" },
  generateRunning: { defaultMessage: "正在生成回复…", description: "Nemesis 思考状态" },
  generateDone: { defaultMessage: "回复生成完成", description: "Nemesis 思考状态" },
  fallback: { defaultMessage: "主模型繁忙，正在尝试备用模型…", description: "Nemesis 思考状态：切换备用模型" },
  waiting: { defaultMessage: "正在处理你的问题", description: "Nemesis 思考状态：兜底" },
});

function stepLabel(step: NemesisProgressStep, intl: IntlShape, useServerLabel: boolean) {
  if (useServerLabel) return step.label;
  if (step.fallback) return intl.formatMessage(STEP_LABELS.fallback);
  const key = `${step.id}${step.status === "done" ? "Done" : "Running"}` as const;
  return intl.formatMessage(STEP_LABELS[key]);
}

function getDisplayState(steps: NemesisProgressStep[], intl: IntlShape, useServerLabel: boolean) {
  const running = steps.find((step) => step.status === "running");
  if (running) {
    return { main: stepLabel(running, intl, useServerLabel), detail: running.detail, isFallback: Boolean(running.fallback) };
  }

  const lastDone = [...steps].reverse().find((step) => step.status === "done");
  return {
    main: lastDone ? stepLabel(lastDone, intl, useServerLabel) : intl.formatMessage(STEP_LABELS.waiting),
    detail: lastDone?.detail,
    isFallback: false,
  };
}

export function NemesisThinkingBubble({ steps }: NemesisThinkingBubbleProps) {
  const intl = useIntl();
  const useServerLabel = useLocale() === DEFAULT_LOCALE;
  const { main, detail, isFallback } = getDisplayState(steps, intl, useServerLabel);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 100);
    return () => window.clearInterval(timer);
  }, []);

  // detail 与主文案重复时（fallback 事件两者相同）不再重复展示；非中文页面 fallback 的 detail 是服务端中文原因，也不展示。
  const visibleDetail = detail && detail !== main && !(isFallback && !useServerLabel) ? detail : null;

  return (
    <div className="nm-turn nm-rise" aria-live="polite">
      <span className="nm-mark live" aria-hidden="true" />
      <div style={{ minWidth: 0, paddingTop: 6 }}>
        <div className="nm-steps">
          {steps.map((step, index) => {
            const next = steps[index + 1];
            const stepClass = [
              "nm-step",
              step.status === "pending" ? "" : step.status,
              step.status === "running" && isFallback ? "fallback" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <Fragment key={step.id}>
                <span className={stepClass}>
                  <span className="nm-node" />
                  {intl.formatMessage(STEP_NAMES[step.id])}
                </span>
                {next ? (
                  <span className="nm-conn" aria-hidden="true">
                    <span className={`nm-conn-fill${step.status === "done" ? " on" : ""}`} />
                  </span>
                ) : null}
              </Fragment>
            );
          })}
          <span className="nm-elapsed">{(elapsedMs / 1000).toFixed(1)}s</span>
        </div>
        <div key={main} className="nm-step-label">
          <div className={`nm-step-main${isFallback ? " fallback" : ""}`}>{main}</div>
          {visibleDetail ? <div className="nm-step-detail">{visibleDetail}</div> : null}
        </div>
      </div>
    </div>
  );
}
