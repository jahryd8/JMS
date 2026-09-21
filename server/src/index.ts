import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import streamRouter from './routes/stream.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/stream', streamRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'JMS Backend Online' });
});

app.listen(PORT, () => {
  console.log(`🎵 JMS Backend streaming server running on http://localhost:${PORT}`);
});