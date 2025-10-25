import NextAuth, { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { connectMongo } from "../../../lib/mongodb";
import User from "../../../models/User";

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

        const email = credentials.email.toLowerCase();
        const user = await User.findOne({ email });
        if (!user) return null;

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
        token.id = (user as any).id;
        token.name = user.name || token.name;
      }
      return token;
    },

    async session({ session, token }) {
      // arricchiamo la sessione con id e avatar dal DB
      if (session.user) {
        (session.user as any).id = token.id;

        try {
          await connectMongo();
          const dbUser = await User.findById(token.id).select("avatarUrl name");
          if (dbUser) {
            // aggiorna name se presente in DB
            if (dbUser.name && !session.user.name) {
              session.user.name = dbUser.name;
            }
            // imposta avatar nella sessione
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
