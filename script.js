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
  btnMenu: document.getElementById('btnMenu'),
  btnReset: document.getElementById('btnReset'),
  // badge
  boostBadge: document.getElementById('boostBadge')
};

const CFG = {
  duration: 30,
  spawn: 600,          // 기본 스폰 간격(ms)
  cleanChance: 0.65,   // 깨끗한 드롭 비율
  obstacleChance: 0.15,// 장애물(빨간 드롭) 확률
  minSpawn: 250,       // 스폰 간격 하한
  speedStep: 0.15      // 장애물 1개당 낙하속도 상승 비율(15%)
};

const state = {
  time: CFG.duration,
  score: 0,
  pollution: 0,
  clean: 0,
  dirty: 0,
  tick: null,
  spawner: null,
  running: false,     // 처음엔 시작 화면
  // 속도/스폰 제어
  speedMul: 1,           // 낙하 속도 배수 (1 = 기본)
  currentSpawn: CFG.spawn// 현재 스폰 간격(ms)
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

function resetState(){
  state.time = CFG.duration;
  state.score = 0;
  state.pollution = 0;
  state.clean = 0;
  state.dirty = 0;
  state.running = false;

  // 속도/스폰 리셋
  state.speedMul = 1;
  state.currentSpawn = CFG.spawn;

  UI.play.innerHTML = '';
  updateHUD();
}

function start(){
  clearTimers();
  state.running = true;
  updateHUD();

  state.tick = setInterval(()=>{
    state.time--;
    updateHUD();
    if(state.time <= 0){ endRound(true); } // 시간 완주 = 승리
  }, 1000);

  // 현재 스폰 간격으로 시작
  state.spawner = setInterval(spawn, state.currentSpawn);
}

function endRound(isWin=false){
  clearTimers();
  state.running = false;

  // pause remaining drops
  [...UI.play.querySelectorAll('.drop')].forEach(d=>{
    d.style.animationPlayState = 'paused';
  });

  // 승리면 컨페티!
  if (isWin) burstConfetti();

  // show end modal
  UI.peopleNum.textContent = `${Math.max(0, state.score)} People!`;
  UI.backdrop.style.display = 'flex';
}

function resetAndStart(){   // Play Again / Reset → 즉시 재시작
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

  // 타입 결정: obstacle(빨간) 우선 → 아니면 clean/dirty
  const r = Math.random();
  let type = 'clean';
  if (r < CFG.obstacleChance) {
    type = 'obstacle';
  } else {
    type = (Math.random() < CFG.cleanChance) ? 'clean' : 'dirty';
  }

  el.className = `drop ${type}`;
  el.dataset.type = type;

  const size = 28 + Math.round(Math.random() * 22);
  el.style.width = el.style.height = size + 'px';
  el.style.left = Math.round(Math.random() * (UI.play.clientWidth - size)) + 'px';

  // 기본 낙하시간(1.2~2.4s)을 현재 속도배율로 나눠 더 빠르게
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
      // === 레벨업 효과: 더 빠르게 + 점수 -2 ===
      state.score = Math.max(0, state.score - 2);            // 요청: -2점
      state.speedMul = +(state.speedMul + CFG.speedStep).toFixed(2); // 낙하 가속
      state.currentSpawn = Math.max(CFG.minSpawn, state.currentSpawn - 80); // 스폰 빨라짐

      // 스포너 재설정
      if (state.spawner) { clearInterval(state.spawner); }
      state.spawner = setInterval(spawn, state.currentSpawn);

      // 배지 표시
      if (UI.boostBadge){
        UI.boostBadge.style.display = 'block';
        setTimeout(()=>{ UI.boostBadge.style.display = 'none'; }, 750);
      }

      // 시각 피드백(빨간 플래시 + 흔들림 재사용)
      UI.qualityBar.classList.add('flash','shake');
      setTimeout(()=>{ UI.qualityBar.classList.remove('flash','shake'); }, 520);
    }

    updateHUD();
  }

  drop.remove();
  if(state.pollution >= 100){ endRound(false); } // 오염 100 = 패배
}

// Drag can left-right across the play area width (양끝까지 이동 보정)
let isDragging = false;
UI.can.addEventListener('pointerdown', ()=>{ isDragging = true; });
document.addEventListener('pointerup',   ()=>{ isDragging = false; });
document.addEventListener('pointermove', (e)=>{
  if(isDragging && state.running){
    const phoneRect = document.querySelector('.phone').getBoundingClientRect();
    const playRect  = UI.play.getBoundingClientRect();
    const canWidth  = UI.can.offsetWidth || 120;

    // phone 좌표계에서의 x
    let x = e.clientX - phoneRect.left - canWidth/2;

    // 이동 한계를 #play 좌우 끝으로 제한
    const minX = (playRect.left - phoneRect.left);
    const maxX = (playRect.right - phoneRect.left) - canWidth;

    x = Math.max(minX, Math.min(maxX, x));

    UI.can.style.left = x + 'px';
    UI.can.style.right = 'auto';
    UI.can.style.position = 'absolute';
  }
});

// Confetti (승리 시 간단 이모지 컨페티)
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
UI.btnStart  && UI.btnStart.addEventListener('click', ()=>{ hideStart(); resetAndStart(); });
UI.btnReplay && UI.btnReplay.addEventListener('click', resetAndStart);
UI.btnMenu   && UI.btnMenu.addEventListener('click', showStart);
UI.btnReset  && UI.btnReset.addEventListener('click', resetAndStart);

// 첫 진입 → 시작 화면 보이기
showStart();
