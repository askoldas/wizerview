import { ClientAuthForm } from '@/components/client-auth-form';

export const metadata = { title: 'Client sign in — WizerView', robots: { index: false, follow: false } };
export default function ClientSignInPage({ searchParams }: { searchParams: { next?: string } }) { return <ClientAuthForm next={searchParams.next} />; }
