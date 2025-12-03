/* js-app.js
   Versión unificada:
   - keys: crm_clients_v3, crm_projects_v3
   - clientes (id,nombre,tipo)
   - proyectos (id,clientId,nombre,amount,estatus,probabilidad,comments,pdf,createdAt)
   - comisiones automáticas: tipo1=1%, tipo2=1.5%
   - selección cliente -> muestra proyectos ligados
   - KPIs y charts (Chart.js)
   - export Excel (XLSX multi-sheet)
*/

const KEY_CLIENTS = 'crm_clients_v3';
const KEY_PROJECTS = 'crm_projects_v3';

/* ---------- state ---------- */
let clients = JSON.parse(localStorage.getItem(KEY_CLIENTS) || '[]');
let projects = JSON.parse(localStorage.getItem(KEY_PROJECTS) || '[]');
let selectedClientId = null;

/* ---------- DOM refs ---------- */
const clientListEl = document.getElementById('clientList');
const clientSearchEl = document.getElementById('clientSearch');
const clientTypeFilter = document.getElementById('clientTypeFilter');
const btnAddClient = document.getElementById('btnAddClient');

const projectsContainer = document.getElementById('projectsContainer');
const projectsTitle = document.getElementById('projectsTitle');
const selectedClientInfo = document.getElementById('selectedClientInfo');

const btnAddProject = document.getElementById('btnAddProject');
const projectFormCard = document.getElementById('projectFormCard');
const projectForm = document.getElementById('projectForm');
const projectClientSelect = document.getElementById('projectClientSelect');
const projectNameEl = document.getElementById('projectName');
const projectAmountEl = document.getElementById('projectAmount');
const projectStatusEl = document.getElementById('projectStatus');
const projectProbEl = document.getElementById('projectProb');
const projectCommentsEl = document.getElementById('projectComments');
const projectPDFEl = document.getElementById('projectPDF');
const cancelProjectBtn = document.getElementById('cancelProjectBtn');

const filterStatusEl = document.getElementById('filterStatus');
const projectSearchEl = document.getElementById('projectSearch');
const globalSearchEl = document.getElementById('globalSearch');

const kpiActive = document.getElementById('kpi_active');
const kpiProbable = document.getElementById('kpi_probable');
const kpiWon = document.getElementById('kpi_won');
const kpiTicket = document.getElementById('kpi_ticket');
const kpiConversion = document.getElementById('kpi_conversion');
const kpiClose = document.getElementById('kpi_close');

const topQuickKPIs = document.getElementById('topQuickKPIs');

const exportAllBtn = document.getElementById('exportAllBtn');
const exportClientBtn = document.getElementById('exportClientBtn');

/* charts */
let chartStatus = null;
let chartByClient = null;

/* ---------- helpers ---------- */
function saveClients(){ localStorage.setItem(KEY_CLIENTS, JSON.stringify(clients)); dispatchStorageEvent(); }
function saveProjects(){ localStorage.setItem(KEY_PROJECTS, JSON.stringify(projects)); dispatchStorageEvent(); }
function dispatchStorageEvent(){ window.dispatchEvent(new Event('storage')); }
function uid(prefix='id'){ return prefix + Date.now() + Math.floor(Math.random()*999); }
function money(v){ return Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }
function commissionFor(project){
  const client = clients.find(c=>c.id===project.clientId);
  const pct = client && client.tipo === '2' ? 0.015 : 0.01;
  return Number(project.amount||0) * pct;
}

/* ---------- render clients ---------- */
function renderClients(filterText='', typeFilter=''){
  clientListEl.innerHTML = '';
  const filtered = clients.filter(c=>{
    if(typeFilter && c.tipo !== typeFilter) return false;
    if(filterText && !c.nombre.toLowerCase().includes(filterText.toLowerCase())) return false;
    return true;
  });

  filtered.forEach(c=>{
    const div = document.createElement('div');
    div.className = 'client-card' + (selectedClientId===c.id ? ' selected':'');
    div.innerHTML = `
      <div>
        <div style="font-weight:700">${escapeHtml(c.nombre)}</div>
        <div class="small muted">Tipo ${c.tipo} · ${projects.filter(p=>p.clientId===c.id).length} proyectos</div>
      </div>
      <div>
        <button class="btn btn-outline small" data-action="edit-client" data-id="${c.id}">Editar</button>
        <button class="btn btn-ghost small" data-action="del-client" data-id="${c.id}">Eliminar</button>
      </div>
    `;
    div.addEventListener('click', (ev)=>{
      // avoid selecting when clicking buttons inside
      if(ev.target && (ev.target.tagName==='BUTTON' || ev.target.closest('button'))) return;
      selectClient(c.id);
    });
    // buttons
    div.querySelectorAll('button').forEach(btn=>{
      btn.addEventListener('click',(e)=>{
        e.stopPropagation();
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if(action==='edit-client') openEditClient(id);
        if(action==='del-client') removeClient(id);
      });
    });

    clientListEl.appendChild(div);
  });

  // update project client select
  renderProjectClientOptions();
  renderTopQuickKPIs();
}

