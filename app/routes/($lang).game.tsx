import { Outlet, useOutletContext } from "react-router";
import type { AppOutletContext } from "~/types/remix";

export default function GameLayout() {
  // 透传 root 的 session / openLoginDialog，子路由里的 Header 依赖它
  return <Outlet context={useOutletContext<AppOutletContext>()} />;
}
