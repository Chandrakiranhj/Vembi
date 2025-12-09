import NextAuth, { AuthOptions } from "next-auth";

// Define auth options
export const authOptions: AuthOptions = {
  providers: [], // Add providers here as needed
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };