let token = localStorage.getItem('token') || '';
const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:8000/api' : '/api';
let currentEditId = null;
let currentDeleteId = null;
const editModal = new bootstrap.Modal(document.getElementById('editModal'));
const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

window.onload = () => {
  if (token) {
    showTodoSection();
  }
  document.getElementById('saveEdit').addEventListener('click', saveEdit);
  document.getElementById('confirmDelete').addEventListener('click', confirmDelete);
};

function showTodoSection() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('todo-section').style.display = 'block';
  loadTasks();
}

async function register() {
  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    const res = await fetch(`${apiBase}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (res.ok) {
      alert('Registered successfully. Please login.');
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    const res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      token = data.data.token;
      localStorage.setItem('token', token);
      showTodoSection();
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function addTask() {
  const title = document.getElementById('new-task-title').value;
  const description = document.getElementById('new-task-desc').value;
  if (!title) return;
  try {
    const res = await fetch(`${apiBase}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title, description })
    });
    if (res.ok) {
      document.getElementById('new-task-title').value = '';
      document.getElementById('new-task-desc').value = '';
      loadTasks();
    } else {
      alert('Failed to add task');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function toggleComplete(id, completed) {
  try {
    const res = await fetch(`${apiBase}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ completed: !completed })
    });
    if (res.ok) {
      loadTasks();
    } else {
      alert('Failed to update task');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function openEditModal(id, title, desc) {
  currentEditId = id;
  document.getElementById('edit-title').value = title;
  document.getElementById('edit-desc').value = desc || '';
  editModal.show();
}

async function saveEdit() {
  const newTitle = document.getElementById('edit-title').value;
  const newDesc = document.getElementById('edit-desc').value;
  if (!newTitle) return;
  try {
    const res = await fetch(`${apiBase}/tasks/${currentEditId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title: newTitle, description: newDesc })
    });
    if (res.ok) {
      editModal.hide();
      loadTasks();
    } else {
      alert('Failed to edit task');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function openDeleteModal(id) {
  currentDeleteId = id;
  deleteModal.show();
}

async function confirmDelete() {
  try {
    const res = await fetch(`${apiBase}/tasks/${currentDeleteId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      deleteModal.hide();
      loadTasks();
    } else {
      alert('Failed to delete task');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function logout() {
  localStorage.removeItem('token');
  token = '';
  document.getElementById('auth-section').style.display = 'block';
  document.getElementById('todo-section').style.display = 'none';
}

async function loadTasks() {
  try {
    const res = await fetch(`${apiBase}/tasks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) {
      logout();
      alert('Session expired. Please login again.');
      return;
    }
    const data = await res.json();
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';
    data.data.forEach(task => {
      const li = document.createElement('li');
      li.className = `list-group-item d-flex justify-content-between align-items-start ${task.completed ? 'completed' : ''}`;
      const contentDiv = document.createElement('div');
      contentDiv.className = 'ms-2 me-auto';
      const titleDiv = document.createElement('div');
      titleDiv.className = 'fw-bold';
      titleDiv.textContent = task.title;
      contentDiv.appendChild(titleDiv);
      contentDiv.appendChild(document.createTextNode(task.description || ''));
      li.appendChild(contentDiv);
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.onclick = () => toggleComplete(task.id, task.completed);
      li.appendChild(checkbox);
      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-sm btn-secondary me-2';
      editBtn.textContent = 'Edit';
      editBtn.onclick = () => openEditModal(task.id, task.title, task.description);
      li.appendChild(editBtn);
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-sm btn-danger';
      deleteBtn.textContent = 'Delete';
      deleteBtn.onclick = () => openDeleteModal(task.id);
      li.appendChild(deleteBtn);
      taskList.appendChild(li);
    });
  } catch (err) {
    alert('Error loading tasks: ' + err.message);
  }
}