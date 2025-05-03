import type { AppProps } from 'next/app';
import { ClerkProvider } from '@clerk/nextjs';
import '../app/globals.css'; // Ensure global styles are loaded

export default function MyApp({ Component, pageProps }: AppProps) {
  // Wrap with ClerkProvider to avoid useUser errors during static generation
  return (
    <ClerkProvider {...pageProps}>
      <Component {...pageProps} />
    </ClerkProvider>
  );
}

// Disable static optimization for all pages in the pages directory
export const config = {
  unstable_runtimeJS: true
}; 