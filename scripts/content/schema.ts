// Zod schemas for source content, per docs/contracts/content-format.md.
import { z } from 'zod';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const isKebab = (value: string): boolean => KEBAB.test(value);

const kebab = (what: string) => z.string().regex(KEBAB, `${what} must be lowercase Latin kebab-case`);

// YAML parses unquoted dates (2026-10-05) into Date objects; normalize back to 'YYYY-MM-DD'.
const dateField = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD'),
);

const tags = z.array(kebab('tags')).min(1);

const updatedNotBeforeDate = <T extends { date: string; updated?: string }>(fm: T) => !fm.updated || fm.updated >= fm.date;
const updatedIssue = { message: 'updated must be on or after date', path: ['updated'] };

export const seriesRef = z.object({ key: kebab('series key'), order: z.number().int().min(1) }).strict();

export const postFrontmatter = z
  .object({
    title: z.string().min(1),
    summary: z.string().min(1).max(200),
    date: dateField,
    updated: dateField.optional(),
    tags,
    draft: z.boolean().default(false),
    cover: z.string().startsWith('/images/').optional(),
    series: seriesRef.optional(),
  })
  .strict()
  .refine(updatedNotBeforeDate, updatedIssue);

export const noteFrontmatter = z
  .object({
    title: z.string().min(1),
    date: dateField,
    updated: dateField.optional(),
    tags,
    draft: z.boolean().default(false),
  })
  .strict()
  .refine(updatedNotBeforeDate, updatedIssue);

const required = z.string().min(1);

export const seriesFile = z
  .object({
    title: z.object({ he: required, en: required }).strict(),
    description: z.object({ he: required.optional(), en: required.optional() }).strict().default({}),
  })
  .strict();

export const tagsFile = z.preprocess(
  (value) => value ?? {},
  z.record(kebab('tag keys'), z.object({ he: required.optional(), en: required.optional() }).strict()),
);

// Certificate files live in public/certificates/ (see scripts/add-certificate.ts).
const certificatePath = z.string().regex(/^\/certificates\/[a-z0-9-]+\.(png|jpe?g|webp|pdf)$/, 'must be /certificates/<key>.<png|jpg|webp|pdf>');

export const certificatesFile = z.preprocess(
  (value) => value ?? [],
  z.array(
    z
      .object({
        key: kebab('certificate key'),
        title: required,
        issuer: required,
        date: dateField,
        image: certificatePath.refine((path) => !path.endsWith('.pdf'), 'image must be a picture, not a PDF'),
        file: certificatePath.optional(),
        url: z.url({ protocol: /^https$/ }).optional(),
        tags: z.array(kebab('tags')).default([]),
      })
      .strict(),
  ),
);

export type PostFrontmatter = z.infer<typeof postFrontmatter>;
export type NoteFrontmatter = z.infer<typeof noteFrontmatter>;
export type SeriesFile = z.infer<typeof seriesFile>;
export type TagsFile = z.infer<typeof tagsFile>;
export type CertificatesFile = z.infer<typeof certificatesFile>;

/** One line: `title: Too small...; tags.0: tags must be ...`. */
export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`).join('; ');
}
