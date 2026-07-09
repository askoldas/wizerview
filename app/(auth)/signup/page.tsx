import type { Metadata } from 'next';
import { AuthFallbackPage } from '@/components/auth/auth-fallback-page';

export const metadata: Metadata = {
  title: 'Sign up — WizerView',
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return <AuthFallbackPage mode="signup" />;
}
