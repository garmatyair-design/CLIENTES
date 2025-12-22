/* ===================== STORAGE ===================== */
const KEY_CLIENTS = 'crm_clients_v3';
const KEY_PROJECTS = 'crm_projects_v3';

let clients = JSON.parse(localStorage.getItem(KEY_CLIENTS) || '[]');
let projects = JSON.parse(localStorage.getItem(KEY_PROJECTS) || '[]');
let selectedClientId = null;

/* ===================== HELPERS ===================== */
function uid(p='id'){ return p + Date.now() + Math.floor(Math.random()*999); }
function saveClients(){ localStorage.setItem(KEY_CLIENTS, JSON.stringify(clients)); }
function saveProjects(){ localStorage.setItem(KEY_PROJECTS, JSON.stringify(projects)); }
function money(v){ return Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2}); }
function commissionFor(p){
  const c = clients.find(x=>x.id===p.clientId);
  return Number(p.amount||0) * (c?.tipo === '2' ? 0.015 : 0.01);
}

/* ===================== DOM ===================== */
const clientList = document.getElementById('clientList');
const projectsContainer = document.getElementById('projectsContainer');
const projectsTitle = document.getElementById('projectsTitle');

const btnAddClient = document.getElementById('openAddClient');
const btnAddProject = document.getElementById('openAddProject');

const modalBackdrop = document.getElementById('modalBackdrop');
const modalClient = document.getElementById('modalClient');
const modalProject = document.getElementById('modalProject');

/* KPIs */
const kpiActive = document.getElementById('kpi_active');
const kpiWon = document.getElementById('kpi_won');
const kpiTicket = document.getElementById('kpi_ticket');

/* ===================== MODALES ===================== */
function openModal(modal){
  modalBackdrop.classList.remove('hidden');
  modal.classList.remove('hidden');
}
function closeModals(){
  modalBackdrop.classList.add('hidden');
  modalClient.classList.add('hidden');
  modalProject.classList.add('hidden');
}

/* ===================== CLIENTES ===================== */
function renderClients(){
  clientList.innerHTML='';
  clients.forEach(c=>{
    const div=document.createElement('div');
    div.className='client-card'+(c.id===selectedClientId?' selected':'');
    div.innerHTML=`
      <div>
        <strong>${c.nombre}</strong>
        <div class="small muted">Tipo ${c.tipo}</div>
      </div>
    `;
    div.onclick=()=>selectClient(c.id);
    clientList.appendChild(div);
  });
  renderProjectClientOptions();
}

function selectClient(id){
  selectedClientId=id;
  const c = clients.find(x=>x.id===id);
  projectsTitle.innerText = c ? `Proyectos — ${c.nombre}` : 'Proyectos';
  updateView();
}

/* ===================== PROYECTOS ===================== */
function renderProjects(list){
  projectsContainer.innerHTML='';
  list.forEach(p=>{
    const div=document.createElement('div');
    div.className='card';

    div.innerHTML=`
      <strong>${p.nombre}</strong>
      <div class="small muted">Monto: $${money(p.amount)}</div>
      <div class="small">Estatus: ${p.estatus}</div>
      <div class="small">Prob: ${p.probabilidad || 0}%</div>
      <div class="small">Comisión: $${money(commissionFor(p))}</div>
      <div class="small">Apertura: ${p.openedAt || '-'}</div>
      <div class="small">Cierre: ${p.closedAt || '-'}</div>

      <div class="actions-row">
        <button class="btn btn-outline" onclick="editProject('${p.id}')">Editar</button>
        <button class="btn btn-ghost" onclick="viewComments('${p.id}')">Comentarios</button>
        <button class="btn btn-ghost" onclick="deleteProject('${p.id}')">Eliminar</button>
      </div>
    `;
    projectsContainer.appendChild(div);
  });
}

/* ===================== KPIs ===================== */
function updateKPIs(list){
  const act=list.filter(p=>p.estatus==='activo').reduce((s,p)=>s+p.amount,0);
  const won=list.filter(p=>['ganado','cerrado'].includes(p.estatus)).reduce((s,p)=>s+p.amount,0);

  kpiActive.innerText='$'+money(act);
  kpiWon.innerText='$'+money(won);
  kpiTicket.innerText='$'+money(list.length?list.reduce((s,p)=>s+p.amount,0)/list.length:0);
}

