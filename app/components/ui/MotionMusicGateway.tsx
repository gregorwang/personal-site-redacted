import { Link } from "~/components/common/LocaleLink";
import { FormattedMessage } from "react-intl";
import { LazyMotion, domAnimation, m } from "framer-motion";

const easeExpo = [0.16, 1, 0.3, 1] as const;

const waveVariants = {
  rest: { height: "0.5rem", opacity: 0.72 },
  hover: (index: number) => ({
    height: ["0.55rem", index % 2 === 0 ? "1.1rem" : "0.88rem", "0.68rem"],
    opacity: [0.72, 1, 0.86],
    transition: {
      duration: 0.72,
      ease: easeExpo,
      delay: index * 0.045,
      repeat: Infinity,
      repeatType: "mirror" as const,
    },
  }),
};

export function MotionMusicGateway() {
  return (
    <LazyMotion features={domAnimation}>
      <m.div initial="rest" whileHover="hover" whileFocus="hover">
        <Link
          to="/music"
          className="ui-music-gateway mt-2 focus-visible:outline-none"
        >
          <span className="ui-music-gateway__wave" aria-hidden="true">
            {[0, 1, 2, 3].map((item) => (
              <m.span key={item} custom={item} variants={waveVariants} />
            ))}
          </span>
          <span><FormattedMessage defaultMessage="向更深处探索音乐世界" /></span>
          <m.svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
            variants={{
              rest: { x: 0 },
              hover: { x: 4, transition: { duration: 0.36, ease: easeExpo } },
            }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 5l7 7m0 0l-7 7m7-7H4"
            />
          </m.svg>
        </Link>
      </m.div>
    </LazyMotion>
  );
}
