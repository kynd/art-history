import { defineConfig } from 'astro/config';

// Deployed as a GitHub Pages project site at www.kynd.info/art-history/.
const BASE = '/art-history';

// Rebase root-absolute markdown links/images (e.g. /articles/foo) under the base path,
// so in-prose cross-links resolve correctly on the deployed site.
function remarkRebaseLinks() {
  return (tree) => {
    const visit = (node) => {
      if (
        (node.type === 'link' || node.type === 'image') &&
        typeof node.url === 'string' &&
        node.url.startsWith('/') &&
        !node.url.startsWith('//')
      ) {
        node.url = BASE + node.url;
      }
      if (node.children) node.children.forEach(visit);
    };
    visit(tree);
  };
}

export default defineConfig({
  base: BASE,
  output: 'static',
  markdown: {
    remarkPlugins: [remarkRebaseLinks],
  },
  server: {
    port: Number(process.env.PORT) || 4321,
    host: true,
  },
  build: {
    assets: 'assets',
  },
  devToolbar: {
    enabled: false,
  },
});
