import type { RouteConfig } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";

// 沿用 Remix v2 的扁平文件路由约定（($lang).xxx.tsx 等），路由文件名无需改动。
export default flatRoutes() satisfies RouteConfig;