/* ---------- select client ---------- */
function selectClient(id){
  selectedClientId = id;
  const client = clients.find(c=>c.id===id);
  if(!client){ selectedClientId = null; selectedClientInfo.innerText = 'Seleccione un cliente a la izquierda'; projectsTitle.innerText = 'Proyectos'; }
  else {
    selectedClientInfo.innerText = `${client.nombre} · Tipo ${client.tipo}`;
    projectsTitle.innerText = `Proyectos — ${client.nombre}`;
  }
  // re-render
  renderClients(clientSearchEl.value, clientTypeFilter.value);
  applyProjectFilters();
}

/* ---------- add/edit/delete client ---------- */
function openEditClient(id){
  const client = clients.find(c=>c.id===id);
  if(!client) return;
  const newName = prompt('Editar nombre del cliente', client.nombre);
  if(newName===null) return;
  client.nombre = newName.trim() || client.nombre;
  const newTipo = prompt('Tipo (1 o 2)', client.tipo) || client.tipo;
  client.tipo = (newTipo==='2') ? '2' : '1';
  saveClients();
  renderClients(clientSearchEl.value, clientTypeFilter.value);
  applyProjectFilters();
}

function removeClient(id){
  if(!confirm('Eliminar cliente y todos sus proyectos?')) return;
  clients = clients.filter(c=>c.id!==id);
  projects = projects.filter(p=>p.clientId!==id);
  if(selectedClientId===id) selectedClientId=null;
  saveClients(); saveProjects();
  renderClients(); applyProjectFilters();
}

/* ---------- project client options ---------- */
function renderProjectClientOptions(){
  if(!projectClientSelect) return;
  projectClientSelect.innerHTML = '';
  clients.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = `${c.nombre} (Tipo ${c.tipo})`;
    projectClientSelect.appendChild(opt);
  });
}

