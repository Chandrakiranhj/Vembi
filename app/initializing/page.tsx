import { redirect } from 'next/navigation';

// This is a server component that immediately redirects
export default function InitializingPage() {
  // Redirect to force-create without any delay
  redirect('/api/auth/force-create');
  
  // This part will never render but is required for the component
  return null;
} 