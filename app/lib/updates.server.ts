import { getSortedUpdates, type ChangelogPreviewEntry, type UpdateLog } from "~/data/updates";
import { UPDATE_TEXT } from "~/data/i18n/updates";
import type { Locale } from "~/lib/i18n";
import { localizedById } from "~/lib/localized-content";

/** 按语言取更新日志（新的在前）：日文 / 英文按 id 盖上覆盖层，没翻到的条目回落中文。 */
export function getLocalizedUpdates(locale: Locale): UpdateLog[] {
  return localizedById<UpdateLog, "id">(locale, getSortedUpdates(), "id", UPDATE_TEXT);
}

/** 首页卡片只要最新几条的标题和日期，不把整本日志塞进首页 loader。 */
export function getChangelogPreview(locale: Locale, count = 4): ChangelogPreviewEntry[] {
  return getLocalizedUpdates(locale)
    .slice(0, count)
    .map(({ id, version, date, title }) => ({ id, version, date, title }));
}
