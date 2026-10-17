import { DEFAULT_LOCALE, type Locale } from "~/lib/i18n";

// 长内容（简历、游戏评价、更新日志、演示对话…）不进 JSON 词典，按 OpenAI 的做法「正文按语言分开存」：
// 中文原文留在 app/data 里不动，日文 / 英文写成同结构的覆盖层，只写需要翻译的字段，没写的字段回落中文。

export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends readonly (infer U)[]
    ? readonly DeepPartial<U>[]
    : T extends (...args: never[]) => unknown
      ? T
      : T extends object
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : T;

export type ContentTranslations<T> = Partial<Record<Exclude<Locale, typeof DEFAULT_LOCALE>, DeepPartial<T>>>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 对象按字段、数组按下标把 patch 盖到 base 上；patch 里没有的部分保留 base。 */
export function overlay<T>(base: T, patch: DeepPartial<T> | undefined): T {
  if (patch === undefined) return base;
  if (Array.isArray(base) && Array.isArray(patch)) {
    return base.map((item, index) => overlay(item, patch[index])) as T;
  }
  if (isPlainObject(base) && isPlainObject(patch)) {
    const result: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(patch)) {
      result[key] = key in base ? overlay(base[key], value as never) : value;
    }
    return result as T;
  }
  return patch as T;
}

/** 取某个语言的内容：中文直接返回原文，其它语言把对应覆盖层盖上去。 */
export function localized<T>(locale: Locale, base: T, translations: ContentTranslations<T>): T {
  if (locale === DEFAULT_LOCALE) return base;
  return overlay(base, translations[locale]);
}

/** 列表按 id 覆盖：适合会在头部插入新条目的数据（例如更新日志），不受下标变化影响。 */
export function localizedById<T, K extends keyof T>(
  locale: Locale,
  list: readonly T[],
  key: K,
  translations: Partial<Record<Exclude<Locale, typeof DEFAULT_LOCALE>, Record<string, DeepPartial<T>>>>,
): T[] {
  if (locale === DEFAULT_LOCALE) return [...list];
  const patches = translations[locale] ?? {};
  return list.map((item) => overlay(item, patches[String(item[key])]));
}
