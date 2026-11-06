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

app.post("/api/tasks", async (req, res) => {
  try {
    const { title, priority, dueDate } = req.body;

    const result = await pool.query(
      `INSERT INTO tasks (id, title, priority, due_date, completed)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [randomUUID(), title, priority, dueDate || null, false]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error("Error adding task:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, priority, dueDate, completed } = req.body;

    const result = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           priority = COALESCE($2, priority),
           due_date = COALESCE($3, due_date),
           completed = COALESCE($4, completed)
       WHERE id = $5
       RETURNING *`,
      [
        title ?? null,
        priority ?? null,
        dueDate ?? null,
        completed ?? null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM tasks
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: error.message });
  }
});




app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
