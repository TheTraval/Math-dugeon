"use strict";

/* ======================================================================
   MATH DUNGEON – game.js

   1. Settings            – numbers you can tweak
   2. Dungeon data        – floors and monsters
   3. Math questions      – random question generators
   4. Game state          – everything the game remembers
   5. Page elements       – shortcuts to the HTML
   6. Game flow           – start, answer, attack, next room, win, lose
   7. Screen updates      – bars, text, buttons
   8. Pixel art + canvas  – sprites, background, animations
   9. Start-up
   ====================================================================== */


/* ======================================================================
   1. SETTINGS
   ====================================================================== */
const CONFIG = {
  playerStartHp: 100,
  hpPerLevel: 10,        // max HP gained per level
  levelUpHeal: 25,       // HP restored on level up
  roomClearHeal: 10,     // HP restored when a monster is defeated
  baseDamage: 10,        // damage dealt by a correct answer at level 1
  damagePerLevel: 2,     // extra damage per level
  baseXp: 10,            // XP for a correct answer on floor 1
  xpPerFloor: 2,         // extra XP per floor
  bossXpBonus: 40,       // bonus XP for beating the boss
  feedbackMs: 4000,      // how long the explanation stays before auto-continue
  timeScale: 1           // 1 = normal speed. Smaller = faster (handy for testing)
};

// XP needed to get from `level` to the next level
function xpNeeded(level) {
  return 30 + (level - 1) * 20;
}


/* ======================================================================
   2. DUNGEON DATA
   hp = monster HP, damage = HP the hero loses on a wrong answer.
   (Which math topics appear on each floor depends on the level the player
   picks - see MODES just below.)
   ====================================================================== */
const FLOORS = [
  {
    name: "Slime Cellar",
    colors: { brick: "#3b4a6e", mortar: "#1b2236", floor: "#252c44" },
    monsters: [
      { name: "Green Slime", sprite: "slime",     hp: 30, damage: 8 },
      { name: "Blue Slime",  sprite: "slimeBlue", hp: 40, damage: 8 }
    ]
  },
  {
    name: "Bone Hallway",
    colors: { brick: "#52525e", mortar: "#22222a", floor: "#2c2c36" },
    monsters: [
      { name: "Skeleton",   sprite: "skeleton",       hp: 40, damage: 10 },
      { name: "Bone Guard", sprite: "skeletonPurple", hp: 40, damage: 10 }
    ]
  },
  {
    name: "Goblin Vault",
    colors: { brick: "#3f5440", mortar: "#18241a", floor: "#222f24" },
    monsters: [
      { name: "Goblin",       sprite: "goblin",    hp: 50, damage: 12 },
      { name: "Goblin Chief", sprite: "goblinRed", hp: 60, damage: 12 }
    ]
  },
  {
    name: "Troll Depths",
    colors: { brick: "#664634", mortar: "#2a1a12", floor: "#33221a" },
    monsters: [
      { name: "Cave Troll", sprite: "troll", hp: 60, damage: 14 },
      { name: "Ogre",       sprite: "ogre",  hp: 70, damage: 14 }
    ]
  },
  {
    name: "Dragon's Lair",
    colors: { brick: "#582c4e", mortar: "#240f20", floor: "#2e1829" },
    monsters: [
      { name: "Dark Wizard",    sprite: "wizard", hp: 70,  damage: 16 },
      { name: "Ancient Dragon", sprite: "dragon", hp: 120, damage: 20, isBoss: true }
    ]
  }
];


/* ======================================================================
   LEVELS (the player picks one on the title screen)
   topics[i] = question topics used on floor i (a topic listed twice appears
               more often). boss = topics used in the final boss fight.
   boost     = makes the numbers bigger (higher = harder numbers).
   Topics: add sub mul div alg geo pyth trig boss bossArith
   ====================================================================== */
const MODES = {
  easy: {
    label: "Easy", boost: 0,
    topics: [["add"], ["sub", "sub", "add"], ["mul", "mul", "sub"],
             ["div", "div", "mul"], ["add", "sub", "mul", "div"]],
    boss: ["bossArith"]
  },
  medium: {
    label: "Medium", boost: 0,
    topics: [["add"], ["sub", "sub", "add"], ["mul", "mul", "sub"],
             ["div", "div", "mul"], ["alg", "alg", "div"]],
    boss: ["boss"]
  },
  hard: {
    label: "Hard", boost: 3,
    topics: [["mul", "div", "sub"], ["alg", "mul", "div"], ["geo", "geo", "alg"],
             ["geo", "pyth", "alg"], ["pyth", "trig", "geo"]],
    boss: ["trig", "pyth", "boss"]
  }
};


/* ======================================================================
   3. MATH QUESTIONS
   Every generator returns a question object:
     label, intro, expr, outro  -> what is shown
     answer                     -> the correct number
     explanation                -> shown after a wrong answer
     extras                     -> "typical mistake" wrong answers
   `d` is the difficulty = number of rooms cleared so far (0 – 9).
   ====================================================================== */
