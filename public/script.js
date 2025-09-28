let token = localStorage.getItem('token') || '';
const apiBase = (() => {
  try {
    const origin = window.location.origin;
    const u = new URL(origin);
    // Trae 预览默认端口为 8001（纯静态），后端为 8000
    if (u.port === '8001') return 'http://localhost:8000/api';
    return `${origin}/api`;
  } catch (e) {
    return `${window.location.origin}/api`;
  }
})();
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let currentEditId = null;
let currentDeleteId = null;
let editModal = null;
let deleteModal = null;
let tasksCache = [];
let currentFilter = 'all';
let searchKeyword = '';
let shareCode = localStorage.getItem('shareCode') || '';
let listVersion = Number(localStorage.getItem('listVersion') || 0);
let onlyOwnerCanDelete = false;
let historyModal;
let socket; // Socket.IO client instance

// ensure toggleLoading exists once
if (typeof toggleLoading !== 'function') {
  function toggleLoading(loading) {
    try {
      const overlay = document.getElementById('loading');
      if (overlay) overlay.classList.toggle('d-none', !loading);
      document.body.style.cursor = loading ? 'wait' : 'default';
      document.querySelectorAll('#auth-section button, #todo-section button').forEach(btn => { btn.disabled = !!loading; });
    } catch (_) { /* noop */ }
  }
}

