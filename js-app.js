const KEY_CLIENTS = 'crm_clients_v3';
const KEY_PROJECTS = 'crm_projects_v3';

let clients = JSON.parse(localStorage.getItem(KEY_CLIENTS) || '[]');
let projects = JSON.parse(localStorage.getItem(KEY_PROJECTS) || '[]');
let selectedClientId = null;

/* ===================== HELPERS ===================== */
function saveClients(){ localStorage.setItem(KEY_CLIENTS, JSON.stringify(clients)); }
function saveProjects(){ localStorage.setItem(KEY_PROJECTS, JSON.stringify(projects)); }
function uid(p='id'){ return p + Date.now() + Math.floor(Math.random()*999); }
function money(v){ return Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2}); }
function commissionFor(p){
  const c = clients.find(x=>x.id===p.clientId);
  return Number(p.amount||0) * (c && c.tipo==='2' ? 0.015 : 0.01);
}
function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

/* ===================== DOM ===================== */
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

const exportAllBtn = document.getElementById('exportAllBtn');
const exportClientBtn = document.getElementById('exportClientBtn');

/* ===================== CLIENTES ===================== */
function renderClients(text='', type=''){
  clientListEl.innerHTML = '';
  clients
    .filter(c=>{
      if(type && c.tipo!==type) return false;
      if(text && !c.nombre.toLowerCase().includes(text.toLowerCase())) return false;
      return true;
    })
    .forEach(c=>{
      const div = document.createElement('div');
      div.className = 'client-card'+(selectedClientId===c.id?' selected':'');
      div.innerHTML = `
        <div>
          <strong>${escapeHtml(c.nombre)}</strong>
          <div class="small muted">Tipo ${c.tipo}</div>
        </div>
      `;
      div.onclick = ()=> selectClient(c.id);
      clientListEl.appendChild(div);
    });

  renderProjectClientOptions();
}

function selectClient(id){
  selectedClientId = id;
  const c = clients.find(x=>x.id===id);
  projectsTitle.innerText = c ? `Proyectos — ${c.nombre}` : 'Proyectos';
  selectedClientInfo.innerText = c ? `Tipo ${c.tipo}` : '';
  applyProjectFilters();
}

btnAddClient.onclick = ()=>{
  const name = prompt('Nombre del cliente');
  if(!name) return;
  const tipo = prompt('Tipo (1 o 2)','1');
  clients.push({ id:uid('c'), nombre:name.trim(), tipo:(tipo==='2'?'2':'1') });
  saveClients(); renderClients();
};

/* ===================== PROYECTOS ===================== */
/* ===== PROYECTOS ===== */
function addProject(data){
  projects.push({
    id: uid('p'),
    ...data,
    openedAt: new Date().toISOString(),
    closedAt:
      data.estatus === 'ganado' || data.estatus === 'cerrado'
        ? new Date().toISOString()
        : null
  });
  saveProjects();
}
function renderProjectClientOptions(){
  projectClientSelect.innerHTML='';
  clients.forEach(c=>{
    const o=document.createElement('option');
    o.value=c.id; o.textContent=c.nombre;
    projectClientSelect.appendChild(o);
  });
}

btnAddProject.onclick=()=>{
  projectForm.reset();
  projectFormCard.style.display='block';
  if(selectedClientId) projectClientSelect.value=selectedClientId;
};

cancelProjectBtn.onclick=()=>{
  projectFormCard.style.display='none';
};

projectForm.onsubmit=(e)=>{
  e.preventDefault();
  const clientId = projectClientSelect.value;
  const nombre = projectNameEl.value.trim();
  const amount = Number(projectAmountEl.value);
  const estatus = projectStatusEl.value;
  const prob = Number(projectProbEl.value);
  const comments = projectCommentsEl.value;
  const pdfFile = projectPDFEl.files[0];

  if(!clientId||!nombre||!amount) return alert('Faltan datos');

  const save = (pdf)=>{
    projects.push({
      id:uid('p'),
      clientId, nombre, amount, estatus,
      probabilidad:prob, comments, pdf,
      createdAt:new Date().toISOString()
    });
    saveProjects();
    projectFormCard.style.display='none';
    applyProjectFilters();
  };

  if(pdfFile){
    const r=new FileReader();
    r.onload=e=>save(e.target.result);
    r.readAsDataURL(pdfFile);
  } else save(null);
};

