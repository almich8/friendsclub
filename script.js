const STORAGE_KEY = 'mhat_friends_bingo_state_v1';
const SEED_KEY = 'mhat_friends_bingo_seed_v1';

const PHRASES = [
  'Знакомься',
  'Общайся',
  'Поддерживай школу',
  'Находи своих',
  'Клуб Друзей Школы-студии МХАТ'
];

const TASK_POOL = [
  '🎭 Был на спектакле Школы-студии МХАТ за последний год',
  '👏 Ходит в театр не реже раза в месяц',
  '🎓 Знаком с выпускником Школы-студии МХАТ',
  '🎬 Работает в театре, кино, медиа или креативной индустрии',
  '☕ Пришёл на встречу с кофе или чаем',
  '🌍 Приехал из другого города',
  '🎶 Любит музыкальный театр',
  '📚 Может назвать любимую пьесу',
  '🗣️ Любит обсуждать спектакли после поклона',
  '🎟️ Уже был на событии клуба раньше',
  '📸 Снимает фото или видео как хобби',
  '🎨 Занимается творчеством в свободное время',
  '🤝 Сегодня здесь впервые',
  '🫶 Поддерживает культурные проекты',
  '🕯️ Может назвать любимого актёра или актрису',
  '🧠 Читал пьесу до просмотра постановки',
  '🏛️ Был на театральной экскурсии или за кулисами',
  '🎤 Не боится публичных выступлений',
  '👫 Привёл сегодня друга или коллегу',
  '🌱 Хочет быть полезным клубу',
  '💬 Легко знакомится первым',
  '📖 Ведёт читательский или зрительский список',
  '🧳 Был на театральном фестивале в другом городе',
  '🎼 Любит театральную музыку или саундтреки',
  '📝 Может порекомендовать современную пьесу',
  '⭐ Мечтает о совместном проекте со школой',
  '🔍 Любит открывать новые имена в театре',
  '🎞️ Смотрит не только спектакли, но и театральные записи',
  '🌆 Часто бывает на культурных событиях в городе',
  '✨ Верит, что театр меняет людей',
  '📅 Уже планирует следующий культурный выход',
  '🤗 Знает, зачем пришёл в Клуб Друзей',
  '🧭 Открыт к новым знакомствам в сообществе',
  '🎫 Часто дарит билеты близким',
  '🏫 Поддерживает образовательные инициативы в искусстве',
  '🤍 Считает, что культура объединяет людей'
];

const gridEl = document.getElementById('bingoGrid');
const modalOverlay = document.getElementById('modalOverlay');
const sheetTitle = document.getElementById('sheetTitle');
const nameInput = document.getElementById('nameInput');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const resetCellBtn = document.getElementById('resetCellBtn');
const resetBtn = document.getElementById('resetBtn');
const filledCountEl = document.getElementById('filledCount');
const leftCountEl = document.getElementById('leftCount');
const lineCountEl = document.getElementById('lineCount');
const winBanner = document.getElementById('winBanner');
const winSubtext = document.getElementById('winSubtext');
const cardSeedEl = document.getElementById('cardSeed');
const tickerTrack = document.getElementById('tickerTrack');

let state = [];
let currentIndex = null;

init();

function init() {
  hydrateTicker();

  const seed = getOrCreateSeed();
  cardSeedEl.textContent = seed;

  const tasks = buildTasks(seed);
  loadState(tasks);
  renderGrid();
  updateStats();

  resetBtn.addEventListener('click', resetGame);
  cancelBtn.addEventListener('click', closeModal);
  saveBtn.addEventListener('click', saveCellName);
  resetCellBtn.addEventListener('click', clearCellName);

  modalOverlay.addEventListener('click', (event) => {
    if (event.target === modalOverlay) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (modalOverlay.hidden) return;

    if (event.key === 'Escape') {
      closeModal();
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      saveCellName();
    }
  });
}

function hydrateTicker() {
  const items = [...PHRASES, ...PHRASES];
  tickerTrack.innerHTML = items
    .map((text) => `<span class="ticker-item">${text}</span>`)
    .join('');
}

function getOrCreateSeed() {
  const existing = localStorage.getItem(SEED_KEY);
  if (existing) return existing;

  const seed = String(Math.floor(1000 + Math.random() * 9000));
  localStorage.setItem(SEED_KEY, seed);
  return seed;
}