function randInt(min, max) {            // whole number from min to max (inclusive)
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(list) {
  return list[randInt(0, list.length - 1)];
}
function shuffle(list) {                // Fisher–Yates shuffle (fair)
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// How a question is worded around its highlighted part, and how answers are shown
const ARITH = { intro: "What is ", outro: "?", prefix: "", suffix: "" };
const ALG   = { intro: "If ", outro: ", what is x?", prefix: "x = ", suffix: "" };
function wordStyle(intro, outro, suffix) {
  return { intro: intro, outro: outro, prefix: "", suffix: suffix || "" };
}

function newQuestion(label, expr, answer, explanation, extras, style) {
  style = style || ARITH;
  return {
    label: label,
    intro: style.intro,
    expr: expr,
    outro: style.outro,
    answer: answer,
    explanation: explanation,
    extras: extras,
    choicePrefix: style.prefix,
    choiceSuffix: style.suffix,
    choices: []
  };
}

// 7 + 8
function makeAddition(d) {
  d = Math.min(d, 6);
  const max = 9 + d * 12;
  const min = d === 0 ? 2 : 5;
  const a = randInt(min, max), b = randInt(min, max);
  const answer = a + b;
  return newQuestion("➕ Addition", `${a} + ${b}`, answer,
    `${a} + ${b} = ${answer}`,
    [answer + 10, answer - 10, answer + 1, answer - 1]);
}

// 25 − 9
function makeSubtraction(d) {
  const max = 12 + Math.min(d, 7) * 10;
  const a = randInt(Math.floor(max / 2), max);
  const b = randInt(2, a - 1);
  const answer = a - b;
  return newQuestion("➖ Subtraction", `${a} − ${b}`, answer,
    `${a} − ${b} = ${answer}`,
    [answer + 10, answer - 10, a + b, answer + 1, answer - 1]);
}

// 7 × 8   and later   17 × 6
function makeMultiplication(d) {
  let a, b;
  if (d <= 4)      { a = randInt(3, 12);  b = randInt(3, 9); }
  else if (d <= 6) { a = randInt(12, 25); b = randInt(3, 9); }
  else             { a = randInt(13, 35); b = randInt(4, 9); }
  const answer = a * b;
  let explanation = `${a} × ${b} = ${answer}`;
  if (a >= 11 && a % 10 !== 0) {          // show the "split it up" trick
    const tens = a - (a % 10), ones = a % 10;
    explanation = `${a} × ${b} = (${tens} × ${b}) + (${ones} × ${b}) = ${tens * b} + ${ones * b} = ${answer}`;
  }
  return newQuestion("✖️ Multiplication", `${a} × ${b}`, answer, explanation,
    [answer + a, answer - a, answer + b, answer - b, answer + 10, answer - 10]);
}

// 72 ÷ 8
function makeDivision(d) {
  const easy = d <= 6;
  const b = easy ? randInt(2, 9) : randInt(3, 12);
  const q = easy ? randInt(3, 12) : randInt(4, 15);
  const a = b * q;
  return newQuestion("➗ Division", `${a} ÷ ${b}`, q,
    `${a} ÷ ${b} = ${q}, because ${b} × ${q} = ${a}`,
    [q + 1, q - 1, q + 2, q - 2, b]);
}

// x + 7 = 15,  4x = 28,  x − 6 = 9
function makeAlgebra() {
  const form = randInt(1, 3);
  if (form === 1) {
    const x = randInt(2, 15), a = randInt(2, 20), c = x + a;
    return newQuestion("🔤 Algebra", `x + ${a} = ${c}`, x,
      `x + ${a} = ${c}  →  x = ${c} − ${a} = ${x}`,
      [c + a, x + 1, x - 1, a], ALG);
  }
  if (form === 2) {
    const a = randInt(2, 9), x = randInt(2, 12), c = a * x;
    return newQuestion("🔤 Algebra", `${a}x = ${c}`, x,
      `${a}x = ${c}  →  x = ${c} ÷ ${a} = ${x}`,
      [c - a, x + 1, x - 1, a], ALG);
  }
  const x = randInt(8, 30), a = randInt(2, 7), c = x - a;
  return newQuestion("🔤 Algebra", `x − ${a} = ${c}`, x,
    `x − ${a} = ${c}  →  x = ${c} + ${a} = ${x}`,
    [c - a, c, x + 1, x - 1], ALG);
}

// Boss: 3x + 5 = 20   or   4x − 6 = 22
function makeBossAlgebra() {
  const a = randInt(2, 9), x = randInt(2, 12);
  if (Math.random() < 0.5) {
    const b = randInt(1, 20), c = a * x + b;
    return newQuestion("🐉 Boss Algebra", `${a}x + ${b} = ${c}`, x,
      `${a}x + ${b} = ${c}  →  ${a}x = ${c} − ${b} = ${a * x}  →  x = ${a * x} ÷ ${a} = ${x}`,
      [c - b, c + b, x + 1, x - 1, (c - b) / a + 1], ALG);
  }
  const b = randInt(1, Math.min(20, a * x - 1)), c = a * x - b;
  return newQuestion("🐉 Boss Algebra", `${a}x − ${b} = ${c}`, x,
    `${a}x − ${b} = ${c}  →  ${a}x = ${c} + ${b} = ${a * x}  →  x = ${a * x} ÷ ${a} = ${x}`,
    [c + b, c - b, x + 1, x - 1], ALG);
}

// Boss for the Easy level: a two-step arithmetic problem
function makeBossArithmetic() {
  const form = randInt(1, 4);
  const label = "🐉 Boss Arithmetic";
  if (form === 1) {
    const a = randInt(4, 12), b = randInt(3, 9), c = randInt(5, 30), ab = a * b, ans = ab + c;
    return newQuestion(label, `${a} × ${b} + ${c}`, ans,
      `${a} × ${b} + ${c} = ${ab} + ${c} = ${ans}  (multiply first!)`,
      [a * (b + c), ab, ab - c]);
  }
  if (form === 2) {
    const a = randInt(4, 12), b = randInt(3, 9), ab = a * b, c = randInt(3, Math.min(30, ab - 1)), ans = ab - c;
    return newQuestion(label, `${a} × ${b} − ${c}`, ans,
      `${a} × ${b} − ${c} = ${ab} − ${c} = ${ans}  (multiply first!)`,
      [ab + c, a * (b - c), ab]);
  }
  if (form === 3) {
    const a = randInt(3, 15), b = randInt(3, 15), c = randInt(2, 9), ans = (a + b) * c;
    return newQuestion(label, `(${a} + ${b}) × ${c}`, ans,
      `(${a} + ${b}) × ${c} = ${a + b} × ${c} = ${ans}  (brackets first!)`,
      [a + b * c, a + b + c, a * c + b]);
  }
  const b = randInt(2, 9), q = randInt(3, 12), a = b * q, c = randInt(3, 20), ans = q + c;
  return newQuestion(label, `${a} ÷ ${b} + ${c}`, ans,
    `${a} ÷ ${b} + ${c} = ${q} + ${c} = ${ans}  (divide first!)`,
    [q, ans + 1, ans - 1, b + c]);
}

// Area, perimeter and angles
function makeGeometry() {
  const form = randInt(1, 7);
  const label = "📐 Geometry";
  if (form === 1) {
    const w = randInt(3, 12), h = randInt(3, 12), ans = w * h;
    return newQuestion(label, `${w} cm by ${h} cm`, ans,
      `Area = width × height = ${w} × ${h} = ${ans} cm²`,
      [2 * (w + h), w + h, ans + w, ans - h],
      wordStyle("A rectangle is ", ". What is its area?", " cm²"));
  }
  if (form === 2) {
    const w = randInt(3, 12), h = randInt(3, 12), ans = 2 * (w + h);
    return newQuestion(label, `${w} cm by ${h} cm`, ans,
      `Perimeter = 2 × (${w} + ${h}) = 2 × ${w + h} = ${ans} cm`,
      [w * h, w + h, 2 * w + h, w + 2 * h],
      wordStyle("A rectangle is ", ". What is its perimeter?", " cm"));
  }
  if (form === 3) {
    const s = randInt(3, 14), ans = s * s;
    return newQuestion(label, `${s} cm`, ans,
      `Area = side × side = ${s} × ${s} = ${ans} cm²`,
      [4 * s, 2 * s, ans + s, ans - s],
      wordStyle("A square has sides of ", ". What is its area?", " cm²"));
  }
  if (form === 4) {
    const b = randInt(2, 8) * 2, h = randInt(3, 12), ans = b * h / 2;
    return newQuestion(label, `base ${b} cm and height ${h} cm`, ans,
      `Area = ½ × base × height = ½ × ${b} × ${h} = ${ans} cm²`,
      [b * h, b + h, ans + h, ans - b / 2],
      wordStyle("A triangle has ", ". What is its area?", " cm²"));
  }
  if (form === 5) {
    const a = randInt(30, 80), b = randInt(30, 80), ans = 180 - a - b;
    return newQuestion(label, `${a}° and ${b}°`, ans,
      `Angles in a triangle add up to 180°: 180 − ${a} − ${b} = ${ans}°`,
      [360 - a - b, 180 - a, 90 - b, ans + 10],
      wordStyle("A triangle has angles ", ". What is the third angle?", "°"));
  }
  if (form === 6) {
    let a = randInt(20, 160);
    if (a === 90) a = 100;
    const ans = 180 - a;
    return newQuestion(label, `${a}°`, ans,
      `Angles on a straight line add up to 180°: 180 − ${a} = ${ans}°`,
      [90 - a, 360 - a, a, ans + 10],
      wordStyle("Two angles make a straight line. One is ", ". What is the other?", "°"));
  }
  const a = randInt(10, 80), ans = 90 - a;
  return newQuestion(label, `${a}°`, ans,
    `Angles in a right angle add up to 90°: 90 − ${a} = ${ans}°`,
    [180 - a, a, ans + 10, ans - 10],
    wordStyle("Two angles make a right angle. One is ", ". What is the other?", "°"));
}

// Pythagorean theorem with whole-number answers
const TRIPLES = [[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17],
                 [9, 12, 15], [7, 24, 25], [12, 16, 20], [15, 20, 25],
                 [10, 24, 26], [18, 24, 30], [20, 21, 29], [16, 30, 34], [9, 40, 41]];
function makePythagoras() {
  const t = pick(TRIPLES);
  let a = t[0], b = t[1];
  const c = t[2];
  if (Math.random() < 0.5) { const tmp = a; a = b; b = tmp; }
  if (Math.random() < 0.5) {
    return newQuestion("📐 Pythagoras", `${a} cm and ${b} cm`, c,
      `${a}² + ${b}² = ${a * a} + ${b * b} = ${c * c}, and √${c * c} = ${c}`,
      [a + b, Math.abs(a - b), c + 1, c - 1],
      wordStyle("A right triangle has legs ", ". How long is the hypotenuse?", " cm"));
  }
  return newQuestion("📐 Pythagoras", `${c} cm and one leg ${a} cm`, b,
    `${c}² − ${a}² = ${c * c} − ${a * a} = ${b * b}, and √${b * b} = ${b}`,
    [c - a, c + a, b + 1, b - 1],
    wordStyle("A right triangle has hypotenuse ", ". How long is the other leg?", " cm"));
}

// Basic trigonometry with whole-number answers
const SPECIAL_ANGLES = [
  ["sin", "1/2", 30], ["cos", "1/2", 60], ["tan", "1", 45], ["sin", "1", 90],
  ["sin", "√3/2", 60], ["cos", "√3/2", 30], ["sin", "√2/2", 45], ["cos", "√2/2", 45]
];
function makeTrig() {
  const form = randInt(1, 4);
  const label = "🔺 Trigonometry";
  if (form === 1) {
    const h = randInt(2, 24) * 2, half = h / 2;
    if (Math.random() < 0.5) {
      return newQuestion(label, `30° angle and hypotenuse ${h} cm`, half,
        `sin 30° = 1/2, so opposite = ${h} × 1/2 = ${half} cm`,
        [h, half + 1, half - 1, half * 3],
        wordStyle("A right triangle has a ", ". How long is the side opposite the 30° angle?", " cm"));
    }
    return newQuestion(label, `60° angle and hypotenuse ${h} cm`, half,
      `cos 60° = 1/2, so adjacent = ${h} × 1/2 = ${half} cm`,
      [h, half + 1, half - 1, half * 3],
      wordStyle("A right triangle has a ", ". How long is the side next to (adjacent to) the 60° angle?", " cm"));
  }
  if (form === 2) {
    const a = randInt(3, 20);
    return newQuestion(label, `45° angle and one leg ${a} cm`, a,
      `tan 45° = 1, so both legs are equal: ${a} cm`,
      [a * 2, a + 1, a - 1, a * 3],
      wordStyle("A right triangle has a ", ". How long is the other leg?", " cm"));
  }
  if (form === 3) {
    const t = pick(SPECIAL_ANGLES);
    return newQuestion(label, `${t[0]} θ = ${t[1]}`, t[2],
      `${t[0]} ${t[2]}° = ${t[1]}, so θ = ${t[2]}°`,
      [30, 45, 60, 90, 15],
      wordStyle("If ", ", what is θ? (between 0° and 90°)", "°"));
  }
  const adj = randInt(2, 8), k = randInt(2, 6), opp = adj * k;
  return newQuestion(label, `opposite ${opp} cm and adjacent ${adj} cm`, k,
    `tan θ = opposite ÷ adjacent = ${opp} ÷ ${adj} = ${k}`,
    [k + 1, k - 1, opp - adj, opp + adj],
    wordStyle("In a right triangle, the sides are ", ". What is tan θ?", ""));
}

const QUESTION_MAKERS = {
  add: makeAddition, sub: makeSubtraction, mul: makeMultiplication,
  div: makeDivision, alg: makeAlgebra, boss: makeBossAlgebra,
  bossArith: makeBossArithmetic, geo: makeGeometry, pyth: makePythagoras, trig: makeTrig
};

// Build 3 believable wrong answers, then shuffle all 4 choices.
function makeChoices(correct, extras) {
  const wrong = [];
  const used = new Set([correct]);
  function tryAdd(n) {
    if (wrong.length < 3 && Number.isInteger(n) && n > 0 && !used.has(n)) {
      used.add(n);
      wrong.push(n);
    }
  }
  shuffle(extras).forEach(tryAdd);                                   // typical mistakes first
  shuffle([correct + 1, correct - 1, correct + 2, correct - 2,
           correct + 10, correct - 10]).forEach(tryAdd);             // then close numbers
  for (let i = 0; wrong.length < 3 && i < 200; i++) {
    tryAdd(correct + randInt(-15, 15));                              // last resort
  }
  for (let k = 1; wrong.length < 3; k++) tryAdd(correct + 20 + k);  // can never fail
  return shuffle([correct].concat(wrong));
}

// Pick a topic, make a question, avoid repeating recent ones.
function createQuestion(topics, d) {
  let q;
  for (let tries = 0; tries < 30; tries++) {
    q = QUESTION_MAKERS[pick(topics)](d);
    if (!state.recent.includes(q.expr)) break;
  }
  state.recent.push(q.expr);
  if (state.recent.length > 12) state.recent.shift();
  q.choices = makeChoices(q.answer, q.extras);
  return q;
}


/* ======================================================================
   4. GAME STATE
   phase is the "traffic light" that stops cheating and double clicks:
     title     – start screen
     busy      – animations playing, answers are locked
     question  – waiting for the player to answer
     feedback  – explaining a wrong answer
     gameover / victory – the end. Only the restart / change-level buttons leave these.
   ====================================================================== */
const state = {
  phase: "title",
  mode: "medium",       // "easy" | "medium" | "hard" (picked on the title screen)
  runId: 0,              // changes on every restart so old timers are ignored
  floorIndex: 0,
  roomIndex: 0,
  difficulty: 0,         // rooms cleared so far
  playerHp: 100,
  playerMaxHp: 100,
  level: 1,
  xp: 0,
  enemy: null,
  question: null,
  recent: [],
  feedbackTimer: null,
  stats: { correct: 0, wrong: 0 }
};

// setTimeout that is automatically cancelled by a restart
function later(fn, ms) {
  const myRun = state.runId;
  return setTimeout(function () {
    if (myRun === state.runId) fn();
  }, ms * CONFIG.timeScale);
}


/* ======================================================================
   5. PAGE ELEMENTS
   ====================================================================== */
const $ = (id) => document.getElementById(id);
const els = {
  floorInfo: $("floor-info"), stage: $("stage"), canvas: $("scene"),
  banner: $("banner"), bannerTitle: $("banner-title"), bannerSub: $("banner-sub"),
  levelText: $("level-text"),
  playerHpFill: $("player-hp-fill"), playerHpText: $("player-hp-text"),
  xpFill: $("xp-fill"), xpText: $("xp-text"),
  enemyCard: $("enemy-card"), enemyName: $("enemy-name"), enemyTag: $("enemy-tag"),
  enemyHpFill: $("enemy-hp-fill"), enemyHpText: $("enemy-hp-text"),
  questionType: $("question-type"), questionText: $("question-text"),
  buttons: Array.from(document.querySelectorAll(".answer")),
  feedback: $("feedback"), continueBtn: $("continue-btn"),
  titleScreen: $("title-screen"), gameoverScreen: $("gameover-screen"),
  victoryScreen: $("victory-screen"),
  gameoverStats: $("gameover-stats"), victoryStats: $("victory-stats")
};


/* ======================================================================
   6. GAME FLOW
   ====================================================================== */
// Starts a fresh run. Pass a mode name, or nothing to replay the current mode.
function startGame(mode) {
  if (typeof mode === "string" && MODES[mode]) state.mode = mode;
  state.runId++;                         // cancels every pending timer
  clearTimeout(state.feedbackTimer);
  state.floorIndex = 0;
  state.roomIndex = 0;
  state.difficulty = 0;
  state.playerMaxHp = CONFIG.playerStartHp;
  state.playerHp = CONFIG.playerStartHp;
  state.level = 1;
  state.xp = 0;
  state.enemy = null;
  state.question = null;
  state.recent = [];
  state.stats = { correct: 0, wrong: 0 };
  state.phase = "busy";

  els.titleScreen.hidden = true;
  els.gameoverScreen.hidden = true;
  els.victoryScreen.hidden = true;
  els.banner.classList.remove("show");
  resetEffects();
  loadRoom();
}

function loadRoom() {
  const floor = FLOORS[state.floorIndex];
  const m = floor.monsters[state.roomIndex];
  state.enemy = { name: m.name, sprite: m.sprite, damage: m.damage,
                  isBoss: !!m.isBoss, hp: m.hp, maxHp: m.hp };
  state.difficulty = 0;
  for (let i = 0; i < state.floorIndex; i++) state.difficulty += FLOORS[i].monsters.length;
  state.difficulty += state.roomIndex + MODES[state.mode].boost;

  state.phase = "busy";
  state.question = null;
  fx.enemy = newActorFx();               // monster walks in
  fx.background = getBackground(state.floorIndex);
  clearQuestionUi();
  updateHud();

  if (state.enemy.isBoss) showBanner("🐉 BOSS FIGHT!", m.name);
  else if (state.roomIndex === 0) showBanner(`🏰 Floor ${state.floorIndex + 1}`, floor.name);

  later(askQuestion, 1100);
}

function askQuestion() {
  if (state.phase !== "busy") return;    // only valid between actions
  const mode = MODES[state.mode];
  const topics = state.enemy.isBoss ? mode.boss : mode.topics[state.floorIndex];
  state.question = createQuestion(topics, state.difficulty);
  renderQuestion(state.question);
  state.phase = "question";
}

// Called when the player clicks a button (index 0–3) or presses 1–4
function onAnswer(index) {
  if (state.phase !== "question") return;        // locked: no cheating, no double clicks
  state.phase = "busy";
  const q = state.question;
  const isRight = q.choices[index] === q.answer;
  lockButtons(index, q);
  if (isRight) handleCorrect(q); else handleWrong(q);
}

// Back to the "choose your level" screen
function showTitle() {
  state.runId++;                         // cancels every pending timer
  clearTimeout(state.feedbackTimer);
  state.phase = "title";
  state.floorIndex = 0;
  state.roomIndex = 0;
  state.enemy = null;
  state.question = null;
  els.gameoverScreen.hidden = true;
  els.victoryScreen.hidden = true;
  els.banner.classList.remove("show");
  resetEffects();
  fx.background = getBackground(0);
  clearQuestionUi();
  updateHud();
  els.titleScreen.hidden = false;
}

function playerDamage() {
  return CONFIG.baseDamage + (state.level - 1) * CONFIG.damagePerLevel;
}

function handleCorrect() {
  const enemy = state.enemy;
  const dmg = Math.min(playerDamage(), enemy.hp);
  const gain = CONFIG.baseXp + state.floorIndex * CONFIG.xpPerFloor;
  state.stats.correct++;
  enemy.hp -= dmg;

  // attack animation: hero lunges, monster flashes
  fx.player.lunge = 1;
  later(function () { hitEnemy(dmg); }, 170);

  const leveledUp = addXp(gain);
  setFeedback("good", `✅ Correct! You deal ${dmg} damage and earn ${gain} XP.`, "");
  updateHud();

  const extra = leveledUp ? 1500 : 0;
  if (enemy.hp <= 0) later(defeatEnemy, 800 + extra);
  else later(askQuestion, 1100 + extra);
}

function handleWrong(q) {
  const enemy = state.enemy;
  const dmg = Math.min(enemy.damage, state.playerHp);
  state.stats.wrong++;
  state.playerHp -= dmg;

  // attack animation: monster lunges, hero flashes
  fx.enemy.lunge = 1;
  later(function () { hitPlayer(dmg); }, 170);

  setFeedback("bad", `❌ Not quite! ${enemy.name} hits you for ${dmg}.`, `💡 ${q.explanation}`);
  updateHud();

  if (state.playerHp <= 0) {
    state.phase = "gameover";            // locked immediately
    later(showGameOver, 2300);
  } else {
    state.phase = "feedback";
    els.continueBtn.hidden = false;
    els.continueBtn.focus();
    state.feedbackTimer = later(continueAfterFeedback, CONFIG.feedbackMs);
  }
}

function continueAfterFeedback() {
  if (state.phase !== "feedback") return;
  clearTimeout(state.feedbackTimer);
  els.continueBtn.hidden = true;
  state.phase = "busy";
  askQuestion();
}

// Gives XP, handles level ups. Returns true if the hero levelled up.
function addXp(amount) {
  state.xp += amount;
  let leveled = false;
  while (state.xp >= xpNeeded(state.level)) {
    state.xp -= xpNeeded(state.level);
    state.level++;
    state.playerMaxHp += CONFIG.hpPerLevel;
    state.playerHp = Math.min(state.playerMaxHp, state.playerHp + CONFIG.levelUpHeal);
    leveled = true;
  }
  if (leveled) {
    showBanner("⭐ LEVEL UP! ⭐", `You are now level ${state.level}`);
    levelUpEffect();
  }
  return leveled;
}

function defeatEnemy() {
  const enemy = state.enemy;
  fx.enemy.dying = true;                 // death animation
  burst(fx.enemyX(), 110, ["#ffffff", "#ffd24a", "#ff7a85", "#c58bff"], 28);
  shakeStage();

  let extra = 0;
  if (enemy.isBoss && addXp(CONFIG.bossXpBonus)) extra = 1500;
  updateHud();
  later(goToNextRoom, 1200 + extra);
}

function goToNextRoom() {
  const floor = FLOORS[state.floorIndex];
  if (state.roomIndex < floor.monsters.length - 1) {
    state.roomIndex++;                                   // next room on this floor
  } else if (state.floorIndex < FLOORS.length - 1) {
    state.floorIndex++;                                  // go down a floor
    state.roomIndex = 0;
  } else {
    winGame();                                           // the boss was the last room
    return;
  }
  const heal = Math.min(CONFIG.roomClearHeal, state.playerMaxHp - state.playerHp);
  if (heal > 0) {
    state.playerHp += heal;
    addFloater(`+${heal}`, 56, 55, "#43e08a");
  }
  loadRoom();
}

function winGame() {
  state.phase = "victory";               // locked immediately
  fx.winning = true;
  els.victoryStats.textContent = statsText();
  later(function () { els.victoryScreen.hidden = false; }, 2200);
  updateHud();
}

function showGameOver() {
  els.gameoverStats.textContent = statsText();
  els.gameoverScreen.hidden = false;
}

function statsText() {
  const total = state.stats.correct + state.stats.wrong;
  const accuracy = total === 0 ? 0 : Math.round((state.stats.correct / total) * 100);
  return `${MODES[state.mode].label} · Floor ${state.floorIndex + 1} · Hero Lv ${state.level}\n` +
         `${state.stats.correct} correct, ${state.stats.wrong} wrong (${accuracy}%)`;
}


/* ======================================================================
   7. SCREEN UPDATES
   ====================================================================== */
function updateHud() {
  const floor = FLOORS[state.floorIndex];
  els.floorInfo.textContent =
    `🏰 Floor ${state.floorIndex + 1}/${FLOORS.length} · Room ${state.roomIndex + 1}/${floor.monsters.length}` +
    ` · ${MODES[state.mode].label}`;
  els.levelText.textContent = `Lv ${state.level}`;

  setBar(els.playerHpFill, state.playerHp, state.playerMaxHp);
  els.playerHpText.textContent = `${state.playerHp}/${state.playerMaxHp}`;

  const need = xpNeeded(state.level);
  els.xpFill.style.width = (state.xp / need) * 100 + "%";
  els.xpText.textContent = `${state.xp}/${need} XP`;

  const e = state.enemy;
  if (e) {
    els.enemyName.textContent = e.name;
    els.enemyTag.textContent = e.isBoss ? "BOSS" : "";
    els.enemyCard.classList.toggle("boss", e.isBoss);
    setBar(els.enemyHpFill, e.hp, e.maxHp);
    els.enemyHpText.textContent = `${e.hp}/${e.maxHp}`;
  } else {                                   // no monster yet (level-select screen)
    els.enemyName.textContent = "Monster";
    els.enemyTag.textContent = "";
    els.enemyCard.classList.remove("boss");
    setBar(els.enemyHpFill, 0, 1);
    els.enemyHpText.textContent = "–";
  }
}

function setBar(fillEl, value, max) {
  fillEl.style.width = Math.max(0, (value / max) * 100) + "%";
  fillEl.classList.toggle("low", fillEl === els.playerHpFill && value / max <= 0.3);
}

function renderQuestion(q) {
  els.questionType.textContent = q.label;
  els.questionText.textContent = "";
  const expr = document.createElement("span");
  expr.className = "expr" + (q.expr.length > 14 ? " long" : "");   // long text may wrap
  expr.textContent = q.expr;
  els.questionText.append(q.intro, expr, q.outro);
  els.questionText.classList.toggle("wordy", (q.intro + q.expr + q.outro).length > 40);

  els.buttons.forEach(function (btn, i) {
    btn.className = "answer";
    btn.disabled = false;
    btn.querySelector(".value").textContent = q.choicePrefix + q.choices[i] + q.choiceSuffix;
  });
  els.feedback.textContent = "";
  els.feedback.className = "feedback";
  els.continueBtn.hidden = true;
  if (document.activeElement) document.activeElement.blur();   // no accidental Enter presses
}

function clearQuestionUi() {
  els.questionType.textContent = "🧮 Get ready…";
  els.questionText.textContent = "A monster appears!";
  els.buttons.forEach(function (btn) {
    btn.className = "answer";
    btn.disabled = true;
    btn.querySelector(".value").textContent = "–";
  });
  els.feedback.textContent = "";
  els.feedback.className = "feedback";
  els.continueBtn.hidden = true;
}

// Disable all buttons and colour the chosen one + the right one
function lockButtons(chosenIndex, q) {
  els.buttons.forEach(function (btn, i) {
    btn.disabled = true;
    if (q.choices[i] === q.answer) btn.classList.add("correct");
    else if (i === chosenIndex) btn.classList.add("wrong");
  });
}

function setFeedback(kind, mainText, explainText) {
  els.feedback.textContent = "";
  els.feedback.className = "feedback " + kind;
  const main = document.createElement("span");
  main.className = "main";
  main.textContent = mainText;
  els.feedback.append(main);
  if (explainText) {
    const ex = document.createElement("span");
    ex.className = "explain";
    ex.textContent = explainText;
    els.feedback.append(ex);
  }
}

let bannerTimer = null;
function showBanner(title, sub) {
  els.bannerTitle.textContent = title;
  els.bannerSub.textContent = sub || "";
  restartCssAnimation(els.banner, "show");
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(function () { els.banner.classList.remove("show"); }, 1700);
}

function restartCssAnimation(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;                   // forces the browser to restart the animation
  el.classList.add(cls);
}
function shakeStage() { restartCssAnimation(els.stage, "shake"); }


/* ======================================================================
   8. PIXEL ART + CANVAS
   ====================================================================== */
const W = 320, H = 160;      // canvas size (it is scaled up by CSS)
const WALL_H = 100;          // where the wall ends and the floor starts
const FEET_Y = 140;          // where characters stand
const PLAYER_X = 56;         // centre of the hero
const SPRITE_SCALE = 5;      // 1 sprite pixel = 5 canvas pixels

const ctx = els.canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

/* ---------- Sprites: each letter is a colour (see PALETTE) ---------- */
const PALETTE = {
  k: "#171321", w: "#f5f5f5", g: "#63d66a", G: "#2f9a4a",
  r: "#e04646", R: "#9a1f33", y: "#ffd84a", o: "#f08a3c",
  s: "#f0c28f", n: "#8a5a30", N: "#5a3a20", a: "#c4c9d6", A: "#7c8294",
  b: "#3f78d6", B: "#6f8fb3", e: "#ece6d0", p: "#a46ee8", P: "#6a3cb4", c: "#58e0ff"
};

const HERO_ROWS = [
  "......rr........",
  ".....krrk.......",
  "....kaaaak......",
  "...kaaaaaak...w.",
  "...kaakkkak...w.",
  "...kaaaaaak...w.",
  "....kaaaak....w.",
  "..kkbbbbbbkk..w.",
  ".kabbbyybbbak.w.",
  ".kabbbbbbbbakyyy",
  ".kssbbbbbbbsskn.",
  "..kkbbbbbbbk....",
  "....kbbkbbk.....",
  "....kaakaak.....",
  "....kaakaak.....",
  "...kkaak.kaak..."
];

const SLIME_ROWS = [
  "................",
  "................",
  "................",
  "................",
  ".....kkkkkk.....",
  "...kkggggggkk...",
  "..kggggggggggk..",
  ".kgggggggggggGk.",
  ".kggwwgggwwgggk.",
  ".kggwkgggwkgggk.",
  ".kgggggggggggGk.",
  ".kgggkkkkkggggk.",
  ".kGgggggggggGGk.",
  "..kGGGGGGGGGGk..",
  "...kkkkkkkkkk...",
  "................"
];

const SKELETON_ROWS = [
  "................",
  ".....kkkkkk.....",
  "....keeeeeek....",
  "...keeeeeeeek...",
  "...kekkeekkek...",
  "...kerkeekrek...",
  "...keeeeeeeek...",
  "....keekkeek....",
  "....kekekeek....",
  ".....kkkkkk.....",
  "..kkeeekeeekk...",
  ".keeekeeekeeek..",
  ".kek.keeek.kek..",
  "..k..keeek..k...",
  ".....kekek......",
  "....kkk.kkk....."
];

const GOBLIN_ROWS = [
  "................",
  "................",
  "..kk........kk..",
  ".kggk.kkkk.kggk.",
  "..kggkggggkggk..",
  "...kkgggggggkk..",
  "....kgyggygk....",
  "....kgggggggk...",
  "....kgkwwkgk....",
  ".....kkkkkk.....",
  "..kkNNNNNNkk....",
  ".kgkNNnnNNkgk...",
  ".kgkNNNNNNkgk...",
  "..k.kNNNNk.k....",
  "....kgkkgk......",
  "...kkgk.kgkk...."
];

const TROLL_ROWS = [
  "................",
  "....kkkkkkkk....",
  "...kBBBBBBBBk...",
  "..kBBBBBBBBBBk..",
  "..kBBrBBBBrBBk..",
  "..kBBBBBBBBBBk..",
  "..kBBwBBBBwBBk..",
  "...kBBkkkkBBk...",
  "...kwBBBBBBwk...",
  ".kkkBBBBBBBBkkk.",
  "kBBBkBBBBBBkBBBk",
  "kBBBkBBnnBBkBBBk",
  "kBBBkBBBBBBkBBBk",
  ".kkk.kBBBBk.kkk.",
  "....kBBkkBBk....",
  "...kkBBk.kBBkk.."
];

const WIZARD_ROWS = [
  ".......kk.......",
  "......kPPk......",
  ".....kPPPPk.....",
  ".....kPyPPk.....",
  "....kPPPPPPk....",
  "..kkkkkkkkkkkk..",
  "....kssssssk....",
  "....ksrssrsk....",
  "....kwwwwwwk....",
  "...kPwwwwwwPk...",
  "..kPPPwwwwPPPk..",
  "..kPPPPPPPPPPk..",
  ".kPPPyPPPPyPPPk.",
  ".kPPPPPPPPPPPPk.",
  "..kPPPPPPPPPPk..",
  "..kkkkkkkkkkkk.."
];
// the wizard's staff (drawn on column 0)
[[3, "c"], [4, "c"], [5, "n"], [6, "n"], [7, "n"], [8, "n"], [9, "n"], [10, "n"],
 [11, "n"], [12, "n"], [13, "n"], [14, "n"], [15, "n"]].forEach(function (p) {
  WIZARD_ROWS[p[0]] = p[1] + WIZARD_ROWS[p[0]].slice(1);
});

// The dragon is built from rectangles, then outlined automatically.
function buildDragonRows() {
  const DW = 24, DH = 16;
  const g = [];
  for (let y = 0; y < DH; y++) g.push(new Array(DW).fill("."));
  function rect(x, y, w, h, c) {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        if (i >= 0 && i < DW && j >= 0 && j < DH) g[j][i] = c;
  }
  for (let y = 1; y <= 5; y++) {                   // wing
    const left = 17 - Math.round((y - 1) * 1.8);
    rect(left, y, 19 - left, 1, y % 2 ? "R" : "P");
  }
  rect(18, 9, 4, 2, "R"); rect(21, 7, 2, 3, "R");  // tail
  rect(7, 5, 12, 7, "r");                           // body
  rect(7, 10, 12, 2, "R");
  rect(8, 8, 9, 4, "o");                            // belly
  rect(5, 5, 3, 5, "r");                            // neck
  rect(1, 4, 5, 4, "r");                            // head
  rect(0, 6, 3, 3, "r");                            // snout
  rect(0, 8, 4, 1, "R");                            // jaw
  rect(3, 5, 1, 1, "y");                            // eye
  rect(5, 2, 1, 2, "w"); rect(3, 3, 1, 1, "w");    // horns
  rect(1, 9, 1, 1, "w"); rect(3, 9, 1, 1, "w");    // teeth
  rect(8, 12, 3, 3, "R"); rect(15, 12, 3, 3, "R"); // legs
  rect(8, 15, 1, 1, "w"); rect(15, 15, 1, 1, "w"); // claws

  const out = g.map(function (row) { return row.slice(); });
  for (let y = 0; y < DH; y++) {                   // automatic black outline
    for (let x = 0; x < DW; x++) {
      if (g[y][x] !== ".") continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) {
        const nx = x + d[0], ny = y + d[1];
        return nx >= 0 && nx < DW && ny >= 0 && ny < DH && g[ny][nx] !== ".";
      });
      if (near) out[y][x] = "k";
    }
  }
  return out.map(function (row) { return row.join(""); });
}

