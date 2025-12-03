/* Mini CRM — Opción B (interfaz moderna)
   Funcionalidades:
   - Clientes CRUD (agregar, editar, eliminar)
   - Proyectos CRUD ligados a cliente
   - Filtros, buscador, export/import JSON
   - Dashboard con métricas: ventas ganadas, probables, activos, ticket promedio, conversión, comisión estimada
   - LocalStorage como persistencia
*/

/* ---------- Utilities ---------- */
const $ = (id) => document.getElementById(id);
const clamp = (n, min=0) => isNaN(n)?0: Math.max(min, Number(n));

/* ---------- Storage keys ---------- */
const KEY_CLIENTS = 'crm_clients_v2';
const KEY_PROJECTS = 'crm_projects_v2';

/* ---------- State ---------- */
let clients = JSON.parse(localStorage.getItem(KEY_CLIENTS) || '[]');
let projects = JSON.parse(localStorage.getItem(KEY_PROJECTS) || '[]');

/* ---------- DOM refs ---------- */
const searchInput = $('searchInput');
const filterClient = $('filterClient');
const filterStatus = $('filterStatus');
const viewMode = $('viewMode');

const clientsTableBody = $('clientsTable').querySelector('tbody');
const projectsTableBody = $('projectsTable').querySelector('tbody');
const dashboardCards = $('dashboardCards');

const openAddClientBtn = $('openAddClient');
const openAddProjectBtn = $('openAddProject');

const modalBackdrop = $('modalBackdrop');
const modalClient = $('modalClient');
const clientForm = $('clientForm');
const clientNameInput = $('clientName');
const clientTypeInput = $('clientType');
const cancelClientBtn = $('cancelClient');

const modalProject = $('modalProject');
const projectForm = $('projectForm');
const projectClientSelect = $('projectClientSelect');
const projectNameInput = $('projectNameInput');
const projectMontoInput = $('projectMontoInput');
const projectPosInput = $('projectPosInput');
const projectStatusSelect = $('projectStatusSelect');
const projectProbInput = $('projectProbInput');
const cancelProjectBtn = $('cancelProject');

const exportClientsBtn = $('exportClients');
const importClientsBtn = $('importClientsBtn');
const importClientsFile = $('importClientsFile');
const exportProjectsBtn = $('exportProjects');
const importProjectsBtn = $('importProjectsBtn');
const importProjectsFile = $('importProjectsFile');

/* ---------- Modal helpers ---------- */
function showModal(modal){
  modalBackdrop.classList.remove('hidden');
  modal.classList.remove('hidden');
}
function hideModal(modal){
  modalBackdrop.classList.add('hidden');
  modal.classList.add('hidden');
}
/* close on backdrop */
modalBackdrop.addEventListener('click', ()=>{
  hideModal(modalClient); hideModal(modalProject);
});

/* ---------- Persistence ---------- */
function saveClients(){
  localStorage.setItem(KEY_CLIENTS, JSON.stringify(clients));
}
function saveProjects(){
  localStorage.setItem(KEY_PROJECTS, JSON.stringify(projects));
}

/* ---------- Rendering ---------- */
function renderClientFilterOptions(){
  filterClient.innerHTML = '<option value="">Todos los clientes</option>';
  projectClientSelect.innerHTML = '<option value="">Selecciona un cliente</option>';
  clients.forEach(c=>{
    const opt = `<option value="${c.id}">${c.nombre}</option>`;
    filterClient.insertAdjacentHTML('beforeend', opt);
    projectClientSelect.insertAdjacentHTML('beforeend', opt);
  });
}

