require('dotenv').config();
const express = require('express');
const cors = require('cors');
const leadsRouter = require('./routes/leads');
const analyticsRouter = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: (origin, cb) => {
    // Allow any localhost origin (any port) in dev
    if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
    if (origin === process.env.FRONTEND_URL) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json());

app.use('/api/leads', leadsRouter);
app.use('/api/analytics', analyticsRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
