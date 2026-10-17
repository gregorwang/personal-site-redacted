import { type ActionFunctionArgs, redirect } from "react-router";
import { NO_STORE_HEADERS } from "~/lib/cache-headers.server";
import { getAuth } from "~/lib/auth.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const headers = new Headers({
    ...NO_STORE_HEADERS,
    Pragma: "no-cache",
    Expires: "0",
  });

  // Better Auth 登出：必须把它返回的 Set-Cookie 转发出去，
  // 否则浏览器会一直带着已失效的 session cookie，后续每个匿名请求都会多打一次 D1。
  try {
    const result = await getAuth(request).api.signOut({
      headers: request.headers,
      asResponse: true,
    });

    for (const cookie of result.headers.getSetCookie()) {
      headers.append("Set-Cookie", cookie);
    }

    if (!result.ok) {
      console.warn("[SignOut] Better Auth returned a non-success response:", {
        status: result.status,
      });
    }
  } catch (error) {
    // 即使服务端 signOut 发生意外故障，也照常重定向回首页。
    console.warn("[SignOut] Better Auth signOut failed:", error);
  }

  return redirect("/", { headers });
};

// 资源路由，不需要UI
export default function SignOutRoute() {
  return null;
}
