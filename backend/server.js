require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { Pool } = require("pg");
const { randomUUID } = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

app.use(cors({
    origin: "https://todo-list-app-1todo-list-frontend.onrender.com",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));

// Serve frontend files
app.use(
  express.static(
    path.join(__dirname, "../frontend")
  )
);

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,

      
});

app.get("/api/tasks", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tasks ORDER BY id DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