// global toast helper
function showToast(message, type = 'info') {
  try {
    const container = document.getElementById('toast-container');
    if (!container) { alert(message); return; }
    const toastEl = document.createElement('div');
    const bg = {
      success: 'bg-success text-white',
      error: 'bg-danger text-white',
      warning: 'bg-warning text-dark',
      info: 'bg-info text-dark'
    }[type] || 'bg-info text-dark';
    toastEl.className = `toast align-items-center border-0 ${bg}`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>`;
    container.appendChild(toastEl);
    if (window.bootstrap && typeof window.bootstrap.Toast === 'function') {
      const t = new bootstrap.Toast(toastEl, { delay: 3000 });
      toastEl.addEventListener('hidden.bs.toast', () => { try { toastEl.remove(); } catch(_){} });
      t.show();
    } else {
      // fallback: auto remove after 3s
      setTimeout(() => { try { toastEl.remove(); } catch(_){} }, 3000);
    }
  } catch(e) { console.warn('showToast error:', e); }
}

function initSocket(){
  try{
    if (typeof io !== 'function') return;
    if (socket && socket.connected) return;
    const ioUrl = window.location.origin;
    socket = io(ioUrl, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      if (shareCode) joinSocketRoom();
    });
    socket.on('disconnect', () => console.log('Socket disconnected'));
    socket.on('tasks:changed', (payload={}) => {
      // If event is for a shared list, only react when code matches current share
      if (payload.code && shareCode && payload.code !== shareCode) return;
      loadTasks();
    });
  } catch(e){ console.warn('Socket init failed:', e); }
}

function updateShareUI(){
  const status = document.getElementById('share-status');
  const permArea = document.getElementById('perm-area');
  const permToggle = document.getElementById('perm-only-owner');
  const btnCopy = document.getElementById('btn-copy-code');
  const btnLeave = document.getElementById('btn-leave');
  const btnJoin = document.getElementById('btn-join-share');
  const datalist = document.getElementById('share-codes');
  if (!status) return;
  // 维护最近使用的共享码历史（最多5个）
  try {
    const history = JSON.parse(localStorage.getItem('shareHistory')||'[]');
    const uniq = Array.from(new Set([shareCode, ...history].filter(Boolean))).slice(0,5);
    localStorage.setItem('shareHistory', JSON.stringify(uniq));
    if (datalist){
      datalist.innerHTML = '';
      uniq.forEach(code => {
        const opt = document.createElement('option');
        opt.value = code; datalist.appendChild(opt);
      });
    }
  } catch(_){}
  if (shareCode){
    status.classList.remove('d-none');
    status.innerHTML = `共享中 · 码 ${shareCode} <span class="version-badge ms-1">v${listVersion||1}</span>`;
    permArea.classList.remove('d-none');
    permToggle.checked = !!onlyOwnerCanDelete;
    permToggle.disabled = !(currentUser && currentUser.id && window.__sharedOwnerId === currentUser.id);
    // 显示复制与退出按钮
    btnCopy && btnCopy.classList.remove('d-none');
    btnLeave && btnLeave.classList.remove('d-none');
    btnJoin && (btnJoin.textContent = '切换共享');
  } else {
    status.textContent = '未共享';
    permArea.classList.add('d-none');
    btnCopy && btnCopy.classList.add('d-none');
    btnLeave && btnLeave.classList.add('d-none');
    btnJoin && (btnJoin.textContent = '加入共享');
  }
}

function joinSocketRoom(){
  if (!socket) return;
  socket.emit('join_list', { code: shareCode });
}
function leaveSocketRoom(){
  if (!socket) return;
  socket.emit('leave_list', { code: shareCode });
}

async function createShare(){
  try {
    const input = document.getElementById('share-code-input');
    const code = (input.value || '').trim();
    const res = await fetch(`${apiBase}/share/create`, { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ code: code || undefined }) });
    const data = await res.json();
    if (!res.ok){ return showToast(data.message || '创建失败', 'error'); }
    shareCode = data.data.code; listVersion = data.data.version || 1; onlyOwnerCanDelete = !!data.data.onlyOwnerCanDelete;
    localStorage.setItem('shareCode', shareCode); localStorage.setItem('listVersion', String(listVersion));
    window.__sharedOwnerId = data.data.ownerId || currentUser?.id;
    updateShareUI();
    joinSocketRoom();
    await loadTasks();
    showToast(`已创建共享：${shareCode}`, 'success');
  } catch(e){ showToast('创建失败：'+e.message, 'error'); }
}

async function joinShare(){
  try {
    const input = document.getElementById('share-code-input');
    const code = (input.value || '').trim();
    if (!code) return showToast('请输入共享码', 'warning');
    const res = await fetch(`${apiBase}/share/join`, { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ code }) });
    const data = await res.json();
    if (!res.ok){ return showToast(data.message || '加入失败', 'error'); }
    if (shareCode && shareCode !== code) leaveSocketRoom();
    shareCode = code; listVersion = data.data.version || 1; onlyOwnerCanDelete = !!data.data.onlyOwnerCanDelete;
    localStorage.setItem('shareCode', shareCode); localStorage.setItem('listVersion', String(listVersion));
    updateShareUI();
    joinSocketRoom();
    await loadTasks();
    showToast(`已加入共享：${shareCode}`, 'success');
  } catch(e){ showToast('加入失败：'+e.message, 'error'); }
}

async function refreshShare(){
  if (!shareCode) return loadTasks();
  try {
    const res = await fetch(`${apiBase}/share/status/${shareCode}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) return showToast(data.message || '刷新失败', 'error');
    listVersion = data.data.version || 1; onlyOwnerCanDelete = !!data.data.onlyOwnerCanDelete;
    localStorage.setItem('listVersion', String(listVersion));
    tasksCache = data.data.tasks || [];
    updateShareUI();
    renderTasks();
  } catch(e){ showToast('刷新失败：'+e.message, 'error'); }
}

async function openHistory(){
  if (!shareCode) return showToast('尚未在共享列表中', 'info');
  try{
    const res = await fetch(`${apiBase}/share/history/${shareCode}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) return showToast(data.message || '加载历史失败', 'error');
    const ul = document.getElementById('history-list');
    ul.innerHTML = '';
    (data.data || []).forEach(rec => {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      const ts = new Date(rec.createdAt || Date.now()).toLocaleString();
      li.textContent = `${ts} · v${rec.version} · ${rec.action} · task#${rec.taskId} · by ${rec.userId}`;
      ul.appendChild(li);
    });
    if (!historyModal && window.bootstrap) historyModal = new bootstrap.Modal(document.getElementById('historyModal'));
    historyModal && historyModal.show();
  } catch(e){ showToast('加载历史失败：'+e.message, 'error'); }
}

