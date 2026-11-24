"use strict";

/*
    MATH DUNGEON
    Simple educational dungeon game
    Uses only vanilla JavaScript.
*/

// =========================
// GAME STATE
// =========================

const game = {
    player: {
        maxHp: 100,
        hp: 100,
        xp: 0,
        level: 1,
        xpToNextLevel: 100
    },

    floor: 1,
    room: 1,
    maxFloors: 5,

    enemy: null,

    currentQuestion: null,
    acceptingAnswers: true,
    gameOver: false,
    victory: false
};


// =========================
// ENEMY DATA
// =========================

const normalEnemies = [
    {
        name: "Dungeon Slime",
        icon: "👾",
        hp: 30
    },
    {
        name: "Cave Goblin",
        icon: "👹",
        hp: 40
    },
    {
        name: "Dark Skeleton",
        icon: "💀",
        hp: 50
    },
    {
        name: "Shadow Beast",
        icon: "🐺",
        hp: 65
    }
];

const bossEnemy = {
    name: "Math Dragon",
    icon: "🐉",
    hp: 150
};


// =========================
// DOM ELEMENTS
// =========================

const floorDisplay = document.getElementById("floorDisplay");
const roomText = document.getElementById("roomText");

const playerHpBar = document.getElementById("playerHpBar");
const playerHpText = document.getElementById("playerHpText");

const xpBar = document.getElementById("xpBar");
const xpText = document.getElementById("xpText");
const levelText = document.getElementById("levelText");

const enemyElement = document.getElementById("enemy");
const enemyName = document.getElementById("enemyName");
const enemyHpBar = document.getElementById("enemyHpBar");
const enemyHpText = document.getElementById("enemyHpText");

const playerElement = document.getElementById("player");

const questionElement = document.getElementById("question");
const answersElement = document.getElementById("answers");
const feedbackElement = document.getElementById("feedback");
const questionDifficulty = document.getElementById("questionDifficulty");

const attackEffect = document.getElementById("attackEffect");
const damageText = document.getElementById("damageText");

const gameMessage = document.getElementById("gameMessage");
const messageIcon = document.getElementById("messageIcon");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");
const restartButton = document.getElementById("restartButton");


// =========================
// UTILITY FUNCTIONS
// =========================

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}


// =========================
// QUESTION GENERATION
// =========================

function generateQuestion() {
    let question;

    /*
        Difficulty is based on the floor.

        Floor 1:
        Addition

        Floor 2:
        Subtraction

        Floor 3:
        Multiplication

        Floor 4:
        Division

        Floor 5:
        Algebra
    */

    if (game.floor === 1) {
        question = generateAddition();
    }
    else if (game.floor === 2) {
        question = generateSubtraction();
    }
    else if (game.floor === 3) {
        question = generateMultiplication();
    }
    else if (game.floor === 4) {
        question = generateDivision();
    }
    else {
        question = generateAlgebra();
    }

    game.currentQuestion = question;

    displayQuestion(question);
}


function generateAddition() {
    const max = 10 + game.floor * 10;

    const a = randomInt(1, max);
    const b = randomInt(1, max);

    return {
        text: `What is ${a} + ${b}?`,
        answer: a + b,
        difficulty: "Addition"
    };
}


function generateSubtraction() {
    const max = 20 + game.floor * 15;

    let a = randomInt(10, max);
    let b = randomInt(1, a);

    return {
        text: `What is ${a} − ${b}?`,
        answer: a - b,
        difficulty: "Subtraction"
    };
}


function generateMultiplication() {
    const max = 5 + game.floor * 4;

    const a = randomInt(2, max);
    const b = randomInt(2, max);

    return {
        text: `What is ${a} × ${b}?`,
        answer: a * b,
        difficulty: "Multiplication"
    };
}


function generateDivision() {
    const divisor = randomInt(2, 12);

    const answer = randomInt(2, 12);

    const dividend = divisor * answer;

    return {
        text: `What is ${dividend} ÷ ${divisor}?`,
        answer: answer,
        difficulty: "Division"
    };
}


