const express = require('express');
const cors = require('cors');
const passport = require('passport');
require('./config/passport');

const app = express();
app.set('trust proxy', 1);
// Add this log so we can spy on Render's brain
console.log("Render sees this FRONTEND_URL string:", process.env.FRONTEND_URL);
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
app.use(cors({
  // Hardcoding both URLs directly into the array
  origin: [
    'http://localhost:5173', 
    'https://examforge-peach.vercel.app'
  ],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use('/api/student', require('./routes/studentRoutes'));
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'ExamForge API is awake!' });
});
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

module.exports = app;