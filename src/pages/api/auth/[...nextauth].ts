// src/pages/api/auth/[...nextauth].ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs"; // <-- bcryptjs: 100% JS, compatibile con Vercel
import { connectMongo } from "../../../lib/mongodb";
import User from "../../../models/User";

// (opzionale ma utile per evitare caching in auth endpoints)
export const dynamic = "force-dynamic";

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
        const user = await User.findOne({ email }).select("+password");
        if (!user) return null;

        // bcryptjs compare
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;

        // ritorna i dati minimi necessari
        return {
          id: String(user._id),
          email: user.email,
          name: user.name || "",
        };
      }
    })
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user }) {
      // alla login inseriamo id e name nel token
      if (user) {
        (token as any).id = (user as any).id;
        token.name = user.name || token.name;
      }
      return token;
    },

    async session({ session, token }) {
      // arricchiamo la sessione con id e avatar dal DB
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
          // in caso di errore DB, lasciamo proseguire con la sessione base
        }
      }
      return session;
    }
  },

  pages: {
    signIn: "/" // usa la home come pagina di login
  },

  secret: process.env.NEXTAUTH_SECRET
};

export default NextAuth(authOptions);
