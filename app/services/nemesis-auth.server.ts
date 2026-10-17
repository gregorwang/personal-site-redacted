import { requireAuth } from "~/lib/auth.server";

export type NemesisUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

export async function requireNemesisUser(request: Request): Promise<NemesisUser> {
  const user = await requireAuth(request);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
