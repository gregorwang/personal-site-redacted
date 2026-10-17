"use client"

import { ReactNode } from "react"
import { FormattedMessage, useIntl, type IntlShape } from "react-intl"
import { GsapFillLink } from "~/components/ui/GsapFillLink"
import { GsapGlassCard } from "~/components/ui/GsapGlassCard"
import { imageSrcSet, resolveImage } from "~/lib/resolve-image"

const BAIQUAN_SRC = resolveImage("baiquan")

type Card = {
  title: string
  description: string
  link: string
  contentLabel: ReactNode
}

const getCards = (intl: IntlShape): Card[] => [
  {
    title: intl.formatMessage({ defaultMessage: "近两年所观看番剧" }),
    description: intl.formatMessage({ defaultMessage: "最近两年看的动漫比大学四年看的还要多，都是非常优秀，令人印象深刻的作品。", description: "首页番剧卡片「近两年所观看番剧」的说明" }),
    link: "",
    contentLabel: (
      <div className="w-full text-left text-sm leading-relaxed p-6">
        <ul className="space-y-2 text-primary-950/70">
          <li><FormattedMessage defaultMessage="败犬女主太多了" /></li>
          <li><FormattedMessage defaultMessage="Re0第三季" /></li>
          <li><FormattedMessage defaultMessage="凡人修仙传" /></li>
          <li><FormattedMessage defaultMessage="金牌得主" /></li>
          <li><FormattedMessage defaultMessage="青之箱" /></li>
          <li><FormattedMessage defaultMessage="弹珠汽水瓶里的千岁同学" /></li>
          <li><FormattedMessage defaultMessage="我心里危险的东西" /></li>
          <li><FormattedMessage defaultMessage="灵笼第二季" /></li>
        </ul>
      </div>
    ),
  },
  {
    title: intl.formatMessage({ defaultMessage: "年度最佳" }),
    description: intl.formatMessage({
      defaultMessage:
        "最近两年看到过最有意思笑的合不拢嘴来的动漫，女主角有点下头，跟男主产生了非常奇妙的化学反应，非常搞笑，但是又极具含蓄，作品的服装搭配也令人耳目一新，最意想不到的是这个作者是一个四五十岁的中年男性，居然能写出如此青春活泼的故事，非常期待第二季。",
      description: "首页番剧卡片「年度最佳」的短评（《败犬女主太多了》），口语化",
    }),
    link: "",
    contentLabel: (
      <img
        src={BAIQUAN_SRC}
        srcSet={imageSrcSet(BAIQUAN_SRC)}
        sizes="(max-width: 640px) 90vw, 360px"
        alt={intl.formatMessage({ defaultMessage: "年度最佳番剧" })}
        className="max-w-full h-auto rounded-lg"
        loading="lazy"
        decoding="async"
      />
    ),
  },
  {
    title: intl.formatMessage({ defaultMessage: "令人铭记的话语" }),
    description: "",
    link: "",
    contentLabel: (
      <div className="w-full h-full p-6 flex flex-wrap items-center justify-center gap-3">
        <span className="text-xl font-semibold text-primary-950/90"><FormattedMessage defaultMessage="海的那边是敌人" /></span>
        <span className="text-sm text-primary-950/50"><FormattedMessage defaultMessage="不要把悲伤和痛苦留给别人" /></span>
        <span className="text-base text-primary-950/70"><FormattedMessage defaultMessage="你这份温柔，迟早会害死你" /></span>
        <span className="text-xs text-primary-950/40"><FormattedMessage defaultMessage="你把生命当成什么了？" /></span>
        <span className="text-lg font-semibold text-primary-950/80"><FormattedMessage defaultMessage="不是当上火影才被大家承认" /></span>
        <span className="text-base text-primary-950/60"><FormattedMessage defaultMessage="而是被承认才当上火影" /></span>
        <span className="text-sm text-primary-950/55"><FormattedMessage defaultMessage="色彩越少，越能看清重要" /></span>
        <span className="text-lg font-semibold text-primary-950/85"><FormattedMessage defaultMessage="此身为剑所成" /></span>
        <span className="text-base text-primary-950/65"><FormattedMessage defaultMessage="下辈子我还会找到你" /></span>
      </div>
    ),
  },
]

export default function Donghua() {
  const intl = useIntl()
  const cards = getCards(intl)
  return (
    <section className="py-section-md bg-primary-50">
      <div className="mx-auto max-w-7xl px-6 md:px-8">
        <header className="mb-8 flex flex-col gap-3">
          <h2 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl text-primary-950"><FormattedMessage defaultMessage="纵览番剧" /></h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-primary-950/70">
            <FormattedMessage defaultMessage="记录那些触动心灵的故事，分享那些难以忘怀的瞬间。每一帧画面，都是一段珍贵的回忆。" />
          </p>
          <div className="mt-4">
            <GsapFillLink
              to="/anime"
              className="ui-button-primary"
            >
              <span className="relative"><FormattedMessage defaultMessage="探索完整榜单" /></span>
              <span className="ui-button-icon" aria-hidden="true">→</span>
            </GsapFillLink>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-12">
          {cards.map((card) => (
            <GsapGlassCard
              key={card.title}
              className="group flex flex-col justify-between md:col-span-4"
            >
              {/* 文字信息移到上方 */}
              <div className="p-6">
                <h3 className="text-2xl font-semibold leading-tight tracking-tight text-primary-950">{card.title}</h3>
                {card.description && (
                  <p className="mt-3 text-base leading-relaxed text-primary-950/70">{card.description}</p>
                )}
              </div>

              {/* 内容展示区域 - 移除固定高度，让内容自然撑开 */}
              <div className="px-6 pb-6">
                <div className="flex items-center justify-center rounded-lg overflow-hidden text-sm bg-primary-100 text-primary-950/60">
                  {card.contentLabel}
                </div>
              </div>

              {/* 链接区域 - 只在有链接时显示 */}
              {card.link && (
                <div className="border-t p-6 border-primary-100/70">
                  <button
                    onClick={() => console.log('Clicked:', card.title)}
                    className="ui-button-ghost min-h-0 px-0 py-0"
                  >
                    {card.link}
                    <span className="ui-button-icon" aria-hidden="true">→</span>
                  </button>
                </div>
              )}
            </GsapGlassCard>
          ))}
        </div>
      </div>
    </section>
  )
}
