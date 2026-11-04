const express = require("express");
const cors = require("cors");
const path = require("path");
const { Pool } = require("pg");
const { randomUUID } = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

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