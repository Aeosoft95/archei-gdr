// src/pages/api/auth/[...nextauth].ts
import NextAuthLib, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectMongo } from "../../../lib/mongodb";
import User from "../../../models/User";

export const dynamic = "force-dynamic";
export const config = { runtime: "nodejs" };

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectMongo();

        const email = credentials.email.toLowerCase().trim();
        const user = await User.findOne({ email });
        if (!user) return null;

        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;

        return {
          id: String(user._id),
          email: user.email,
          name: user.name || ""
        };
      }
    })
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).id = (user as any).id;
        token.name = user.name || token.name;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id;
        try {
          await connectMongo();
          const dbUser = await User.findById((token as any).id).select("avatarUrl name");
          if (dbUser) {
            if (dbUser.name && !session.user.name) session.user.name = dbUser.name;
            session.user.image = dbUser.avatarUrl || undefined;
          }
        } catch {
          // lascia proseguire senza bloccare la sessione
        }
      }
      return session;
    }
  },

  pages: {
    signIn: "/"
  },

  secret: process.env.NEXTAUTH_SECRET
};

export default NextAuthLib(authOptions);