async function savePermissions(){
  if (!shareCode) return;
  const permToggle = document.getElementById('perm-only-owner');
  try{
    const res = await fetch(`${apiBase}/share/permissions`, { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ code: shareCode, onlyOwnerCanDelete: !!permToggle.checked }) });
    if (!res.ok) return showToast('更新权限失败', 'error');
    onlyOwnerCanDelete = !!permToggle.checked;
    showToast('权限已更新', 'success');
  } catch(e){ showToast('更新权限失败：'+e.message, 'error'); }
}

// Patch requests to include sharing headers when active
async function addTask() {
  const title = document.getElementById('new-task-title').value.trim();
  const description = document.getElementById('new-task-desc').value.trim();
  if (!title) return showToast('请输入任务标题', 'warning');
  try {
    toggleLoading(true);
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    if (shareCode){ headers['X-Share-Code'] = shareCode; headers['X-List-Version'] = String(listVersion||0); }
    const res = await fetch(`${apiBase}/tasks`, { method: 'POST', headers, body: JSON.stringify({ title, description }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      document.getElementById('new-task-title').value = '';
      document.getElementById('new-task-desc').value = '';
      if (data.meta && typeof data.meta.version === 'number'){ listVersion = data.meta.version; localStorage.setItem('listVersion', String(listVersion)); }
      await loadTasks();
      showToast('已添加任务', 'success');
    } else {
      showToast(data.message || '添加失败', 'error');
    }
  } catch (err) {
    showToast('网络错误：' + err.message, 'error');
  } finally { toggleLoading(false); }
}

async function toggleComplete(id, completed) {
  try {
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    if (shareCode){ headers['X-Share-Code'] = shareCode; headers['X-List-Version'] = String(listVersion||0); }
    const res = await fetch(`${apiBase}/tasks/${id}`, { method: 'PUT', headers, body: JSON.stringify({ completed: !completed }) });
    const data = await res.json().catch(()=>({}));
    if (!res.ok) { showToast(data.message || '更新失败', 'error'); }
    if (data.meta && typeof data.meta.version === 'number'){ listVersion = data.meta.version; localStorage.setItem('listVersion', String(listVersion)); updateShareUI(); }
  } catch (err) {
    showToast('网络错误：' + err.message, 'error');
  }
}

async function saveEdit() {
  const newTitle = document.getElementById('edit-title').value.trim();
  const newDesc = document.getElementById('edit-desc').value.trim();
  if (!newTitle) return showToast('标题不能为空', 'warning');
  try {
    toggleLoading(true);
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    if (shareCode){ headers['X-Share-Code'] = shareCode; headers['X-List-Version'] = String(listVersion||0); }
    const res = await fetch(`${apiBase}/tasks/${currentEditId}`, { method: 'PUT', headers, body: JSON.stringify({ title: newTitle, description: newDesc }) });
    const data = await res.json().catch(()=>({}));
    if (res.ok) {
      const btnEl = document.getElementById('saveEdit'); btnEl && btnEl.blur();
      if (editModal) editModal.hide();
      if (data.meta && typeof data.meta.version === 'number'){ listVersion = data.meta.version; localStorage.setItem('listVersion', String(listVersion)); }
      await loadTasks();
      showToast('已更新任务', 'success');
    } else {
      showToast(data.message || '编辑失败', 'error');
    }
  } catch (err) {
    showToast('网络错误：' + err.message, 'error');
  } finally { toggleLoading(false); }
}

function openEditModal(id, title, desc){
  try{
    currentEditId = id;
    const titleInput = document.getElementById('edit-title');
    const descInput = document.getElementById('edit-desc');
    if (titleInput) titleInput.value = title || '';
    if (descInput) descInput.value = desc || '';
    if (!editModal && window.bootstrap) {
      const el = document.getElementById('editModal');
      if (el) editModal = new bootstrap.Modal(el);
    }
    if (editModal) {
      editModal.show();
      // 聚焦标题，便于立即编辑
      setTimeout(() => { titleInput && titleInput.focus(); }, 50);
    }
  } catch (e){ console.error('openEditModal error:', e); }
}

// Robust app initialization to ensure event bindings work even if load has already fired
function initApp(){
  if (window.__appInitialized) return;
  window.__appInitialized = true;
  // Initialize socket first
  initSocket();
  // Initialize Bootstrap modals safely after bundle is loaded
  if (window.bootstrap && typeof window.bootstrap.Modal === 'function') {
    editModal = new bootstrap.Modal(document.getElementById('editModal'));
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
  } else {
    console.warn('Bootstrap not available at init time.');
  }

  if (token) {
    showTodoSection();
  }
  const saveEditBtn = document.getElementById('saveEdit');
  const confirmDeleteBtn = document.getElementById('confirmDelete');
  saveEditBtn && saveEditBtn.addEventListener('click', saveEdit);
  confirmDeleteBtn && confirmDeleteBtn.addEventListener('click', confirmDelete);
  const filterAllBtn = document.getElementById('filter-all');
  const filterActiveBtn = document.getElementById('filter-active');
  const filterCompletedBtn = document.getElementById('filter-completed');
  filterAllBtn && filterAllBtn.addEventListener('click', () => setFilter('all'));
  filterActiveBtn && filterActiveBtn.addEventListener('click', () => setFilter('active'));
  filterCompletedBtn && filterCompletedBtn.addEventListener('click', () => setFilter('completed'));
  const searchInput = document.getElementById('search-input');
  searchInput && searchInput.addEventListener('input', (e) => { searchKeyword = e.target.value.trim().toLowerCase(); renderTasks(); });
  const clearCompletedBtn = document.getElementById('clear-completed');
  clearCompletedBtn && clearCompletedBtn.addEventListener('click', clearCompleted);
  const titleInput = document.getElementById('new-task-title');
  const descInput = document.getElementById('new-task-desc');
  titleInput && titleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
  descInput && descInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
  // bind share ui
  const btnCreate = document.getElementById('btn-create-share');
  const btnJoin = document.getElementById('btn-join-share');
  const btnRefresh = document.getElementById('btn-refresh');
  const btnHistory = document.getElementById('btn-history');
  const permToggle = document.getElementById('perm-only-owner');
  const btnCopy = document.getElementById('btn-copy-code');
  const btnLeave = document.getElementById('btn-leave');
  btnCreate && btnCreate.addEventListener('click', createShare);
  btnJoin && btnJoin.addEventListener('click', joinShare);
  btnRefresh && btnRefresh.addEventListener('click', refreshShare);
  btnHistory && btnHistory.addEventListener('click', openHistory);
  permToggle && permToggle.addEventListener('change', savePermissions);
  btnCopy && btnCopy.addEventListener('click', copyShareCode);
  btnLeave && btnLeave.addEventListener('click', leaveShare);

  // restore share state
  if (shareCode){ joinSocketRoom(); updateShareUI(); }
}

// Initialize using multiple strategies to avoid missing the load event
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(initApp, 0);
} else {
  document.addEventListener('DOMContentLoaded', initApp);
  window.addEventListener('load', initApp);
}

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('[id^="filter-"]').forEach(btn => btn.classList.remove('active'));
  const btn = document.getElementById(`filter-${f}`);
  if (btn) btn.classList.add('active');
  renderTasks();
}

