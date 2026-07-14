import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = { title: 'Reset password — WizerView', robots: { index: false, follow: false } };

export default function ResetPasswordPage() { return <ResetPasswordForm />; }