function generateAlgebra() {
    /*
        Creates equations such as:

        3x + 5 = 20
        4x + 2 = 18

        The solution is always an integer.
    */

    const x = randomInt(2, 10);
    const coefficient = randomInt(2, 6);
    const constant = randomInt(1, 10);

    const result = coefficient * x + constant;

    return {
        text: `Solve: ${coefficient}x + ${constant} = ${result}`,
        answer: x,
        difficulty: "Algebra"
    };
}


// =========================
// ANSWER CHOICES
// =========================

function createAnswerChoices(correctAnswer) {
    const choices = [correctAnswer];

    /*
        Keep generating incorrect answers until
        there are four unique choices.
    */

    while (choices.length < 4) {
        let difference = randomInt(1, 10);

        if (Math.random() < 0.5) {
            difference *= -1;
        }

        const wrongAnswer = correctAnswer + difference;

        if (
            wrongAnswer !== correctAnswer &&
            wrongAnswer >= 0 &&
            !choices.includes(wrongAnswer)
        ) {
            choices.push(wrongAnswer);
        }
    }

    return shuffle(choices);
}


// =========================
// DISPLAY QUESTION
// =========================

function displayQuestion(question) {
    questionElement.textContent = question.text;
    questionDifficulty.textContent = question.difficulty;

    answersElement.innerHTML = "";

    const choices = createAnswerChoices(question.answer);

    choices.forEach(choice => {
        const button = document.createElement("button");

        button.className = "answer-button";
        button.textContent = choice;

        button.addEventListener("click", () => {
            checkAnswer(choice, button);
        });

        answersElement.appendChild(button);
    });

    feedbackElement.textContent = "Answer the question to attack!";
    feedbackElement.className = "feedback";
}


// =========================
// CHECK ANSWER
// =========================

function checkAnswer(selectedAnswer, selectedButton) {

    // Prevent multiple answers during animations.
    if (!game.acceptingAnswers || game.gameOver || game.victory) {
        return;
    }

    game.acceptingAnswers = false;

    const buttons = document.querySelectorAll(".answer-button");

    buttons.forEach(button => {
        button.disabled = true;

        if (
            Number(button.textContent) === game.currentQuestion.answer
        ) {
            button.classList.add("correct");
        }
    });

    if (selectedAnswer === game.currentQuestion.answer) {
        selectedButton.classList.add("correct");

        correctAnswer();
    }
    else {
        selectedButton.classList.add("wrong");

        wrongAnswer();
    }
}


// =========================
// CORRECT ANSWER
// =========================

function correctAnswer() {

    const damage = randomInt(10, 16) + game.player.level * 2;

    game.enemy.hp -= damage;

    if (game.enemy.hp < 0) {
        game.enemy.hp = 0;
    }

    updateEnemyUI();

    feedbackElement.textContent =
        `Correct! You deal ${damage} damage!`;

    feedbackElement.className = "feedback good";

    animateAttack();

    showDamage(`-${damage}`);

    if (game.enemy.hp <= 0) {
        defeatEnemy();
        return;
    }

    /*
        Give XP for every successful attack.
    */

    gainXP(25);

    setTimeout(() => {
        if (!game.gameOver && !game.victory) {
            generateQuestion();
            game.acceptingAnswers = true;
        }
    }, 850);
}


// =========================
// WRONG ANSWER
// =========================

function wrongAnswer() {

    const damage = randomInt(8, 14);

    game.player.hp -= damage;

    if (game.player.hp < 0) {
        game.player.hp = 0;
    }

    updatePlayerUI();

    feedbackElement.textContent =
        `Wrong! The correct answer is ${game.currentQuestion.answer}. You take ${damage} damage.`;

    feedbackElement.className = "feedback bad";

    playerElement.classList.add("hurt");

    setTimeout(() => {
        playerElement.classList.remove("hurt");
    }, 400);

    showDamage(`-${damage}`);

    if (game.player.hp <= 0) {
        endGame();
        return;
    }

    setTimeout(() => {
        if (!game.gameOver && !game.victory) {
            generateQuestion();
            game.acceptingAnswers = true;
        }
    }, 1400);
}


