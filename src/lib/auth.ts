import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import prisma from "./prisma";
import { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          console.log("Missing credentials");
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            username: credentials.username,
          },
          include: {
            role: true,
          },
        });
        console.log("Found user:", user);

        if (!user || !user.isActive) {
          console.log("User not found or inactive:", user);
          return null;
        }
        
        // Check if user is pending approval
        if (user.isPending) {
          console.log("User is pending approval:", user.username);
          throw new Error("PENDING_APPROVAL");
        }

        const passwordMatch = await compare(
          credentials.password,
          user.passwordHash
        );
        console.log("Password match:", passwordMatch);

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.userId.toString(),
          name: user.fullName,
          email: user.email,
          username: user.username,
          role: user.role.roleName,
          permissions: user.role.permissions,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.role = token.role;
        session.user.permissions = token.permissions;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 giờ
  },
  secret: process.env.NEXTAUTH_SECRET,
}; 