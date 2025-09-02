// === Safe Storage ===
function safeLoadTasks(key = "tasks") {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    localStorage.removeItem(key);
    return [];
  }
}
function safeSaveTasks(tasks, key = "tasks") {
  try {
    localStorage.setItem(key, JSON.stringify(tasks));
  } catch (err) {
    console.error("Save error:", err);
  }
}
let tasks = safeLoadTasks();

// === Elements ===
const taskList = document.querySelector(".task-list");
const addTaskBtn = document.querySelector("#addTaskBtn");
const searchBar = document.getElementById("searchBar");
const statusFilter = document.getElementById("statusFilter");
const dateFilter = document.getElementById("dateFilter");
const dayFilter = document.getElementById("dayFilter");
const priorityFilter = document.getElementById("priorityFilter");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

// === Utils ===
function parseTaskDateTime(date, time) {
  if (!date) return NaN;
  return time ? new Date(`${date}T${time}`) : new Date(date);
}
function save() { safeSaveTasks(tasks); }

// === Notifications ===
function scheduleReminder(task) {
  if (!task.date || !task.time) return;
  const taskTime = parseTaskDateTime(task.date, task.time);
  if (isNaN(taskTime)) return;

  const remindTime = taskTime.getTime() - 15 * 60 * 1000;
  let delay = remindTime - Date.now();
  if (delay <= 0) return;

  setTimeout(() => {
    const msg = `⏰ 15 minutes left for: ${task.title}`;
    if (Notification.permission === "granted") {
      new Notification("Task Reminder", { body: msg });
    } else {
      alert(msg);
    }
  }, Math.min(delay, 2147483647));
}
document.addEventListener("DOMContentLoaded", () => {
  if ("Notification" in window) {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }
  renderTasks(tasks);
  tasks.forEach(t => scheduleReminder(t));
});

// === Add Task ===
function handleAdd() {
  const title = document.querySelector("#task-title").value.trim();
  const date = document.querySelector("#task-date").value;
  const time = document.querySelector("#task-time").value;
  const priority = document.querySelector("#task-priority").value;

  if (!title || !priority) return alert("Enter task title and priority!");

  const newTask = {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now(),
    title, date, time,
    status: "Pending", priority
  };
  tasks.push(newTask);
  save();
  scheduleReminder(newTask);
  renderTasks(tasks);
  document.querySelector("#task-title").value = "";
  document.querySelector("#task-date").value = "";
  document.querySelector("#task-time").value = "";
  document.querySelector("#task-priority").value = "";
}
addTaskBtn.addEventListener("click", handleAdd);

// === Render Tasks ===
function renderTasks(list) {
  taskList.innerHTML = "";
  if (!list.length) {
    taskList.innerHTML = `<p class="no-tasks">No tasks found</p>`;
    return;
  }
  list.forEach(task => {
    const li = document.createElement("li");

    const info = document.createElement("div");
    info.className = "task-info";
    const titleDiv = document.createElement("div");
    titleDiv.className = "task-title" + (task.status === "Completed" ? " completed" : "");
    titleDiv.textContent = task.title;
    const small = document.createElement("small");
    small.textContent = `${task.date || ""} ${task.time || ""} • ${task.status}`;
    info.append(titleDiv, small);

    const actions = document.createElement("div");
    actions.className = "task-actions";
    const doneBtn = document.createElement("button");
    doneBtn.textContent = task.status === "Completed" ? "Undo" : "Done";
    doneBtn.className = "complete";
    doneBtn.onclick = () => {
      task.status = task.status === "Completed" ? "Pending" : "Completed";
      save(); renderTasks(tasks);
    };
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit"; editBtn.className = "edit";
    editBtn.onclick = () => editTask(task, li);
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete"; delBtn.className = "delete";
    delBtn.onclick = () => { tasks = tasks.filter(t => t.id !== task.id); save(); renderTasks(tasks); };
    actions.append(doneBtn, editBtn, delBtn);

    li.append(info, actions);
    taskList.appendChild(li);
  });
}

// === Edit Task ===
function editTask(task, li) {
  li.innerHTML = "";
  const input = document.createElement("input"); input.value = task.title;
  const date = document.createElement("input"); date.type = "date"; date.value = task.date;
  const time = document.createElement("input"); time.type = "time"; time.value = task.time;
  const select = document.createElement("select");
  ["low","medium","high"].forEach(p => {
    const opt = document.createElement("option"); opt.value = p; opt.textContent = p;
    if (task.priority === p) opt.selected = true; select.appendChild(opt);
  });
  const saveBtn = document.createElement("button"); saveBtn.textContent = "Save"; saveBtn.className = "complete";
  saveBtn.onclick = () => {
    task.title = input.value.trim(); task.date = date.value; task.time = time.value;
    task.priority = select.value; save(); renderTasks(tasks);
  };
  const cancelBtn = document.createElement("button"); cancelBtn.textContent = "Cancel"; cancelBtn.className = "delete";
  cancelBtn.onclick = () => renderTasks(tasks);
  li.append(input, date, time, select, saveBtn, cancelBtn);
}

// === Filters ===
function filterTasks() {
  const text = searchBar.value.toLowerCase();
  const status = statusFilter.value;
  const dateVal = dateFilter.value;
  const dayVal = dayFilter.value;
  const prioVal = priorityFilter.value;
  const today = new Date(); today.setHours(0,0,0,0);

  const filtered = tasks.filter(t => {
    const matchesText = t.title.toLowerCase().includes(text);
    const matchesStatus = status === "all" || t.status.toLowerCase() === status;
    const matchesDate = !dateVal || t.date === dateVal;
    let matchesDay = true;
    if (dayVal === "today") matchesDay = t.date && new Date(t.date).getTime() === today.getTime();
    if (dayVal === "tomorrow") {
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
      matchesDay = t.date && new Date(t.date).getTime() === tomorrow.getTime();
    }
    if (dayVal === "week") {
      const weekEnd = new Date(today); weekEnd.setDate(today.getDate()+7);
      matchesDay = t.date && new Date(t.date) >= today && new Date(t.date) <= weekEnd;
    }
    const matchesPrio = prioVal === "all" || t.priority === prioVal;
    return matchesText && matchesStatus && matchesDate && matchesDay && matchesPrio;
  });
  renderTasks(filtered);
}
[searchBar,statusFilter,dateFilter,dayFilter,priorityFilter].forEach(el => el.addEventListener("input", filterTasks));
clearFiltersBtn.addEventListener("click", () => {
  searchBar.value=""; statusFilter.value="all"; dateFilter.value="";
  dayFilter.value="all"; priorityFilter.value="all"; renderTasks(tasks);
});
