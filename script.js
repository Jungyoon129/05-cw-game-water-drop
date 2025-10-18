// ========= UI refs =========
const UI = {
  play: document.getElementById('play'),
  score: document.getElementById('score'),
  timeFill: document.getElementById('timeFill'),
  cleanFill: document.getElementById('cleanFill'),
  dirtyFill: document.getElementById('dirtyFill'),
  cleanPct: document.getElementById('cleanPct'),
  dirtyPct: document.getElementById('dirtyPct'),
  can: document.getElementById('canWrap'),
  canEl: document.getElementById('can'),
  qualityBar: document.getElementById('qualityBar'),
  scoreCenter: document.getElementById('scoreCenter'),
  start: document.getElementById('start'),
  backdrop: document.getElementById('backdrop'),
  peopleNum: document.getElementById('peopleNum'),
  btnStart: document.getElementById('btnStart'),
  btnReplay: document.getElementById('btnReplay'),
  btnMenu: document.getElementById('btnMenu'),
  btnReset: document.getElementById('btnReset'),
  boostBadge: document.getElementById('boostBadge')
};

// ========= Difficulty presets =========
const DIFF = {
  easy:   { duration: 35, spawn: 650, cleanChance: 0.70, obstacleChance: 0.10, minSpawn: 260, speedStep: 0.12 },
  normal: { duration: 30, spawn: 600, cleanChance: 0.65, obstacleChance: 0.15, minSpawn: 250, speedStep: 0.15 },
  hard:   { duration: 25, spawn: 520, cleanChance: 0.58, obstacleChance: 0.20, minSpawn: 220, speedStep: 0.18 },
};

// active config (set at start)
let CFG = { ...DIFF.normal };

// ========= Game state =========
const state = {
  time: CFG.duration,
  score: 0,
  pollution: 0,
  clean: 0,
  dirty: 0,
  tick: null,
  spawner: null,
  running: false,
  speedMul: 1,
  currentSpawn: CFG.spawn,
  difficulty: 'normal'
};

function updateHUD(){
  UI.timeFill.style.width = (state.time / CFG.duration * 100) + '%';

  const total = state.clean + state.dirty;
  const cPct = total > 0 ? Math.round((state.clean / total) * 100) : 0;
  const dPct = total > 0 ? 100 - cPct : 0;
  UI.cleanFill.style.width = cPct + '%';
  UI.dirtyFill.style.width = dPct + '%';
  UI.cleanPct.textContent = cPct + '%';
  UI.dirtyPct.textContent = dPct + '%';

  UI.score.textContent = state.score;
}

function clearTimers(){
  if (state.tick)    { clearInterval(state.tick);    state.tick = null; }
  if (state.spawner) { clearInterval(state.spawner); state.spawner = null; }
}

function resetState(){
  state.time = CFG.duration;
  state.score = 0;
  state.pollution = 0;
  state.clean = 0;
  state.dirty = 0;
  state.running = false;
  state.speedMul = 1;
  state.currentSpawn = CFG.spawn;
  UI.play.innerHTML = '';
  updateHUD();
}

function applyDifficulty(){
  const chosen = document.querySelector('input[name="difficulty"]:checked')?.value || 'normal';
  state.difficulty = chosen;
  CFG = { ...DIFF[chosen] };
}

function start(){
  clearTimers();
  state.running = true;
  updateHUD();

  state.tick = setInterval(()=>{
    state.time--;
    updateHUD();
    if(state.time <= 0){ endRound(true); } // time survived = win
  }, 1000);

  state.spawner = setInterval(spawn, state.currentSpawn);
}

function endRound(isWin=false){
  clearTimers();
  state.running = false;

  [...UI.play.querySelectorAll('.drop')].forEach(d=>{
    d.style.animationPlayState = 'paused';
  });

  if (isWin) burstConfetti();

  UI.peopleNum.textContent = `${Math.max(0, state.score)} People!`;
  UI.backdrop.style.display = 'flex';
}

function resetAndStart(){
  resetState();
  UI.backdrop.style.display = 'none';
  start();
}

function showStart(){
  clearTimers();
  resetState();
  UI.backdrop.style.display = 'none';
  UI.start.style.display = 'flex';
}

function hideStart(){
  UI.start.style.display = 'none';
}

