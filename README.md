# Chiroatwater Routing Worker

A Cloudflare Worker that routes requests to different Cloudflare Pages deployments based on URL paths.

## Routing Rules

| Path Pattern | Destination | Path Rewrite |
|-------------|-------------|--------------|
| `/painrelief/*` | chiroatwater_website | Strip `/painrelief` prefix |
| `/`, `/en`, `/fr`, etc. | godot website | No rewrite |

### Examples

- `www.chiroatwater.com/painrelief/en` → `chiroatwater-website.pages.dev/en`
- `www.chiroatwater.com/painrelief/fr/contact` → `chiroatwater-website.pages.dev/fr/contact`
- `www.chiroatwater.com/en` → `godot-website.pages.dev/en`
- `www.chiroatwater.com/fr` → `godot-website.pages.dev/fr`
- `www.chiroatwater.com/` → `godot-website.pages.dev/`

## Setup

### 1. Install Dependencies

```bash
cd routing-worker
npm install
```

### 2. Configure Environment Variables

Edit `wrangler.toml` and replace the placeholder URLs with your actual Cloudflare Pages deployment URLs:

```toml
[vars]
CHIROATWATER_PAGES_URL = "https://your-chiroatwater-project.pages.dev"
GODOT_PAGES_URL = "https://your-godot-project.pages.dev"
```

### 3. Local Development

```bash
npm run dev
```

This starts a local development server. Test your routes at `http://localhost:8787`.

### 4. Deploy to Cloudflare

```bash
npm run deploy
```

### 5. Configure Custom Domain Routing

After deployment, configure the worker to handle traffic for your domain:

1. Go to Cloudflare Dashboard → Workers & Pages → Your Worker
2. Go to "Triggers" tab
3. Add route: `www.chiroatwater.com/*` and select your zone
4. Make sure your domain's DNS is proxied through Cloudflare (orange cloud)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CHIROATWATER_PAGES_URL` | Full URL of chiroatwater Pages deployment |
| `GODOT_PAGES_URL` | Full URL of godot Pages deployment |

## How It Works

1. Worker receives request for `www.chiroatwater.com`
2. Checks if path starts with `/painrelief`
   - **Yes**: Routes to `CHIROATWATER_PAGES_URL`, strips `/painrelief` prefix
   - **No**: Routes to `GODOT_PAGES_URL`, keeps path as-is
3. Handles redirects by rewriting Location headers to maintain proper routing
