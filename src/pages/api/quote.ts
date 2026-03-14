import type { APIRoute } from 'astro';
import { getAuthUser } from '../../lib/auth';

const quotes = [
  { text: "Though she be but little, she is fierce.", author: "William Shakespeare" },
  { text: "A girl should be two things: who and what she wants.", author: "Coco Chanel" },
  { text: "Girls compete with each other. Women empower one another.", author: "Unknown" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Above all, be the heroine of your life, not the victim.", author: "Nora Ephron" },
  { text: "We realize the importance of our voices only when we are silenced.", author: "Malala Yousafzai" },
  { text: "Success is only meaningful and enjoyable if it feels like your own.", author: "Michelle Obama" },
  { text: "I can and I will. Watch me.", author: "Carrie Green" },
  { text: "Little girls with dreams become women with vision.", author: "Unknown" },
  { text: "Give a girl the right shoes, and she can conquer the world.", author: "Marilyn Monroe" },
  { text: "There is no limit to what we, as women, can accomplish.", author: "Michelle Obama" },
  { text: "You are more powerful than you know; you are beautiful just as you are.", author: "Melissa Etheridge" },
  { text: "She remembered who she was and the game changed.", author: "Lalah Delia" },
  { text: "Don't let anyone tell you what you can't do. Just do it and prove them wrong.", author: "Unknown" },
  { text: "Magic happens when you don't give up, even though you want to. The universe always falls in love with a stubborn heart.", author: "J.M. Storm" }
];

export const GET: APIRoute = async ({ request }) => {
  const auth = await getAuthUser(request);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  return new Response(JSON.stringify({ success: true, data: randomQuote }), { status: 200 });
};
