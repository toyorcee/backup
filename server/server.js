// server.ts
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { traceError, ApiError } from "./utils/errorHandler.js";
import multer from "multer";
import fs from "fs";

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads", "profiles");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Route Imports
import authRoutes from "./routes/authRoutes.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import regularUserRoutes from "./routes/regularUserRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import invitationRoutes from "./routes/invitationRoutes.js";
import onboardingRoutes from "./routes/onboardingRoutes.js";
import disciplinaryRoutes from "./routes/disciplinaryRoutes.js";
import feedbackRoute from "./routes/feedbackRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import passwordRoutes from "./routes/passwordRoutes.js";
import deductionRoutes from "./routes/deductionRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import approvalRoutes from "./routes/approvalRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";

// Load environment variables
dotenv.config();

// Enhanced error tracking
const logServerError = (error, context) => {
  console.error(`🔴 ${context}:`, {
    message: error.message,
    stack: error.stack,
    time: new Date().toISOString(),
  });
};

// Request logger middleware
const requestLogger = (req, _res, next) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
};

// Response logger middleware
const responseLogger = (req, res, next) => {
  const oldJson = res.json;
  res.json = function (data) {
    console.log(
      `📤 ${new Date().toISOString()} - ${req.method} ${req.url} - Status: ${
        res.statusCode
      }`
    );
    return oldJson.call(this, data);
  };
  next();
};

// Database connection with enhanced logging
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`🟢 MongoDB Connected: ${conn.connection.host}`);

    // Monitor database events
    mongoose.connection.on("error", (error) => {
      logServerError(error, "MongoDB Error");
    });

    mongoose.connection.on("disconnected", () => {
      console.log("🔴 MongoDB Disconnected");
    });
  } catch (error) {
    logServerError(error, "MongoDB Connection Error");
    console.error("❌ Error details:", error);
    setTimeout(connectDB, 5000);
  }
};

// Initialize Express with enhanced error handling
const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Global error handlers with more detail
process.on("unhandledRejection", (reason, promise) => {
  logServerError({ reason, promise }, "Unhandled Promise Rejection");
  console.error("🔴 Promise details:", promise);
});

process.on("uncaughtException", (error) => {
  logServerError(error, "Uncaught Exception");
  console.error("🔴 Error details:", error);
});

// Middleware with logging
app.use(requestLogger);
app.use(responseLogger);
app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(cookieParser());
app.use(express.json());

// Add session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Add this after other middleware declarations (after app.use(express.json()))
app.use((req, res, next) => {
  // Set security headers
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Set correct MIME types for TypeScript files
  if (req.url.endsWith(".ts")) {
    res.setHeader("Content-Type", "application/typescript");
  }
  next();
});

// Multer configuration for profile images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/profiles/"); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG and GIF are allowed."));
    }
  },
});

// Route error wrapper
const routeErrorWrapper = (handler) => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      logServerError(error, `Route Error: ${req.method} ${req.url}`);
      next(error);
    }
  };
};

// Wrap your route handlers
app.use("/api/auth", routeErrorWrapper(authRoutes));
app.use("/api/admin", routeErrorWrapper(adminRoutes));
app.use("/api/super-admin", routeErrorWrapper(superAdminRoutes));
app.use("/api/leave", routeErrorWrapper(leaveRoutes));
app.use("/api/users", routeErrorWrapper(regularUserRoutes));
app.use("/api/employees", routeErrorWrapper(employeeRoutes));
app.use("/api/invitation", routeErrorWrapper(invitationRoutes));
app.use("/api/onboarding", routeErrorWrapper(onboardingRoutes));
app.use("/api/disciplinary", routeErrorWrapper(disciplinaryRoutes));
app.use("/api/feedback", routeErrorWrapper(feedbackRoute));
app.use("/api/departments", routeErrorWrapper(departmentRoutes));
app.use("/api/password", routeErrorWrapper(passwordRoutes));
app.use("/api/deductions", routeErrorWrapper(deductionRoutes));
app.use("/api/notifications", routeErrorWrapper(notificationRoutes));
app.use("/api/approvals", routeErrorWrapper(approvalRoutes));
app.use("/api/audit", routeErrorWrapper(auditRoutes));

// Enhanced health check
app.get("/api/health", (_req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
  res.json(health);
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get(
  "/uploads/profiles/:filename",
  (req, res, next) => {
    res.setHeader("Cache-Control", "public, max-age=31536000");
    next();
  },
  express.static(path.join(__dirname, "uploads/profiles"))
);

// Enhanced error handler
app.use((err, req, res, next) => {
  const error = traceError(
    err,
    `Global Error Handler: ${req.method} ${req.url}`
  );
  console.error("❌ Full error details:", {
    error,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    headers: req.headers,
  });

  // Determine status code
  const statusCode = error.statusCode || 500;

  // Determine error message
  let errorMessage = "Internal server error";

  if (error instanceof ApiError) {
    errorMessage = error.message;
  } else if (error.message) {
    errorMessage = error.message;
  }

  res.status(statusCode).json({
    success: false,
    message: errorMessage,
    error:
      process.env.NODE_ENV === "development"
        ? {
            message: error.message,
            stack: error.stack,
          }
        : undefined,
  });
});

// 404 handler should be last
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Your test route for development
if (process.env.NODE_ENV === "development") {
  import("./routes/testRoutes.js").then((testRoutes) => {
    app.use("/api/test", testRoutes.default);
  });
}

// Start server with enhanced logging
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`
🚀 Server is running!
📡 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV}
🔗 Client URL: ${process.env.CLIENT_URL || "http://localhost:5173"}
      `);
    });
  } catch (error) {
    logServerError(error, "Server Startup Error");
    process.exit(1);
  }
};

startServer();
