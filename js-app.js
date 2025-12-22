const KEY_CLIENTS = 'crm_clients_v3';
const KEY_PROJECTS = 'crm_projects_v3';

let clients = JSON.parse(localStorage.getItem(KEY_CLIENTS) || '[]');
let projects = JSON.parse(localStorage.getItem(KEY_PROJECTS) || '[]');
let selectedClientId = null;

/* HELPERS */
function saveClients(){ localStorage.setItem(KEY_CLIENTS, JSON.stringify(clients)); }
function saveProjects(){ localStorage.setItem(KEY_PROJECTS, JSON.stringify(projects)); }
function uid(p='id'){ return p + Date.now() + Math.floor(Math.random()*999); }
function money(v){ return Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2}); }
function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
function commissionFor(p){
  const c = clients.find(x=>x.id===p.clientId);
  return Number(p.amount||0) * (c && c.tipo==='2' ? 0.015 : 0.01);
}

/* DOM */
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
const projectOpenDateEl = document.getElementById('projectOpenDate');
const projectCloseDateEl = document.getElementById('projectCloseDate');
const cancelProjectBtn = document.getElementById('cancelProjectBtn');

const filterStatusEl = document.getElementById('filterStatus');
const projectSearchEl = document.getElementById('projectSearch');

const kpiActive = document.getElementById('kpi_active');
const kpiProbable = document.getElementById('kpi_probable');
const kpiWon = document.getElementById('kpi_won');
const kpiTicket = document.getElementById('kpi_ticket');
const kpiConversion = document.getElementById('kpi_conversion');
const kpiClose = document.getElementById('kpi_close');

const exportAllBtn = document.getElementById('exportAllBtn');
const exportClientBtn = document.getElementById('exportClientBtn');

/* CLIENTES */
function renderClients(){
  clientListEl.innerHTML='';
  clients
    .filter(c=>{
      if(clientTypeFilter.value && c.tipo!==clientTypeFilter.value) return false;
      if(clientSearchEl.value && !c.nombre.toLowerCase().includes(clientSearchEl.value.toLowerCase())) return false;
      return true;
    })
    .forEach(c=>{
      const div=document.createElement('div');
      div.className='client-card'+(selectedClientId===c.id?' selected':'');
      div.innerHTML=`<strong>${escapeHtml(c.nombre)}</strong><div class="muted">Tipo ${c.tipo}</div>`;
      div.onclick=()=>selectClient(c.id);
      clientListEl.appendChild(div);
    });

  renderProjectClientOptions();
}

function selectClient(id){
  selectedClientId=id;
  const c=clients.find(x=>x.id===id);
  projectsTitle.innerText=c?`Proyectos — ${c.nombre}`:'Proyectos';
  selectedClientInfo.innerText=c?`Tipo ${c.tipo}`:'';
  renderClients();
  applyProjectFilters();
}

btnAddClient.onclick=()=>{
  const nombre=prompt('Nombre del cliente');
  if(!nombre) return;
  const tipo=prompt('Tipo (1 o 2)','1');
  clients.push({id:uid('c'),nombre:nombre.trim(),tipo:(tipo==='2'?'2':'1')});
  saveClients();
  renderClients();
};

/* PROYECTOS */
function renderProjectClientOptions(){
  projectClientSelect.innerHTML='';
  clients.forEach(c=>{
    const o=document.createElement('option');
    o.value=c.id;
    o.textContent=c.nombre;
    projectClientSelect.appendChild(o);
  });
}

btnAddProject.onclick=()=>{
  projectForm.reset();
  projectFormCard.style.display='block';
  if(selectedClientId) projectClientSelect.value=selectedClientId;
};

cancelProjectBtn.onclick=()=>projectFormCard.style.display='none';

projectForm.onsubmit=e=>{
  e.preventDefault();

  const data={
    id:uid('p'),
    clientId:projectClientSelect.value,
    nombre:projectNameEl.value.trim(),
    amount:Number(projectAmountEl.value),
    estatus:projectStatusEl.value,
    probabilidad:Number(projectProbEl.value),
    openedAt:projectOpenDateEl.value,
    closedAt:projectCloseDateEl.value||null,
    comments:projectCommentsEl.value,
    createdAt:new Date().toISOString()
  };

  projects.push(data);
  saveProjects();
  projectFormCard.style.display='none';
  applyProjectFilters();
};

