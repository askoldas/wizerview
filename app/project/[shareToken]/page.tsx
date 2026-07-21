import type { Metadata } from 'next';
import { SharedProjectPage } from '@/components/shared-project-page';

export const metadata: Metadata = { title: 'Project — WizerView', robots: { index: false, follow: false } };
export default function ProjectPage({ params }: { params: { shareToken: string } }) { return <SharedProjectPage shareToken={params.shareToken} />; }
