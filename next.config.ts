import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/reports/primer-informe-julio-2026.html",
        headers: [
          {
            key: "Link",
            value:
              '<https://www.luiguiherrera.com/informes/primer-informe-julio-2026>; rel="canonical"',
          },
        ],
      },
      {
        source: "/reports/primer-informe-julio-2026.pdf",
        headers: [
          {
            key: "Link",
            value:
              '<https://www.luiguiherrera.com/informes/primer-informe-julio-2026>; rel="canonical"',
          },
        ],
      },
      {
        source: "/reports/primer-informe-julio-2026.md",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, follow",
          },
        ],
      },
      {
        source: "/reports/primer-informe-julio-2026-calendar.ics",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, follow",
          },
        ],
      },
      {
        source: "/reports/segundo-informe-julio-2026.html",
        headers: [
          {
            key: "Link",
            value:
              '<https://www.luiguiherrera.com/informes/segundo-informe-julio-2026>; rel="canonical"',
          },
        ],
      },
      {
        source: "/reports/segundo-informe-julio-2026.pdf",
        headers: [
          {
            key: "Link",
            value:
              '<https://www.luiguiherrera.com/informes/segundo-informe-julio-2026>; rel="canonical"',
          },
        ],
      },
      {
        source: "/reports/segundo-informe-julio-2026.md",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, follow",
          },
        ],
      },
      {
        source: "/reports/primer-informe-agosto-2026.html",
        headers: [
          {
            key: "Link",
            value:
              '<https://www.luiguiherrera.com/informes/primer-informe-agosto-2026>; rel="canonical"',
          },
        ],
      },
      {
        source: "/reports/primer-informe-agosto-2026.pdf",
        headers: [
          {
            key: "Link",
            value:
              '<https://www.luiguiherrera.com/informes/primer-informe-agosto-2026>; rel="canonical"',
          },
        ],
      },
      {
        source: "/reports/primer-informe-agosto-2026.md",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, follow",
          },
        ],
      },
      {
        source: "/reports/primer-informe-agosto-2026-calendar.ics",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, follow",
          },
        ],
      },
      {
        source: "/reports/segundo-informe-agosto-2026.html",
        headers: [
          {
            key: "Link",
            value:
              '<https://www.luiguiherrera.com/informes/segundo-informe-agosto-2026>; rel="canonical"',
          },
        ],
      },
      {
        source: "/reports/segundo-informe-agosto-2026.pdf",
        headers: [
          {
            key: "Link",
            value:
              '<https://www.luiguiherrera.com/informes/segundo-informe-agosto-2026>; rel="canonical"',
          },
        ],
      },
      {
        source: "/reports/segundo-informe-agosto-2026.md",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, follow",
          },
        ],
      },
      {
        source: "/reports/segundo-informe-agosto-2026-calendar.ics",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, follow",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