function renderClientsTable(filteredClients){
  clientsTableBody.innerHTML = '';
  (filteredClients || clients).forEach(c=>{
    const count = projects.filter(p => p.clienteId === c.id).length;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(c.nombre)}</td>
      <td>${c.tipo}</td>
      <td>${count}</td>
      <td>
        <button class="action-btn action-edit" data-id="${c.id}" data-type="edit-client">Editar</button>
        <button class="action-btn action-delete" data-id="${c.id}" data-type="del-client">Eliminar</button>
      </td>
    `;
    clientsTableBody.appendChild(row);
  });
}

function renderProjectsTable(filteredProjects){
  projectsTableBody.innerHTML = '';
  (filteredProjects || projects).forEach(p=>{
    const cliente = clients.find(c=>c.id===p.clienteId) || {nombre:'Sin cliente', tipo:'1'};
    const commission = (cliente.tipo==='1') ? (p.monto * 0.01) : (p.monto * 0.015);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(p.nombre)}</td>
      <td>${escapeHtml(cliente.nombre)}</td>
      <td>$${Number(p.monto).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
      <td>${p.estatus}</td>
      <td>${p.probabilidad}%</td>
      <td>$${commission.toFixed(2)}</td>
      <td>
        <button class="action-btn action-edit" data-id="${p.id}" data-type="edit-project">Editar</button>
        <button class="action-btn action-delete" data-id="${p.id}" data-type="del-project">Eliminar</button>
      </td>
    `;
    projectsTableBody.appendChild(row);
  });
}

function renderDashboardCards(){
  const ventasTotales = projects
    .filter(p => p.estatus==='ganado' || p.estatus==='cerrado')
    .reduce((s,p)=> s + Number(p.monto || 0), 0);

  const montoProbable = projects
    .filter(p => p.estatus==='proceso' || p.estatus==='negociacion')
    .reduce((s,p)=> s + ((Number(p.monto||0) * Number(p.probabilidad||0))/100), 0);

  const montoActivo = projects
    .filter(p => p.estatus==='activo')
    .reduce((s,p)=> s + Number(p.monto||0), 0);

  const ticketPromedio = projects.length ? (projects.reduce((s,p)=> s + Number(p.monto||0),0)/projects.length) : 0;

  const totalProjects = projects.length;
  const won = projects.filter(p => p.estatus==='ganado' || p.estatus==='cerrado').length;
  const porcentajeConversion = totalProjects ? (won / totalProjects) * 100 : 0;

  // comisión estimada sobre proyectos activos
  const comisionEstim = projects.reduce((acc,p)=>{
    const cliente = clients.find(c=>c.id===p.clienteId);
    if(!cliente) return acc;
    const pct = cliente.tipo==='1' ? 0.01 : 0.015;
    return acc + (Number(p.monto||0) * pct);
  },0);

  dashboardCards.innerHTML = '';
  const cards = [
    {title:'Total Ventas (ganadas)', value:`$${ventasTotales.toLocaleString(undefined,{minimumFractionDigits:2})}`},
    {title:'Monto Probable', value:`$${montoProbable.toLocaleString(undefined,{minimumFractionDigits:2})}`},
    {title:'Monto Activo', value:`$${montoActivo.toLocaleString(undefined,{minimumFractionDigits:2})}`},
    {title:'Ticket Promedio', value:`$${ticketPromedio.toFixed(2)}`},
    {title:'Conversión', value:`${porcentajeConversion.toFixed(1)}%`},
    {title:'Comisión estimada (act.)', value:`$${comisionEstim.toFixed(2)}`}
  ];

  cards.forEach(c=>{
    const el = document.createElement('div');
    el.className = 'card kpi';
    el.innerHTML = `<p class="card-title">${c.title}</p><div class="card-value">${c.value}</div>`;
    dashboardCards.appendChild(el);
  });
}

/* ---------- Helpers ---------- */
function escapeHtml(str=''){
  return String(str).replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* ---------- CRUD Actions ---------- */
/* Add client */
clientForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const name = clientNameInput.value.trim();
  const tipo = clientTypeInput.value;
  if(!name) return alert('Nombre requerido');
  const newClient = { id: 'c'+Date.now(), nombre: name, tipo };
  clients.push(newClient);
  saveClients();
  renderAll();
  hideModal(modalClient);
});