// Sprite list. "colors" swaps palette letters to make recoloured monsters.
const SPRITE_DEFS = {
  hero:           { rows: HERO_ROWS },
  slime:          { rows: SLIME_ROWS },
  slimeBlue:      { rows: SLIME_ROWS,    colors: { g: "#5fb4ff", G: "#2f73c4" } },
  skeleton:       { rows: SKELETON_ROWS },
  skeletonPurple: { rows: SKELETON_ROWS, colors: { e: "#cdb4f0" } },
  goblin:         { rows: GOBLIN_ROWS },
  goblinRed:      { rows: GOBLIN_ROWS,   colors: { g: "#d9704a", y: "#ffffff" } },
  troll:          { rows: TROLL_ROWS },
  ogre:           { rows: TROLL_ROWS,    colors: { B: "#b9803f", r: "#ffd84a" } },
  wizard:         { rows: WIZARD_ROWS },
  dragon:         { rows: buildDragonRows() }
};

// Turn the letter maps into little canvases (plus white/red/gold silhouettes for flashes)
const sprites = {};
function silhouette(src, color) {
  const c = document.createElement("canvas");
  c.width = src.width; c.height = src.height;
  const g = c.getContext("2d");
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}
Object.keys(SPRITE_DEFS).forEach(function (name) {
  const def = SPRITE_DEFS[name];
  const colors = Object.assign({}, PALETTE, def.colors || {});
  const c = document.createElement("canvas");
  c.width = def.rows[0].length;
  c.height = def.rows.length;
  const g = c.getContext("2d");
  def.rows.forEach(function (row, y) {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === ".") continue;
      g.fillStyle = colors[row[x]];
      g.fillRect(x, y, 1, 1);
    }
  });
  sprites[name] = {
    canvas: c,
    white: silhouette(c, "#ffffff"),
    red: silhouette(c, "#ff2a3c"),
    gold: silhouette(c, "#ffd24a")
  };
});

