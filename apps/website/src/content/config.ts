import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('FieldLedger Compliance Team'),
    authorRole: z.string().default('Facility & Fire Safety Specialist'),
    vertical: z.enum(['fire-extinguisher', 'hood-cleaning', 'grease-trap', 'general-compliance', 'comparison']),
    tags: z.array(z.string()).default([]),
    canonicalUrl: z.string().optional(),
    featured: z.boolean().default(false),
    schemaType: z.enum(['Article', 'TechArticle', 'HowTo', 'FAQPage']).default('Article'),
    faqs: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
  }),
});

export const collections = { blog };
