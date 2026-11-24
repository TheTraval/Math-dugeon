"use strict";

/*
==========================================================
MATH DUNGEON
==========================================================

Controls:
    WASD
    Arrow Keys

Walk into an enemy to begin a math battle.

The game uses a simple tile/grid system.
No external libraries or assets are required.
*/


// ========================================================
// GAME CONFIGURATION
// ========================================================

const TILE_SIZE = 48;

const GRID_WIDTH = 16;
const GRID_HEIGHT = 10;

const MAX_FLOOR = 5;


// ========================================================
// GAME STATE
// ========================================================

const game = {

    floor: 1,

    player: {
        x: 1,
        y: 1,

        maxHp: 100,
        hp: 100,

        xp: 0,
        level: 1,
        xpNeeded: 100
    },

    enemies: [],

    currentEnemy: null,

    currentQuestion: null,

    battleActive: false,

    locked: false,

    victory: false,

    gameOver: false
};


// ========================================================
// DUNGEON DATA
// ========================================================

const floors = [

    {
        name: "THE SLIME CAVES",
        description:
            "Small creatures lurk among the ancient stones.",
        difficulty: "addition"
    },

    {
        name: "THE GOBLIN HALLS",
        description:
            "The goblins have learned to guard their territory.",
        difficulty: "subtraction"
    },

    {
        name: "THE SKELETON CRYPT",
        description:
            "Ancient warriors rise from the darkness.",
        difficulty: "multiplication"
    },

    {
        name: "THE SHADOW CHAMBER",
        description:
            "Only the strongest scholars survive this chamber.",
        difficulty: "division"
    },

    {
        name: "THE DRAGON'S LAIR",
        description:
            "The final guardian awaits your mathematical challenge.",
        difficulty: "algebra"
    }

];


// ========================================================
// ENEMY TYPES
// ========================================================

const enemyTypes = [

    {
        name: "Slime",
        icon: "👾",
        hp: 30
    },

    {
        name: "Goblin",
        icon: "👹",
        hp: 40
    },

    {
        name: "Skeleton",
        icon: "💀",
        hp: 50
    },

    {
        name: "Beast",
        icon: "🐺",
        hp: 65
    }

];


// ========================================================
// DOM
// ========================================================

const dungeon = document.getElementById("dungeon");

const floorName = document.getElementById("floorName");

const playerHpBar =
    document.getElementById("playerHpBar");

const playerHpText =
    document.getElementById("playerHpText");

const xpBar =
    document.getElementById("xpBar");

const xpText =
    document.getElementById("xpText");

const levelText =
    document.getElementById("levelText");

const heroLevel =
    document.getElementById("heroLevel");

const roomTitle =
    document.getElementById("roomTitle");

const roomDescription =
    document.getElementById("roomDescription");

const enemyCount =
    document.getElementById("enemyCount");

const statusMessage =
    document.getElementById("statusMessage");

const battlePanel =
    document.getElementById("battlePanel");

const battleEnemyName =
    document.getElementById("battleEnemyName");

const enemyHpBar =
    document.getElementById("enemyHpBar");

const enemyHpText =
    document.getElementById("enemyHpText");

const question =
    document.getElementById("question");

const answers =
    document.getElementById("answers");

const feedback =
    document.getElementById("feedback");

const overlay =
    document.getElementById("gameOverlay");

const resultIcon =
    document.getElementById("resultIcon");

const resultTitle =
    document.getElementById("resultTitle");

const resultText =
    document.getElementById("resultText");

const restartButton =
    document.getElementById("restartButton");


// ========================================================
// UTILITY
// ========================================================

function randomInt(min, max) {

    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;
}


function shuffle(array) {

    for (
        let i = array.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(Math.random() * (i + 1));

        [array[i], array[j]] =
            [array[j], array[i]];
    }

    return array;
}


// ========================================================
// CREATE DUNGEON
// ========================================================

