
const API_URL = "https://todo-list-app-3mhc.onrender.com/api/tasks";

const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskPriority = document.getElementById("taskPriority");
const taskDueDate = document.getElementById("taskDueDate");
const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");
const submitButton = document.getElementById("submitButton");

const totalTasks = document.getElementById("totalTasks");
const pendingTasks = document.getElementById("pendingTasks");
const completedTasks = document.getElementById("completedTasks");

let tasks = [];
let currentFilter = "all";
let editingTaskId = null;

// Fetch all tasks from backend
async function loadTasks() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Unable to load tasks");
        }

        tasks = await response.json();

        renderTasks();
        updateSummary();

    } catch (error) {
        taskList.innerHTML = `
            <p class="empty-message">
                Unable to load tasks. Please try again.
            </p>
        `;

        console.error(error);
    }
}

// Create or update task
taskForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const title = taskTitle.value.trim();

    if (!title) {
        alert("Please enter a task.");
        return;
    }

    const taskData = {
        title,
        priority: taskPriority.value,
        dueDate: taskDueDate.value || null
    };

    try {
        const isEditing = editingTaskId !== null;

        const url = isEditing
            ? `${API_URL}/${editingTaskId}`
            : API_URL;

        const method = isEditing ? "PUT" : "POST";

        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(taskData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Task operation failed");
        }

        resetForm();
        await loadTasks();

    } catch (error) {
        alert(error.message);
    }
});

// Display tasks
function renderTasks() {
    const searchTerm = searchInput.value.toLowerCase();

    let filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title
            .toLowerCase()
            .includes(searchTerm);

        const matchesFilter =
            currentFilter === "all" ||
            (currentFilter === "pending" && !task.completed) ||
            (currentFilter === "completed" && task.completed);

        return matchesSearch && matchesFilter;
    });

    if (filteredTasks.length === 0) {
        taskList.innerHTML = `
            <p class="empty-message">
                No tasks found. Add a new task!
            </p>
        `;

        return;
    }

    taskList.innerHTML = "";

    filteredTasks.forEach(task => {
        const taskItem = document.createElement("div");

        taskItem.className = "task-item";

        if (task.completed) {
            taskItem.classList.add("completed");
        }

        const taskMain = document.createElement("div");
        taskMain.className = "task-main";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.completed;

        checkbox.addEventListener("change", () => {
            toggleTask(task.id, checkbox.checked);
        });

        const content = document.createElement("div");
        content.className = "task-content";

        const title = document.createElement("h3");
        title.textContent = task.title;

        const meta = document.createElement("div");
        meta.className = "task-meta";

        const priority = document.createElement("span");
        priority.className = `priority ${task.priority}`;
        priority.textContent = task.priority;

        const date = document.createElement("span");
        date.textContent = task.dueDate
            ? `Due: ${task.dueDate}`
            : "No due date";

        meta.append(priority, date);
        content.append(title, meta);
        taskMain.append(checkbox, content);

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const editButton = document.createElement("button");
        editButton.className = "edit-btn";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            editTask(task.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteTask(task.id);
        });

        actions.append(editButton, deleteButton);

        taskItem.append(taskMain, actions);
        taskList.appendChild(taskItem);
    });
}

// Complete or uncomplete task
async function toggleTask(id, completed) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ completed })
        });

        if (!response.ok) {
            throw new Error("Unable to update task");
        }

        await loadTasks();

    } catch (error) {
        alert(error.message);
    }
}

// Edit task
function editTask(id) {
    const task = tasks.find(task => task.id === id);

    if (!task) return;

    taskTitle.value = task.title;
    taskPriority.value = task.priority;
    taskDueDate.value = task.dueDate || "";

    editingTaskId = id;

    submitButton.textContent = "Update Task";

    taskForm.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    taskTitle.focus();
}

// Delete task
async function deleteTask(id) {
    const confirmed = confirm(
        "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Unable to delete task");
        }

        await loadTasks();

    } catch (error) {
        alert(error.message);
    }
}

// Reset form
function resetForm() {
    taskForm.reset();

    editingTaskId = null;

    submitButton.textContent = "Add Task";
}

// Update counters
function updateSummary() {
    const total = tasks.length;

    const completed = tasks.filter(
        task => task.completed
    ).length;

    const pending = total - completed;

    totalTasks.textContent = total;
    pendingTasks.textContent = pending;
    completedTasks.textContent = completed;
}

// Search tasks
searchInput.addEventListener("input", renderTasks);

// Filter tasks
document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        currentFilter = button.dataset.filter;

        renderTasks();
    });
});

// Initial loading
loadTasks();