// =========================
// ENEMY DEFEATED
// =========================

function defeatEnemy() {

    game.acceptingAnswers = false;

    enemyElement.classList.add("enemy-defeated");

    feedbackElement.textContent =
        `${game.enemy.name} defeated! +50 XP`;

    feedbackElement.className = "feedback good";

    gainXP(50);

    /*
        Wait for the defeat animation.
    */

    setTimeout(() => {

        enemyElement.classList.remove("enemy-defeated");

        /*
            Final boss defeated.
        */

        if (game.floor === game.maxFloors) {
            showVictory();
            return;
        }

        /*
            Move to the next floor.
        */

        game.floor++;
        game.room++;

        prepareNextFloor();

    }, 900);
}


// =========================
// NEXT FLOOR
// =========================

function prepareNextFloor() {

    floorDisplay.textContent = `Floor ${game.floor}`;

    roomText.textContent = getFloorName();

    spawnEnemy();

    /*
        Small pause before the new question appears.
    */

    setTimeout(() => {
        generateQuestion();
        game.acceptingAnswers = true;
    }, 500);
}


function getFloorName() {

    switch (game.floor) {
        case 1:
            return "THE SLIME CAVES";

        case 2:
            return "THE GOBLIN HALLS";

        case 3:
            return "THE SKELETON CRYPT";

        case 4:
            return "THE SHADOW CHAMBER";

        case 5:
            return "THE DRAGON'S LAIR";

        default:
            return "THE DUNGEON";
    }
}


// =========================
// SPAWN ENEMY
// =========================

function spawnEnemy() {

    let enemyData;

    if (game.floor === game.maxFloors) {

        enemyData = {
            ...bossEnemy
        };

    }
    else {

        /*
            Choose an enemy based on the floor.
        */

        const possibleEnemies =
            normalEnemies.slice(
                0,
                Math.min(game.floor + 1, normalEnemies.length)
            );

        enemyData = {
            ...possibleEnemies[
                randomInt(0, possibleEnemies.length - 1)
            ]
        };

        /*
            Increase HP on later floors.
        */

        enemyData.hp += (game.floor - 1) * 10;
    }

    game.enemy = {
        name: enemyData.name,
        icon: enemyData.icon,
        maxHp: enemyData.hp,
        hp: enemyData.hp
    };

    enemyElement.textContent = game.enemy.icon;

    /*
        Recreate enemy information after replacing
        the element's text content.
    */

    const nameElement = document.createElement("div");
    nameElement.className = "enemy-name";
    nameElement.id = "enemyName";
    nameElement.textContent = game.enemy.name;

    const hpContainer = document.createElement("div");
    hpContainer.className = "enemy-hp";

    const hpBar = document.createElement("div");
    hpBar.id = "enemyHpBar";
    hpBar.className = "bar-fill enemy-bar";

    hpContainer.appendChild(hpBar);

    const hpText = document.createElement("div");
    hpText.id = "enemyHpText";
    hpText.textContent =
        `${game.enemy.hp} / ${game.enemy.maxHp}`;

    enemyElement.appendChild(nameElement);
    enemyElement.appendChild(hpContainer);
    enemyElement.appendChild(hpText);

    /*
        Refresh references because the old elements
        were replaced.
    */

    enemyName = document.getElementById("enemyName");
    enemyHpBar = document.getElementById("enemyHpBar");
    enemyHpText = document.getElementById("enemyHpText");

    updateEnemyUI();
}


// =========================
// PLAYER XP
// =========================

