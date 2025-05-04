"use client";

import { useUser } from "@clerk/nextjs";
import { AIChatWidget } from "./AIChatWidget";

export default function ClientAdminAIChatWrapper() {
  const { isLoaded, isSignedIn, user } = useUser();
  
  const isAdmin = isLoaded && isSignedIn && user?.publicMetadata?.role === 'ADMIN';

  return isAdmin ? <AIChatWidget /> : null;
} 