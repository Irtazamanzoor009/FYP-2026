require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/database');
// const { scheduleCronJobs } = require('./jobs');
const { log, error } = require("./src/utils/logger")

const PORT = process.env.PORT || 8000;

(async () => {
  try {
    await connectDB();
    log('✅ Database connected');

    // scheduleCronJobs();
    // log('⚙️  Cron jobs scheduled')

    app.listen(PORT, () => {
      log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    error('❌ Server startup failed:', err);
    process.exit(1);
  }
})();