function gainXP(amount) {

    game.player.xp += amount;

    let leveledUp = false;

    while (game.player.xp >= game.player.xpToNextLevel) {

        game.player.xp -= game.player.xpToNextLevel;

        game.player.level++;

        game.player.xpToNextLevel =
            Math.floor(game.player.xpToNextLevel * 1.25);

        /*
            Reward the player with some HP.
        */

        game.player.hp += 15;

        if (game.player.hp > game.player.maxHp) {
            game.player.hp = game.player.maxHp;
        }

        leveledUp = true;
    }

    updatePlayerUI();

    if (leveledUp) {
        showLevelUp();
    }
}


// =========================
// LEVEL UP ANIMATION
// =========================

function showLevelUp() {

    levelText.classList.add("level-up");

    feedbackElement.textContent =
        `⭐ LEVEL UP! You are now level ${game.player.level}!`;

    feedbackElement.className = "feedback good";

    setTimeout(() => {
        levelText.classList.remove("level-up");
    }, 800);
}


// =========================
// UI UPDATES
// =========================

function updatePlayerUI() {

    const hpPercentage =
        (game.player.hp / game.player.maxHp) * 100;

    playerHpBar.style.width =
        `${Math.max(0, hpPercentage)}%`;

    playerHpText.textContent =
        `${game.player.hp} / ${game.player.maxHp}`;

    const xpPercentage =
        (game.player.xp / game.player.xpToNextLevel) * 100;

    xpBar.style.width =
        `${Math.min(100, xpPercentage)}%`;

    xpText.textContent =
        `${game.player.xp} / ${game.player.xpToNextLevel}`;

    levelText.textContent =
        game.player.level;
}


function updateEnemyUI() {

    if (!game.enemy) {
        return;
    }

    const percentage =
        (game.enemy.hp / game.enemy.maxHp) * 100;

    enemyHpBar.style.width =
        `${Math.max(0, percentage)}%`;

    enemyHpText.textContent =
        `${game.enemy.hp} / ${game.enemy.maxHp}`;
}


// =========================
// ANIMATIONS
// =========================

function animateAttack() {

    playerElement.classList.remove("attack");

    /*
        Force the browser to restart the animation.
    */

    void playerElement.offsetWidth;

    playerElement.classList.add("attack");

    attackEffect.classList.remove("active");

    void attackEffect.offsetWidth;

    attackEffect.classList.add("active");

    setTimeout(() => {
        playerElement.classList.remove("attack");
    }, 350);
}


function showDamage(text) {

    damageText.textContent = text;

    damageText.classList.remove("show");

    void damageText.offsetWidth;

    damageText.classList.add("show");
}


// =========================
// GAME OVER
// =========================

function endGame() {

    game.gameOver = true;
    game.acceptingAnswers = false;

    showGameMessage(
        "💀",
        "GAME OVER",
        `The dungeon defeated you on Floor ${game.floor}.`
    );
}


// =========================
// VICTORY
// =========================

function showVictory() {

    game.victory = true;
    game.acceptingAnswers = false;

    showGameMessage(
        "🏆",
        "DUNGEON CLEARED!",
        `You defeated the Math Dragon and reached level ${game.player.level}!`
    );
}


// =========================
// GAME MESSAGE
// =========================

function showGameMessage(icon, title, text) {

    messageIcon.textContent = icon;
    messageTitle.textContent = title;
    messageText.textContent = text;

    gameMessage.classList.remove("hidden");
}


// =========================
// RESTART
// =========================

function restartGame() {

    /*
        Completely reset game state without
        refreshing the browser.
    */

    game.player.hp = 100;
    game.player.maxHp = 100;
    game.player.xp = 0;
    game.player.level = 1;
    game.player.xpToNextLevel = 100;

    game.floor = 1;
    game.room = 1;

    game.enemy = null;
    game.currentQuestion = null;

    game.acceptingAnswers = true;
    game.gameOver = false;
    game.victory = false;

    gameMessage.classList.add("hidden");

    floorDisplay.textContent = "Floor 1";
    roomText.textContent = "THE SLIME CAVES";

    enemyElement.className = "character enemy-character";

    updatePlayerUI();

    spawnEnemy();
    generateQuestion();
}


// =========================
// START GAME
// =========================

restartButton.addEventListener("click", restartGame);

restartGame();