function buildTasks(seed) {
  const arr = [...TASK_POOL];
  const random = mulberry32(Number(seed));

  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  const picked = arr.slice(0, 24);
  const result = [];
  let taskIndex = 0;

  for (let i = 0; i < 25; i += 1) {
    if (i === 12) {
      result.push({ text: '⭐ FREE', free: true, name: '', filled: true });
    } else {
      result.push({ text: picked[taskIndex], free: false, name: '', filled: false });
      taskIndex += 1;
    }
  }

  return result;
}

function loadState(tasks) {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    state = tasks;
    persist();
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length !== 25) throw new Error('Invalid state');

    state = tasks.map((task, idx) => {
      if (task.free) return task;

      const savedCell = parsed[idx] || {};
      const name = typeof savedCell.name === 'string' ? savedCell.name : '';

      return {
        ...task,
        name,
        filled: Boolean(name.trim())
      };
    });
  } catch {
    state = tasks;
    persist();
  }
}

function renderGrid() {
  gridEl.innerHTML = '';

  const lineIndexes = collectLineIndexes();

  state.forEach((cell, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cell';
    button.setAttribute('role', 'gridcell');

    if (cell.free) button.classList.add('free');
    if (cell.filled && !cell.free) button.classList.add('filled');
    if (lineIndexes.has(index)) button.classList.add('in-line');

    button.innerHTML = `<span class="task-text">${cell.text}</span>`;

    if (cell.filled && !cell.free && cell.name) {
      const nameTag = document.createElement('span');
      nameTag.className = 'name-tag';
      nameTag.textContent = `${cell.name} ✓`;
      button.appendChild(nameTag);
    }

    if (cell.free) {
      button.setAttribute('aria-label', 'Свободная клетка');
      button.disabled = true;
    } else {
      button.setAttribute('aria-label', `Клетка: ${cell.text}`);
      button.addEventListener('click', () => openModal(index));
    }

    gridEl.appendChild(button);
  });
}

function openModal(index) {
  currentIndex = index;
  const cell = state[index];

  sheetTitle.textContent = cell.text;
  nameInput.value = cell.name || '';

  modalOverlay.hidden = false;
  nameInput.focus();
}

function closeModal() {
  modalOverlay.hidden = true;
  currentIndex = null;
}

function saveCellName() {
  if (currentIndex === null) return;

  const value = nameInput.value.trim();
  if (!value) {
    nameInput.focus();
    return;
  }

  state[currentIndex].name = value;
  state[currentIndex].filled = true;

  persist();
  renderGrid();
  updateStats();
  closeModal();
}

function clearCellName() {
  if (currentIndex === null) return;

  state[currentIndex].name = '';
  state[currentIndex].filled = false;

  persist();
  renderGrid();
  updateStats();
  closeModal();
}

function resetGame() {
  const confirmed = window.confirm('Точно начать заново? Все заполненные клетки будут очищены.');
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SEED_KEY);
  initFresh();
}

function initFresh() {
  const seed = getOrCreateSeed();
  cardSeedEl.textContent = seed;
  const tasks = buildTasks(seed);
  state = tasks;

  persist();
  renderGrid();
  updateStats();
}

function updateStats() {
  const filled = state.filter((cell) => cell.filled && !cell.free).length;
  const left = 24 - filled;
  const lines = findCompletedLines().length;

  filledCountEl.textContent = String(filled);
  leftCountEl.textContent = String(left);
  lineCountEl.textContent = String(lines);

  if (lines > 0) {
    winBanner.hidden = false;
    winSubtext.textContent =
      lines === 1
        ? 'Покажи карточку организаторам — ты в числе первых!'
        : 'У тебя уже несколько линий — отличный результат!';
  } else {
    winBanner.hidden = true;
  }
}

function findCompletedLines() {
  const lines = [];

  for (let row = 0; row < 5; row += 1) {
    const rowIndexes = [0, 1, 2, 3, 4].map((col) => row * 5 + col);
    if (rowIndexes.every((idx) => state[idx].filled)) lines.push(rowIndexes);
  }

  for (let col = 0; col < 5; col += 1) {
    const colIndexes = [0, 1, 2, 3, 4].map((row) => row * 5 + col);
    if (colIndexes.every((idx) => state[idx].filled)) lines.push(colIndexes);
  }

  const diag1 = [0, 6, 12, 18, 24];
  const diag2 = [4, 8, 12, 16, 20];

  if (diag1.every((idx) => state[idx].filled)) lines.push(diag1);
  if (diag2.every((idx) => state[idx].filled)) lines.push(diag2);

  return lines;
}

function collectLineIndexes() {
  return new Set(findCompletedLines().flat());
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state.map((cell) => ({ name: cell.name || '' })))
  );
}

function mulberry32(a) {
  return function random() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
