import { useEffect, useState } from "react";
import { defineMessage, defineMessages, useIntl } from "react-intl";
import { renderCode, renderMarkdown } from "~/lib/build-log-render";
import { imageSrcSet, resolveImage } from "~/lib/resolve-image";
import type { BuildLogFile, BuildLogModel } from "~/types/build-log";
import { BrowserBarIcons, ChevronIcon } from "./icons";
import { HeatmapView, TokensView } from "./BuildLogStats";

const messages = defineMessages({
  noFile: { defaultMessage: "未打开任何文件", description: "构建记录：标签全关掉后的空状态" },
  tabs: { defaultMessage: "打开的文件", description: "构建记录：标签栏" },
});

// 带占位符的文案用 defineMessage 单独声明参数类型（同 hero-messages.ts），漏传参数会在编译期报错
const closeTabMessage = defineMessage<{ name: string }>({ defaultMessage: "关闭 {name}", description: "构建记录：关闭标签按钮" });

const tabLabel = (path: string, file: BuildLogFile) => file.label ?? path.split("/").pop() ?? path;

type PaneProps = {
  files: Record<string, BuildLogFile>;
  open: string[];
  active: string | null;
  model: BuildLogModel;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
};

export function BuildLogPane({ files, open, active, model, onSelect, onClose }: PaneProps) {
  const intl = useIntl();
  const file = active ? files[active] : undefined;
  // 统计页只有一个标签时不显示标签栏，和 Cursor 内嵌浏览器的处理一样
  const bare = open.length === 1 && (file?.kind === "heatmap" || file?.kind === "tokens");

  return (
    <div className="bl-pane">
      {!bare && (
        <div className="bl-tabs" role="tablist" aria-label={intl.formatMessage(messages.tabs)}>
          {open.map((path) => {
            const name = tabLabel(path, files[path]);
            return (
              <div key={path} className="bl-tab" role="tab" aria-selected={path === active} title={path}>
                <button type="button" onClick={() => onSelect(path)}>
                  {name}
                </button>
                <button type="button" className="bl-tab-close" aria-label={intl.formatMessage(closeTabMessage, { name })} onClick={() => onClose(path)}>
                  ×
                </button>
              </div>
            );
          })}
          <div className="bl-tabs-fill" />
        </div>
      )}
      {file ? <FileView key={active} file={file} path={active ?? ""} model={model} /> : <div className="bl-empty">{intl.formatMessage(messages.noFile)}</div>}
    </div>
  );
}

function FileView({ file, path, model }: { file: BuildLogFile; path: string; model: BuildLogModel }) {
  switch (file.kind) {
    case "code":
      return <pre className="bl-code" dangerouslySetInnerHTML={{ __html: renderCode(file) }} />;
    case "markdown":
      return <div className="bl-doc" dangerouslySetInnerHTML={{ __html: renderMarkdown(file.content) }} />;
    case "plan":
      return (
        <>
          <div className="bl-planbar">
            Plans <span aria-hidden="true">›</span> <span style={{ color: "var(--bl-text)" }}>{path}</span>
            <span className="bl-planbar-right">
              <span>
                {model} <ChevronIcon />
              </span>
              <span className="bl-build">Build</span>
            </span>
          </div>
          <div className="bl-plan">
            <h3>{file.title}</h3>
            {file.body.map((part, i) => (
              <div key={i}>
                {part.heading && <h4>{part.heading}</h4>}
                <p dangerouslySetInnerHTML={{ __html: part.html }} />
              </div>
            ))}
            <div className="bl-plan-tasks">
              <p>{file.tasksLabel}</p>
              {file.tasks.map((task) => (
                <div key={task.text} className={`bl-plan-task${task.done ? " done" : ""}`}>
                  <i aria-hidden="true" />
                  {task.text}
                </div>
              ))}
            </div>
          </div>
        </>
      );
    case "shot":
      return <ShotView file={file} />;
    case "heatmap":
      return <HeatmapView />;
    case "tokens":
      return <TokensView />;
  }
}

function ShotView({ file }: { file: Extract<BuildLogFile, { kind: "shot" }> }) {
  const [index, setIndex] = useState(0);
  const src = resolveImage(file.image);

  useEffect(() => {
    if (file.highlights.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % file.highlights.length), 2400);
    return () => window.clearInterval(timer);
  }, [file]);

  const hl = file.highlights[index];
  return (
    <>
      <BrowserBarIcons url={file.url} />
      <div className="bl-shot">
        <div className="bl-shot-inner">
          <img
            src={src}
            srcSet={imageSrcSet(src)}
            sizes="(max-width: 1100px) 50vw, 520px"
            width={file.width}
            height={file.height}
            alt=""
            loading="lazy"
            decoding="async"
          />
          {hl && (
            <div className={`bl-hl${hl.y < 6 ? " below" : ""}`} style={{ left: `${hl.x}%`, top: `${hl.y}%`, width: `${hl.w}%`, height: `${hl.h}%` }}>
              <span>{hl.label}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
