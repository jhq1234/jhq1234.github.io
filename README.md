# jangho.me

Personal academic homepage — minimal single-page Jekyll site.
Design: serif (Charter/Georgia) body + system sans labels, single indigo accent, light/dark aware.

## Edit content (no HTML needed)

Everything lives in data files:

| What                         | File                        |
|------------------------------|-----------------------------|
| Name, role, links, emails    | `_config.yml`               |
| Publications                 | `_data/publications.yml`    |
| News items                   | `_data/news.yml`            |
| Bio / About paragraphs       | `index.html` (top section)  |
| Colors / layout              | `assets/css/main.css`       |

**Add a publication** — prepend an entry to `_data/publications.yml` (newest first).
Your own name (`profile.name` in `_config.yml`) is auto-bolded in the author list.

**Add a thumbnail** — drop an image in `assets/img/thumb/` and set `thumb: assets/img/thumb/xxx.jpg`
on that publication. Leave `thumb: ""` to keep the placeholder box.

**Add your photo** — drop it at `assets/img/profile.jpg` and set
`profile.image: assets/img/profile.jpg` in `_config.yml`. Empty = "JP" initials.

## Preview locally

```bash
bundle install
bundle exec jekyll serve --livereload
# open http://localhost:4000
```

## Deploy to GitHub Pages + jangho.me

1. Create a GitHub repo (e.g. `jhq1234/jhq1234.github.io` or any repo name) and push this folder.
2. Repo **Settings → Pages**: Source = `Deploy from a branch`, Branch = `main` / root.
3. The included `CNAME` file already points the site at `jangho.me`.
4. At your domain registrar, add DNS records for `jangho.me`:
   - Four `A` records → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - One `AAAA` set (optional, IPv6) → `2606:50c0:8000::153` … `8003::153`
   - `CNAME` for `www` → `jhq1234.github.io`
5. Back in Settings → Pages, set the custom domain to `jangho.me` and enable **Enforce HTTPS**.

DNS can take up to a few hours to propagate.
