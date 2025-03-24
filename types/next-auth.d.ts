import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    role: string;
    permissions: any;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      permissions: any;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: string;
    permissions: any;
  }
}