function openDeleteModal(id) {
  currentDeleteId = id;
  if (!deleteModal && window.bootstrap) deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
  deleteModal && deleteModal.show();
}

async function confirmDelete() {
  try {
    toggleLoading(true);
    const headers = { 'Authorization': `Bearer ${token}` };
    if (shareCode){ headers['X-Share-Code'] = shareCode; headers['X-List-Version'] = String(listVersion||0); }
    const res = await fetch(`${apiBase}/tasks/${currentDeleteId}`, { method: 'DELETE', headers });
    const data = await res.json().catch(()=>({}));
    if (res.ok) {
      const btnEl = document.getElementById('confirmDelete'); btnEl && btnEl.blur();
      if (deleteModal) deleteModal.hide();
      if (data.meta && typeof data.meta.version === 'number'){ listVersion = data.meta.version; localStorage.setItem('listVersion', String(listVersion)); updateShareUI(); }
      await loadTasks();
      showToast('已删除任务', 'success');
    } else {
      showToast(data.message || '删除失败', 'error');
    }
  } catch (err) {
    showToast('网络错误：' + err.message, 'error');
  } finally { toggleLoading(false); }
}

async function loadTasks() {
  try {
    toggleLoading(true);
    const headers = { 'Authorization': `Bearer ${token}` };
    if (shareCode){ headers['X-Share-Code'] = shareCode; }
    const res = await fetch(`${apiBase}/tasks`, { headers });
    if (res.status === 401) {
      logout();
      showToast('登录已过期，请重新登录', 'warning');
      return;
    }
    const data = await res.json();
    if (res.ok){
      tasksCache = data.data || [];
      if (data.meta && typeof data.meta.version === 'number'){
        listVersion = data.meta.version;
        localStorage.setItem('listVersion', String(listVersion));
        onlyOwnerCanDelete = !!data.meta.onlyOwnerCanDelete;
        window.__sharedOwnerId = data.meta.ownerId;
      }
      updateShareUI();
      renderTasks();
    } else {
      showToast(data.message || '加载失败', 'error');
    }
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
  if (!filtered.length){ empty.classList.remove('d-none'); return; } else { empty.classList.add('d-none'); }
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

    if (shareCode && onlyOwnerCanDelete && currentUser && window.__sharedOwnerId && currentUser.id !== window.__sharedOwnerId){
      delBtn.disabled = true; delBtn.title = '仅创建者可删除';
    }

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
    const headers = { 'Authorization': `Bearer ${token}` };
    if (shareCode){ headers['X-Share-Code'] = shareCode; headers['X-List-Version'] = String(listVersion||0); }
    await Promise.all(completed.map(t => fetch(`${apiBase}/tasks/${t.id}`, { method: 'DELETE', headers })));
    await loadTasks();
    showToast('已清除完成项', 'success');
  } catch (e) {
    showToast('清除失败：' + e.message, 'error');
  } finally { toggleLoading(false); }
}



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
  // default refresh after showing todo section (falls back to loadTasks when not in share)
  refreshShare();
}