/* Edit / Delete via event delegation (clients table) */
clientsTableBody.addEventListener('click', (e)=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const id = btn.dataset.id;
  const type = btn.dataset.type;
  if(type==='edit-client'){
    openEditClient(id);
  } else if(type==='del-client'){
    if(confirm('Eliminar cliente y todos sus proyectos?')){
      // remove projects related
      projects = projects.filter(p => p.clienteId !== id);
      clients = clients.filter(c => c.id !== id);
      saveProjects(); saveClients();
      renderAll();
    }
  }
});

/* Edit / Delete via event delegation (projects table) */
projectsTableBody.addEventListener('click', (e)=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const id = btn.dataset.id;
  const type = btn.dataset.type;
  if(type==='edit-project'){
    openEditProject(id);
  } else if(type==='del-project'){
    if(confirm('Eliminar proyecto?')){
      projects = projects.filter(p => p.id !== id);
      saveProjects();
      renderAll();
    }
  }
});

/* Add project */
projectForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const clienteId = projectClientSelect.value;
  const nombre = projectNameInput.value.trim();
  const monto = clamp(parseFloat(projectMontoInput.value));
  const posiciones = clamp(parseInt(projectPosInput.value||0,10));
  const estatus = projectStatusSelect.value;
  const probabilidad = clamp(parseFloat(projectProbInput.value||0),0);

  if(!clienteId || !nombre) return alert('Cliente y nombre requeridos');
  const newProject = {
    id:'p'+Date.now(),
    clienteId,
    nombre,
    monto,
    posiciones,
    estatus,
    probabilidad,
    createdAt: new Date().toISOString()
  };
  projects.push(newProject);
  saveProjects();
  renderAll();
  hideModal(modalProject);
});

/* ---------- Edit helpers (open edit modals) ---------- */
function openEditClient(id){
  const client = clients.find(c=>c.id===id);
  if(!client) return;
  clientNameInput.value = client.nombre;
  clientTypeInput.value = client.tipo;
  $('modalClientTitle').innerText = 'Editar Cliente';
  showModal(modalClient);

  // change submit handler temporarily
  const handler = function(e){
    e.preventDefault();
    client.nombre = clientNameInput.value.trim();
    client.tipo = clientTypeInput.value;
    saveClients();
    renderAll();
    hideModal(modalClient);
    clientForm.removeEventListener('submit', handler);
    clientForm.addEventListener('submit', clientSubmitBackup);
    $('modalClientTitle').innerText = 'Agregar Cliente';
  };

  // backup original and replace
  const clientSubmitBackup = clientForm._backup || null;
  if(!clientForm._backup){
    // create backup wrapper
    function backup(e){ e.preventDefault(); const name = clientNameInput.value.trim(); const tipo = clientTypeInput.value; if(!name) return alert('Nombre requerido'); const newClient = { id: 'c'+Date.now(), nombre: name, tipo }; clients.push(newClient); saveClients(); renderAll(); hideModal(modalClient); }
    clientForm._backup = backup;
    clientForm.removeEventListener('submit', backup);
    clientForm.addEventListener('submit', handler);
  } else {
    // remove existing and set new
    clientForm.removeEventListener('submit', clientForm._backup);
    clientForm.addEventListener('submit', handler);
  }
}

