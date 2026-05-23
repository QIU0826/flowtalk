import express from 'express';
import cors from 'cors';
import { rewriteSentence, rewritePolish } from './rewrite';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.post('/api/rewrite/sentence', async (req, res) => {
  const { sentence, context } = req.body || {};

  if (!sentence || typeof sentence !== 'string' || sentence.trim().length === 0) {
    res.status(400).json({ error: 'sentence is required' });
    return;
  }

  await rewriteSentence(sentence.trim(), context, res);
});

app.post('/api/rewrite/polish', async (req, res) => {
  const { text, scene } = req.body || {};

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  await rewritePolish(text.trim(), scene || '通用', res);
});

app.listen(PORT, () => {
  console.log(`FlowTalk server running on http://localhost:${PORT}`);
});
