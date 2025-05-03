import NextAuth from "next-auth";

// This is a placeholder NextAuth configuration file
// since the application primarily uses Clerk for authentication
// and this file is just to satisfy imports

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [],
  secret: process.env.NEXTAUTH_SECRET,
});

export { handlers as GET, handlers as POST }; 