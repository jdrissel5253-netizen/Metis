require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/money', require('./routes/money'));
app.use('/api/habits', require('./routes/habits'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/talos', require('./routes/talos'));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Metis server running on port ${PORT}`));
