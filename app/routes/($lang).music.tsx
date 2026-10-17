import type { LinksFunction, MetaFunction, HeadersFunction } from "react-router";
import musicStyles from "~/styles/music.css?url";
import { getMetaIntl, pageMeta } from "~/utils/seo";
import MusicPlates from "~/components/music/MusicPlates";
import { BackHome } from "~/components/ui/BackHome";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: musicStyles },
];

export const meta: MetaFunction = ({ matches }) => pageMeta.music(getMetaIntl(matches));

// 页面内容全部来自 app/data/music-tree.ts（静态），不需要 loader：客户端跳转时不发 .data 请求
export const headers: HeadersFunction = () => ({ "Cache-Control": "public, max-age=3600" });

export default function Music() {
  return (
    <>
      <BackHome />
      <MusicPlates />
    </>
  );
}
