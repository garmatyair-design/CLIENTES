const KEY_CLIENTS = 'crm_clients_v3';
const KEY_PROJECTS = 'crm_projects_v3';

let clients = JSON.parse(localStorage.getItem(KEY_CLIENTS) || '[]');
let projects = JSON.parse(localStorage.getItem(KEY_PROJECTS) || '[]');
let selectedClientId = null;

/* HELPERS */
const uid = p => p + Date.now() + Math.floor(Math.random()*999);
const money = v => Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2});
const saveClients = () => localStorage.setItem(KEY_CLIENTS, JSON.stringify(clients));
const saveProjects = () => localStorage.setItem(KEY_PROJECTS, JSON.stringify(projects));

const commissionFor = p => {
  const c = clients.find(x=>x.id===p.clientId);
  return Number(p.amount||0) * (c?.tipo === '2' ? 0.015 : 0.01);
};

/* DOM */
const clientList = document.getElementById('clientList');
const projectsContainer = document.getElementById('projectsContainer');

/* CLIENTES */
function renderClients(){
  clientList.innerHTML='';
  clients.forEach(c=>{
    const div=document.createElement('div');
    div.className='client-card'+(c.id===selectedClientId?' selected':'');
    div.innerHTML=`<strong>${c.nombre}</strong><span>Tipo ${c.tipo}</span>`;
    div.onclick=()=>selectClient(c.id);
    clientList.appendChild(div);
  });
  renderProjectClientOptions();
}

function selectClient(id){
  selectedClientId=id;
  document.getElementById('projectsTitle').innerText =
    'Proyectos — ' + clients.find(c=>c.id===id).nombre;
  updateView();
}

/* PROYECTOS */
function renderProjects(list){
  projectsContainer.innerHTML='';
  list.forEach(p=>{
    const div=document.createElement('div');
    div.className='project-card';
    div.innerHTML=`
      <strong>${p.nombre}</strong>
      <div>Monto: $${money(p.amount)}</div>
      <div>Estatus: ${p.estatus}</div>
      <div>Comisión: $${money(commissionFor(p))}</div>
      <div>Apertura: ${p.openedAt||'-'}</div>
      <div>Cierre: ${p.closedAt||'-'}</div>
    `;
    projectsContainer.appendChild(div);
  });
}
function renderProjectClientOptions() {
  const select = document.getElementById("projectClientSelect");
  if (!select) return;

  select.innerHTML = `<option value="">Selecciona un cliente</option>`;

  clients.forEach(client => {
    const option = document.createElement("option");
    option.value = client.id;
    option.textContent = client.name;
    select.appendChild(option);
  });
}


/* KPIs */
function updateKPIs(list){
  const act=list.filter(p=>p.estatus==='activo').reduce((s,p)=>s+p.amount,0);
  const won=list.filter(p=>['ganado','cerrado'].includes(p.estatus)).reduce((s,p)=>s+p.amount,0);

  document.getElementById('kpi_active').innerText='$'+money(act);
  document.getElementById('kpi_won').innerText='$'+money(won);
  document.getElementById('kpi_ticket').innerText='$'+money(list.length?list.reduce((s,p)=>s+p.amount,0)/list.length:0);
}

/* GRÁFICAS */
let chartStatus=null, chartClient=null;
function drawCharts(list){
  const statuses=['activo','proceso','negociacion','ganado','cerrado','cancelado','perdido'];
  const data=statuses.map(s=>list.filter(p=>p.estatus===s).length);

  if(chartStatus) chartStatus.destroy();
  chartStatus=new Chart(document.getElementById('chart_status'),{
    type:'pie',
    data:{labels:statuses,datasets:[{data}]}
  });
}

/* UPDATE */
function updateView(){
  const list=projects.filter(p=>p.clientId===selectedClientId);
  renderProjects(list);
  updateKPIs(list);
  drawCharts(list);
}

/* INIT */
renderClients();
