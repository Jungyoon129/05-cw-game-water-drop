// script.js
const UI = {
  // playfield & HUD
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
  // modals
  start: document.getElementById('start'),
  backdrop: document.getElementById('backdrop'),
  // modal texts/buttons
  peopleNum: document.getElementById('peopleNum'),
  btnStart: document.getElementById('btnStart'),
  btnReplay: document.getElementById('btnReplay'),
  btnMenu: document.getElementById('btnMenu')
};

const CFG = { duration: 30, spawn: 600, cleanChance: 0.65 };
const state = {
  time: CFG.duration,
  score: 0,
  pollution: 0,
  clean: 0,
  dirty: 0,
  tick: null,
  spawner: null,
  running: false // 처음엔 시작 화면만 보이기
};

function updateHUD(){
  // timer bar
  UI.timeFill.style.width = (state.time / CFG.duration * 100) + '%';

  // dual bar (normalized %)
  const total = state.clean + state.dirty;
  const cPct = total > 0 ? Math.round((state.clean / total) * 100) : 0;
  const dPct = total > 0 ? 100 - cPct : 0;
  UI.cleanFill.style.width = cPct + '%';
  UI.dirtyFill.style.width = dPct + '%';
  UI.cleanPct.textContent = cPct + '%';
  UI.dirtyPct.textContent = dPct + '%';

  // score
  UI.score.textContent = state.score;
}

function clearTimers(){
  if (state.tick)    { clearInterval(state.tick);    state.tick = null; }
  if (state.spawner) { clearInterval(state.spawner); state.spawner = null; }
}

function start(){
  clearTimers();
  state.running = true;
  updateHUD();

  state.tick = setInterval(()=>{
    state.time--;
    updateHUD();
    if(state.time <= 0){ endRound(); }
  }, 1000);

  state.spawner = setInterval(spawn, CFG.spawn);
}

function endRound(){
  clearTimers();
  state.running = false;

  // pause remaining drops
  [...UI.play.querySelectorAll('.drop')].forEach(d=>{
    d.style.animationPlayState = 'paused';
  });

  // show end modal
  UI.peopleNum.textContent = `${Math.max(0, state.score)} People!`;
  UI.backdrop.style.display = 'flex';
}

function resetState(){
  state.time = CFG.duration;
  state.score = 0;
  state.pollution = 0;
  state.clean = 0;
  state.dirty = 0;
  state.running = false;
  UI.play.innerHTML = '';
  updateHUD();
}

function resetAndStart(){   // Play Again → 즉시 재시작
  resetState();
  UI.backdrop.style.display = 'none'; // 엔드 모달 닫기 (중요)
  start();
}

function showStart(){       // Back to Menu → 시작 화면 복귀
  clearTimers();
  resetState();
  UI.backdrop.style.display = 'none';
  UI.start.style.display = 'flex';
}

function hideStart(){       // Start 버튼 누르면 모달 닫기
  UI.start.style.display = 'none';
}

function spawn(){
  const el = document.createElement('i');
  const clean = Math.random() < CFG.cleanChance;
  el.className = 'drop ' + (clean ? 'clean' : 'dirty');
  el.dataset.type = clean ? 'clean' : 'dirty';

  const size = 28 + Math.round(Math.random() * 22);
  el.style.width = el.style.height = size + 'px';
  el.style.left = Math.round(Math.random() * (UI.play.clientWidth - size)) + 'px';

  const dur = 1.2 + Math.random() * 1.2; // fast fall
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
    if(drop.dataset.type === 'clean'){
      state.score++;
      state.clean = Math.min(100, state.clean + 10);

      // animations: boing can + pop score
      UI.canEl.classList.add('hit');
      UI.scoreCenter.classList.add('pop');
      setTimeout(()=>{
        UI.canEl.classList.remove('hit');
        UI.scoreCenter.classList.remove('pop');
      }, 500);
    } else {
      state.score = Math.max(0, state.score - 1);
      state.pollution = Math.min(100, state.pollution + 10);
      state.dirty = Math.min(100, state.dirty + 10);

      // animations: shake & flash the quality bar
      UI.qualityBar.classList.add('shake', 'flash');
      setTimeout(()=>{
        UI.qualityBar.classList.remove('shake', 'flash');
      }, 520);
    }
    updateHUD();
  }

  drop.remove();
  if(state.pollution >= 100){ endRound(); }
}

// Drag can left-right across phone width
let isDragging = false;
UI.can.addEventListener('pointerdown', ()=>{ isDragging = true; });
document.addEventListener('pointerup',   ()=>{ isDragging = false; });
document.addEventListener('pointermove', (e)=>{
  if(isDragging && state.running){
    const phoneRect = document.querySelector('.phone').getBoundingClientRect();
    const canWidth  = UI.can.offsetWidth || 120;
    let x = e.clientX - phoneRect.left - canWidth / 2;
    x = Math.max(0, Math.min(phoneRect.width - canWidth, x));
    UI.can.style.left = x + 'px';
    UI.can.style.right = 'auto';
    UI.can.style.position = 'absolute';
  }
});

// Buttons
UI.btnStart  && UI.btnStart.addEventListener('click', ()=>{ hideStart(); resetAndStart(); });
UI.btnReplay && UI.btnReplay.addEventListener('click', resetAndStart);
UI.btnMenu   && UI.btnMenu.addEventListener('click', showStart);

// 첫 진입 → 시작 화면 보이기
showStart();
