import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type * as Blog from '@docusaurus/plugin-content-blog';
import type * as Docs from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const repository = 'https://github.com/zerodensity/ograf-studio';
const linkedInGroup = 'https://www.linkedin.com/groups/40618425/';

// A section's landing page is the parent in its menu, so it isn't listed under itself as well.
const withoutLandingPage: Docs.Options['sidebarItemsGenerator'] = async ({
  defaultSidebarItemsGenerator,
  ...args
}) =>
  (await defaultSidebarItemsGenerator(args)).filter(
    (item) => !(item.type === 'doc' && item.id === 'index'),
  );

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
          sidebarItemsGenerator: withoutLandingPage,
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
        sidebarItemsGenerator: withoutLandingPage,
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
    // Raise v when the card changes: chat apps keep the image they fetched from a given address.
    image: 'img/social-card.png?v=2',
    metadata: [
      {
        name: 'keywords',
        content: 'OGraf, EBU, broadcast graphics, lower thirds, playout, MCP',
      },
    ],
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      // Always dark, so it meets the homepage stage cleanly in either colour mode.
      style: 'dark',
      logo: {
        alt: 'OGraf Studio',
        src: 'img/ograf-studio-logo.png',
        width: 156,
        height: 21,
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
        {
          href: linkedInGroup,
          position: 'right',
          className: 'header-linkedin-link',
          'aria-label': 'OGraf Studio Community on LinkedIn',
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
          title: 'Links',
          items: [
            {label: 'OGraf Studio on GitHub', href: repository},
            {label: 'LinkedIn community', href: linkedInGroup},
            {label: 'Download', href: `${repository}/releases/latest`},
            {label: 'Contributing', href: `${repository}/blob/stable/CONTRIBUTING.md`},
            {label: 'OGraf Specifications on GitHub', href: 'https://github.com/ebu/ograf'},
            {label: 'EBU OGraf', href: 'https://ograf.ebu.io/'},
            {label: 'Third-party credits', to: '/docs/third-party'},
          ],
        },
      ],
      copyright: `OGraf Studio is open source under the <a href="${repository}/blob/stable/LICENSE">GNU AGPL v3.0</a>. The OGraf logo is © European Broadcasting Union (EBU)`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ['glsl', 'powershell'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
