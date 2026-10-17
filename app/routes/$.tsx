export function loader() {
  throw new Response("Not Found", { status: 404 });
}

export { default } from "~/components/error/NotFound404";
