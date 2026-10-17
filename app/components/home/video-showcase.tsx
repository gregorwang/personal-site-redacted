import { GsapFillLink } from "~/components/ui/GsapFillLink"
import { FormattedMessage, useIntl } from "react-intl";
import { VideoPlayer } from "~/components/ui/VideoPlayer"
import { ossUrl } from "~/lib/media-cdn"
import { resolveImage } from "~/lib/resolve-image"

const YOTEI_POSTER = resolveImage("yotei_poster")
const YOTEI_VIDEO_SRC = ossUrl("yotei.mp4")
/** yotei.mp4 是 1280×720，但实际画面只占中间 548 行，上下 86px 是片源自带的黑边 */
const YOTEI_PICTURE_ASPECT = "1280 / 548"
const YOTEI_DURATION_SECONDS = 60.56

export default function VideoShowcase() {
  const intl = useIntl();
  return (
    <div className="relative w-full py-16 md:py-24 bg-primary-50">
      <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20">
        <div className="flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-12">
          {/* Left side - Text content */}
          <div className="w-full lg:w-[24rem] flex-shrink-0">
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-primary-950"><FormattedMessage defaultMessage="羊蹄山之魂" /></h2>
                <div className="h-1 w-12 rounded-full bg-gradient-to-r from-accent to-accent-hover" />
              </div>
              <div className="space-y-3 max-w-sm">
                <p className="text-base lg:text-lg text-primary-950/70 leading-relaxed whitespace-pre-line">
                  <FormattedMessage defaultMessage="血染刀刃，泪湿衣襟。 三味线低吟着复仇之歌， 狼之刀鍔在北境的风雪中闪耀。" />
                </p>
                <p className="text-base lg:text-lg text-primary-950/70 leading-relaxed whitespace-pre-line">
                  <FormattedMessage defaultMessage="每一次滑动手柄，每一缕指引之风， 都在告诉我—— 这条路，还要继续走下去。 游戏如此，人生亦如此。" />
                </p>
                <div className="pt-2">
                  <GsapFillLink
                    to="/game"
                    className="ui-button-primary"
                  >
                    <span className="relative"><FormattedMessage defaultMessage="追随指引之风" /></span>
                    <svg
                      className="ui-button-icon h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M5 12h14M13 6l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </GsapFillLink>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - 视频直接放在页面底色上，不加背景装饰，画面本身就是主角 */}
          <div className="w-full min-w-0 flex-1">
            <div className="overflow-hidden rounded-[6px] border border-black/10">
              <VideoPlayer
                src={YOTEI_VIDEO_SRC}
                poster={YOTEI_POSTER}
                title={intl.formatMessage({ defaultMessage: "羊蹄山之魂 - 对马岛之魂游戏视频" })}
                aspectRatio={YOTEI_PICTURE_ASPECT}
                durationHint={YOTEI_DURATION_SECONDS}
                captionsSrc="/captions/yotei.vtt"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