function createDungeon() {

    /*
        Keep the existing decorative walls.
        Remove only generated tiles/entities.
    */

    dungeon
        .querySelectorAll(
            ".tile, .enemy, .player, .torch, .exit"
        )
        .forEach(element => element.remove());


    /*
        Create the walkable floor.

        Every tile is a real grid coordinate.
    */

    for (let y = 0; y < GRID_HEIGHT; y++) {

        for (let x = 0; x < GRID_WIDTH; x++) {

            const tile =
                document.createElement("div");

            tile.className = "tile floor";

            tile.style.left =
                `${x * TILE_SIZE}px`;

            tile.style.top =
                `${y * TILE_SIZE}px`;

            dungeon.appendChild(tile);
        }
    }


    /*
        Add decorative wall blocks.

        These are visual only. The player remains
        inside the rectangular dungeon.
    */

    createWallDecoration(5, 1);
    createWallDecoration(6, 1);
    createWallDecoration(9, 1);

    createWallDecoration(3, 8);
    createWallDecoration(4, 8);
    createWallDecoration(11, 8);


    /*
        Torches.
    */

    createTorch(2, 1);
    createTorch(13, 1);
    createTorch(2, 8);
    createTorch(13, 8);


    /*
        Exit.
    */

    createExit(
        GRID_WIDTH - 2,
        GRID_HEIGHT - 2
    );
}


// ========================================================
// WALL DECORATION
// ========================================================

function createWallDecoration(x, y) {

    const wall =
        document.createElement("div");

    wall.className =
        "tile wall-tile";

    wall.style.left =
        `${x * TILE_SIZE}px`;

    wall.style.top =
        `${y * TILE_SIZE}px`;

    dungeon.appendChild(wall);
}


// ========================================================
// TORCH
// ========================================================

function createTorch(x, y) {

    const torch =
        document.createElement("div");

    torch.className = "torch";

    torch.textContent = "🔥";

    torch.style.left =
        `${x * TILE_SIZE + 10}px`;

    torch.style.top =
        `${y * TILE_SIZE + 5}px`;

    dungeon.appendChild(torch);
}


// ========================================================
// EXIT
// ========================================================

function createExit(x, y) {

    const exit =
        document.createElement("div");

    exit.className =
        "tile exit";

    exit.textContent = "◆";

    exit.style.left =
        `${x * TILE_SIZE}px`;

    exit.style.top =
        `${y * TILE_SIZE}px`;

    dungeon.appendChild(exit);
}


// ========================================================
// SPAWN PLAYER
// ========================================================

function createPlayer() {

    const player =
        document.createElement("div");

    player.id = "player";

    player.className =
        "tile player";

    player.textContent = "🧙";

    dungeon.appendChild(player);

    updatePlayerPosition();
}


// ========================================================
// PLAYER POSITION
// ========================================================

function updatePlayerPosition() {

    const player =
        document.getElementById("player");

    if (!player) {
        return;
    }

    player.style.left =
        `${game.player.x * TILE_SIZE}px`;

    player.style.top =
        `${game.player.y * TILE_SIZE}px`;
}


// ========================================================
// SPAWN ENEMIES
// ========================================================

function spawnEnemies() {

    game.enemies = [];


    /*
        Floor 1: 3 enemies
        Floor 2: 4
        Floor 3: 5
        Floor 4: 6
        Floor 5: boss
    */

    const enemyAmount =
        game.floor === MAX_FLOOR
            ? 1
            : game.floor + 2;


    if (game.floor === MAX_FLOOR) {

        createEnemy(
            "Math Dragon",
            "🐉",
            150,
            10,
            7,
            true
        );

        return;
    }


    for (
        let i = 0;
        i < enemyAmount;
        i++
    ) {

        const type =
            enemyTypes[
                Math.min(
                    randomInt(0, game.floor),
                    enemyTypes.length - 1
                )
            ];


        /*
            Find a free position.
        */

        let x;
        let y;

        do {

            x = randomInt(2, GRID_WIDTH - 3);
            y = randomInt(2, GRID_HEIGHT - 3);

        } while (
            isOccupied(x, y) ||
            distanceFromPlayer(x, y) < 3
        );


        const hp =
            type.hp +
            (game.floor - 1) * 8;


        createEnemy(
            type.name,
            type.icon,
            hp,
            x,
            y,
            false
        );
    }
}


// ========================================================
// CREATE ENEMY
// ========================================================

