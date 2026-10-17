import type { LinksFunction, LoaderFunctionArgs, MetaFunction, HeadersFunction } from "react-router";
import { data, useLoaderData } from "react-router";
import gameStyles from "~/styles/game.css?url";
import { forwardLoaderCacheControl, JSON_TOKEN_DATA_CACHE_HEADERS } from "~/lib/cache-headers.server";
import { buildUnifiedGameData, isPlatformId } from "~/lib/game-platform.server";
import GameArchive from "~/components/game/GameArchive";
import { getRouteLocale } from "~/lib/i18n.server";
import { getMetaIntl } from "~/utils/seo";

export const meta: MetaFunction<typeof loader> = ({ data, matches }) => {
  const { intl } = getMetaIntl(matches);
  if (!data) {
    return [
      { title: intl.formatMessage({ defaultMessage: "游戏空间 - 未找到" }) },
      { name: "description", content: intl.formatMessage({ defaultMessage: "游戏平台未找到" }) },
    ];
  }

  const platformName =
    data.platforms.find((platform) => platform.id === data.initialPlatform)?.name ||
    intl.formatMessage({ defaultMessage: "游戏空间" });

  return [
    { title: intl.formatMessage({ defaultMessage: "{platform} · 汪家俊的玩家典藏" }, { platform: platformName }) },
    {
      name: "description",
      content: intl.formatMessage({ defaultMessage: "展示 {platform} 游戏收藏、白金奖杯和真实游玩评价" }, { platform: platformName }),
    },
  ];
};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: gameStyles },
];

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const platformId = params.platform || "playstation";

  if (!isPlatformId(platformId)) {
    throw new Response("Platform not found", {
      status: 404,
      statusText: "Platform not found",
    });
  }

  return data(await buildUnifiedGameData(platformId, getRouteLocale(params)), {
    headers: JSON_TOKEN_DATA_CACHE_HEADERS,
  });
};

export const headers: HeadersFunction = forwardLoaderCacheControl;

export default function GamePlatformRoute() {
  const data = useLoaderData<typeof loader>();

  return <GameArchive {...data} />;
}
