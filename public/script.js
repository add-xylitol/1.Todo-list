let token = localStorage.getItem('token') || '';
const apiBase = `${window.location.origin}/api`;
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let currentEditId = null;
let currentDeleteId = null;
let editModal = null;
let deleteModal = null;
let tasksCache = [];
let currentFilter = 'all';
let searchKeyword = '';

// Toast helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return alert(message);
  const id = `t-${Date.now()}`;
  const bg = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : type === 'warning' ? 'bg-warning text-dark' : 'bg-secondary';
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white ${bg}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  toast.id = id;
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>`;
  container.appendChild(toast);
  try {
    const t = new bootstrap.Toast(toast, { delay: 2000 });
    t.show();
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
  } catch {
    // fallback
    alert(message);
  }
}

// Initialize Socket.IO client
let socket;
function initSocket() {
  try {
    const ioUrl = window.location.origin; // bind to same origin
    if (typeof io !== 'function') return; // guard if socket.io client is not ready
    socket = io(ioUrl, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => console.log('Socket connected:', socket.id));
    socket.on('disconnect', () => console.log('Socket disconnected'));
    socket.on('tasks:changed', () => {
      loadTasks();
    });
  } catch (e) {
    console.warn('Socket init failed:', e);
  }
}

window.addEventListener('load', () => {
  // Initialize Bootstrap modals safely after bundle is loaded
  if (window.bootstrap && typeof window.bootstrap.Modal === 'function') {
    editModal = new bootstrap.Modal(document.getElementById('editModal'));
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
  } else {
    console.warn('Bootstrap not available at load time.');
  }

  if (token) {
    showTodoSection();
  }
  document.getElementById('saveEdit').addEventListener('click', saveEdit);
  document.getElementById('confirmDelete').addEventListener('click', confirmDelete);
  document.getElementById('filter-all').addEventListener('click', () => setFilter('all'));
  document.getElementById('filter-active').addEventListener('click', () => setFilter('active'));
  document.getElementById('filter-completed').addEventListener('click', () => setFilter('completed'));
  document.getElementById('search-input').addEventListener('input', (e) => { searchKeyword = e.target.value.trim().toLowerCase(); renderTasks(); });
  document.getElementById('clear-completed').addEventListener('click', clearCompleted);
  const titleInput = document.getElementById('new-task-title');
  const descInput = document.getElementById('new-task-desc');
  titleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
  descInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
  initSocket();
});

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('[id^="filter-"]').forEach(btn => btn.classList.remove('active'));
  const btn = document.getElementById(`filter-${f}`);
  if (btn) btn.classList.add('active');
  renderTasks();
}

function showTodoSection() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('todo-section').style.display = 'block';
  document.getElementById('logoutBtn').classList.remove('d-none');
  if (currentUser) updateUserUI(currentUser);
  loadTasks();
}

function updateUserUI(user){
  const badge = document.getElementById('user-info');
  if (!badge) return;
  badge.textContent = `${user.username || user.email || '用户'}`;
  badge.classList.remove('d-none');
}

async function register() {
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) return showToast('请输入邮箱和密码', 'warning');
  try {
    toggleLoading(true);
    const res = await fetch(`${apiBase}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      // Auto login with returned token
      const { token: tk, user } = data.data || {};
      if (tk) {
        token = tk; localStorage.setItem('token', token);
      }
      if (user) { currentUser = user; localStorage.setItem('user', JSON.stringify(user)); updateUserUI(user); }
      showToast('注册成功，已自动登录', 'success');
      showTodoSection();
    } else {
      showToast(data.message || '注册失败', 'error');
    }
  } catch (err) {
    showToast('网络错误：' + err.message, 'error');
  } finally { toggleLoading(false); }
}

async function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) return showToast('请输入邮箱和密码', 'warning');
  try {
    toggleLoading(true);
    const res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const { token: tk, user } = data.data || {};
      token = tk; localStorage.setItem('token', token);
      if (user) { currentUser = user; localStorage.setItem('user', JSON.stringify(user)); updateUserUI(user); }
      showToast('登录成功', 'success');
      showTodoSection();
    } else {
      showToast(data.message || '登录失败', 'error');
    }
  } catch (err) {
    showToast('网络错误：' + err.message, 'error');
  } finally { toggleLoading(false); }
}

async function addTask() {
  const title = document.getElementById('new-task-title').value.trim();
  const description = document.getElementById('new-task-desc').value.trim();
  if (!title) return showToast('请输入任务标题', 'warning');
  try {
    toggleLoading(true);
    const res = await fetch(`${apiBase}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title, description })
    });
    if (res.ok) {
      document.getElementById('new-task-title').value = '';
      document.getElementById('new-task-desc').value = '';
      await loadTasks();
      showToast('已添加任务', 'success');
    } else {
      showToast('添加失败', 'error');
    }
  } catch (err) {
    showToast('网络错误：' + err.message, 'error');
  } finally { toggleLoading(false); }
}

async function toggleComplete(id, completed) {
  try {
    const res = await fetch(`${apiBase}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ completed: !completed })
    });
    if (!res.ok) {
      showToast('更新失败', 'error');
    }
  } catch (err) {
    showToast('网络错误：' + err.message, 'error');
  }
}

