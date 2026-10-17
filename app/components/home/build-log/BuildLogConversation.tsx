import { useEffect, useRef, useState } from "react";
import { defineMessage, defineMessages, useIntl, type MessageTag } from "react-intl";
import type { BuildLogBlock, BuildLogTask } from "~/types/build-log";
import { FileIcon } from "./icons";

const messages = defineMessages({
  more: { defaultMessage: "展开", description: "构建记录：长消息展开" },
  think: { defaultMessage: "思考", description: "构建记录：思考了几秒" },
  question: { defaultMessage: "疑问", description: "构建记录：疑问卡片标题" },
  prev: { defaultMessage: "上一题", description: "构建记录：疑问卡片" },
  next: { defaultMessage: "下一题", description: "构建记录：疑问卡片" },
  skip: { defaultMessage: "跳过", description: "构建记录：疑问卡片" },
  go: { defaultMessage: "继续", description: "构建记录：疑问卡片" },
});

// 带占位符的文案用 defineMessage 单独声明参数类型（同 hero-messages.ts），漏传参数会在编译期报错
const mergedMessage = defineMessage<{ hash: string; date: string; files: number; code: MessageTag }>({ defaultMessage: "已合并 · <code>{hash}</code> · {date} · {files} 个文件", description: "构建记录：对话末尾的提交信息" });
const openMessage = defineMessage<{ path: string }>({ defaultMessage: "打开 {path}", description: "构建记录：文件卡片" });

export type ExtraMessage = { role: "user"; text: string } | { role: "assistant"; reply: true };
export type QuestionState = { index: number; selected: Record<number, number>; done: boolean };

type ConversationProps = {
  task: BuildLogTask;
  now: number;
  extra: ExtraMessage[];
  question: QuestionState;
  onQuestion: (next: QuestionState) => void;
  onOpenFile: (path: string) => void;
  renderReply: () => React.ReactNode;
};

const isShown = (block: BuildLogBlock, now: number) => (block.at ?? 0) <= now;
const isRunning = (block: BuildLogBlock, now: number) => block.done !== undefined && (block.done === Infinity || now < block.done);

export function BuildLogConversation({ task, now, extra, question, onQuestion, onOpenFile, renderReply }: ConversationProps) {
  const intl = useIntl();
  const scrollRef = useRef<HTMLDivElement>(null);
  const visible = task.blocks.filter((b) => isShown(b, now));
  const questionBlock = visible.find((b): b is Extract<BuildLogBlock, { type: "question" }> => b.type === "question");
  const runningCount = visible.filter((b) => isRunning(b, now)).length;

  // 新内容出现时，只有原本就在底部附近才跟着滚，用户往上翻着看时不打扰
  const stick = useRef(true);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [visible.length, runningCount, extra.length, question.done]);
  useEffect(() => {
    stick.current = true;
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
  }, [task.id]);

  return (
    <div
      ref={scrollRef}
      className="bl-scroll"
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      }}
    >
      <div className="bl-head">{task.title}</div>
      {task.prompt && <UserMessage text={task.prompt} />}
      {visible.map((block, i) => {
        if (block.type === "question") return null;
        const running = isRunning(block, now);
        // 状态变化（进行中 → 完成）时换 key，让新状态重新淡入
        const key = `${i}-${running ? "r" : "d"}`;
        switch (block.type) {
          case "user":
            return <UserMessage key={key} text={block.text} />;
          case "text":
            return <div key={key} className="bl-text bl-fade" dangerouslySetInnerHTML={{ __html: block.html }} />;
          case "step":
            if (running)
              return (
                <div key={key} className="bl-step bl-fade">
                  <span className="bl-shimmer">
                    {block.ing} {block.obj}
                  </span>
                </div>
              );
            return block.verb ? (
              <div key={key} className="bl-step bl-fade">
                {block.verb} <em>{block.obj}</em>
              </div>
            ) : (
              <div key={key} className="bl-step bl-step-plain bl-fade">
                {block.obj}
              </div>
            );
          case "think":
            return running ? (
              <div key={key} className="bl-step bl-fade">
                <span className="bl-shimmer">{block.ing}</span>
              </div>
            ) : (
              <div key={key} className="bl-step bl-fade">
                {intl.formatMessage(messages.think)} <em>{block.sec}</em>
              </div>
            );
          case "chip":
            return (
              <button
                key={key}
                type="button"
                className="bl-chip bl-fade"
                title={intl.formatMessage(openMessage, { path: block.path })}
                onClick={() => onOpenFile(block.path)}
              >
                <FileIcon />
                <span className="bl-chip-name">{block.label ?? block.path}</span>
                {block.add != null && <span className="add">+{block.add}</span>}
                {block.del != null && <span className="del">-{block.del}</span>}
              </button>
            );
          case "merged":
            return (
              <span key={key} className="bl-merged bl-fade">
                {intl.formatMessage(mergedMessage, { hash: block.hash, date: block.date, files: block.files, code: (chunks) => <code key="h">{chunks}</code> })}{" "}
                <span className="add">+{block.add}</span> <span className="del">−{block.del}</span>
              </span>
            );
        }
      })}
      {extra.map((m, i) =>
        m.role === "user" ? (
          <UserMessage key={`x${i}`} text={m.text} />
        ) : (
          <div key={`x${i}`} className="bl-text bl-fade">
            {renderReply()}
          </div>
        ),
      )}
      {questionBlock && !question.done && <QuestionCard block={questionBlock} state={question} onChange={onQuestion} />}
    </div>
  );
}

function UserMessage({ text }: { text: string }) {
  const intl = useIntl();
  const [expanded, setExpanded] = useState(false);
  if (text.length <= 140) return <div className="bl-msg bl-fade">{text}</div>;
  return (
    <button
      type="button"
      className="bl-msg bl-msg-long bl-fade"
      aria-expanded={expanded}
      data-more={intl.formatMessage(messages.more)}
      onClick={() => setExpanded((v) => !v)}
    >
      {text}
    </button>
  );
}

function QuestionCard({
  block,
  state,
  onChange,
}: {
  block: Extract<BuildLogBlock, { type: "question" }>;
  state: QuestionState;
  onChange: (next: QuestionState) => void;
}) {
  const intl = useIntl();
  const q = block.questions[state.index];
  const last = state.index >= block.questions.length - 1;
  const advance = () => onChange(last ? { ...state, done: true } : { ...state, index: state.index + 1 });
  return (
    <div className="bl-q bl-fade">
      <div className="bl-q-head">
        <span>{intl.formatMessage(messages.question)}</span>
        <span className="bl-q-pager">
          <button type="button" aria-label={intl.formatMessage(messages.prev)} onClick={() => onChange({ ...state, index: Math.max(0, state.index - 1) })}>
            ‹
          </button>
          <button type="button" aria-label={intl.formatMessage(messages.next)} onClick={() => onChange({ ...state, index: Math.min(block.questions.length - 1, state.index + 1) })}>
            ›
          </button>
        </span>
      </div>
      <div className="bl-q-title">{q.q}</div>
      {q.options.map((option, k) => (
        <button
          key={option}
          type="button"
          className="bl-q-opt"
          aria-pressed={state.selected[state.index] === k}
          onClick={() => onChange({ ...state, selected: { ...state.selected, [state.index]: k } })}
        >
          <b>{k + 1}</b>
          {option}
        </button>
      ))}
      <div className="bl-q-actions">
        <button type="button" onClick={advance}>
          {intl.formatMessage(messages.skip)}
        </button>
        <button type="button" className="bl-q-go" onClick={advance}>
          {intl.formatMessage(messages.go)}
        </button>
      </div>
    </div>
  );
}