/* ---------- Animation state ---------- */
const fx = {
  time: 0, last: 0,
  player: null, enemy: null,
  particles: [], floaters: [],
  winning: false,
  background: null
};
function newActorFx() {
  return { lunge: 0, flash: 0, flashColor: "white", glow: 0, enter: 0, deathT: 0, dying: false };
}
function resetEffects() {
  fx.player = newActorFx();
  fx.player.enter = 1;
  fx.enemy = newActorFx();
  fx.particles = [];
  fx.floaters = [];
  fx.winning = false;
}
resetEffects();
fx.enemy.enter = 1;

fx.enemyX = function () {
  return state.enemy && state.enemy.isBoss ? 240 : 256;
};

function hitEnemy(dmg) {
  fx.enemy.flash = 1; fx.enemy.flashColor = "white";
  addFloater(`-${dmg}`, fx.enemyX(), 60, "#ffd24a");
  burst(fx.enemyX(), 95, ["#ffffff", "#ffd24a"], 10);
  shakeStage();
}
function hitPlayer(dmg) {
  fx.player.flash = 1; fx.player.flashColor = "red";
  addFloater(`-${dmg}`, PLAYER_X, 60, "#ff5a6a");
  burst(PLAYER_X, 95, ["#ff5a6a", "#ffffff"], 10);
  restartCssAnimation(els.stage, "hurt");
  shakeStage();
}
function levelUpEffect() {
  fx.player.glow = 1;
  burst(PLAYER_X, 100, ["#ffd24a", "#fff3a0", "#ffffff"], 30, true);
  addFloater("LEVEL UP!", PLAYER_X, 50, "#ffd24a");
}
function addFloater(text, x, y, color) {
  fx.floaters.push({ text: text, x: x, y: y, color: color, age: 0, life: 1.1 });
}
function burst(x, y, colors, count, goUp) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 90;
    fx.particles.push({
      x: x, y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (goUp ? 60 : 30),
      size: 2 + Math.random() * 2,
      color: pick(colors), age: 0, life: 0.6 + Math.random() * 0.5
    });
  }
}