function createEnemy(
    name,
    icon,
    hp,
    x,
    y,
    boss
) {

    const enemy = {

        id:
            `enemy-${Date.now()}-${Math.random()}`,

        name,

        icon,

        x,
        y,

        maxHp: hp,

        hp,

        boss,

        element: null
    };


    const element =
        document.createElement("div");

    element.className =
        "tile enemy";

    if (boss) {
        element.classList.add("boss");
    }


    element.textContent = icon;


    /*
        Small name label.
    */

    const label =
        document.createElement("span");

    label.className =
        "enemy-name-tag";

    label.textContent =
        name.toUpperCase();

    element.appendChild(label);


    element.style.left =
        `${x * TILE_SIZE}px`;

    element.style.top =
        `${y * TILE_SIZE}px`;


    element.addEventListener(
        "click",
        () => {

            if (
                !game.battleActive &&
                !game.locked
            ) {

                startBattle(enemy);
            }
        }
    );


    enemy.element = element;

    game.enemies.push(enemy);

    dungeon.appendChild(element);
}


// ========================================================
// POSITION CHECKS
// ========================================================

function isOccupied(x, y) {

    return game.enemies.some(
        enemy =>
            enemy.x === x &&
            enemy.y === y &&
            enemy.hp > 0
    );
}


function distanceFromPlayer(x, y) {

    return Math.abs(
        game.player.x - x
    ) +
    Math.abs(
        game.player.y - y
    );
}


// ========================================================
// MOVEMENT
// ========================================================

function movePlayer(dx, dy) {

    if (
        game.locked ||
        game.battleActive ||
        game.gameOver ||
        game.victory
    ) {
        return;
    }


    const newX =
        game.player.x + dx;

    const newY =
        game.player.y + dy;


    /*
        Keep player inside dungeon.
    */

    if (
        newX < 1 ||
        newX >= GRID_WIDTH - 1 ||
        newY < 1 ||
        newY >= GRID_HEIGHT - 1
    ) {

        return;
    }


    /*
        Decorative walls are blocked.
    */

    if (
        isDecorativeWall(
            newX,
            newY
        )
    ) {

        setStatus(
            "The stone wall blocks your path."
        );

        return;
    }


    /*
        If the tile contains an enemy,
        start a battle instead of moving.
    */

    const enemy =
        game.enemies.find(
            e =>
                e.x === newX &&
                e.y === newY &&
                e.hp > 0
        );


    if (enemy) {

        startBattle(enemy);

        return;
    }


    game.player.x = newX;
    game.player.y = newY;

    updatePlayerPosition();


    const player =
        document.getElementById("player");

    player.classList.remove("moving");

    void player.offsetWidth;

    player.classList.add("moving");


    setTimeout(() => {

        player.classList.remove("moving");

    }, 120);


    /*
        Check whether the player reached
        the exit.
    */

    checkExit();
}


// ========================================================
// DECORATIVE WALL COLLISION
// ========================================================

function isDecorativeWall(x, y) {

    const blocked = [

        "5,1",
        "6,1",
        "9,1",

        "3,8",
        "4,8",
        "11,8"
    ];


    return blocked.includes(
        `${x},${y}`
    );
}


// ========================================================
// EXIT CHECK
// ========================================================

function checkExit() {

    if (
        game.player.x === GRID_WIDTH - 2 &&
        game.player.y === GRID_HEIGHT - 2
    ) {

        const remaining =
            game.enemies.filter(
                enemy => enemy.hp > 0
            );


        if (remaining.length > 0) {

            setStatus(
                `The exit is sealed. ${remaining.length} enemy${remaining.length === 1 ? "" : "ies"} remain.`
            );

            return;
        }


        /*
            If this was the final floor,
            victory.
        */

        if (game.floor === MAX_FLOOR) {

            showVictory();

            return;
        }


        nextFloor();
    }
}


// ========================================================
// NEXT FLOOR
// ========================================================

function nextFloor() {

    game.locked = true;

    game.floor++;


    setTimeout(() => {

        game.player.x = 1;
        game.player.y = 1;

        updateFloorUI();

        createDungeon();

        createPlayer();

        spawnEnemies();

        updateEnemyCount();

        game.locked = false;

        setStatus(
            `Floor ${game.floor}: ${floors[game.floor - 1].description}`
        );

    }, 500);
}


