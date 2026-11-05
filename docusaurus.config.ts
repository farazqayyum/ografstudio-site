import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type * as Blog from '@docusaurus/plugin-content-blog';
import type * as Docs from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const repository = 'https://github.com/zerodensity/ograf-studio';

const config: Config = {
  title: 'OGraf Studio',
  tagline: 'Create animated, data-driven broadcast graphics visually or with AI.',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  url: 'https://ografstudio.org',
  baseUrl: '/',
  trailingSlash: false,

  // GitHub Pages deployment; see README.md. The custom domain is set in the repository's settings.
  organizationName: 'zerodensity',
  projectName: 'ografstudio-site',

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'warn',

  markdown: {
    // .md files are plain CommonMark, so pages imported from the Studio repository need no MDX
    // escaping. Use .mdx when a page needs components.
    format: 'detect',
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'docs',
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
        },
        blog: {
          path: 'announcements',
          routeBasePath: 'announcements',
          blogTitle: 'Announcements',
          blogDescription: 'News about OGraf Studio.',
          blogSidebarTitle: 'Recent announcements',
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            title: 'OGraf Studio announcements',
            xslt: true,
          },
          onInlineTags: 'throw',
          onInlineAuthors: 'throw',
          onUntruncatedBlogPosts: 'throw',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'guides',
        path: 'guides',
        routeBasePath: 'guides',
        sidebarPath: './sidebarsGuides.ts',
      } satisfies Docs.Options,
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'examples',
        path: 'examples',
        routeBasePath: 'examples',
        sidebarPath: './sidebarsExamples.ts',
      } satisfies Docs.Options,
    ],
    [
      '@docusaurus/plugin-content-blog',
      {
        // Generated from the Studio repository's docs/releases by scripts/import-ograf-docs.mjs.
        id: 'releases',
        path: 'releases',
        routeBasePath: 'releases',
        blogTitle: "What's new",
        blogDescription: 'Release notes for every OGraf Studio version.',
        blogSidebarTitle: 'All releases',
        blogSidebarCount: 'ALL',
        postsPerPage: 10,
        showReadingTime: false,
        feedOptions: {
          type: ['rss', 'atom'],
          title: 'OGraf Studio releases',
          xslt: true,
        },
        onInlineTags: 'throw',
        onInlineAuthors: 'throw',
        onUntruncatedBlogPosts: 'throw',
      } satisfies Blog.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    metadata: [
      {
        name: 'keywords',
        content: 'OGraf, EBU, broadcast graphics, HTML5 graphics, lower thirds, playout, MCP',
      },
    ],
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      // Always dark, so it meets the homepage stage cleanly in either colour mode.
      style: 'dark',
      title: 'Studio',
      logo: {
        alt: 'OGraf',
        src: 'img/ograf-logo-mono-white.svg',
        height: 24,
      },
      items: [
        {type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Docs'},
        {
          type: 'docSidebar',
          docsPluginId: 'guides',
          sidebarId: 'guides',
          position: 'left',
          label: 'How-to guides',
        },
        {
          type: 'docSidebar',
          docsPluginId: 'examples',
          sidebarId: 'examples',
          position: 'left',
          label: 'Examples',
        },
        {to: '/releases', label: "What's new", position: 'left'},
        {to: '/announcements', label: 'Announcements', position: 'left'},
        {
          href: `${repository}/releases/latest`,
          label: 'Download',
          position: 'right',
          className: 'navbar-download',
        },
        {
          href: repository,
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub repository',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Learn',
          items: [
            {label: 'Get started', to: '/guides/install'},
            {label: 'Documentation', to: '/docs'},
            {label: 'How-to guides', to: '/guides'},
            {label: 'Examples', to: '/examples'},
          ],
        },
        {
          title: 'News',
          items: [
            {label: "What's new", to: '/releases'},
            {label: 'Announcements', to: '/announcements'},
            {label: 'Release feed (RSS)', href: 'pathname:///releases/rss.xml'},
          ],
        },
        {
          title: 'Project',
          items: [
            {label: 'GitHub', href: repository},
            {label: 'Download', href: `${repository}/releases/latest`},
            {label: 'Contributing', href: `${repository}/blob/stable/CONTRIBUTING.md`},
            {label: 'Third-party credits', to: '/docs/third-party'},
          ],
        },
        {
          title: 'OGraf',
          items: [
            {label: 'EBU OGraf', href: 'https://ograf.ebu.io/'},
            {label: 'OGraf on GitHub', href: 'https://github.com/ebu/ograf'},
          ],
        },
      ],
      copyright: `OGraf Studio is open source under the <a href="${repository}/blob/stable/LICENSE">GNU AGPL v3.0</a>. The OGraf logo is © European Broadcasting Union (EBU), used under the <a href="/third-party/ebu-ograf-LICENSE.txt">MIT licence</a>; it identifies OGraf functionality and does not indicate EBU endorsement or certification. The feature reel uses an excerpt of Big Buck Bunny, © 2008 Blender Foundation, <a href="https://peach.blender.org/">peach.blender.org</a>, cut and re-encoded, under <a href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a>.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ['glsl', 'powershell'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
