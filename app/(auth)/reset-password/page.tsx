import type { Metadata } from 'next';
import { AuthFallbackPage } from '@/components/auth/auth-fallback-page';

export const metadata: Metadata = {
  title: 'Reset password — WizerView',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <AuthFallbackPage mode="login" />;
}
