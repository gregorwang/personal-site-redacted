import { useEffect, useRef, useState } from "react";
import { defineMessages, useIntl } from "react-intl";
import type { BuildLogModel, BuildLogTool } from "~/types/build-log";
import { ArrowUpIcon, ChevronIcon, ToolIcon } from "./icons";

const messages = defineMessages({
  placeholder: { defaultMessage: "提问、推翻、重做，迭代永无止息……", description: "构建记录输入框占位，句式照 Cursor 的「规划、搜索、构建一切……」" },
  send: { defaultMessage: "发送", description: "构建记录：发送按钮" },
  tool: { defaultMessage: "工具", description: "构建记录：工具菜单" },
  model: { defaultMessage: "模型", description: "构建记录：模型菜单" },
});

export const BUILD_LOG_TOOLS: { id: BuildLogTool; name: string }[] = [
  { id: "claude", name: "Claude Code" },
  { id: "codex", name: "Codex" },
  { id: "cursor", name: "Cursor" },
];
export const BUILD_LOG_MODELS: BuildLogModel[] = ["Opus 5.5", "Sonnet 5.5", "GPT-5.6 Sol", "Astra"];

type ComposerProps = {
  tool: BuildLogTool;
  model: BuildLogModel;
  onTool: (tool: BuildLogTool) => void;
  onModel: (model: BuildLogModel) => void;
  onSend: (text: string) => void;
};

export function BuildLogComposer({ tool, model, onTool, onModel, onSend }: ComposerProps) {
  const intl = useIntl();
  const [text, setText] = useState("");
  const [menu, setMenu] = useState<"tool" | "model" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !rootRef.current?.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  const send = () => {
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const toolName = BUILD_LOG_TOOLS.find((t) => t.id === tool)?.name ?? tool;

  return (
    <div className="bl-composer" ref={rootRef}>
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        placeholder={intl.formatMessage(messages.placeholder)}
        aria-label={intl.formatMessage(messages.placeholder)}
        onChange={(e) => {
          setText(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(200, e.target.scrollHeight)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send();
          }
        }}
      />
      <div className="bl-controls">
        <button type="button" className="bl-pill" aria-haspopup="menu" aria-expanded={menu === "tool"} aria-label={intl.formatMessage(messages.tool)} onClick={() => setMenu(menu === "tool" ? null : "tool")}>
          <ToolIcon tool={tool} />
          <span>{toolName}</span>
          <ChevronIcon />
        </button>
        <button type="button" className="bl-model" aria-haspopup="menu" aria-expanded={menu === "model"} aria-label={intl.formatMessage(messages.model)} onClick={() => setMenu(menu === "model" ? null : "model")}>
          <span>{model}</span>
          <ChevronIcon />
        </button>
        <button type="button" className="bl-send" disabled={!text.trim()} aria-label={intl.formatMessage(messages.send)} onClick={send}>
          <ArrowUpIcon />
        </button>
      </div>
      {menu === "tool" && (
        <div className="bl-menu" role="menu" style={{ left: 8 }}>
          {BUILD_LOG_TOOLS.map((t) => (
            <button key={t.id} type="button" role="menuitemradio" aria-checked={t.id === tool} onClick={() => (onTool(t.id), setMenu(null))}>
              <ToolIcon tool={t.id} />
              {t.name}
              {t.id === tool && <span className="bl-check">✓</span>}
            </button>
          ))}
        </div>
      )}
      {menu === "model" && (
        <div className="bl-menu" role="menu" style={{ left: 96 }}>
          {BUILD_LOG_MODELS.map((m) => (
            <button key={m} type="button" role="menuitemradio" aria-checked={m === model} onClick={() => (onModel(m), setMenu(null))}>
              {m}
              {m === model && <span className="bl-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
