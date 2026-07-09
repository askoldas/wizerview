import { redirect } from 'next/navigation';

export default function ReviewBuilderIndexPage() {
  redirect('/reviews/new');
}