/* ===================== GRÁFICAS ===================== */
let chartStatus=null;
function drawCharts(list){
  if(!document.getElementById('chart_status')) return;

  const statuses=['activo','proceso','negociacion','ganado','cerrado','cancelado','perdido'];
  const data=statuses.map(s=>list.filter(p=>p.estatus===s).length);

  if(chartStatus) chartStatus.destroy();
  chartStatus=new Chart(document.getElementById('chart_status'),{
    type:'pie',
    data:{
      labels:statuses.map(s=>s.toUpperCase()),
      datasets:[{
        data,
        backgroundColor:[
          '#2563EB','#1D4ED8','#60A5FA',
          '#FBBF24','#F59E0B','#9CA3AF','#EF4444'
        ]
      }]
    },
    options:{plugins:{legend:{position:'bottom'}}}
  });
}

/* ===================== UPDATE ===================== */
function updateView(){
  const list = selectedClientId
    ? projects.filter(p=>p.clientId===selectedClientId)
    : projects;

  renderProjects(list);
  updateKPIs(list);
  drawCharts(list);
}

/* ===================== FORM CLIENTE ===================== */
document.getElementById('clientForm')?.addEventListener('submit', e=>{
  e.preventDefault();
  const nombre=document.getElementById('clientName').value.trim();
  const tipo=document.getElementById('clientType').value;

  if(!nombre) return;

  clients.push({ id:uid('c'), nombre, tipo });
  saveClients();
  closeModals();
  renderClients();
});

/* ===================== FORM PROYECTO ===================== */
document.getElementById('projectForm')?.addEventListener('submit', e=>{
  e.preventDefault();

  const clientId=document.getElementById('projectClientSelect').value;
  const nombre=document.getElementById('projectNameInput').value.trim();
  const amount=Number(document.getElementById('projectMontoInput').value);
  const estatus=document.getElementById('projectStatusSelect').value;
  const prob=Number(document.getElementById('projectProbInput').value);

  if(!clientId||!nombre||!amount) return alert('Faltan datos');

  projects.push({
    id:uid('p'),
    clientId,
    nombre,
    amount,
    estatus,
    probabilidad:prob,
    comments:'',
    openedAt:new Date().toISOString().slice(0,10),
    closedAt:(estatus==='ganado'||estatus==='cerrado')?new Date().toISOString().slice(0,10):null
  });

  saveProjects();
  closeModals();
  updateView();
});

/* ===================== ACCIONES ===================== */
function editProject(id){
  const p=projects.find(x=>x.id===id);
  if(!p) return;

  p.nombre=prompt('Nombre',p.nombre)||p.nombre;
  p.amount=Number(prompt('Monto',p.amount)||p.amount);
  p.estatus=prompt('Estatus',p.estatus)||p.estatus;
  p.probabilidad=Number(prompt('Probabilidad',p.probabilidad)||p.probabilidad);
  p.openedAt=prompt('Apertura YYYY-MM-DD',p.openedAt||'')||p.openedAt;
  p.closedAt=prompt('Cierre YYYY-MM-DD',p.closedAt||'')||p.closedAt;

  saveProjects();
  updateView();
}

function viewComments(id){
  const p=projects.find(x=>x.id===id);
  if(!p) return;
  p.comments=prompt('Comentarios',p.comments||'')||p.comments;
  saveProjects();
}

function deleteProject(id){
  if(!confirm('Eliminar proyecto?')) return;
  projects=projects.filter(p=>p.id!==id);
  saveProjects();
  updateView();
}

/* ===================== SELECT CLIENTES ===================== */
function renderProjectClientOptions(){
  const select=document.getElementById('projectClientSelect');
  if(!select) return;

  select.innerHTML='<option value="">Selecciona cliente</option>';
  clients.forEach(c=>{
    const o=document.createElement('option');
    o.value=c.id;
    o.textContent=c.nombre;
    select.appendChild(o);
  });
}

/* ===================== BOTONES ===================== */
btnAddClient?.addEventListener('click',()=>openModal(modalClient));
btnAddProject?.addEventListener('click',()=>openModal(modalProject));
modalBackdrop?.addEventListener('click',closeModals);
document.getElementById('cancelClient')?.addEventListener('click',closeModals);
document.getElementById('cancelProject')?.addEventListener('click',closeModals);

/* ===================== INIT ===================== */
renderClients();
updateView();
