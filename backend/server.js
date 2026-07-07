require('dotenv').config();
const app = require('./src/app');
const prisma = require('./src/utils/prismaClient');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Keep Neon DB alive — ping every 4 minutes
setInterval(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('DB ping OK');
  } catch (err) {
    console.log('DB ping failed:', err.message);
  }
}, 4 * 60 * 1000);