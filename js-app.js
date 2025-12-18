// ===== MIGRACIÓN AUTOMÁTICA DE DATOS =====
(function () {
  const sources = ['crm_clients_v3', 'crm_clients_v2'];
  let clients = [];

  sources.forEach(k => {
    const data = JSON.parse(localStorage.getItem(k) || '[]');
    if (data.length) clients = data;
  });

  if (!localStorage.getItem('crm_clients') && clients.length) {
    localStorage.setItem('crm_clients', JSON.stringify(clients));
  }

  const pSources = ['crm_projects_v3', 'crm_projects_v2'];
  let projects = [];

  pSources.forEach(k => {
    const data = JSON.parse(localStorage.getItem(k) || '[]');
    if (data.length) projects = data;
  });

  if (!localStorage.getItem('crm_projects') && projects.length) {
    localStorage.setItem('crm_projects', JSON.stringify(projects));
  }
})();

const KEY_CLIENTS = 'crm_clients';
const KEY_PROJECTS = 'crm_projects';



let clients = JSON.parse(localStorage.getItem(KEY_CLIENTS) || '[]');
let projects = JSON.parse(localStorage.getItem(KEY_PROJECTS) || '[]');
let selectedClientId = null;

function saveClients(){ localStorage.setItem(KEY_CLIENTS, JSON.stringify(clients)); }
function saveProjects(){ localStorage.setItem(KEY_PROJECTS, JSON.stringify(projects)); }
function uid(p='id'){ return p + Date.now() + Math.floor(Math.random()*999); }

function commissionFor(p){
  const c = clients.find(x=>x.id===p.clientId);
  return Number(p.amount||0) * (c?.tipo==='2' ? 0.015 : 0.01);
}

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

/* ⚠️
Aquí NO tocamos más lógica visual.
Tu formulario sigue igual, solo cambia el guardado.
*/
