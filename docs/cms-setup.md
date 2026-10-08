# Web CMS (Sveltia CMS)

A browser editor for the content in `content/`, at **https://mnmz81.github.io/loom/admin/**.
It works on a phone, needs no server, and saves by committing Markdown straight to `main` in
`mnmz81/loom`. Files: `public/admin/index.html` (loads Sveltia CMS from a CDN) and
`public/admin/config.yml` (collections that mirror `docs/contracts/content-format.md`).

## 1. Create a GitHub token (once, then whenever it expires)

Sign-in uses a **fine-grained personal access token** (there is no OAuth server on GitHub Pages,
so the "Sign in with GitHub" button is turned off).

1. Open https://github.com/settings/personal-access-tokens/new
2. **Token name:** `loom-cms` · **Expiration:** 90 days (or less) · **Resource owner:** `mnmz81`
3. **Repository access:** *Only select repositories* → `mnmz81/loom`
4. **Repository permissions:** **Contents → Read and write**. *Metadata → Read* is added
   automatically. Nothing else — no Pull requests, no Workflows, no Administration.
5. **Generate token** and copy it (it is shown once).

The login dialog also links to a GitHub page with permissions pre-selected; if you use that, still
narrow it to the one repository and Contents read/write before generating.

## 2. Sign in

1. Open https://mnmz81.github.io/loom/admin/ (on a phone: *Share → Add to Home Screen*).
2. **Sign In Using Access Token** → paste the token.

The CMS UI language follows your browser (Sveltia has no Hebrew UI yet, so it shows English);
collection and field labels are bilingual, and text you type in Hebrew is shown right-to-left.

## 3. Writing

The sidebar has one collection **per language**, because each language is its own file:

| Collection | Writes |
|---|---|
| פוסטים · עברית | `content/posts/<slug>/he.md` |
| Posts · English | `content/posts/<slug>/en.md` |
| פתקים · עברית | `content/notes/<slug>/he.md` |
| Notes · English | `content/notes/<slug>/en.md` |
| סדרות · Series | `content/series/<key>.yaml` |

### New Hebrew post
1. **פוסטים · עברית → New**.
2. In the **Slug** panel type a Latin kebab-case slug, e.g. `rust-borrowing`. It is the URL and
   cannot be changed after the first save (renaming would split the post from its translation).
3. Fill title, summary (≤ 200 chars), date, at least one tag (Latin kebab-case: `rust`,
   `web-dev`), optional cover / series / draft, and the body.
4. **Save** → one commit to `main`.

### Add the English translation
1. **Posts · English → New**, and type **the same slug** as the Hebrew post.
2. Copy the shared facts exactly: **date, tags, series, cover**. The build fails (naming both
   files) if they differ. Title, summary, updated, draft and body are per language.
3. Save.

An **English-only** post is just an entry in *Posts · English* with no Hebrew twin; a Hebrew-only
post likewise. The site shows the "Hebrew only / English only" badge automatically.

### Notes (TIL)
Same flow in *פתקים · עברית* / *Notes · English* (no summary, cover or series). A slug must not
be used by both a post and a note.

### Series
*סדרות · Series → New*: the slug is the series key (e.g. `learning-rust`); Hebrew and English
titles are required, descriptions optional. Then pick it in a post's **Series** field and give
the post an **Order** (1, 2, 3…, unique within the series).

### Images
Upload through the **Cover** field or the image button in the body editor. Files go to
`public/images/<slug>/` and are written as `/images/<slug>/file.png`, as the contract requires.
Upload from the Hebrew post and reuse the same path in the translation.

### Tag labels (`content/tags.yaml`)
Not editable in the CMS (its map-of-objects shape can't be modelled — see *Open decisions*).
Edit it in GitHub's web editor, which also works on a phone:
https://github.com/mnmz81/loom/edit/main/content/tags.yaml

### Drafts
Toggle **Draft** to keep an entry out of the production site. A draft translation counts as
missing, so the other language shows the "only in …" badge until you publish it.

## 4. How publishing works

Every Save, upload or delete is a commit to `main` (`content(<collection>): create <slug>` …).
The GitHub Pages deploy workflow runs on that push, builds the site (which validates every
file against the content contract) and publishes it a few minutes later. If something is wrong
the build fails and the live site stays as it was: open the repository's **Actions** tab, read
the error (it names the file), fix the entry in the CMS and save again.

What the CMS checks while you type: required fields, slug/tag format, summary length, date format,
series order ≥ 1. What only the build checks: `updated` ≥ `date`, he/en shared facts equal, unique
series order, a slug used by both a post and a note, extra files in an entry folder.

## 5. Security

- The token lives **only in this browser's local storage** on the device you signed in from. It
  is never put in the repository or sent anywhere except `api.github.com`.
- Keep it narrow: one repository, Contents read/write only, short expiry. If a device is lost or
  the token leaks, revoke it at https://github.com/settings/personal-access-tokens — nothing else
  needs changing.
- **Sign out** (avatar menu → Sign Out) on shared devices; that clears the token.
- `admin/index.html` pins an exact Sveltia CMS version with a Subresource Integrity hash, so a
  tampered CDN file is refused instead of running next to your token. The page is `noindex`.
- Anyone can open `/admin/`, but without a token with write access they cannot change anything.
  Drafts are hidden from the site, not secret: if the repository is public, they are readable
  on GitHub.

## 6. Updating Sveltia CMS

The version is pinned in `public/admin/index.html` (`@sveltia/cms@0.230.0`). To update, check
the release notes (https://github.com/sveltia/sveltia-cms/releases), change the version in the
URL and regenerate the integrity hash:

```bash
V=0.231.0   # new version
curl -sL "https://unpkg.com/@sveltia/cms@$V/dist/sveltia-cms.js" | openssl dgst -sha384 -binary | openssl base64 -A
```

Put the output after `sha384-` in the `integrity` attribute. To check `config.yml` against the
matching schema, download `https://unpkg.com/@sveltia/cms@$V/schema/sveltia-cms.json` and
validate with the installed `ajv` + `yaml` packages (the CMS also reports config errors on load).

## Open decisions

1. **Per-language collections vs. Sveltia i18n.** Sveltia's i18n mode (side-by-side translation
   editor, shared fields copied automatically, one entry per slug) cannot write
   `<slug>/he.md`: the locale can only be a file suffix or a folder *above* the slug, and
   `{{locale}}` is not allowed in the `path` option
   ([i18n structures](https://sveltiacms.app/en/docs/i18n/structures),
   [file paths](https://sveltiacms.app/en/docs/collections/entries/slugs)). The config therefore
   keeps the contract and uses one collection per language. To get the i18n editor instead, the
   contract would have to change to `content/posts/<slug>/index.he.md` + `index.en.md`
   (i18n `structure: multiple_files`, `path: '{{slug}}/index'`), with the pipeline, seed content
   and Notion sync updated to match.
2. **`content/tags.yaml`.** To make tag labels editable in the CMS, the contract would need a
   list shape, e.g. `- { key: rust, he: ראסט, en: Rust }`. A ready collection for that shape is
   commented out at the bottom of `config.yml`.