function spawn(){
  const el = document.createElement('i');

  // decide type
  const r = Math.random();
  let type = 'clean';
  if (r < CFG.obstacleChance) type = 'obstacle';
  else type = (Math.random() < CFG.cleanChance) ? 'clean' : 'dirty';

  el.className = `drop ${type}`;
  el.dataset.type = type;

  const size = 28 + Math.round(Math.random() * 22);
  el.style.width = el.style.height = size + 'px';
  el.style.left = Math.round(Math.random() * (UI.play.clientWidth - size)) + 'px';
  el.style.setProperty('--h', size + 'px');

  const base = 1.2 + Math.random() * 1.2;
  const dur = Math.max(0.5, base / state.speedMul);
  el.style.animation = `fall ${dur}s linear forwards`;

  el.addEventListener('animationend', ()=> checkCollision(el));
  UI.play.appendChild(el);
}

function checkCollision(drop){
  const dropRect = drop.getBoundingClientRect();
  const canRect  = UI.can.getBoundingClientRect();

  if(
    dropRect.bottom >= canRect.top &&
    dropRect.left   <  canRect.right &&
    dropRect.right  >  canRect.left
  ){
    if (drop.dataset.type === 'clean') {
      state.score++;
      state.clean = Math.min(100, state.clean + 10);
      UI.canEl.classList.add('hit');
      UI.scoreCenter.classList.add('pop');
      setTimeout(()=>{
        UI.canEl.classList.remove('hit');
        UI.scoreCenter.classList.remove('pop');
      }, 500);

    } else if (drop.dataset.type === 'dirty') {
      state.score = Math.max(0, state.score - 1);
      state.pollution = Math.min(100, state.pollution + 10);
      state.dirty = Math.min(100, state.dirty + 10);
      UI.qualityBar.classList.add('shake','flash');
      setTimeout(()=>{ UI.qualityBar.classList.remove('shake','flash'); }, 520);

    } else if (drop.dataset.type === 'obstacle') {
      // obstacle: speed up + score penalty
      state.score = Math.max(0, state.score - 2);
      state.speedMul = +(state.speedMul + CFG.speedStep).toFixed(2);
      state.currentSpawn = Math.max(CFG.minSpawn, state.currentSpawn - 80);

      if (state.spawner) { clearInterval(state.spawner); }
      state.spawner = setInterval(spawn, state.currentSpawn);

      if (UI.boostBadge){
        UI.boostBadge.style.display = 'block';
        setTimeout(()=>{ UI.boostBadge.style.display = 'none'; }, 750);
      }

      UI.qualityBar.classList.add('flash','shake');
      setTimeout(()=>{ UI.qualityBar.classList.remove('flash','shake'); }, 520);
    }

    updateHUD();
  }

  drop.remove();
  if(state.pollution >= 100){ endRound(false); } // lose if pollution 100
}

// Drag can left-right
let isDragging = false;
UI.can.addEventListener('pointerdown', ()=>{ isDragging = true; });
document.addEventListener('pointerup',   ()=>{ isDragging = false; });
document.addEventListener('pointermove', (e)=>{
  if(isDragging && state.running){
    const phoneRect = document.querySelector('.phone').getBoundingClientRect();
    const playRect  = UI.play.getBoundingClientRect();
    const canWidth  = UI.can.offsetWidth || 120;

    let x = e.clientX - phoneRect.left - canWidth/2;
    const minX = (playRect.left - phoneRect.left);
    const maxX = (playRect.right - phoneRect.left) - canWidth;
    x = Math.max(minX, Math.min(maxX, x));

    UI.can.style.left = x + 'px';
    UI.can.style.right = 'auto';
    UI.can.style.position = 'absolute';
  }
});

// Simple emoji confetti
function burstConfetti(){
  const emojis = ['🎉','✨','💛','💧','🎊'];
  const N = 36;
  for(let i=0;i<N;i++){
    const s = document.createElement('span');
    s.className = 'confetti';
    s.textContent = emojis[i % emojis.length];
    s.style.left = Math.random()*92 + 'vw';
    s.style.animationDuration = (900 + Math.random()*700) + 'ms';
    s.style.fontSize = (16 + Math.random()*16) + 'px';
    document.body.appendChild(s);
    s.addEventListener('animationend', ()=> s.remove());
  }
}

// Buttons
UI.btnStart  && UI.btnStart.addEventListener('click', ()=>{
  applyDifficulty();
  hideStart();
  resetAndStart();
});
UI.btnReplay && UI.btnReplay.addEventListener('click', resetAndStart);
UI.btnMenu   && UI.btnMenu.addEventListener('click', showStart);
UI.btnReset  && UI.btnReset.addEventListener('click', resetAndStart);

// First load → show start
showStart();
