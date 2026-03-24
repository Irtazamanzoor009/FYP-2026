const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const errorHandler = require("./middleware/errorHandler");
const loggerMiddleware = require("./middleware/loggerMiddleware");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require('./routes/userRoutes');
const jiraRoutes = require('./routes/jiraRoutes');
const overviewRoutes = require('./routes/overviewRoutes');
const suggestionsRoutes = require('./routes/suggestionsRoutes');

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(loggerMiddleware);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use('/api/jira', jiraRoutes);
app.use('/api/overview', overviewRoutes);
app.use('/api/suggestions', suggestionsRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
