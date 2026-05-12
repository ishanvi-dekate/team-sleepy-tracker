import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'github-ai-proxy',
      configureServer(server) {
        // POST /ai/chat  →  GitHub Models API (gpt-4o, free, uses injected GITHUB_TOKEN)
        server.middlewares.use('/ai/chat', async (req, res) => {
          let body = '';
          req.on('data', c => (body += c));
          req.on('end', async () => {
            try {
              const token = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN;
              if (!token) {
                res.statusCode = 401;
                res.end('No token: add VITE_GITHUB_TOKEN to .env.local');
                return;
              }

              const { messages } = JSON.parse(body);
              const ghRes = await fetch('https://models.inference.ai.azure.com/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ model: 'gpt-4o', messages, max_tokens: 2000 }),
              });

              if (!ghRes.ok) {
                res.statusCode = ghRes.status;
                res.end(await ghRes.text());
                return;
              }

              const data = await ghRes.json();
              res.setHeader('Content-Type', 'text/plain');
              res.end(data.choices?.[0]?.message?.content ?? '');
            } catch (e) {
              res.statusCode = 500;
              res.end(e.message);
            }
          });
        });
      },
    },
  ],
  base: '/team-efficient-epp/',
})
