# The site of Burnout

This repository holds the website of
[Burnout](https://github.com/Stiven-Gjekaj/burnout), a tool that writes a
bootable USB drive from the command line. Vercel serves it at
<https://burnout-cli.vercel.app>.

The site is one static page. It has no build step and no dependency.

| Path | What it holds |
| --- | --- |
| `public/index.html` | The page |
| `public/styles.css` | The style, in dark and in light |
| `public/app.js` | The download table, the install command and the copy buttons |
| `public/assets/` | The wordmark of Burnout |
| `art/og.svg` | The source of `public/og.png`, the preview image for links |
| `vercel.json` | The output folder and the headers, with a strict content security policy |

## The downloads stay current by themselves

`public/app.js` reads the latest release from the GitHub API in the browser of
each visitor. The table shows each binary with its size and its SHA-256 from
that release. So a release of Burnout needs no change here.

Without JavaScript, or when GitHub does not answer, the page links to the
latest release on GitHub.

## Run it on your computer

    python3 -m http.server 4173 --directory public

Then open <http://localhost:4173>.

## Deploy

Vercel builds the project `burnout-cli` from this repository. A push to
`main` deploys to production. A push to another branch gives a preview.

## Change the text

The text follows the Burnout documents, and it uses ASD-STE100 Simplified
Technical English. Each claim on the page comes from the
[README](https://github.com/Stiven-Gjekaj/burnout/blob/main/README.md) or the
[roadmap](https://github.com/Stiven-Gjekaj/burnout/blob/main/docs/roadmap.md)
of Burnout. Change the page when those documents change.

After a change to `art/og.svg`, render the preview image again:

    rsvg-convert -w 1200 -h 630 art/og.svg -o public/og.png

## Licence

MIT, in [LICENSE](LICENSE). The wordmark is the one in the
Burnout repository.
