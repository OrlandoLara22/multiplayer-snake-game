/* You run this server with: npx nodemon server.js
   so that the server refreshes when I make changes. This way I don't have to
   constantly kill and restart the server with every change. */

const io = require('socket.io')({
    cors: {
        origin: "https://zealous-lamarr-1caab1.netlify.app",
        //origin: 'http://localhost:8080',
        credentials: true
    },
    allowEIO3: true // This seems to be neccesary for socket.IO v2 clients compatability
});

const { initGame, runGameLoop, getUpdatedVelocity } = require('./game');
const { FRAME_RATE, COUNTDOWN_SECONDS } = require('./constants');
const { makeid } = require('./utils');

// These are global objects
const clientRooms = {};     //This stores the roomNames and is simply used to know what room a specific client is in
const runningGames = {}; //This holds information regarding all the active games

io.on('connection', client => {
    client.on('keydown', handleKeydown);
    client.on('singlePlayerMode', handleSinglePlayerMode);
    client.on('newGame', handleNewGame);
    client.on('joinGame', handleJoinGame);
    client.on('startGame', handleStartGame);
    client.on('resetGame', handleResetGame);
    client.on('disconnect', handleDisconnect);
    console.log('\n\mrooms:');
    console.log(runningGames);
    console.log('\nclient rooms: ');
    console.log(clientRooms);
    function handleKeydown(keyCode){
        const roomName = clientRooms[client.id];
        if (!roomName || !runningGames[roomName].state.active){
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
            runningGames[roomName].state.players[client.number - 1].moves.push({ ...move}); // Append another desired move to the queque
        }
    }

    function handleSinglePlayerMode() {
        let roomName = makeid(5);
        clientRooms[client.id] = roomName;
        client.emit('gameCode', roomName);

        // First create the game object linked to that room 
        runningGames[roomName] = {};
        // Then start adding the game properties such as the state
        runningGames[roomName].state = initGame(false); // true: it is a multiplayer game
        runningGames[roomName].counter = COUNTDOWN_SECONDS;

        client.join(roomName);
        client.number = 1;
        client.emit('playerNumber', client.number);

        // All players have joined, go to game screen
        io.sockets.in(roomName).emit('init', JSON.stringify(runningGames[roomName].state));
    }

    function handleNewGame() {
        let roomName = makeid(5);
        clientRooms[client.id] = roomName;
        client.emit('gameCode', roomName);

        // First create the game object linked to that room 
        runningGames[roomName] = {};
        // Then start adding the game properties such as the state
        runningGames[roomName].state = initGame(true); // true: it is a multiplayer game
        runningGames[roomName].counter = COUNTDOWN_SECONDS;

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
        io.sockets.in(gameCode).emit('init', JSON.stringify(runningGames[gameCode].state));
    }

    function handleStartGame() {
        const roomName = clientRooms[client.id];
        if (!runningGames.hasOwnProperty(roomName)) {
            io.sockets.in(roomName).emit('unknownGame');
            if(clientRooms.hasOwnProperty(client.id)){  // If this client is connected to a room
                delete clientRooms[client.id];
            }
            return;
        }

        if (!runningGames[roomName].state.active && runningGames[roomName].counter === 3){
            startCoundDown(roomName);
        }
    }

    function handleResetGame(roomName) {
        if (!runningGames.hasOwnProperty(roomName)) {   // Check if the room exists
            io.sockets.in(roomName).emit('unknownGame');
            if(clientRooms.hasOwnProperty(client.id)){  // If this client is connected to a room
                delete clientRooms[client.id];
            }
            return;
        }

        clearInterval(runningGames[roomName].gameLoop);     // Stop the game loop
        clearInterval(runningGames[roomName].counterId);    // Stop the countdown
        runningGames[roomName].state.active = false;
        runningGames[roomName].counter = COUNTDOWN_SECONDS;
        
        allClients = io.sockets.adapter.rooms.get(roomName);    // This is an ES6 Set of all client ids in the room
        const numClients = allClients ? allClients.size : 0; 
        
        if (numClients === 1){
            runningGames[roomName].state = initGame(false);
        } else if (numClients > 1){
            runningGames[roomName].state = initGame(true);
        }
        
        io.sockets.in(roomName).emit('init', JSON.stringify(runningGames[roomName].state));
    }

    function handleDisconnect(){ //TODO only delete the game if there are no other players in the game
        console.log('Client Disconnected: ' + client.id );

        if(clientRooms.hasOwnProperty(client.id)){  // If this client is connected to a room
            roomName = clientRooms[client.id];
            if (runningGames.hasOwnProperty(roomName)){ // If the room still exists
                clearInterval(runningGames[roomName].gameLoop);     // Stop the game loop
                clearInterval(runningGames[roomName].counterId);    // Stop the countdown
                delete runningGames[roomName];
            }
            delete clientRooms[client.id];
        }
        
    }
});

function startCoundDown(roomName) {
    runningGames[roomName].counter = COUNTDOWN_SECONDS;

    // These next two lines are to account for the delay at the beginning of setInterval
    emitCounter(roomName, runningGames[roomName].counter);
    runningGames[roomName].counter--;

    runningGames[roomName].counterId = setInterval(() => {
        emitCounter(roomName, runningGames[roomName].counter)  // I still want the 0 to be sent, so this goes first
        
        if (runningGames[roomName].counter <= 0 ){
            runningGames[roomName].state.active = true;
            startGameInterval(roomName);
            clearInterval(runningGames[roomName].counterId);
        } else{
            runningGames[roomName].counter--;
        }
    }, 1000);
}

function startGameInterval(roomName){
    runningGames[roomName].gameLoop = setInterval(() => {
        const loser = runGameLoop(runningGames[roomName].state);
        
        emitGameState(roomName, runningGames[roomName].state); //for single player:  client.emit('gameState', JSON.stringify(state));
        
        if (loser){
            emitGameOver(roomName, loser); //for single player:  client.emit('gameOver');
            clearInterval(runningGames[roomName].gameLoop);
        }
    }, 1000 / FRAME_RATE);
}

function emitCounter(roomName, counter){
    io.sockets.in(roomName).emit('gameCounter', JSON.stringify({ counter }));
}

function emitGameState(roomName, state) {
    io.sockets.in(roomName).emit('gameState', JSON.stringify(state));
}

function emitGameOver(roomName, loser) {
    io.sockets.in(roomName).emit('gameOver', JSON.stringify({ loser }));
}

io.listen(process.env.PORT || 3000);