function openEditModal(id, title, desc) {
  currentEditId = id;
  document.getElementById('edit-title').value = title;
  document.getElementById('edit-desc').value = desc || '';
  if (editModal) editModal.show();
}

async function saveEdit() {
  const newTitle = document.getElementById('edit-title').value.trim();
  const newDesc = document.getElementById('edit-desc').value.trim();
  if (!newTitle) return showToast('标题不能为空', 'warning');
  try {
    toggleLoading(true);
    const res = await fetch(`${apiBase}/tasks/${currentEditId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title: newTitle, description: newDesc })
    });
    if (res.ok) {
      if (editModal) editModal.hide();
      await loadTasks();
      showToast('已更新任务', 'success');
    } else {
      showToast('编辑失败', 'error');
    }
  } catch (err) {
    showToast('网络错误：' + err.message, 'error');
  } finally { toggleLoading(false); }
}

function openDeleteModal(id) {
  currentDeleteId = id;
  if (deleteModal) deleteModal.show();
}

async function confirmDelete() {
  try {
    toggleLoading(true);
    const res = await fetch(`${apiBase}/tasks/${currentDeleteId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      if (deleteModal) deleteModal.hide();
      await loadTasks();
      showToast('已删除任务', 'success');
    } else {
      showToast('删除失败', 'error');
    }
  } catch (err) {
    showToast('网络错误：' + err.message, 'error');
  } finally { toggleLoading(false); }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  token = '';
  currentUser = null;
  document.getElementById('auth-section').style.display = 'block';
  document.getElementById('todo-section').style.display = 'none';
  document.getElementById('logoutBtn').classList.add('d-none');
  document.getElementById('user-info').classList.add('d-none');
}

function toggleLoading(show){
  const el = document.getElementById('loading');
  if (el) el.classList.toggle('d-none', !show);
}

async function loadTasks() {
  try {
    toggleLoading(true);
    const res = await fetch(`${apiBase}/tasks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) {
      logout();
      showToast('登录已过期，请重新登录', 'warning');
      return;
    }
    const data = await res.json();
    tasksCache = data.data || [];
    renderTasks();
  } catch (err) {
    showToast('加载失败：' + err.message, 'error');
  } finally { toggleLoading(false); }
}

function renderTasks(){
  const list = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');
  list.innerHTML = '';
  let filtered = tasksCache;
  if (currentFilter === 'active') filtered = filtered.filter(t => !t.completed);
  if (currentFilter === 'completed') filtered = filtered.filter(t => t.completed);
  if (searchKeyword) filtered = filtered.filter(t => `${t.title} ${t.description || ''}`.toLowerCase().includes(searchKeyword));
  document.getElementById('task-count').textContent = filtered.length ? `(${filtered.length})` : '';
  if (!filtered.length){
    empty.classList.remove('d-none');
    return;
  } else {
    empty.classList.add('d-none');
  }
  filtered.forEach(task => {
    const li = document.createElement('li');
    li.className = `list-group-item d-flex justify-content-between align-items-center ${task.completed ? 'completed' : ''}`;
    li.classList.add('item-enter');

    const left = document.createElement('div');
    left.className = 'd-flex align-items-center gap-3 flex-grow-1';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'form-check-input';
    checkbox.checked = task.completed;
    checkbox.onchange = () => toggleComplete(task.id, task.completed);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'ms-1';
    const titleDiv = document.createElement('div');
    titleDiv.className = 'fw-bold';
    titleDiv.textContent = task.title;
    const descDiv = document.createElement('div');
    descDiv.className = 'text-secondary small';
    descDiv.textContent = task.description || '';
    contentDiv.appendChild(titleDiv);
    contentDiv.appendChild(descDiv);

    left.appendChild(checkbox);
    left.appendChild(contentDiv);

    const actions = document.createElement('div');
    actions.className = 'btn-group btn-group-sm';
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-outline-secondary';
    editBtn.textContent = '编辑';
    editBtn.onclick = () => openEditModal(task.id, task.title, task.description);
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-outline-danger';
    delBtn.textContent = '删除';
    delBtn.onclick = () => openDeleteModal(task.id);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(left);
    li.appendChild(actions);

    list.appendChild(li);
  });
}

async function clearCompleted(){
  const completed = tasksCache.filter(t => t.completed);
  if (completed.length === 0) return showToast('没有已完成的任务', 'info');
  try {
    toggleLoading(true);
    await Promise.all(completed.map(t => fetch(`${apiBase}/tasks/${t.id}`, {
      method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
    })));
    await loadTasks();
    showToast('已清除完成项', 'success');
  } catch (e) {
    showToast('清除失败：' + e.message, 'error');
  } finally { toggleLoading(false); }
}