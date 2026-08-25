# Sonakshi's Portfolio

A static recreation of [somohanty.wixsite.com/sonakshi](https://somohanty.wixsite.com/sonakshi), built with plain HTML, CSS, and JavaScript — no frameworks or build step required.

## Pages

| Page | File |
| --- | --- |
| Home (typewriter hero + project grid) | `index.html` |
| Zara Website Redesign case study | `zara-website-redesign.html` |
| Department of Defense Internship (EMS Deception) | `department-of-defense-internship-project.html` |
| OAK Website Redesign case study | `oak-website-redesign.html` |
| EZ Eventz case study | `ez-events.html` |
| Beli Redesign case study | `beli-redesign.html` |
| AISEQ Website Redesign (placeholder, like original) | `aiseq-website-redesign.html` |
| About | `about.html` |
| Published (placeholder, like original) | `published.html` |
| Contact | `contact.html` |

The Trilogy Sanctuary Rebrand card on the home page links to its external Notion case study, matching the original site.

## Structure

- `css/style.css` — all styles (sage green palette + serif display type matching the original)
- `js/main.js` — typewriter hero animation, mobile nav toggle, contact form handler
- `assets/` — all images downloaded from the original Wix site

## Running locally

Any static file server works:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000