function openEditProject(id){
  const project = projects.find(p=>p.id===id);
  if(!project) return;

  projectClientSelect.value = project.clienteId;
  projectNameInput.value = project.nombre;
  projectMontoInput.value = project.monto;
  projectPosInput.value = project.posiciones;
  projectStatusSelect.value = project.estatus;
  projectProbInput.value = project.probabilidad;

  $('modalProjectTitle').innerText = 'Editar Proyecto';
  showModal(modalProject);

  // create edit handler
  const handler = function(e){
    e.preventDefault();
    project.clienteId = projectClientSelect.value;
    project.nombre = projectNameInput.value.trim();
    project.monto = clamp(parseFloat(projectMontoInput.value));
    project.posiciones = clamp(parseInt(projectPosInput.value||0,10));
    project.estatus = projectStatusSelect.value;
    project.probabilidad = clamp(parseFloat(projectProbInput.value||0),0);
    project.updatedAt = new Date().toISOString();
    saveProjects();
    renderAll();
    hideModal(modalProject);
    projectForm.removeEventListener('submit', handler);
    projectForm.addEventListener('submit', projectSubmitBackup);
    $('modalProjectTitle').innerText = 'Agregar Proyecto';
  };

  // backup original if not done
  if(!projectForm._backup){
    function backup(e){ e.preventDefault(); const clienteId = projectClientSelect.value; const nombre = projectNameInput.value.trim(); const monto = clamp(parseFloat(projectMontoInput.value)); if(!clienteId||!nombre) return alert('Cliente y nombre requeridos'); const n = { id:'p'+Date.now(), clienteId, nombre, monto, posiciones:clamp(parseInt(projectPosInput.value||0,10)), estatus:projectStatusSelect.value, probabilidad:clamp(parseFloat(projectProbInput.value||0),0), createdAt:new Date().toISOString() }; projects.push(n); saveProjects(); renderAll(); hideModal(modalProject); }
    projectForm._backup = backup;
    projectForm.removeEventListener('submit', backup);
    projectForm.addEventListener('submit', handler);
  } else {
    projectForm.removeEventListener('submit', projectForm._backup);
    projectForm.addEventListener('submit', handler);
  }
}

/* ---------- Search & Filters ---------- */
function applyFiltersAndSearch(){
  const q = searchInput.value.trim().toLowerCase();
  const clientFilter = filterClient.value;
  const statusFilter = filterStatus.value;
  const mode = viewMode.value;

  // filter clients
  const filteredClients = clients.filter(c=>{
    if(clientFilter && c.id !== clientFilter) return false;
    if(q){
      return c.nombre.toLowerCase().includes(q);
    }
    return true;
  });

  // filter projects
  const filteredProjects = projects.filter(p=>{
    if(clientFilter && p.clienteId !== clientFilter) return false;
    if(statusFilter && p.estatus !== statusFilter) return false;
    if(q){
      const cliente = clients.find(c=>c.id===p.clienteId) || {nombre:''};
      const hay = (p.nombre + ' ' + cliente.nombre).toLowerCase().includes(q);
      return hay;
    }
    return true;
  });

  // view mode
  if(mode==='clients'){
    $('clientsPanel').style.display = ''; $('projectsPanel').style.display = 'none';
  } else if(mode==='projects'){
    $('clientsPanel').style.display = 'none'; $('projectsPanel').style.display = '';
  } else {
    $('clientsPanel').style.display = ''; $('projectsPanel').style.display = '';
  }

  renderClientFilterOptions();
  renderClientsTable(filteredClients);
  renderProjectsTable(filteredProjects);
  renderDashboardCards();
}

/* ---------- Export / Import ---------- */
exportClientsBtn.addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(clients, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'clients.json'; a.click(); URL.revokeObjectURL(url);
});
importClientsBtn.addEventListener('click', ()=> importClientsFile.click());
importClientsFile.addEventListener('change', (ev)=>{
  const file = ev.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=> {
    try{
      const data = JSON.parse(reader.result);
      if(Array.isArray(data)){
        clients = data.map(c=> ({...c, id: c.id || 'c'+Date.now()+Math.random()}));
        saveClients(); renderAll();
        alert('Clientes importados');
      } else alert('Archivo inválido');
    }catch(err){ alert('Error importando'); }
  };
  reader.readAsText(file);
  ev.target.value='';
});

