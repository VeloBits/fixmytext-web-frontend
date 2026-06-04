interface Env {
  SHELL_PAGES_URL: string;
  EDITOR_PAGES_URL: string;
  ANALYTICS_PAGES_URL: string;
  CONTENT_URL: string; // Cloudflare Worker (OpenNext), not a Pages project
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname, search } = url;

    // editor-remote bundle — strip /remotes/editor prefix
    if (pathname.startsWith('/remotes/editor/')) {
      const target = pathname.replace('/remotes/editor', '');
      return fetch(`${env.EDITOR_PAGES_URL}${target}${search}`, request);
    }

    // analytics-remote bundle — strip /remotes/analytics prefix
    if (pathname.startsWith('/remotes/analytics/')) {
      const target = pathname.replace('/remotes/analytics', '');
      return fetch(`${env.ANALYTICS_PAGES_URL}${target}${search}`, request);
    }

    // shell SPA
    if (pathname.startsWith('/app')) {
      return fetch(`${env.SHELL_PAGES_URL}${pathname}${search}`, request);
    }

    // everything else → Next.js content app (Cloudflare Worker via OpenNext)
    return fetch(`${env.CONTENT_URL}${pathname}${search}`, request);
  },
} satisfies ExportedHandler<Env>;
