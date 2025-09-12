import express from 'express';
import path from 'path';
import { nearRouter } from './src/api/near';

const app = express();

// static files
app.use(express.static(path.join(process.cwd(), 'public')));

// API: one simple endpoint
app.use('/api/near', nearRouter);

// root serves the minimal UI
app.get('/', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`rawmilk.ai listening on http://localhost:${PORT}`));