/* ---------- Background (drawn once per floor, then reused) ---------- */
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp((n >> 16) + amount), g = clamp(((n >> 8) & 255) + amount), b = clamp((n & 255) + amount);
  return `rgb(${r},${g},${b})`;
}
const backgrounds = {};
function getBackground(floorIndex) {
  if (!backgrounds[floorIndex]) backgrounds[floorIndex] = buildBackground(FLOORS[floorIndex].colors);
  return backgrounds[floorIndex];
}
function buildBackground(colors) {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");

  // brick wall
  g.fillStyle = colors.mortar;
  g.fillRect(0, 0, W, WALL_H);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const bw = 20, bh = 10;
  for (let row = 0; row * bh < WALL_H; row++) {
    const offset = row % 2 ? -bw / 2 : 0;
    for (let x = offset; x < W; x += bw) {
      g.fillStyle = shade(colors.brick, (rnd() - 0.5) * 18);
      g.fillRect(x + 1, row * bh + 1, bw - 2, bh - 2);
      g.fillStyle = "rgba(255,255,255,0.07)";
      g.fillRect(x + 1, row * bh + 1, bw - 2, 1);
    }
  }
  // shadow where wall meets floor
  const grad = g.createLinearGradient(0, WALL_H - 24, 0, WALL_H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.5)");
  g.fillStyle = grad;
  g.fillRect(0, WALL_H - 24, W, 24);

  // stone floor
  g.fillStyle = colors.floor;
  g.fillRect(0, WALL_H, W, H - WALL_H);
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.fillRect(0, WALL_H, W, 2);
  for (let y = WALL_H + 2, row = 0; y < H; y += 14, row++) {
    g.fillStyle = "rgba(0,0,0,0.3)";
    g.fillRect(0, y, W, 1);
    for (let x = (row % 2) * 20; x < W; x += 40) g.fillRect(x, y, 1, 14);
    g.fillStyle = "rgba(255,255,255,0.04)";
    g.fillRect(0, y + 1, W, 1);
  }

  // stone pillars on the left and right edges
  [0, W - 14].forEach(function (x) {
    g.fillStyle = "#14101f"; g.fillRect(x, 0, 14, WALL_H + 4);
    g.fillStyle = "#2a2340"; g.fillRect(x + (x === 0 ? 0 : 2), 0, 10, WALL_H + 4);
    g.fillStyle = "rgba(255,255,255,0.1)"; g.fillRect(x + (x === 0 ? 2 : 4), 0, 2, WALL_H + 4);
  });
  return c;
}

