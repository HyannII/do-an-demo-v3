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

        if (!user || !user.isActive) {
          return null;
        }

        // Kiểm tra mật khẩu
        const passwordMatch = await compare(
          credentials.password,
          user.passwordHash
        );

        if (!passwordMatch) {
          return null;
        }

        // Cập nhật thời gian đăng nhập cuối
        await prisma.user.update({
          where: {
            userId: user.userId, // Sửa từ id thành userId theo schema
          },
          data: {
            lastLogin: new Date(),
          },
        });

        // Ghi log đăng nhập
        await prisma.systemLog.create({
          data: {
            eventType: "LOGIN",
            description: "Đăng nhập thành công",
            userId: user.userId, // Sửa từ id thành userId theo schema
            ipAddress: "0.0.0.0", // Trong ứng dụng thực tế, lấy IP của client
          },
        });

        return {
          id: user.userId.toString(), // Sửa từ id thành userId theo schema
          name: user.fullName,
          email: user.email,
          username: user.username,
          role: user.role.roleName, // Sửa từ name thành roleName theo schema
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