// ========================================================
// FLOOR UI
// ========================================================

function updateFloorUI() {

    const data =
        floors[game.floor - 1];


    floorName.textContent =
        data.name;

    roomTitle.textContent =
        data.name;

    roomDescription.textContent =
        data.description;
}


// ========================================================
// BATTLE START
// ========================================================

function startBattle(enemy) {

    if (
        game.battleActive ||
        game.locked ||
        game.gameOver ||
        game.victory
    ) {
        return;
    }


    game.battleActive = true;

    game.currentEnemy = enemy;


    battlePanel.classList.remove("hidden");


    battleEnemyName.textContent =
        enemy.name.toUpperCase();


    updateEnemyBattleUI();


    setStatus(
        `You encountered a ${enemy.name}. Solve the problem to attack!`
    );


    generateQuestion();


    /*
        Scroll down on small screens.
    */

    battlePanel.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}


// ========================================================
// END BATTLE
// ========================================================

function endBattle() {

    game.battleActive = false;

    game.currentEnemy = null;

    battlePanel.classList.add("hidden");

    updateEnemyCount();

    checkExit();
}


// ========================================================
// GENERATE QUESTION
// ========================================================

function generateQuestion() {

    let result;


    switch (
        floors[game.floor - 1].difficulty
    ) {

        case "addition":
            result = additionQuestion();
            break;

        case "subtraction":
            result = subtractionQuestion();
            break;

        case "multiplication":
            result = multiplicationQuestion();
            break;

        case "division":
            result = divisionQuestion();
            break;

        case "algebra":
            result = algebraQuestion();
            break;
    }


    game.currentQuestion = result;


    question.textContent =
        result.text;


    createAnswers(
        result.answer
    );


    feedback.textContent =
        "Solve the problem to attack.";

    feedback.className = "";
}


// ========================================================
// QUESTION TYPES
// ========================================================

function additionQuestion() {

    const max =
        12 + game.floor * 8;


    const a =
        randomInt(1, max);

    const b =
        randomInt(1, max);


    return {

        text:
            `What is ${a} + ${b}?`,

        answer:
            a + b
    };
}


function subtractionQuestion() {

    const a =
        randomInt(
            15,
            30 + game.floor * 10
        );


    const b =
        randomInt(1, a);


    return {

        text:
            `What is ${a} − ${b}?`,

        answer:
            a - b
    };
}


function multiplicationQuestion() {

    const a =
        randomInt(
            2,
            5 + game.floor * 3
        );


    const b =
        randomInt(
            2,
            5 + game.floor * 2
        );


    return {

        text:
            `What is ${a} × ${b}?`,

        answer:
            a * b
    };
}


function divisionQuestion() {

    const divisor =
        randomInt(2, 12);


    const answer =
        randomInt(
            2,
            6 + game.floor
        );


    return {

        text:
            `What is ${divisor * answer} ÷ ${divisor}?`,

        answer
    };
}


function algebraQuestion() {

    const x =
        randomInt(2, 9);


    const coefficient =
        randomInt(2, 5);


    const constant =
        randomInt(1, 10);


    const result =
        coefficient * x +
        constant;


    return {

        text:
            `Solve: ${coefficient}x + ${constant} = ${result}`,

        answer: x
    };
}


// ========================================================
// CREATE ANSWERS
// ========================================================

function createAnswers(correct) {

    answers.innerHTML = "";


    const choices = [
        correct
    ];


    while (
        choices.length < 4
    ) {

        const offset =
            randomInt(1, 10);


        const direction =
            Math.random() < .5
                ? -1
                : 1;


        const wrong =
            correct +
            offset * direction;


        if (
            wrong >= 0 &&
            !choices.includes(wrong)
        ) {

            choices.push(wrong);
        }
    }


    shuffle(choices);


    choices.forEach(
        value => {

            const button =
                document.createElement("button");


            button.className =
                "answer";


            button.textContent =
                value;


            button.addEventListener(
                "click",
                () => {

                    answerQuestion(
                        value,
                        button
                    );
                }
            );


            answers.appendChild(button);
        }
    );
}