exportProjectsBtn.addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(projects, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'projects.json'; a.click(); URL.revokeObjectURL(url);
});
importProjectsBtn.addEventListener('click', ()=> importProjectsFile.click());
importProjectsFile.addEventListener('change', (ev)=>{
  const file = ev.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=> {
    try{
      const data = JSON.parse(reader.result);
      if(Array.isArray(data)){
        projects = data.map(p=> ({...p, id: p.id || 'p'+Date.now()+Math.random()}));
        saveProjects(); renderAll();
        alert('Proyectos importados');
      } else alert('Archivo inválido');
    }catch(err){ alert('Error importando'); }
  };
  reader.readAsText(file);
  ev.target.value='';
});

/* ---------- UI Events ---------- */
openAddClientBtn.addEventListener('click', ()=>{
  clientNameInput.value = '';
  clientTypeInput.value = '1';
  $('modalClientTitle').innerText = 'Agregar Cliente';
  // ensure original submit is restored
  if(clientForm._backup) { clientForm.removeEventListener('submit', clientForm._backup); clientForm._backup=null; }
  // attach backup basic submit
  function basicSubmit(e){ e.preventDefault(); const name = clientNameInput.value.trim(); const tipo = clientTypeInput.value; if(!name) return alert('Nombre requerido'); const newClient = { id:'c'+Date.now(), nombre:name, tipo }; clients.push(newClient); saveClients(); renderAll(); hideModal(modalClient); clientForm.removeEventListener('submit', basicSubmit); clientForm._backup=null; }
  clientForm._backup = basicSubmit;
  clientForm.addEventListener('submit', basicSubmit);
  showModal(modalClient);
});
cancelClientBtn.addEventListener('click', ()=> hideModal(modalClient));

openAddProjectBtn.addEventListener('click', ()=>{
  projectClientSelect.value = '';
  projectNameInput.value = '';
  projectMontoInput.value = '';
  projectPosInput.value = '';
  projectStatusSelect.value = 'activo';
  projectProbInput.value = '100';
  $('modalProjectTitle').innerText = 'Agregar Proyecto';
  if(projectForm._backup) { projectForm.removeEventListener('submit', projectForm._backup); projectForm._backup=null; }
  function basicSubmit(e){ e.preventDefault(); const clienteId = projectClientSelect.value; const nombre = projectNameInput.value.trim(); const monto = clamp(parseFloat(projectMontoInput.value)); if(!clienteId || !nombre) return alert('Cliente y nombre requeridos'); const n = { id:'p'+Date.now(), clienteId, nombre, monto, posiciones:clamp(parseInt(projectPosInput.value||0,10)), estatus:projectStatusSelect.value, probabilidad:clamp(parseFloat(projectProbInput.value||0),0), createdAt:new Date().toISOString() }; projects.push(n); saveProjects(); renderAll(); hideModal(modalProject); projectForm.removeEventListener('submit', basicSubmit); projectForm._backup=null; }
  projectForm._backup = basicSubmit;
  projectForm.addEventListener('submit', basicSubmit);
  showModal(modalProject);
});
cancelProjectBtn.addEventListener('click', ()=> hideModal(modalProject));

$('filterClient').addEventListener('change', applyFiltersAndSearch);
$('filterStatus').addEventListener('change', applyFiltersAndSearch);
$('viewMode').addEventListener('change', applyFiltersAndSearch);
searchInput.addEventListener('input', ()=> { debounceApply(); });

/* ---------- Debounce ---------- */
let debounceTimer;
function debounceApply(){ clearTimeout(debounceTimer); debounceTimer = setTimeout(()=> applyFiltersAndSearch(), 250); }

/* ---------- Render all ---------- */
function renderAll(){
  renderClientFilterOptions();
  applyFiltersAndSearch();
  renderDashboardCards();
}

/* ---------- Initial render ---------- */
renderAll();

/* ---------- On load, ensure panels visible per viewMode ---------- */
applyFiltersAndSearch();

/* ---------- End of file ---------- */
