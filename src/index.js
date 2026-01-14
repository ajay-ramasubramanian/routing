/**
 * Cloudflare Routing Worker
 * 
 * Routes requests to different Cloudflare Pages deployments based on URL path:
 * - /painrelief/* -> chiroatwater_website (rewritten to /* on origin)
 * - /en, /fr, / -> godot website
 */

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        // Determine which origin to route to based on path
        const { targetUrl, rewrittenPath } = getRoutingTarget(path, env);

        // Build the proxied request URL
        const proxyUrl = new URL(rewrittenPath, targetUrl);
        proxyUrl.search = url.search; // Preserve query string

        // Create a new request with the proxied URL
        const proxyRequest = new Request(proxyUrl.toString(), {
            method: request.method,
            headers: request.headers,
            body: request.body,
            redirect: 'manual', // Handle redirects manually to rewrite them
        });

        // Fetch from the origin
        let response = await fetch(proxyRequest);

        // Handle redirects - rewrite Location header to maintain routing
        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('Location');
            if (location) {
                const rewrittenLocation = rewriteRedirectLocation(location, path, env);
                const newHeaders = new Headers(response.headers);
                newHeaders.set('Location', rewrittenLocation);
                response = new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: newHeaders,
                });
            }
        }

        // Add CORS headers if needed and return response
        return response;
    },
};

/**
 * Determines the target origin URL and rewritten path based on the incoming path
 * 
 * Routing rules:
 * - /painrelief/* -> CHIROATWATER_PAGES_URL, path rewritten to remove /painrelief prefix
 * - Everything else (/, /en, /fr, etc.) -> GODOT_PAGES_URL
 * 
 * @param {string} path - The incoming request path
 * @param {object} env - Environment variables
 * @returns {object} - { targetUrl, rewrittenPath }
 */
function getRoutingTarget(path, env) {
    const chiroatwaterUrl = env.CHIROATWATER_PAGES_URL;
    const godotUrl = env.GODOT_PAGES_URL;

    // Check if path starts with /painrelief
    if (path.startsWith('/painrelief')) {
        // Route to chiroatwater_website
        // Remove the /painrelief prefix for the origin request
        // /painrelief/en/page -> /en/page
        // /painrelief -> /
        // let rewrittenPath = path.replace(/^\/painrelief/, '') || '/';

        return {
            targetUrl: chiroatwaterUrl,
            rewrittenPath: path,
        };
    }

    // Default: Route to godot website
    // Path stays the same (/, /en, /fr, /en/page, etc.)
    return {
        targetUrl: godotUrl,
        rewrittenPath: path,
    };
}

/**
 * Rewrites redirect Location headers from origins to maintain proper routing
 * 
 * For example, if chiroatwater origin redirects to /en/contact,
 * we need to rewrite it to /painrelief/en/contact
 * 
 * @param {string} location - The original Location header value
 * @param {string} originalPath - The original incoming request path
 * @param {object} env - Environment variables
 * @returns {string} - The rewritten Location URL
 */
function rewriteRedirectLocation(location, originalPath, env) {
    try {
        const locationUrl = new URL(location);
        const chiroatwaterHost = new URL(env.CHIROATWATER_PAGES_URL).host;
        const godotHost = new URL(env.GODOT_PAGES_URL).host;

        // If redirect is to chiroatwater origin, prepend /painrelief
        if (locationUrl.host === chiroatwaterHost) {
            return `/painrelief${locationUrl.pathname}${locationUrl.search}`;
        }

        // If redirect is to godot origin, keep path as is
        if (locationUrl.host === godotHost) {
            return `${locationUrl.pathname}${locationUrl.search}`;
        }

        // External redirect, return as is
        return location;
    } catch (e) {
        // Relative URL - determine based on original path context
        if (originalPath.startsWith('/painrelief')) {
            // Redirect from chiroatwater, prepend /painrelief if not already there
            if (!location.startsWith('/painrelief')) {
                return `/painrelief${location.startsWith('/') ? '' : '/'}${location}`;
            }
        }
        return location;
    }
}
