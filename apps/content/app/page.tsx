import { redirect } from 'next/navigation';

// Root / redirects to the Vite editor. A dedicated VeloBits marketing landing
// will replace this when built in its own repo.
export default function RootPage() {
  redirect('/app');
}
