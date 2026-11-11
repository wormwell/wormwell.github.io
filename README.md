# Wormwell website

Static site for `https://wormwell.github.io/` and the App Store Connect marketing, support and privacy URLs.
No build step, no third-party code, fonts, cookies, analytics or forms.

## Publish

GitHub Pages serves `wormwell.github.io` from a repository named `wormwell.github.io` owned by the GitHub account
or organization `wormwell`. Copy the contents of this directory to the root of that repository (or deploy this
directory with a Pages workflow). Publishing is an external action: do it only with the owner's approval.

## App Store Connect URLs

The canonical mapping lives in `../appstore/METADATA-URLS.md`.

| Field | URL |
| --- | --- |
| Marketing URL | `https://wormwell.github.io/` |
| Support URL | `https://wormwell.github.io/support.html` |
| Privacy Policy URL | `https://wormwell.github.io/privacy.html` |
| Terms of Use (EULA link in the description, if used) | `https://wormwell.github.io/terms.html` |
| Contact | `https://wormwell.github.io/contact.html` |

Keep `privacy.html` in line with `Wormwell/PrivacyInfo.xcprivacy` and the App Privacy answers in App Store Connect
("Data Not Collected"). Update it before shipping iCloud sync or anything else that changes what the app stores or
sends.

## Pages

| File | Content |
| --- | --- |
| `index.html` | Landing page: hero, playable dig demo, screenshot gallery, the 14 zones, progression, privacy promises |
| `support.html` | FAQ (controls, Mac, energy, camps, purchases, Game Center, devices, sound, language, accessibility), billing |
| `contact.html`, `privacy.html`, `terms.html`, `404.html` | Contact, legal and not-found pages |
| `site.js` | Scroll burrow, dig demo, gallery and reveals; respects `prefers-reduced-motion` |
| `styles.css` | Colors from `Wormwell/Graphics/DesignTokens.swift` (see `docs/ART-DIRECTION.md`) |

On the home page the worm peeks out of a hole under the hero and digs down the page as the visitor scrolls,
collecting Amber; scrolling up makes it crawl back through its tunnel. The page ground and the depth chip follow
the 14 zones from Roots & Soil to the Heart of the World. The tunnel is planned once per window size from a fixed
seed and drawn into one viewport-sized canvas only while something moves.

## Media

`media/` holds web copies of real iPhone screenshots (iPhone 18 Pro simulator, 644 × 1400, WebP + JPEG fallback)
and the app icon art (`hero-art`, `og.jpg` 1200 × 630). Replace them with the final App Store screenshots when
that set exists. Example:

```sh
sips -Z 1400 shot.png --out /tmp/shot.png
cwebp -q 80 /tmp/shot.png -o site/media/02-dig-the-deep.webp
sips -s format jpeg -s formatOptions 82 /tmp/shot.png --out site/media/02-dig-the-deep.jpg
```

`_headers` sets security headers on hosts that support it; GitHub Pages ignores it.