function updateUserUI(user){
  const badge = document.getElementById('user-info');
  if (!badge) return;
  badge.textContent = `${user.username || user.email || '用户'}`;
  badge.classList.remove('d-none');
}

// New: global logout
function logout(){
  try {
    if (shareCode) leaveSocketRoom();
  } catch(_){}
  token = '';
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  shareCode = '';
  listVersion = 0;
  onlyOwnerCanDelete = false;
  localStorage.removeItem('shareCode');
  localStorage.removeItem('listVersion');
  tasksCache = [];
  try { updateShareUI(); } catch(_){}
  try {
    const badge = document.getElementById('user-info');
    if (badge){ badge.textContent = ''; badge.classList.add('d-none'); }
  } catch(_){}
  try { renderTasks && renderTasks(); } catch(_){}
  document.getElementById('todo-section').style.display = 'none';
  document.getElementById('auth-section').style.display = 'block';
  document.getElementById('logoutBtn').classList.add('d-none');
  showToast && showToast('已退出登录', 'info');
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
  const authShareInput = document.getElementById('auth-share-code');
  const authShareCode = (authShareInput && authShareInput.value || '').trim();
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
      // 如果登录页填写了共享码，自动加入对应共享
      if (authShareCode) {
        const shareInput = document.getElementById('share-code-input');
        if (shareInput) shareInput.value = authShareCode;
        try { await joinShare(); } catch(e){ console.warn('auto join share failed:', e); }
      } else {
        // 否则默认刷新（非共享列表将回退到加载个人任务）
        try { await refreshShare(); } catch(e){ console.warn('auto refresh after login failed:', e); }
      }
    } else {
      showToast(data.message || '登录失败', 'error');
    }
  } catch (err) {
    showToast('网络错误：' + err.message, 'error');
  } finally { toggleLoading(false); }
}