function deleteProject(id){
  if(!confirm('Eliminar proyecto?')) return;
  projects=projects.filter(p=>p.id!==id);
  saveProjects(); applyProjectFilters();
}

function renderProjects(list){
  projectsContainer.innerHTML='';
  list.forEach(p=>{
    const c=clients.find(x=>x.id===p.clientId)||{};
    const card=document.createElement('div');
    card.className='card';
    card.innerHTML=`
      <strong>${escapeHtml(p.nombre)}</strong>
      <div class="small muted">${escapeHtml(c.nombre||'')}</div>
      <div>Monto: $${money(p.amount)}</div>
      <div>Estatus: ${p.estatus}</div>
      <div>Prob: ${p.probabilidad}%</div>
      <div>Comisión: $${money(commissionFor(p))}</div>
      ${p.comments?`<button onclick="alert('${escapeHtml(p.comments)}')">Comentarios</button>`:''}
      ${p.pdf?`<a href="${p.pdf}" download>PDF</a>`:''}
      <button onclick="deleteProject('${p.id}')">Eliminar</button>
    `;
    projectsContainer.appendChild(card);
  });
}

/* ===================== FILTROS + KPIs ===================== */
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

/* ===================== GRÁFICAS (PASTEL) ===================== */
let chartStatus=null, chartClient=null;

function drawCharts(list){
  const statuses=['activo','proceso','negociacion','ganado','cerrado','cancelado','perdido'];
  const amounts=statuses.map(s=>list.filter(p=>p.estatus===s).reduce((a,p)=>a+p.amount,0));

  if(chartStatus) chartStatus.destroy();
  chartStatus=new Chart(document.getElementById('chart_status'),{
    type:'pie',
    data:{
      labels:statuses.map(s=>s.toUpperCase()),
      datasets:[{
        data:amounts,
        backgroundColor:['#2563EB','#1D4ED8','#60A5FA','#FBBF24','#F59E0B','#9CA3AF','#EF4444']
      }]
    },
    options:{plugins:{legend:{position:'bottom'}}}
  });

  const byClient={};
  list.forEach(p=>byClient[p.clientId]=(byClient[p.clientId]||0)+p.amount);
  const labels=Object.keys(byClient).map(id=>clients.find(c=>c.id===id)?.nombre||'');
  const values=Object.values(byClient);

  if(chartClient) chartClient.destroy();
  chartClient=new Chart(document.getElementById('chart_by_client'),{
    type:'pie',
    data:{
      labels,
      datasets:[{
        data:values,
        backgroundColor:['#2563EB','#1D4ED8','#60A5FA','#93C5FD','#FBBF24','#F59E0B','#9CA3AF']
      }]
    },
    options:{plugins:{legend:{position:'bottom'}}}
  });
}

/* ===================== EXPORT ===================== */
exportAllBtn.onclick=()=>{
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(clients),'Clientes');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(projects),'Proyectos');
  XLSX.writeFile(wb,'crm_export.xlsx');
};

exportClientBtn.onclick=()=>{
  if(!selectedClientId) return alert('Selecciona cliente');
  const wb=XLSX.utils.book_new();
  const c=clients.find(x=>x.id===selectedClientId);
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([c]),'Cliente');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(projects.filter(p=>p.clientId===selectedClientId)),'Proyectos');
  XLSX.writeFile(wb,`cliente_${c.nombre}.xlsx`);
};

/* ===================== INIT ===================== */
renderClients();
applyProjectFilters();

/* ⚠️
Aquí NO tocamos más lógica visual.
Tu formulario sigue igual, solo cambia el guardado.
*/
