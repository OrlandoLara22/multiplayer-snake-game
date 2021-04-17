/* You run this server with: npx nodemon server.js
   so that the server refreshes when I make changes. This way I don't have to
   constantly kill and restart the server with every change. */

/* const io = require('socket.io')({
    cors: {
        origin: "http://localhost:8080",
        credentials: true
    },
    allowEIO3: true // This seems to be neccesary for socket.IO v2 clients compatability
}); */
const io = require('socket.io')({allowEIO3});

const { initGame, gameLoop, getUpdatedVelocity } = require('./game');
const { FRAME_RATE } = require('./constants');
const { makeid } = require('./utils');

// These are global objects
const state = {};
const clientRooms = {};
const gameLoops = {};

io.on('connection', client => {
    client.on('keydown', handleKeydown);
    client.on('singlePlayerMode', handleSinglePlayerMode);
    client.on('newGame', handleNewGame);
    client.on('joinGame', handleJoinGame);
    client.on('startGame', handleStartGame);
    client.on('resetGame', handleResetGame);

    function handleKeydown(keyCode){
        const roomName = clientRooms[client.id];
        if (!roomName){
            return;
        }

        if(!state[roomName].active){
            return;
        }

        try{
            keyCode = parseInt(keyCode);
        } catch(e) {
            console.error(e);
            return;
        }

        const move = getUpdatedVelocity(keyCode);
        if(move){
            state[roomName].players[client.number - 1].moves.push({ ...move}); // Append another desired move to the queque
        }
    }

    function handleSinglePlayerMode() {
        let roomName = makeid(5);
        clientRooms[client.id] = roomName;
        client.emit('gameCode', roomName);

        state[roomName] = initGame(false); // true: it is a multiplayer game

        client.join(roomName);
        client.number = 1;
        client.emit('playerNumber', client.number);

        // All players have joined, go to game screen
        io.sockets.in(roomName).emit('init', JSON.stringify(state[roomName]));
    }

    function handleNewGame() {
        let roomName = makeid(5);
        clientRooms[client.id] = roomName;
        client.emit('gameCode', roomName);

        state[roomName] = initGame(true); // true: it is a multiplayer game

        client.join(roomName);
        client.number = 1;
        client.emit('playerNumber', client.number);
    }

    function handleJoinGame(gameCode) {
        // To join a game, the game has to exist in the first place and
        // there has to be another player waiting to play you
        
        allClients = io.sockets.adapter.rooms.get(gameCode);    // This is an ES6 Set of all client ids in the room
        const numClients = allClients ? allClients.size : 0;    // Get the number of clients in this room

        if ( numClients === 0){
             client.emit('unknownGame');
             return;
        } else if (numClients > 1){
            client.emit('tooManyPlayers');
            return;
        }

        clientRooms[client.id] = gameCode;
        client.join(gameCode);
        client.number = 2;
        client.emit('playerNumber', client.number);
        
        // All players have joined, go to game screen
        io.sockets.in(gameCode).emit('init', JSON.stringify(state[gameCode]));
    }

    function handleStartGame() {
        const roomName = clientRooms[client.id];
        if (!state[roomName].active){
            state[roomName].active = true;
            startGameInterval(roomName);
        }
    }

    function handleResetGame(roomName) {
        clearInterval(gameLoops[roomName]); // Stop the game loop
        
        allClients = io.sockets.adapter.rooms.get(roomName);    // This is an ES6 Set of all client ids in the room
        const numClients = allClients ? allClients.size : 0; 
        
        if (numClients === 1){
            state[roomName] = initGame(false);
        } else if (numClients === 2){
            state[roomName] = initGame(true);
        }
        
        io.sockets.in(roomName).emit('init', JSON.stringify(state[roomName]));
    }
});

function startGameInterval(roomName){
    gameLoops[roomName] = setInterval(() => {
        const loser = gameLoop(state[roomName]);
        
        emitGameState(roomName, state[roomName]); //for single player:  client.emit('gameState', JSON.stringify(state));
        
        if (loser){
            emitGameOver(roomName, loser); //for single player:  client.emit('gameOver');
            clearInterval(gameLoops[roomName]);
        }
    }, 1000 / FRAME_RATE);
}

function emitGameState(roomName, state) {
    io.sockets.in(roomName).emit('gameState', JSON.stringify(state))
}

function emitGameOver(roomName, loser) {
    io.sockets.in(roomName).emit('gameOver', JSON.stringify({ loser }));
}

io.listen(process.env.PORT || 3000);