const vignette = (function () {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 200);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.65)");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  return c;
})();

/* ---------- Drawing helpers ---------- */
const TORCH_XS = [92, 160, 228];

function drawTorch(x, seedOffset) {
  const t = fx.time * 9 + seedOffset;
  const flick = Math.sin(t) * 1.5 + Math.sin(t * 2.3) * 1;
  // soft glow
  const glow = ctx.createRadialGradient(x, 38, 2, x, 38, 42 + flick * 3);
  glow.addColorStop(0, "rgba(255,170,60,0.38)");
  glow.addColorStop(1, "rgba(255,170,60,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 50, 0, 100, 90);
  // bracket
  ctx.fillStyle = "#1a1220"; ctx.fillRect(x - 3, 44, 6, 3);
  ctx.fillStyle = "#6b4a2a"; ctx.fillRect(x - 2, 47, 4, 12);
  // flame
  ctx.fillStyle = "#e8581e"; ctx.fillRect(x - 4, 34 - flick, 8, 11 + flick);
  ctx.fillStyle = "#ffa83a"; ctx.fillRect(x - 3, 36 - flick, 6, 9 + flick);
  ctx.fillStyle = "#ffe27a"; ctx.fillRect(x - 2, 39 - flick, 4, 6);
  ctx.fillStyle = "#ffffff"; ctx.fillRect(x - 1, 42, 2, 3);
}

function drawShadow(x, width) {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x, FEET_Y + 1, width / 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Draws one sprite with its feet at (cx, feetY)
function drawSprite(sp, cx, feetY, o) {
  const w = sp.canvas.width * SPRITE_SCALE;
  const h = sp.canvas.height * SPRITE_SCALE;
  ctx.save();
  ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
  ctx.translate(Math.round(cx), Math.round(feetY));
  ctx.scale(o.scaleX || 1, o.scaleY || 1);
  ctx.drawImage(sp.canvas, -w / 2, -h, w, h);
  if (o.flash) {
    ctx.globalAlpha = (o.alpha === undefined ? 1 : o.alpha) * o.flashAmount;
    ctx.drawImage(sp[o.flash], -w / 2, -h, w, h);
  }
  ctx.restore();
}

function ease(t) { return 1 - Math.pow(1 - t, 3); }

function drawActors() {
  const p = fx.player, e = fx.enemy;

  // ----- enemy -----
  if (state.enemy && e.deathT < 1) {
    const sp = sprites[state.enemy.sprite];
    const baseX = fx.enemyX();
    const slideIn = (1 - ease(e.enter)) * 140;
    const lunge = Math.sin((1 - e.lunge) * Math.PI) * (e.lunge > 0 ? 40 : 0);
    const jitter = e.flash > 0 ? (Math.random() - 0.5) * 4 : 0;
    const bob = Math.sin(fx.time * 3) * 1.5;
    const width = sp.canvas.width * SPRITE_SCALE;
    drawShadow(baseX + slideIn, width * 0.8);
    drawSprite(sp, baseX + slideIn - lunge + jitter, FEET_Y + bob * (e.dying ? 0 : 1), {
      alpha: 1 - e.deathT,
      scaleX: 1 + e.deathT * 0.3,
      scaleY: 1 - e.deathT * 0.9,
      flash: e.flash > 0 ? e.flashColor : (e.dying && Math.floor(fx.time * 20) % 2 ? "white" : null),
      flashAmount: e.dying ? 0.8 : e.flash
    });
  }

  // ----- trophy when winning -----
  if (fx.winning) {
    ctx.font = "44px serif";
    ctx.textAlign = "center";
    ctx.fillText("🏆", fx.enemyX(), 120 - Math.abs(Math.sin(fx.time * 4)) * 14);
  }

  // ----- hero -----
  const hero = sprites.hero;
  const lunge = Math.sin((1 - p.lunge) * Math.PI) * (p.lunge > 0 ? 44 : 0);
  const jitter = p.flash > 0 ? (Math.random() - 0.5) * 4 : 0;
  const bob = Math.sin(fx.time * 3 + 1) * 1.5;
  const jump = fx.winning ? Math.abs(Math.sin(fx.time * 6)) * 16 : 0;
  drawShadow(PLAYER_X + lunge, 60);
  drawSprite(hero, PLAYER_X + lunge + jitter, FEET_Y + bob - jump, {
    flash: p.flash > 0 ? p.flashColor : (p.glow > 0 ? "gold" : null),
    flashAmount: p.flash > 0 ? p.flash : p.glow * 0.6
  });
}

function drawEffects() {
  fx.particles.forEach(function (pt) {
    ctx.globalAlpha = Math.max(0, 1 - pt.age / pt.life);
    ctx.fillStyle = pt.color;
    ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
  });
  ctx.globalAlpha = 1;

  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  fx.floaters.forEach(function (f) {
    ctx.globalAlpha = Math.max(0, 1 - f.age / f.life);
    const y = f.y - f.age * 24;
    ctx.lineWidth = 3; ctx.strokeStyle = "#000";
    ctx.strokeText(f.text, f.x, y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, y);
  });
  ctx.globalAlpha = 1;
}

function updateEffects(dtMs) {
  const dt = dtMs / 1000;
  [fx.player, fx.enemy].forEach(function (a) {
    a.lunge = Math.max(0, a.lunge - dtMs / 350);
    a.flash = Math.max(0, a.flash - dtMs / 350);
    a.glow = Math.max(0, a.glow - dtMs / 1200);
    if (a.enter < 1) a.enter = Math.min(1, a.enter + dtMs / 800);
    if (a.dying && a.deathT < 1) a.deathT = Math.min(1, a.deathT + dtMs / 900);
  });
  fx.particles.forEach(function (pt) {
    pt.age += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 220 * dt;
  });
  fx.particles = fx.particles.filter((pt) => pt.age < pt.life);
  fx.floaters.forEach((f) => (f.age += dt));
  fx.floaters = fx.floaters.filter((f) => f.age < f.life);

  if (fx.winning && Math.random() < 0.6) {               // confetti!
    fx.particles.push({
      x: Math.random() * W, y: -4, vx: (Math.random() - 0.5) * 40, vy: 20 + Math.random() * 40,
      size: 3, age: 0, life: 2.2,
      color: pick(["#ffd24a", "#ff5a6a", "#43e08a", "#5aa9ff", "#c58bff", "#ffffff"])
    });
  }
}

function frame(now) {
  const dt = Math.min(50, now - (fx.last || now));
  fx.last = now;
  fx.time += dt / 1000;
  updateEffects(dt);

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(fx.background, 0, 0);
  TORCH_XS.forEach((x, i) => drawTorch(x, i * 2));
  drawActors();
  drawEffects();
  ctx.drawImage(vignette, 0, 0);
  requestAnimationFrame(frame);
}


/* ======================================================================
   9. START-UP
   ====================================================================== */
els.buttons.forEach(function (btn, i) {
  btn.addEventListener("click", function () { onAnswer(i); });
});
els.continueBtn.addEventListener("click", continueAfterFeedback);
document.querySelectorAll(".mode-btn").forEach(function (btn) {
  btn.addEventListener("click", function () { startGame(btn.dataset.mode); });
});
$("gameover-restart").addEventListener("click", function () { startGame(); });
$("victory-restart").addEventListener("click", function () { startGame(); });
$("gameover-change").addEventListener("click", showTitle);
$("victory-change").addEventListener("click", showTitle);

// Keyboard: 1–4 answer the question (on the title screen 1–3 pick a level)
document.addEventListener("keydown", function (e) {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (state.phase === "title") {
    const modeKeys = { "1": "easy", "2": "medium", "3": "hard" };
    if (modeKeys[e.key]) startGame(modeKeys[e.key]);
    return;
  }
  if (e.key >= "1" && e.key <= "4") onAnswer(Number(e.key) - 1);
});

// Title screen (choose a level) shows the first dungeon floor behind it
fx.background = getBackground(0);
updateHud();
requestAnimationFrame(frame);