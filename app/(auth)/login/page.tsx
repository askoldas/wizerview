import type { Metadata } from 'next';
import { AuthFallbackPage } from '@/components/auth/auth-fallback-page';

export const metadata: Metadata = {
  title: 'Sign in — WizerView',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <AuthFallbackPage mode="login" />;
}
