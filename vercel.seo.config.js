/**
 * Vercel Configuration for International SEO
 * Handles prerendering for bots and proper headers
 */

module.exports = {
  // Headers for SEO
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Language',
            value: 'en, ar'
          },
          {
            key: 'X-Robots-Tag',
            value: 'index, follow'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400'
          }
        ]
      }
    ];
  },

  // Redirects (if needed for clean URLs)
  async redirects() {
    return [
      // Example: Redirect old URLs to new structure
      // Uncomment if you switch to subdirectory structure
      // {
      //   source: '/?lang=en',
      //   destination: '/en',
      //   permanent: true
      // }
    ];
  },

  // Rewrites for serving prerendered content to bots
  async rewrites() {
    return {
      beforeFiles: [
        // Serve prerendered English version to bots
        {
          source: '/',
          has: [
            {
              type: 'header',
              key: 'user-agent',
              value: '.*(bot|crawler|spider|scraper).*'
            }
          ],
          destination: '/api/prerender?url=/'
        },
        // Serve prerendered Arabic version to bots
        {
          source: '/',
          has: [
            {
              type: 'query',
              key: 'lang',
              value: 'ar'
            },
            {
              type: 'header',
              key: 'user-agent',
              value: '.*(bot|crawler|spider|scraper).*'
            }
          ],
          destination: '/api/prerender?url=/?lang=ar'
        }
      ]
    };
  }
};
