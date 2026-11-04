
require("dotenv").config();
app.use(cors());

const express = require("express");
const cors = require("cors");
const path = require("path");
const { Pool } = require("pg");
const { randomUUID } = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,

    // Render PostgreSQL may require SSL.
    // Local databases can use SSL disabled.
    ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false
});

app.use(express.json());
app.use(cors());

// Serve frontend files
app.use(
    express.static(
        path.join(__dirname, "../frontend")
    )
);

// Create table
async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
            id UUID PRIMARY KEY,
            title VARCHAR(150) NOT NULL,
            priority VARCHAR(10) NOT NULL
                CHECK (priority IN ('Low', 'Medium', 'High')),
            due_date DATE,
            completed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    console.log("Database table ready");
}

// GET: Retrieve all tasks
app.get("/api/tasks", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id,
                title,
                priority,
                due_date AS "dueDate",
                completed,
                created_at AS "createdAt"
            FROM tasks
            ORDER BY created_at DESC
        `);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Unable to retrieve tasks"
        });
    }
});

// POST: Create a task
app.post("/api/tasks", async (req, res) => {
    const { title, priority, dueDate } = req.body;

    if (
        typeof title !== "string" ||
        !title.trim() ||
        title.trim().length > 150
    ) {
        return res.status(400).json({
            error: "Task title must contain 1–150 characters"
        });
    }

    const validPriorities = ["Low", "Medium", "High"];

    if (!validPriorities.includes(priority)) {
        return res.status(400).json({
            error: "Invalid task priority"
        });
    }

    if (
        dueDate !== undefined &&
        dueDate !== null &&
        (
            typeof dueDate !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
            !isValidDate(dueDate)
        )
    ) {
        return res.status(400).json({
            error: "Invalid due date"
        });
    }

    try {
        const id = randomUUID();

        const result = await pool.query(
            `INSERT INTO tasks
                (id, title, priority, due_date)
             VALUES ($1, $2, $3, $4)
             RETURNING
                id,
                title,
                priority,
                due_date AS "dueDate",
                completed`,
            [
                id,
                title.trim(),
                priority,
                dueDate || null
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Unable to create task"
        });
    }
});

// PUT: Update task
app.put("/api/tasks/:id", async (req, res) => {
    const { id } = req.params;

    const { title, priority, dueDate, completed } = req.body;

    const updates = [];
    const values = [];

    if (title !== undefined) {
        if (
            typeof title !== "string" ||
            !title.trim() ||
            title.trim().length > 150
        ) {
            return res.status(400).json({
                error: "Invalid task title"
            });
        }

        updates.push(`title = $${values.length + 1}`);
        values.push(title.trim());
    }

    if (priority !== undefined) {
        if (!["Low", "Medium", "High"].includes(priority)) {
            return res.status(400).json({
                error: "Invalid priority"
            });
        }

        updates.push(`priority = $${values.length + 1}`);
        values.push(priority);
    }

    if (dueDate !== undefined) {
        if (
            dueDate !== null &&
            (
                typeof dueDate !== "string" ||
                !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
                !isValidDate(dueDate)
            )
        ) {
            return res.status(400).json({
                error: "Invalid due date"
            });
        }

        updates.push(`due_date = $${values.length + 1}`);
        values.push(dueDate);
    }

    if (completed !== undefined) {
        if (typeof completed !== "boolean") {
            return res.status(400).json({
                error: "Completed must be true or false"
            });
        }

        updates.push(`completed = $${values.length + 1}`);
        values.push(completed);
    }

    if (updates.length === 0) {
        return res.status(400).json({
            error: "No valid fields provided"
        });
    }

    values.push(id);

    try {
        const result = await pool.query(
            `UPDATE tasks
             SET ${updates.join(", ")}
             WHERE id = $${values.length}
             RETURNING
                id,
                title,
                priority,
                due_date AS "dueDate",
                completed`,
            values
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Unable to update task"
        });
    }
});

// DELETE: Delete task
app.delete("/api/tasks/:id", async (req, res) => {
    try {
        const result = await pool.query(
            "DELETE FROM tasks WHERE id = $1",
            [req.params.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        res.json({
            message: "Task deleted successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Unable to delete task"
        });
    }
});

// Validate YYYY-MM-DD dates
function isValidDate(value) {
    const date = new Date(`${value}T00:00:00Z`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}

// Start server
async function startServer() {
    try {
        await initializeDatabase();

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Database initialization failed:", error);
        process.exit(1);
    }
}

startServer();
