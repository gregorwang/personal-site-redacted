export interface BetterAuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;
  banned?: boolean;
  banReason?: string;
  banExpires?: Date;
}

export interface BetterAuthSession {
  user: BetterAuthUser;
}

export interface AppOutletContext {
  session: BetterAuthSession | null;
  openLoginDialog: () => void;
  loginDialogOpen: boolean;
}
