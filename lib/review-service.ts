import { initialReview, type ReviewData } from '@/lib/mock-data';
import { createSupabaseClientInstance, isSupabaseConfigured } from '@/lib/supabase';

const REVIEW_TABLE = 'reviews';

export async function loadReview(reviewId: string): Promise<ReviewData> {
  if (!isSupabaseConfigured()) {
    return initialReview;
  }

  const client = createSupabaseClientInstance();
  if (!client) {
    return initialReview;
  }

  const { data, error } = await client.from(REVIEW_TABLE).select('content').eq('id', reviewId).maybeSingle();

  if (error) {
    console.error('Failed to load review from Supabase:', error.message);
    return initialReview;
  }

  if (data?.content) {
    return data.content as ReviewData;
  }

  const { error: insertError } = await client.from(REVIEW_TABLE).upsert({
    id: reviewId,
    content: initialReview,
  });

  if (insertError) {
    console.error('Failed to seed review in Supabase:', insertError.message);
  }

  return initialReview;
}

export async function saveReview(review: ReviewData): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const client = createSupabaseClientInstance();
  if (!client) {
    return;
  }

  const { error } = await client.from(REVIEW_TABLE).upsert({
    id: review.id,
    content: review,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Failed to save review to Supabase:', error.message);
  }
}