// ========================================================
// ANSWER QUESTION
// ========================================================

function answerQuestion(
    selected,
    selectedButton
) {

    if (
        !game.battleActive ||
        game.locked
    ) {
        return;
    }


    game.locked = true;


    const buttons =
        document.querySelectorAll(
            ".answer"
        );


    buttons.forEach(
        button => {

            button.disabled = true;

            if (
                Number(button.textContent) ===
                game.currentQuestion.answer
            ) {

                button.classList.add(
                    "correct"
                );
            }
        }
    );


    if (
        selected ===
        game.currentQuestion.answer
    ) {

        selectedButton.classList.add(
            "correct"
        );

        correctAnswer();

    } else {

        selectedButton.classList.add(
            "wrong"
        );

        wrongAnswer();
    }
}


// ========================================================
// CORRECT ANSWER
// ========================================================

function correctAnswer() {

    const enemy =
        game.currentEnemy;


    /*
        Damage scales slightly with level.
    */

    const damage =
        randomInt(
            10,
            16
        ) +
        game.player.level * 2;


    enemy.hp -= damage;


    if (enemy.hp < 0) {
        enemy.hp = 0;
    }


    updateEnemyBattleUI();


    feedback.textContent =
        `Correct! You dealt ${damage} damage.`;


    feedback.className =
        "good";


    const player =
        document.getElementById("player");


    player.classList.add("attack");


    setTimeout(() => {

        player.classList.remove(
            "attack"
        );

    }, 300);


    if (enemy.hp <= 0) {

        defeatEnemy();

        return;
    }


    gainXP(20);


    setTimeout(() => {

        if (
            game.battleActive &&
            !game.gameOver
        ) {

            generateQuestion();

            game.locked = false;
        }

    }, 700);
}


// ========================================================
// WRONG ANSWER
// ========================================================

function wrongAnswer() {

    const damage =
        randomInt(8, 14);


    game.player.hp -= damage;


    if (
        game.player.hp < 0
    ) {

        game.player.hp = 0;
    }


    updatePlayerUI();


    feedback.textContent =
        `Incorrect. The answer was ${game.currentQuestion.answer}. You take ${damage} damage.`;


    feedback.className =
        "bad";


    const player =
        document.getElementById("player");


    player.style.filter =
        "drop-shadow(0 0 12px #e85b64)";


    setTimeout(() => {

        player.style.filter = "";

    }, 400);


    if (
        game.player.hp <= 0
    ) {

        showGameOver();

        return;
    }


    setTimeout(() => {

        if (
            game.battleActive &&
            !game.gameOver
        ) {

            generateQuestion();

            game.locked = false;
        }

    }, 1300);
}


// ========================================================
// DEFEAT ENEMY
// ========================================================

function defeatEnemy() {

    const enemy =
        game.currentEnemy;


    enemy.hp = 0;


    enemy.element.classList.add(
        "dead"
    );


    gainXP(
        enemy.boss
            ? 150
            : 50
    );


    setStatus(
        `${enemy.name} defeated! You gained XP.`
    );


    setTimeout(() => {

        if (enemy.element) {

            enemy.element.remove();
        }


        endBattle();

        game.locked = false;

    }, 500);
}


// ========================================================
// ENEMY BATTLE UI
// ========================================================

function updateEnemyBattleUI() {

    const enemy =
        game.currentEnemy;


    if (!enemy) {
        return;
    }


    const percentage =
        Math.max(
            0,
            enemy.hp /
            enemy.maxHp *
            100
        );


    enemyHpBar.style.width =
        `${percentage}%`;


    enemyHpText.textContent =
        `${enemy.hp} / ${enemy.maxHp}`;
}


// ========================================================
// PLAYER XP
// ========================================================

function gainXP(amount) {

    game.player.xp += amount;


    let leveledUp =
        false;


    while (
        game.player.xp >=
        game.player.xpNeeded
    ) {

        game.player.xp -=
            game.player.xpNeeded;


        game.player.level++;


        game.player.xpNeeded =
            Math.floor(
                game.player.xpNeeded *
                1.25
            );


        /*
            Leveling restores some HP.
        */

        game.player.hp =
            Math.min(
                game.player.maxHp,
                game.player.hp + 20
            );


        leveledUp = true;
    }


    updatePlayerUI();


    if (leveledUp) {

        setStatus(
            `LEVEL UP! You are now level ${game.player.level}.`
        );
    }
}


