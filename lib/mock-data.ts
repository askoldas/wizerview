export type SectionType = 'review-together' | 'compare-options';

export interface Asset {
  id: string;
  title: string;
  kind: 'image' | 'screenshot' | 'pdf';
  description: string;
  accent: string;
  notes: string;
}

export interface Comment {
  id: string;
  assetId: string;
  x: number;
  y: number;
  text: string;
  author: string;
}

export interface ReviewSection {
  id: string;
  type: SectionType;
  title: string;
  intro: string;
  assets?: Asset[];
  options?: Array<{
    id: string;
    title: string;
    description: string;
    assets: Asset[];
  }>;
}

export interface ShareSettings {
  reviewerNameRequired: boolean;
  pinProtection: boolean;
  allowComments: boolean;
  allowDecisions: boolean;
}

export interface ReviewData {
  id: string;
  title: string;
  client: string;
  instructions: string;
  shareSettings: ShareSettings;
  sections: ReviewSection[];
  sectionFeedback: Record<string, string>;
  optionFeedback: Record<string, string>;
  overallFeedback: string;
  decision: string;
  selectedDirection: string | null;
  comments: Comment[];
}

export const initialReview: ReviewData = {
  id: '1',
  title: 'Homepage Direction',
  client: 'Acme Studio',
  instructions: 'Please compare the homepage directions, leave notes, and select the strongest direction.',
  shareSettings: {
    reviewerNameRequired: true,
    pinProtection: false,
    allowComments: true,
    allowDecisions: true,
  },
  sections: [
    {
      id: 'section-1',
      type: 'compare-options',
      title: 'Compare homepage directions',
      intro: 'Choose the strongest direction for the next release.',
      options: [
        {
          id: 'option-a',
          title: 'Calm editorial homepage',
          description: 'Quiet, premium, and highly editorial.',
          assets: [
            { id: 'a-desktop', title: 'Desktop preview', kind: 'screenshot', description: 'Editorial hero with soft contrast', accent: 'from-stone-700 via-stone-500 to-stone-300', notes: 'Balanced layout with lots of whitespace.' },
            { id: 'a-mobile', title: 'Mobile preview', kind: 'screenshot', description: 'Overview card stack with gentle motion', accent: 'from-stone-800 via-stone-600 to-stone-400', notes: 'A simple, calm flow.' },
          ],
        },
        {
          id: 'option-b',
          title: 'Bold conversion homepage',
          description: 'Readable, punchy, and product-led.',
          assets: [
            { id: 'b-desktop', title: 'Desktop preview', kind: 'screenshot', description: 'Conversion-focused hero and feature grid', accent: 'from-orange-700 via-amber-500 to-orange-300', notes: 'The call to action is more prominent.' },
            { id: 'b-mobile', title: 'Mobile preview', kind: 'screenshot', description: 'Sticky CTA and concise proof points', accent: 'from-amber-800 via-orange-600 to-orange-400', notes: 'Good for mobile adoption.' },
          ],
        },
        {
          id: 'option-c',
          title: 'Minimal premium homepage',
          description: 'Refined, confident, and understated.',
          assets: [
            { id: 'c-desktop', title: 'Desktop preview', kind: 'screenshot', description: 'Minimal hero with polished typography', accent: 'from-neutral-700 via-zinc-500 to-zinc-300', notes: 'Feels premium but may be too quiet.' },
          ],
        },
      ],
    },
    {
      id: 'section-2',
      type: 'review-together',
      title: 'Brand lockups',
      intro: 'Review the logo directions as a set before finalizing the homepage mood.',
      assets: [
        { id: 'logo-h', title: 'Logo horizontal', kind: 'image', description: 'A wide lockup for the header', accent: 'from-slate-800 via-slate-600 to-slate-300', notes: 'Works well in product marketing contexts.' },
        { id: 'logo-s', title: 'Logo square', kind: 'image', description: 'A compact square version for app surfaces', accent: 'from-stone-800 via-stone-600 to-stone-400', notes: 'Feels clear and modern.' },
        { id: 'favicon', title: 'Favicon preview', kind: 'pdf', description: 'Icon treatment for browser tabs', accent: 'from-slate-700 via-slate-500 to-slate-200', notes: 'The negative space needs a little more balance.' },
      ],
    },
  ],
  sectionFeedback: {
    'section-1': '',
    'section-2': '',
  },
  optionFeedback: {
    'option-a': '',
    'option-b': '',
    'option-c': '',
  },
  overallFeedback: '',
  decision: '',
  selectedDirection: null,
  comments: [
    {
      id: 'comment-1',
      assetId: 'b-desktop',
      x: 28,
      y: 36,
      text: 'The benefit stack feels strong here.',
      author: 'Mina',
    },
  ],
};

export const mockReviewSummaries = [
  {
    id: initialReview.id,
    title: initialReview.title,
    client: initialReview.client,
    status: 'In review',
    updatedAt: '2h ago',
    comments: initialReview.comments.length,
  },
  {
    id: '2',
    title: 'Launch email suite',
    client: 'Northwind Labs',
    status: 'Draft',
    updatedAt: 'Yesterday',
    comments: 4,
  },
  {
    id: '3',
    title: 'Product update visuals',
    client: 'River & Oak',
    status: 'Approved',
    updatedAt: '3 days ago',
    comments: 1,
  },
];