async function addTaskLegacy() {
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

async function toggleCompleteLegacy(id, completed) {
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

async function saveEditLegacy() {
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
      showToast(data.message || '编辑失败', 'error');
    }
  } catch (err) {
    showToast('网络错误：' + err.message, 'error');
  } finally { toggleLoading(false); }
}

// Rename legacy duplicate to avoid overriding primary implementation
function openDeleteModalLegacy(id) {
  currentDeleteId = id;
  if (!deleteModal && window.bootstrap) deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
  deleteModal && deleteModal.show();
}

async function confirmDeleteLegacy() {
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
      showToast(data.message || '删除失败', 'error');
    }
  } catch (err) {
    showToast('网络错误：' + err.message, 'error');
  } finally { toggleLoading(false); }
}

async function loadTasksLegacy() {
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

function renderTasksLegacy(){
  const list = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');
  list.innerHTML = '';
  let filtered = tasksCache;
  if (currentFilter === 'active') filtered = filtered.filter(t => !t.completed);
  if (currentFilter === 'completed') filtered = filtered.filter(t => t.completed);
  if (searchKeyword) filtered = filtered.filter(t => `${t.title} ${t.description || ''}`.toLowerCase().includes(searchKeyword));
  document.getElementById('task-count').textContent = filtered.length ? `(${filtered.length})` : '';
  if (!filtered.length){ empty.classList.remove('d-none'); return; } else { empty.classList.add('d-none'); }
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
    checkbox.onchange = () => toggleCompleteLegacy(task.id, task.completed);

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

    if (shareCode && onlyOwnerCanDelete && currentUser && window.__sharedOwnerId && currentUser.id !== window.__sharedOwnerId){
      delBtn.disabled = true; delBtn.title = '仅创建者可删除';
    }

    li.appendChild(left);
    li.appendChild(actions);

    list.appendChild(li);
  });
}

async function clearCompletedLegacy(){
  const completed = tasksCache.filter(t => t.completed);
  if (completed.length === 0) return showToast('没有已完成的任务', 'info');
  try {
    toggleLoading(true);
    const headers = { 'Authorization': `Bearer ${token}` };
    if (shareCode){ headers['X-Share-Code'] = shareCode; headers['X-List-Version'] = String(listVersion||0); }
    await Promise.all(completed.map(t => fetch(`${apiBase}/tasks/${t.id}`, { method: 'DELETE', headers })));
    await loadTasks();
    showToast('已清除完成项', 'success');
  } catch (e) {
    showToast('清除失败：' + e.message, 'error');
  } finally { toggleLoading(false); }
}

function copyShareCode(){
  if (!shareCode) return showToast('尚未在共享列表中', 'info');
  try {
    navigator.clipboard.writeText(shareCode).then(() => {
      showToast('共享码已复制', 'success');
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = shareCode; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); showToast('共享码已复制', 'success'); } catch(e){ showToast('复制失败：'+e.message, 'error'); }
      finally { try { ta.remove(); } catch(_){} }
    });
  } catch(e){ showToast('复制失败：'+e.message, 'error'); }
}

function leaveShare(){
  try{
    if (shareCode) { try{ leaveSocketRoom(); } catch(_){} }
    shareCode = '';
    listVersion = 0;
    onlyOwnerCanDelete = false;
    window.__sharedOwnerId = undefined;
    localStorage.removeItem('shareCode');
    localStorage.removeItem('listVersion');
    updateShareUI();
    loadTasks();
    showToast('已退出当前共享', 'success');
  } catch(e){ showToast('退出失败：'+e.message, 'error'); }
}