function deleteProject(id){
  if(!confirm('Eliminar proyecto?')) return;
  projects=projects.filter(p=>p.id!==id);
  saveProjects();
  applyProjectFilters();
}

function renderProjects(list){
  projectsContainer.innerHTML='';
  list.forEach(p=>{
    const c=clients.find(x=>x.id===p.clientId)||{};
    const div=document.createElement('div');
    div.className='card';
    div.innerHTML=`
      <strong>${escapeHtml(p.nombre)}</strong>
      <div class="muted">${escapeHtml(c.nombre||'')}</div>
      <div>Monto: $${money(p.amount)}</div>
      <div>Estatus: ${p.estatus}</div>
      <div>Prob: ${p.probabilidad}%</div>
      ${p.openedAt?`<div>Apertura: ${p.openedAt}</div>`:''}
      ${p.closedAt?`<div>Cierre: ${p.closedAt}</div>`:''}
      <div>Comisión: $${money(commissionFor(p))}</div>
      <button onclick="deleteProject('${p.id}')">Eliminar</button>
    `;
    projectsContainer.appendChild(div);
  });
}

/* FILTROS + KPIS */
function applyProjectFilters(){
  let list=[...projects];
  if(selectedClientId) list=list.filter(p=>p.clientId===selectedClientId);
  if(filterStatusEl.value) list=list.filter(p=>p.estatus===filterStatusEl.value);
  if(projectSearchEl.value) list=list.filter(p=>p.nombre.toLowerCase().includes(projectSearchEl.value.toLowerCase()));
  renderProjects(list);
  updateKPIs(list);
  drawCharts(list);
}

function updateKPIs(list){
  const act=list.filter(p=>p.estatus==='activo').reduce((s,p)=>s+p.amount,0);
  const prob=list.filter(p=>['proceso','negociacion'].includes(p.estatus)).reduce((s,p)=>s+p.amount,0);
  const won=list.filter(p=>['ganado','cerrado'].includes(p.estatus)).reduce((s,p)=>s+p.amount,0);
  kpiActive.innerText='$'+money(act);
  kpiProbable.innerText='$'+money(prob);
  kpiWon.innerText='$'+money(won);
  kpiTicket.innerText='$'+money(list.length?list.reduce((s,p)=>s+p.amount,0)/list.length:0);
  const total=projects.length||1;
  kpiConversion.innerText=((projects.filter(p=>['ganado','cerrado'].includes(p.estatus)).length/total)*100).toFixed(1)+'%';
  kpiClose.innerText=((projects.filter(p=>['ganado','cerrado'].includes(p.estatus)).length/(projects.filter(p=>p.estatus==='activo').length||1))*100).toFixed(1)+'%';
}

/* GRÁFICAS */
let chartStatus=null, chartClient=null;
function drawCharts(list){
  if(!document.getElementById('chart_status')) return;
  const statuses=['activo','proceso','negociacion','ganado','cerrado','perdido','cancelado'];
  const values=statuses.map(s=>list.filter(p=>p.estatus===s).reduce((a,p)=>a+p.amount,0));

  if(chartStatus) chartStatus.destroy();
  chartStatus=new Chart(chart_status,{type:'pie',data:{labels:statuses,data:values}});
}

/* EXPORT */
exportAllBtn.onclick=()=>{
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(clients),'Clientes');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(projects),'Proyectos');
  XLSX.writeFile(wb,'crm_export.xlsx');
};

exportClientBtn.onclick=()=>{
  if(!selectedClientId) return alert('Selecciona cliente');
  const c=clients.find(x=>x.id===selectedClientId);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([c]),'Cliente');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(projects.filter(p=>p.clientId===selectedClientId)),'Proyectos');
  XLSX.writeFile(wb,`cliente_${c.nombre}.xlsx`);
};

/* INIT */
renderClients();
applyProjectFilters();
