import { Link } from "~/components/common/LocaleLink";

export interface ChangelogCardProps {
  id: string;
  version: string;
  date: string;
  datetime: string;
  title: string;
  href: string;
  className?: string;
}

export default function ChangelogCard({
  date,
  datetime,
  title,
  href,
  className = "",
}: ChangelogCardProps) {
  return (
    <div className={`w-[clamp(260px,75vw,320px)] shrink-0 snap-start lg:w-auto lg:shrink ${className}`}>
      <article className="h-full">
        <Link
          to={href}
          className="group flex h-full flex-col justify-start rounded-[4px] bg-[#F2F1ED] p-[16px_18px_20px_18px] text-inherit select-none transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#EBEAE5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F54E00] dark:bg-[#1C1B18] dark:hover:bg-[#262522] dark:focus-visible:outline-[#FF5A1F]"
        >
          <time
            dateTime={datetime}
            className="mb-[2px] block text-[16px] leading-[24px] tracking-[0.08px] text-[#26251E]/50 dark:text-[#EDEDEA]/45"
          >
            {date}
          </time>
          <p className="block truncate text-[16px] leading-[24px] tracking-[0.08px] text-[#26251E] dark:text-[#EDEDEA]">
            {title}
          </p>
        </Link>
      </article>
    </div>
  );
}

