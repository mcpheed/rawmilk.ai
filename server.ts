import express from 'express';
import path from 'path';
import { locationsRouter } from './src/api/locations';

const app = express();

// static files
app.use(express.static(path.join(process.cwd(), 'public')));

// API
app.use('/api/locations', locationsRouter);

// fallback to index.html
app.get('/', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`rawmilk.ai server running at http://localhost:${PORT}`);
});