// ========================================================
// PLAYER UI
// ========================================================

function updatePlayerUI() {

    const hpPercentage =
        game.player.hp /
        game.player.maxHp *
        100;


    playerHpBar.style.width =
        `${Math.max(
            0,
            hpPercentage
        )}%`;


    playerHpText.textContent =
        `${game.player.hp} / ${game.player.maxHp}`;


    const xpPercentage =
        game.player.xp /
        game.player.xpNeeded *
        100;


    xpBar.style.width =
        `${Math.min(
            100,
            xpPercentage
        )}%`;


    xpText.textContent =
        `${game.player.xp} / ${game.player.xpNeeded}`;


    levelText.textContent =
        game.player.level;


    heroLevel.textContent =
        game.player.level;
}


// ========================================================
// ENEMY COUNT
// ========================================================

function updateEnemyCount() {

    const remaining =
        game.enemies.filter(
            enemy =>
                enemy.hp > 0
        ).length;


    enemyCount.textContent =
        remaining;
}


// ========================================================
// STATUS MESSAGE
// ========================================================

function setStatus(message) {

    statusMessage.textContent =
        message;
}


// ========================================================
// GAME OVER
// ========================================================

function showGameOver() {

    game.gameOver = true;

    game.battleActive = false;

    game.locked = true;


    battlePanel.classList.add(
        "hidden"
    );


    resultIcon.textContent =
        "💀";


    resultTitle.textContent =
        "YOU DIED";


    resultText.textContent =
        `The dungeon defeated you on Floor ${game.floor}.`;


    overlay.classList.remove(
        "hidden"
    );
}


// ========================================================
// VICTORY
// ========================================================

function showVictory() {

    game.victory = true;

    game.locked = true;

    battlePanel.classList.add(
        "hidden"
    );


    resultIcon.textContent =
        "🏆";


    resultTitle.textContent =
        "DUNGEON CLEARED";


    resultText.textContent =
        `You defeated the Math Dragon and conquered all five floors at level ${game.player.level}.`;


    overlay.classList.remove(
        "hidden"
    );
}


// ========================================================
// RESTART
// ========================================================

function restartGame() {

    game.floor = 1;


    game.player.x = 1;
    game.player.y = 1;

    game.player.hp = 100;

    game.player.maxHp = 100;

    game.player.xp = 0;

    game.player.level = 1;

    game.player.xpNeeded = 100;


    game.enemies = [];

    game.currentEnemy = null;

    game.currentQuestion = null;

    game.battleActive = false;

    game.locked = false;

    game.gameOver = false;

    game.victory = false;


    overlay.classList.add(
        "hidden"
    );


    battlePanel.classList.add(
        "hidden"
    );


    updateFloorUI();

    createDungeon();

    createPlayer();

    spawnEnemies();

    updatePlayerUI();

    updateEnemyCount();


    setStatus(
        "Explore the dungeon. Walk into an enemy to begin a math battle."
    );
}


// ========================================================
// KEYBOARD CONTROLS
// ========================================================

document.addEventListener(
    "keydown",
    event => {

        /*
            Do not allow movement during
            a battle or game-over state.
        */

        if (
            game.battleActive ||
            game.locked ||
            game.gameOver ||
            game.victory
        ) {
            return;
        }


        const key =
            event.key.toLowerCase();


        let dx = 0;
        let dy = 0;


        switch (key) {

            case "w":
            case "arrowup":

                dy = -1;
                break;


            case "s":
            case "arrowdown":

                dy = 1;
                break;


            case "a":
            case "arrowleft":

                dx = -1;
                break;


            case "d":
            case "arrowright":

                dx = 1;
                break;


            default:

                return;
        }


        event.preventDefault();


        movePlayer(
            dx,
            dy
        );
    }
);


// ========================================================
// RESTART BUTTON
// ========================================================

restartButton.addEventListener(
    "click",
    restartGame
);


// ========================================================
// START
// ========================================================

restartGame();