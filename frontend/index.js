// This is front end Javascript
// To run this just run the following command from the frontend directory:
// npx live-server
const BG_COLOR = '#231f20';
const SNAKE_BODY_COLOR = ['#F48FB1', '#c2c2c2'];
const SNAKE_HEAD_COLOR = ['#F06292', '#757575'];
const FOOD_COLOR = '#CB3535';

// Configure the front end to connect to the backend and as soon as we
// connect we will get the 'init' message
// Since I already have the socket IO library in the HTML so I can use the
// gloabl IO object

const socket = io('https://multiplayer-snake-game-backend.herokuapp.com/');
//const socket = io('http://localhost:3000');
//const socket = io('http://fb48d22cae78.ngrok.io');

socket.on('init', handleInit); // When we hear the init event we call function handleInit
socket.on('gameCounter', handleGameCounter);
socket.on('gameState', handleGameState);
socket.on('gameOver', handleGameOver);
socket.on('gameCode', handleGameCode);
socket.on('unknownGame', handleUnknownGame);
socket.on('tooManyPlayers', handleTooManyPlayers);
socket.on('playerNumber', handlePlayerNumber);

const gameScreen = document.getElementById('gameScreen');
const multiplayerScreen = document.getElementById('multiplayerScreen');
const gameModeSelectionScreen = document.getElementById('gameModeSelectionScreen');
const singlePlayBtn = document.getElementById('singlePlayerButton');
const multiPlayBtn = document.getElementById('multiplayerButton');
const newGameBtn = document.getElementById('newGameButton');
const joinGameBtn = document.getElementById('joinGameButton');
const startGameBtn = document.getElementById('startGameButton');
const resetGameBtn = document.getElementById('resetGameButton');
const gameCodeInput = document.getElementById('gameCodeInput');
const gameCodeDisplay = document.getElementById('gameCodeDisplay');
const playerOneScoreText = document.getElementById('playerOneScoreText');
const playerTwoScoreText = document.getElementById('playerTwoScoreText');
const playerOneScoreValue = document.getElementById('playerOneScoreValue');
const playerTwoScoreValue = document.getElementById('playerTwoScoreValue');
const gameWinnerDisplay = document.getElementById('gameWinnerDisplay');

singlePlayBtn.addEventListener('click', singlePlayerMode);
multiPlayBtn.addEventListener('click', multiplayerMode);
newGameBtn.addEventListener('click', newGame);
joinGameBtn.addEventListener('click', joinGame);
startGameBtn.addEventListener('click', startGame);
resetGameBtn.addEventListener('click', resetGame);

let canvas, ctx;
let playerNumber;
let roomName;

function singlePlayerMode() {
    socket.emit('singlePlayerMode');
}

function multiplayerMode() {
    goToMultiplayerMenu();
}

function newGame() {
    socket.emit('newGame');
}

function joinGame() {
    roomName = gameCodeInput.value;
    socket.emit('joinGame', roomName);
}

function startGame() {
    socket.emit('startGame');
}

function resetGame() {
    socket.emit('resetGame', roomName);
}

function keydown(e){
    //console.log(e.keyCode);
    socket.emit('keydown', e.keyCode);
}

function paintGame(state){
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0,0, canvas.width, canvas.height);

    const food = state.food;
    const gridsize = state.gridsize;
    const size = canvas.width / gridsize; // This is the pixel size per square game 600px/20 sqaures = 30px per square

    ctx.fillStyle = FOOD_COLOR;
    ctx.fillRect(food.x * size, food.y * size, size, size);

    for(let idx=0; idx < state.players.length; idx++){
        paintPlayer(state.players[idx], size, SNAKE_BODY_COLOR[idx], SNAKE_HEAD_COLOR[idx]);
    }
    
    // Update score
    playerOneScoreValue.innerText = state.players[0].score;
    if(state.players.length === 2){
        playerTwoScoreValue.innerText = state.players[1].score;
    }
}

function paintPlayer(playerState, size, bodyColor, headColor){
    const snake = playerState.snake;

    ctx.fillStyle = bodyColor;
    for (let cell of snake ){
        ctx.fillRect(cell.x * size, cell.y * size, size, size);
    }

    ctx.fillStyle = headColor;
    ctx.fillRect(playerState.pos.x * size, playerState.pos.y * size, size, size);
}

function goToMultiplayerMenu() {
    gameModeSelectionScreen.style.display = 'none';
    multiplayerScreen.style.display = 'block';
    gameScreen.style.display = 'none';

    playerNumber = null;
    gameCodeInput.value = "";
    gameCodeDisplay.innerText = "";
}

function goToGameModeSelectionMenu() {
    gameModeSelectionScreen.style.display = 'block';
    multiplayerScreen.style.display = 'none';
    gameScreen.style.display = 'none';

    playerNumber = null;
    gameCodeInput.value = "";
    gameCodeDisplay.innerText = "";
}

function handleInit(gameState) {
    gameState = JSON.parse(gameState);

    // Hide the menu screens and show the game screen
    gameModeSelectionScreen.style.display = 'none';
    multiplayerScreen.style.display = 'none';
    gameScreen.style.display = 'block';

    gameWinnerDisplay.innerText = "Click 'Start Game' to Begin";
    gameWinnerDisplay.style.color = 'black';
    playerOneScoreText.style.color = SNAKE_BODY_COLOR[0];
    playerOneScoreValue.style.color = SNAKE_HEAD_COLOR[0];
    if (gameState.players.length === 2){
        playerTwoScoreText.style.color = SNAKE_BODY_COLOR[1];
        playerTwoScoreValue.style.color = SNAKE_HEAD_COLOR[1];
    } else{
        playerTwoScoreText.innerText = '';
    }

    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    canvas.width = canvas.height = 600;

    ctx.fillStyle = BG_COLOR;
    // void ctx.fillRect(x, y, width, height); this method draws a rectangle
    // with a starting point of (x,y) and a size of width and height
    ctx.fillRect(0,0, canvas.width, canvas.height);

    paintGame(gameState);
    document.addEventListener('keydown', keydown);
}

function handlePlayerNumber(number){
    playerNumber = number;
}

function handleGameCounter(data){
    data = JSON.parse(data);
    gameWinnerDisplay.innerText = "Game Starting in: " + data.counter;

    if (data.counter === 0){
        gameWinnerDisplay.innerText = "GAME ON";
    }
}

function handleGameState(gameState){
    gameState = JSON.parse(gameState);
    requestAnimationFrame(() => paintGame(gameState));
}

function handleGameOver(data) {
    data = JSON.parse(data);

    switch (data.loser) {
        case playerNumber:
            gameWinnerDisplay.innerText = "You Lose!";
            gameWinnerDisplay.style.color = 'red';
            break;
        case 3:
            gameWinnerDisplay.innerText = "It's a Tie!";
            gameWinnerDisplay.style.color = 'blue';
            break;
        default:
            gameWinnerDisplay.innerText = "You Win!";
            gameWinnerDisplay.style.color = 'green';
    }
    document.removeEventListener('keydown', keydown);
}

function handleGameCode(gameCode) {
    gameCodeDisplay.innerText = 'Your Game Code is: ' + gameCode;
    roomName = gameCode;

}

function handleUnknownGame() {
    alert('Game room not valid');
    goToGameModeSelectionMenu();
}

function handleTooManyPlayers() {
    alert('This game is already in progress');
    goToGameModeSelectionMenu();
}