/* ---------- render projects (cards) ---------- */
function renderProjectsList(list){
  projectsContainer.innerHTML = '';
  if(list.length===0){
    projectsContainer.innerHTML = `<div class="card">No hay proyectos</div>`;
    return;
  }
  list.forEach(p=>{
    const client = clients.find(c=>c.id===p.clientId) || {nombre:'Sin cliente', tipo:'1'};
    const comm = commissionFor(p);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div style="flex:1">
          <div style="font-weight:700">${escapeHtml(p.nombre)}</div>
          <div class="small muted">${escapeHtml(client.nombre)} · Tipo ${client.tipo}</div>
          <div style="margin-top:8px">
            <span><strong>Monto:</strong> $${money(p.amount)}</span> &nbsp; 
            <span><strong>Prob:</strong> ${p.probabilidad}%</span> &nbsp; 
            <span><strong>Estatus:</strong> ${p.estatus}</span>
          </div>
          <div style="margin-top:8px">
            <strong>Comisión: </strong>$${money(comm)}
          </div>
          <div style="margin-top:8px">
            <strong>Comentarios:</strong> ${p.comments ? `<button class="btn btn-outline small" data-action="view-comments" data-id="${p.id}">Ver</button>` : '—'}
            &nbsp;
            ${p.pdf ? `<a class="btn btn-ghost small" href="${p.pdf}" download="proyecto_${p.id}.pdf">Descargar PDF</a>` : ''}
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
          <div class="small muted">${new Date(p.createdAt).toLocaleString()}</div>
          <div>
            <button class="btn btn-blue small" data-action="edit-project" data-id="${p.id}">Editar</button>
            <button class="btn btn-ghost small" data-action="del-project" data-id="${p.id}">Eliminar</button>
          </div>
        </div>
      </div>
    `;
    // events for buttons inside
    card.querySelectorAll('button').forEach(bt=>{
      bt.addEventListener('click', (ev)=>{
        ev.stopPropagation();
        const action = bt.dataset.action; const id = bt.dataset.id;
        if(action==='view-comments') alert(projects.find(pp=>pp.id===id).comments || '');
        if(action==='edit-project') openEditProject(id);
        if(action==='del-project') deleteProject(id);
      });
    });
    projectsContainer.appendChild(card);
  });
}

/* ---------- project add/edit/delete ---------- */
btnAddClient.addEventListener('click', ()=>{
  const name = prompt('Nombre del cliente');
  if(!name) return;
  const tipo = prompt('Tipo (1 ó 2)', '1') || '1';
  const c = { id: uid('c'), nombre: name.trim(), tipo: (tipo==='2'?'2':'1') };
  clients.push(c); saveClients(); renderClients();
});

btnAddProject.addEventListener('click', ()=>{
  // show form and preselect selected client
  projectForm.reset();
  projectCommentsEl.value = '';
  projectPDFEl.value = '';
  if(selectedClientId) projectClientSelect.value = selectedClientId;
  projectFormCard.style.display = 'block';
  projectClientSelect.focus();
});

cancelProjectBtn.addEventListener('click', ()=>{
  projectFormCard.style.display = 'none';
  projectForm.reset();
});

projectForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const clientId = projectClientSelect.value;
  const nombre = projectNameEl.value.trim();
  const amount = Number(projectAmountEl.value || 0);
  const estatus = projectStatusEl.value;
  const prob = Number(projectProbEl.value || 0);
  const comments = projectCommentsEl.value.trim();
  const pdfFile = projectPDFEl.files[0];

  if(!clientId || !nombre || !amount){ alert('Cliente, nombre y monto son requeridos'); return; }

  // handle pdf -> base64
  if(pdfFile){
    const reader = new FileReader();
    reader.onload = function(ev){
      const base64 = ev.target.result;
      saveProjectToStore({ clientId, nombre, amount, estatus, prob, comments, pdf: base64 });
    };
    reader.readAsDataURL(pdfFile);
  } else {
    saveProjectToStore({ clientId, nombre, amount, estatus, prob, comments, pdf: null });
  }
});

function saveProjectToStore({clientId,nombre,amount,estatus,prob,comments,pdf}){
  const p = { id: uid('p'), clientId, nombre, amount, estatus, probabilidad: prob, comments, pdf, createdAt: new Date().toISOString() };
  projects.push(p);
  saveProjects();
  projectFormCard.style.display = 'none';
  projectForm.reset();
  applyProjectFilters();
}

/* edit project (simple prompt flow) */
function openEditProject(id){
  const p = projects.find(x=>x.id===id);
  if(!p) return;
  const newName = prompt('Nombre proyecto', p.nombre);
  if(newName===null) return;
  p.nombre = newName.trim() || p.nombre;
  const newAmount = prompt('Monto', p.amount);
  if(newAmount!==null) p.amount = Number(newAmount) || p.amount;
  const newStatus = prompt('Estatus', p.estatus);
  if(newStatus!==null) p.estatus = newStatus || p.estatus;
  const newProb = prompt('Probabilidad (%)', p.probabilidad);
  if(newProb!==null) p.probabilidad = Number(newProb) || p.probabilidad;
  const newComments = prompt('Comentarios (editar)', p.comments || '') ;
  if(newComments!==null) p.comments = newComments;
  saveProjects(); applyProjectFilters();
}

function deleteProject(id){
  if(!confirm('Eliminar proyecto?')) return;
  projects = projects.filter(p=>p.id!==id);
  saveProjects();
  applyProjectFilters();
}

/* ---------- filtering / searching ---------- */
function applyProjectFilters(){
  let list = projects.slice();

  const statusFilter = filterStatusEl.value;
  const projectSearch = projectSearchEl.value.trim().toLowerCase();
  const clientSearch = clientSearchEl.value.trim().toLowerCase();
  const globalSearch = globalSearchEl.value.trim().toLowerCase();
  const clientType = clientTypeFilter.value;

  // if a client is selected, show only that client's projects
  if(selectedClientId){
    list = list.filter(p => p.clientId === selectedClientId);
  }

  if(statusFilter) list = list.filter(p=>p.estatus === statusFilter);
  if(projectSearch) list = list.filter(p=> p.nombre.toLowerCase().includes(projectSearch));
  if(globalSearch){
    list = list.filter(p=> (p.nombre + ' ' + (clients.find(c=>c.id===p.clientId)?.nombre||'')).toLowerCase().includes(globalSearch));
  }

  // apply client-side filters (client search/type) for client list rendering
  renderClients(clientSearch, clientType);
  renderProjectsList(list);
  updateKPIs(list);
  drawCharts(list);
}

/* ---------- KPIs ---------- */
function updateKPIs(filteredProjects){
  // Consider filteredProjects for some KPIs; for totals use full projects when needed
  const activeAmount = filteredProjects.filter(p=>p.estatus==='activo').reduce((s,p)=>s+Number(p.amount||0),0);
  const probableAmount = filteredProjects.filter(p=>p.estatus==='proceso' || p.estatus==='negociacion').reduce((s,p)=>s+Number(p.amount||0),0);
  const wonAmount = filteredProjects.filter(p=>p.estatus==='ganado' || p.estatus==='cerrado').reduce((s,p)=>s+Number(p.amount||0),0);

  const totalProjects = projects.length;
  const wonCount = projects.filter(p=>p.estatus==='ganado' || p.estatus==='cerrado').length;
  const conversion = totalProjects ? (wonCount/totalProjects)*100 : 0;

  // for 'cierre' we compute won / active (if active exists)
  const activeCount = projects.filter(p=>p.estatus==='activo').length;
  const closeRate = activeCount ? (wonCount/activeCount)*100 : 0;

  const ticketProm = filteredProjects.length ? (filteredProjects.reduce((s,p)=>s+Number(p.amount||0),0)/filteredProjects.length) : 0;

  kpiActive.innerText = `$${money(activeAmount)}`;
  kpiProbable.innerText = `$${money(probableAmount)}`;
  kpiWon.innerText = `$${money(wonAmount)}`;
  kpiTicket.innerText = `$${money(ticketProm)}`;
  kpiConversion.innerText = `${conversion.toFixed(1)}%`;
  kpiClose.innerText = `${closeRate.toFixed(1)}%`;

  renderTopQuickKPIs();
}

/* top quick KPIs in header */
function renderTopQuickKPIs(){
  const totalClients = clients.length;
  const totalProjects = projects.length;
  const activeAmount = projects.filter(p=>p.estatus==='activo').reduce((s,p)=>s+Number(p.amount||0),0);
  const wonAmount = projects.filter(p=>p.estatus==='ganado' || p.estatus==='cerrado').reduce((s,p)=>s+Number(p.amount||0),0);
  const probableAmount = projects.filter(p=>p.estatus==='proceso' || p.estatus==='negociacion').reduce((s,p)=>s+Number(p.amount||0),0);

  topQuickKPIs.innerHTML = `
    <div class="quick-kpi">Clientes: <strong>${totalClients}</strong></div>
    <div class="quick-kpi">Proyectos: <strong>${totalProjects}</strong></div>
    <div class="quick-kpi">Activos: <strong>$${money(activeAmount)}</strong></div>
    <div class="quick-kpi">Ganados: <strong>$${money(wonAmount)}</strong></div>
    <div class="quick-kpi">Probables: <strong>$${money(probableAmount)}</strong></div>
  `;
}

/* ---------- charts ---------- */
function drawCharts(filtered){
  // status counts for filtered
  const statuses = ['activo','proceso','negociacion','ganado','cerrado','cancelado','perdido'];
  const counts = statuses.map(s => filtered.filter(p=>p.estatus===s).length);
  const amounts = statuses.map(s => filtered.filter(p=>p.estatus===s).reduce((s2,p)=>s2+Number(p.amount||0),0));

  const ctx1 = document.getElementById('chart_status');
  if(chartStatus) chartStatus.destroy();
  chartStatus = new Chart(ctx1, {
    type:'bar',
    data:{ labels: statuses.map(s=>s.toUpperCase()), datasets:[{ label:'Cantidad', data: counts, backgroundColor:'#2563EB' }, { label:'Monto', data: amounts, backgroundColor:'#FBBF24' }] },
    options:{responsive:true,maintainAspectRatio:false}
  });

  // by client amounts (top 10)
  const byClient = {};
  filtered.forEach(p=> byClient[p.clientId] = (byClient[p.clientId]||0) + Number(p.amount||0));
  const arr = Object.entries(byClient).map(([id,total])=>({ id, total, name: clients.find(c=>c.id===id)?.nombre || 'Sin cliente' })).sort((a,b)=>b.total-a.total).slice(0,10);
  const ctx2 = document.getElementById('chart_by_client');
  if(chartByClient) chartByClient.destroy();
  chartByClient = new Chart(ctx2, {
    type:'bar',
    data:{ labels: arr.map(a=>a.name), datasets:[{ label:'Monto', data: arr.map(a=>a.total), backgroundColor:'#2563EB' }] },
    options:{responsive:true,maintainAspectRatio:false}
  });
}

/* ---------- export Excel ---------- */
function exportAllToExcel(){
  if(typeof XLSX === 'undefined'){ alert('XLSX no cargado'); return; }
  const wb = XLSX.utils.book_new();

  const clientsSheet = clients.map(c=> ({ ID:c.id, Nombre:c.nombre, Tipo:c.tipo }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clientsSheet),'Clientes');

  const projectsSheet = projects.map(p=>{
    const client = clients.find(c=>c.id===p.clientId) || { nombre:'Sin cliente', tipo:'1' };
    return { ID:p.id, ClienteID:p.clientId, Cliente:client.nombre, Proyecto:p.nombre, Monto:p.amount, Estatus:p.estatus, Probabilidad:p.probabilidad, Comentarios:p.comments, Comision: commissionFor(p) };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projectsSheet),'Proyectos');

  const ventas = projects.filter(p=>p.estatus==='ganado' || p.estatus==='cerrado').reduce((s,p)=>s+Number(p.amount||0),0);
  const kpi = [{ TotalClientes: clients.length, TotalProyectos: projects.length, VentasGanadas: ventas, FechaExport: new Date().toISOString() }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpi),'KPIs');

  XLSX.writeFile(wb,'crm_proyectos_export.xlsx');
}

/* export only selected client */
function exportClientToExcel(){
  if(!selectedClientId){ alert('Seleccione un cliente para exportar'); return; }
  if(typeof XLSX === 'undefined'){ alert('XLSX no cargado'); return; }
  const wb = XLSX.utils.book_new();
  const client = clients.find(c=>c.id===selectedClientId);
  const clientSheet = [{ ID:client.id, Nombre:client.nombre, Tipo:client.tipo }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clientSheet),'Cliente');

  const clientProjects = projects.filter(p=>p.clientId===selectedClientId).map(p=> ({ ID:p.id, Proyecto:p.nombre, Monto:p.amount, Estatus:p.estatus, Probabilidad:p.probabilidad, Comentarios:p.comments, Comision: commissionFor(p) }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clientProjects),'ProyectosCliente');

  XLSX.writeFile(wb, `cliente_${client.nombre.replace(/\s+/g,'_')}.xlsx`);
}

/* ---------- init / events ---------- */
function init(){
  // initial render
  renderClients();
  applyProjectFilters();

  // listeners
  clientSearchEl.addEventListener('input', ()=> renderClients(clientSearchEl.value, clientTypeFilter.value));
  clientTypeFilter.addEventListener('change', ()=> renderClients(clientSearchEl.value, clientTypeFilter.value));
  filterStatusEl.addEventListener('change', applyProjectFilters);
  projectSearchEl.addEventListener('input', applyProjectFilters);
  globalSearchEl.addEventListener('input', applyProjectFilters);

  exportAllBtn.addEventListener('click', exportAllToExcel);
  exportClientBtn.addEventListener('click', exportClientToExcel);

  // storage listener (in case dashboard or another tab updates)
  window.addEventListener('storage', ()=>{
    clients = JSON.parse(localStorage.getItem(KEY_CLIENTS) || '[]');
    projects = JSON.parse(localStorage.getItem(KEY_PROJECTS) || '[]');
    renderClients();
    applyProjectFilters();
  });

  // initial selection: if there is at least one client, select the first
  if(clients.length && !selectedClientId){
    selectClient(clients[0].id);
  }
}

init();

/* ---------- utilities ---------- */
function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g,(m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function commissionFor(p){ const c = clients.find(x=>x.id===p.clientId); const pct = c && c.tipo==='2' ? 0.015 : 0.01; return Number(p.amount||0) * pct; }
