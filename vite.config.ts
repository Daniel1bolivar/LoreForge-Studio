import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'node:fs';
import path from 'node:path';

function localGemaPlugin(): Plugin {
  return {
    name: 'local-gema-provider',
    configureServer(server) {
      server.middlewares.use('/api/local-gema', (_req, res) => {
        const filePath = path.resolve(process.cwd(), 'private/la-gema-de-las-almas.worldbuilder.json');
        if (fs.existsSync(filePath)) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(fs.readFileSync(filePath, 'utf-8'));
        } else {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'not_found' }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [viteSingleFile(), localGemaPlugin()],
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: false,
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
