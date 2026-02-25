// lib/demoSeed.ts
// Script to seed demo articles into the Supabase `articles` table
import { supabase } from './supabase';

/**
 * Call this function (temporarily) from the HomePage or a one-time setup page
 * It will insert demo published articles if there are no published articles yet.
 */
export async function seedDemoArticles(userId: string) {
  // Only run if fewer than 12 published articles in the DB (to allow adding more)
  const { data } = await supabase.from('articles').select('id').eq('status', 'published');
  if (data && data.length >= 12) return;
  await supabase.from('articles').insert([
    {
      title: 'How Young Voices Shape the News',
      slug: 'how-young-voices-shape-the-news',
      type: 'reporting',
      content: 'An in-depth look at youth in journalism and the impact they have on public discourse. Featuring interviews, stats, and stories from around the world.',
      status: 'approved',
      author_id: userId,
      disclosure: null,
      context_box: 'Youth reporters are bringing fresh perspectives to today’s stories.',
      published_at: new Date().toISOString(),
    },
    {
      title: 'Finding Calm in a Noisy World',
      slug: 'finding-calm-in-a-noisy-world',
      type: 'perspective',
      content: 'Personal reflections from teens navigating today’s fast-paced media—and why mindful communication matters.',
      status: 'approved',
      author_id: userId,
      disclosure: '',
      context_box: 'Perspectives on managing mental health in the digital age.',
      published_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // one day ago
    },
    {
      title: 'The Rise of TikTok Journalism',
      slug: 'the-rise-of-tiktok-journalism',
      type: 'reporting',
      content: 'How short-form video platforms are revolutionizing news delivery and giving young creators unprecedented reach in storytelling.',
      status: 'approved',
      author_id: userId,
      disclosure: null,
      context_box: 'Social media is changing how we consume and create news.',
      published_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // two days ago
    },
    {
      title: 'Climate Action Starts With Us',
      slug: 'climate-action-starts-with-us',
      type: 'perspective',
      content: 'Young activists share their experiences fighting for environmental justice and why the next generation must lead the charge.',
      status: 'approved',
      author_id: userId,
      disclosure: null,
      context_box: 'Youth climate activism is gaining momentum worldwide.',
      published_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // three days ago
    },
    {
      title: 'Mental Health Matters: Breaking the Stigma',
      slug: 'mental-health-matters-breaking-the-stigma',
      type: 'explainer',
      content: 'A comprehensive guide to understanding mental health challenges facing today\'s youth, with resources and support information.',
      status: 'approved',
      author_id: userId,
      disclosure: null,
      context_box: 'One in five young people experience mental health challenges.',
      published_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(), // four days ago
    },
    {
      title: 'The Future of Education: Learning Beyond Classrooms',
      slug: 'the-future-of-education-learning-beyond-classrooms',
      type: 'reporting',
      content: 'Exploring innovative educational approaches that prepare students for tomorrow\'s challenges through project-based and experiential learning.',
      status: 'approved',
      author_id: userId,
      disclosure: null,
      context_box: 'Education is evolving to meet the needs of the 21st century.',
      published_at: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(), // five days ago
    },
    {
      title: 'Digital Privacy: Protecting Your Online Identity',
      slug: 'digital-privacy-protecting-your-online-identity',
      type: 'explainer',
      content: 'Essential tips for staying safe online, understanding data privacy, and navigating the complexities of social media platforms.',
      status: 'approved',
      author_id: userId,
      disclosure: null,
      context_box: 'Your digital footprint matters more than you think.',
      published_at: new Date(Date.now() - 1000 * 60 * 60 * 144).toISOString(), // six days ago
    },
    {
      title: 'Youth Entrepreneurship: Turning Ideas Into Impact',
      slug: 'youth-entrepreneurship-turning-ideas-into-impact',
      type: 'reporting',
      content: 'Stories of young innovators who are solving real-world problems through creativity, technology, and determination.',
      status: 'approved',
      author_id: userId,
      disclosure: null,
      context_box: 'Young people are driving innovation and social change.',
      published_at: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString(), // seven days ago
    },
    {
      title: 'The Power of Community Organizing',
      slug: 'the-power-of-community-organizing',
      type: 'perspective',
      content: 'How grassroots movements and community-led initiatives are creating lasting change in neighborhoods and beyond.',
      status: 'approved',
      author_id: userId,
      disclosure: null,
      context_box: 'Change starts at the local level with collective action.',
      published_at: new Date(Date.now() - 1000 * 60 * 60 * 192).toISOString(), // eight days ago
    },
    {
      title: 'Art as Activism: Creative Resistance',
      slug: 'art-as-activism-creative-resistance',
      type: 'perspective',
      content: 'Exploring how artists use their creative talents to challenge injustice, spark conversations, and inspire social change.',
      status: 'approved',
      author_id: userId,
      disclosure: null,
      context_box: 'Art has always been a powerful tool for social change.',
      published_at: new Date(Date.now() - 1000 * 60 * 60 * 216).toISOString(), // nine days ago
    },
    {
      title: 'AI and the Future of Journalism',
      slug: 'ai-and-the-future-of-journalism',
      type: 'explainer',
      content: 'How artificial intelligence is transforming newsrooms, fact-checking, and storytelling while raising important ethical questions about automation and human judgment.',
      status: 'approved',
      author_id: userId,
      disclosure: null,
      context_box: 'Technology is reshaping how we gather and verify information.',
      published_at: new Date(Date.now() - 1000 * 60 * 60 * 240).toISOString(), // ten days ago
    },
    {
      title: 'Social Media and Body Image: The Hidden Impact',
      slug: 'social-media-and-body-image-the-hidden-impact',
      type: 'reporting',
      content: 'An investigation into how social media platforms influence body image perceptions among youth, featuring expert opinions and personal stories from affected individuals.',
      status: 'approved',
      author_id: userId,
      disclosure: null,
      context_box: 'Social media\'s impact on mental health goes beyond what meets the eye.',
      published_at: new Date(Date.now() - 1000 * 60 * 60 * 264).toISOString(), // eleven days ago
    }
  ]);
}
