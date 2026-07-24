export interface Consultant {
  name: string;
  slug: string;
  avatar: string;
  rating: number;
  reviews: number;
  isNew?: boolean;
}

export const CONSULTANTS: Consultant[] = [
  { name: "Carmen", slug: "carmen-oxeu", avatar: "/images/2733282868.jpeg", rating: 5.0, reviews: 88 },
  { name: "Scarlet", slug: "scarlet-0bq4", avatar: "/images/4267627322.jpeg", rating: 5.0, reviews: 65 },
  { name: "Samy", slug: "samy-zg6b", avatar: "/images/421824214.jpeg", rating: 4.9, reviews: 32 },
  { name: "Cigana Inayá", slug: "cigana-inaya-vafq", avatar: "/images/3723115142.jpeg", rating: 5.0, reviews: 18 },
  { name: "Charlotte", slug: "charlotte-bwns", avatar: "/images/4111375925.jpeg", rating: 4.9, reviews: 17 },
  { name: "Ana Luz", slug: "ana-luz-xyzm", avatar: "/images/620940365.jpeg", rating: 5.0, reviews: 8 },
  { name: "Marcos Cigano", slug: "marcos-cigano-ouwk", avatar: "/images/3899594855.jpeg", rating: 5.0, reviews: 4, isNew: true },
  { name: "Duda Taróloga", slug: "duda-tarologa-b2xc", avatar: "/images/2525502776.jpeg", rating: 5.0, reviews: 32 },
];

export interface AIConsultant {
  name: string;
  slug: string;
  avatar: string;
}

export const AI_CONSULTANTS: AIConsultant[] = [
  { name: "Sofia", slug: "sofia-virtual", avatar: "/images/1638221837.jpeg" },
  { name: "Mariana", slug: "mariana-virtual", avatar: "/images/806989993.jpeg" },
  { name: "Mestre Ramiro", slug: "ramiro-virtual", avatar: "/images/2962052770.jpeg" },
  { name: "Aurora", slug: "aurora-virtual", avatar: "/images/3083896062.jpeg" },
];

// Index-matched to translations[lang].zodiac
export interface ZodiacSign {
  symbol: string;
  love: number;
  work: number;
  luck: number;
}

export const ZODIAC: ZodiacSign[] = [
  { symbol: "♈", love: 2, work: 5, luck: 5 },
  { symbol: "♉", love: 4, work: 3, luck: 4 },
  { symbol: "♊", love: 5, work: 4, luck: 3 },
  { symbol: "♋", love: 4, work: 3, luck: 4 },
  { symbol: "♌", love: 5, work: 5, luck: 4 },
  { symbol: "♍", love: 3, work: 5, luck: 3 },
  { symbol: "♎", love: 4, work: 4, luck: 5 },
  { symbol: "♏", love: 5, work: 3, luck: 4 },
  { symbol: "♐", love: 4, work: 4, luck: 5 },
  { symbol: "♑", love: 3, work: 5, luck: 3 },
  { symbol: "♒", love: 4, work: 4, luck: 4 },
  { symbol: "♓", love: 5, work: 3, luck: 4 },
];

// Index-matched to translations[lang].tarot
export const TAROT_SYMBOLS = ["☀", "✦", "◍", "♀", "⊕", "∞"];

// Index-matched to translations[lang].blogPosts
export interface BlogPost {
  image: string;
  minutes: string;
}

export const BLOG_POSTS: BlogPost[] = [
  { image: "/images/1249322042.jpeg", minutes: "12 min" },
  { image: "/images/833536744.jpeg", minutes: "8 min" },
  { image: "/images/1249322042.jpeg", minutes: "7 min" },
];
