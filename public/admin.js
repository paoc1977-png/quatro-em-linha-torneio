let current, variant='classic', mode='individual';
const pin=()=>$('#pin').value;
const act=async fn=>{try{$('#error').textContent='';await fn()}catch(e){$('#error').textContent=e.message}};

document.querySelectorAll('[data-variant]').forEach(b=>b.onclick=()=>variant=b.dataset.variant);
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>mode=b.dataset.mode);
$('#toggleAccess').onclick=()=>$('#access').classList.toggle('hidden');
$('#save').onclick=()=>act(()=>post('/api/admin/config',{
  title:$('#title').value,
  rounds:+$('#rounds').value,
  variant,
  deviceMode:mode
},pin()));
$('#start').onclick=()=>confirm('Iniciar o torneio?')&&act(()=>post('/api/admin/start',{},pin()));
$('#next').onclick=()=>act(()=>post('/api/admin/next',{},pin()));
$('#new').onclick=()=>confirm('Apagar participantes, partidas e classificação e gerar novo código?')&&act(async()=>{
  await post('/api/admin/new',{},pin());
  $('#notice').textContent='Novo torneio criado com novo código e QR.';
});

function table(rows){
  return `<table><thead><tr><th>#</th><th>Jogador</th><th>Pts</th><th>Vit.</th><th>Emp.</th><th>Buchholz</th></tr></thead><tbody>${rows.map((p,i)=>`<tr><td>${i+1}</td><td>${esc(p.name)}</td><td><b>${p.points}</b></td><td>${p.wins}</td><td>${p.draws}</td><td>${p.buchholz||0}</td></tr>`).join('')}</tbody></table>`;
}

function render(s){
  current=s;
  variant=s.config.variant;
  mode=s.config.deviceMode;
  document.querySelectorAll('[data-variant]').forEach(x=>x.classList.toggle('selected',x.dataset.variant===variant));
  document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('selected',x.dataset.mode===mode));
  $('#title').value=s.config.title;
  $('#rounds').value=s.config.rounds;
  const join=location.origin+'/?room='+s.roomCode;
  $('#room').textContent=s.roomCode;
  $('#url').textContent=join;
  $('#qr').src='/api/qr?url='+encodeURIComponent(join)+'&v='+s.roomCode;
  $('#status').textContent=s.status==='setup'?'Inscrições abertas':s.status==='finished'?'Torneio terminado':`Ronda ${s.currentRound} de ${s.config.rounds}`;
  $('#players').innerHTML=s.players.map(p=>`<div class="row"><span><i class="dot status ${p.claimed?'on':''}"></i>${esc(p.name)}</span>${s.status==='setup'?`<button data-remove="${p.id}">Remover</button>`:''}</div>`).join('');
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>confirm('Remover esta inscrição?')&&act(()=>post('/api/admin/remove',{playerId:b.dataset.remove},pin())));
  const r=s.rounds[s.currentRound-1];
  $('#roundTitle').textContent=r?`Ronda ${s.currentRound}`:'Classificação';
  $('#matches').innerHTML=r?r.matches.map(m=>`<div class="row"><span><i class="dot red"></i>${esc(pname(m.red))}</span><b>${m.bye?'Isento':m.status==='finished'?(m.draw?'Empate':'Venceu '+esc(pname(m.winner))):'Em jogo'}</b><span class="right">${m.yellow?esc(pname(m.yellow))+' <i class="dot yellow"></i>':''}</span>${m.status==='playing'?`<button data-draw="${m.id}">½–½</button>`:'✓'}</div>`).join(''):'';
  document.querySelectorAll('[data-draw]').forEach(b=>b.onclick=()=>confirm('Registar empate?')&&act(()=>post('/api/admin/draw',{matchId:b.dataset.draw},pin())));
  $('#standings').innerHTML=table(s.standings);
}

events(render);
