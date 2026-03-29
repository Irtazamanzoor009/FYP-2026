require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/database');
const { initSocket } = require('./src/config/socket');
const { log, error } = require('./src/utils/logger');
const { scheduleCronJobs } = require('./jobs');

const PORT = process.env.PORT || 8000;

(async () => {
    try {
        await connectDB();
        log('✅ Database connected');

        // Create HTTP server from express app
        const server = http.createServer(app);

        // Initialize Socket.io on same server
        initSocket(server);

        // scheduleCronJobs();
        log('⚙️  Cron jobs scheduled')

        server.listen(PORT, () => {
            log(`🚀 Server running at http://localhost:${PORT}`);
        });

    } catch (err) {
        error('❌ Server startup failed:', err);
        process.exit(1);
    }
})();