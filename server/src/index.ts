import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import applicationsRouter from './routes/applications';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/applications', applicationsRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API running on port ${port}`));