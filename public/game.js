let token=localStorage.fourToken||('d-'+Date.now()+'-'+Math.random().toString(36).slice(2));
let me=localStorage.fourPlayer||'',table=localStorage.fourTable||'',board3,SpatialBoard,spatialLoading;
localStorage.fourToken=token;
const room=new URLSearchParams(location.search).get('room')||localStorage.fourRoom||'';
$('#roomInput').value=room;

function ranking(s){
  return `<table><tbody>${s.standings.map((p,i)=>`<tr><td>${i+1}</td><td>${esc(p.name)}</td><td><b>${p.points}</b></td></tr>`).join('')}</tbody></table>`;
}
async function register(){
  try{
    $('#error').textContent='';
    const j=await post('/api/register',{roomCode:$('#roomInput').value,name:$('#nameInput').value,token});
    me=j.playerId;
    localStorage.fourPlayer=me;
    localStorage.fourRoom=$('#roomInput').value.toUpperCase();
  }catch(e){$('#error').textContent=e.message}
}
async function joinTable(id){
  try{
    await post('/api/join-table',{roomCode:$('#roomInput').value,matchId:id,token});
    table=id;
    localStorage.fourTable=id;
  }catch(e){$('#error').textContent=e.message}
}
async function drop(data){
  try{await post('/api/drop',{...data,token})}
  catch(e){$('#error').textContent=e.message}
}
$('#registerBtn').onclick=register;
$('#nameInput').onkeydown=e=>{if(e.key==='Enter')register()};
$('#roomInput').onkeydown=e=>{if(e.key==='Enter')register()};

function showWaiting(){
  $('#join').classList.add('hidden');
  $('#game').classList.add('hidden');
  $('#waiting').classList.remove('hidden');
}
function loadSpatial(){
  if(!spatialLoading)spatialLoading=import('/spatial.js')
    .then(module=>{SpatialBoard=module.SpatialBoard;render(state)})
    .catch(e=>{$('#error').textContent='Não foi possível carregar o tabuleiro 3D.';console.error(e)});
}
function render(s){
  state=s;
  const r=s.rounds[s.currentRound-1],shared=s.config.deviceMode==='shared';
  const registered=s.players.some(p=>p.id===me);
  const mine=shared?r?.matches.find(m=>m.id===table):r?.matches.find(m=>m.red===me||m.yellow===me);
  $('#ranking').innerHTML=ranking(s);

  if(!registered){
    $('#game').classList.add('hidden');
    $('#waiting').classList.add('hidden');
    $('#join').classList.remove('hidden');
    $('#registerForm').classList.remove('hidden');
    $('#choices').innerHTML='';
    $('#joinTitle').textContent='Inscreve-te no torneio';
    return;
  }
  if(s.status==='setup'){
    showWaiting();
    return;
  }
  if(shared&&!mine){
    $('#game').classList.add('hidden');
    $('#waiting').classList.add('hidden');
    $('#join').classList.remove('hidden');
    $('#registerForm').classList.add('hidden');
    $('#joinTitle').textContent='Escolham a vossa partida';
    $('#choices').innerHTML=r?r.matches.filter(m=>!m.bye).map(m=>`<button data-table="${m.id}" ${m.sharedClaimed?'disabled':''}><i class="dot red"></i>${esc(pname(m.red))} vs. ${esc(pname(m.yellow))}<i class="dot yellow"></i></button>`).join(''):'A aguardar o emparelhamento.';
    document.querySelectorAll('[data-table]').forEach(b=>b.onclick=()=>joinTable(b.dataset.table));
    return;
  }
  if(!mine||mine.bye){
    showWaiting();
    return;
  }

  $('#join').classList.add('hidden');
  $('#waiting').classList.add('hidden');
  $('#game').classList.remove('hidden');
  $('#round').textContent=`Ronda ${s.currentRound} de ${s.config.rounds} · ${s.config.variant==='spatial'?'Espacial 4×4×4':'Clássico 7×6'}`;
  $('#versus').innerHTML=`<i class="dot red"></i>${esc(pname(mine.red))} vs. ${esc(pname(mine.yellow))}<i class="dot yellow"></i>`;
  const can=mine.status==='playing'&&(shared||mine.turn===me);
  $('#turn').textContent=mine.status==='finished'?(mine.draw?'Empate':`Venceu ${pname(mine.winner)}`):can?`Agora joga ${pname(mine.turn)}`:'Aguarda a jogada do adversário';
  if(s.config.variant==='classic'){
    $('#classic').classList.remove('hidden');
    $('#spatial').classList.add('hidden');
    $('#classic').innerHTML=mine.board.flatMap(row=>row.map((c,ci)=>`<button class="cell ${c||''}" data-col="${ci}" ${can?'':'disabled'} aria-label="Coluna ${ci+1}"></button>`)).join('');
    document.querySelectorAll('[data-col]').forEach(b=>b.onclick=()=>drop({matchId:mine.id,column:+b.dataset.col}));
  }else{
    $('#classic').classList.add('hidden');
    $('#spatial').classList.remove('hidden');
    if(!SpatialBoard){loadSpatial();return}
    if(!board3)board3=new SpatialBoard($('#three'),{near:$('#near'),far:$('#far'),home:$('#home'),map:$('#map')},(x,z)=>drop({matchId:board3.matchId,x,z}));
    board3.matchId=mine.id;
    board3.update(mine.cells,can);
  }
}
events(render);
