import type { LoaderFunctionArgs, MetaFunction, HeadersFunction } from "react-router";
import { data, useLoaderData } from "react-router";
import { getMetaIntl, pageMeta } from "~/utils/seo";
import { buildUnifiedGameData } from "~/lib/game-platform.server";
import { forwardLoaderCacheControl, JSON_TOKEN_DATA_CACHE_HEADERS } from "~/lib/cache-headers.server";
import GameArchive from "~/components/game/GameArchive";
import { getRouteLocale } from "~/lib/i18n.server";

export const meta: MetaFunction = ({ matches }) => pageMeta.game(getMetaIntl(matches));

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const platform = url.searchParams.get("platform") || "all";

  return data(await buildUnifiedGameData(platform, getRouteLocale(params)), {
    headers: JSON_TOKEN_DATA_CACHE_HEADERS,
  });
};

export const headers: HeadersFunction = forwardLoaderCacheControl;

export default function GameIndexRoute() {
  const data = useLoaderData<typeof loader>();

  return <GameArchive {...data} />;
}
