const { GRID_SIZE, PLAYER_ONE, PLAYER_TWO, MULTIPLAYER_SCORE_LIMIT, SINGLE_PLAYER_SCORE_LIMIT } = require('./constants');

module.exports = {
    initGame,
    runGameLoop,
    getUpdatedVelocity,
}

function initGame(multiplayer) {
    const state = createGameState();
    
    state.players.push( JSON.parse(JSON.stringify(PLAYER_ONE))); // This is a dirty trick for a deep copy. Check this: https://www.samanthaming.com/tidbits/70-3-ways-to-clone-objects/
    if (multiplayer){
        state.players.push(JSON.parse(JSON.stringify(PLAYER_TWO)));
    }
    
    randomFood(state);
    return state;
}

function createGameState() {
    return {
        players: [],
        food: {},
        gridsize: GRID_SIZE,
        active: false,
    };
}

function runGameLoop(state){
    if (!state) {
        return;
    }

    let newFoodNeeded = false;
    let loser = 0;
    /*
    0: No one lost
    1: Player One lost
    2: Player Two lost
    3: Both players lost
    */

    for (let player of state.players){
        let previousScore = player.score;
        
        loser += getUpdatedPosition(player, state.food);

        if (state.players.length > 1){
            if(player.score >= MULTIPLAYER_SCORE_LIMIT){
                loser = loser | (~player.id & 0x3);    // This is to indicate that the other player lost
            }
        } else{
            if(player.score >= SINGLE_PLAYER_SCORE_LIMIT){
                loser = loser | (~player.id & 0x3);
            }
        }

        if (previousScore < player.score){
            newFoodNeeded = true;
        }
    }

    if (newFoodNeeded){
        randomFood(state);
    }

    return loser;
}

function randomFood(state){
    food = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
    }
    for (let player of state.players){
        for (let cell of player.snake){
            if (cell.x === food.x && cell.y === food.y){
                return randomFood(state);
            }
        }
    }
    state.food = food;
}

function getUpdatedVelocity(keyCode){
    switch (keyCode){
        case 37: //Left
            return {
                x: -1,
                y: 0,
            };
        case 38: // Up
            return {
                x: 0,
                y: -1,
            };
        case 39: // Right
            return {
                x: 1,
                y: 0,
            };
        case 40: // Down
            return {
                x: 0,
                y: 1,
            };
        case 65: //Left
            return {
                x: -1,
                y: 0,
            };
        case 87: // Up
            return {
                x: 0,
                y: -1,
            };
        case 68: // Right
            return {
                x: 1,
                y: 0,
            };
        case 83: // Down
            return {
                x: 0,
                y: 1,
            };
    }
}

function getUpdatedPosition(player, food){
    // Check if there are any moves made by the player
    if (player.moves.length !== 0){
        const vel = player.moves[0];
        player.moves.shift(); // remove the element in position 0
        if (vel.x !== -player.vel.x && vel.y !== -player.vel.y){
            player.vel = vel;
        }
    }

    // Move the head of the snake of the player
    player.pos.x += player.vel.x;
    player.pos.y += player.vel.y;

    // Check if the player ate a fruit and update the body of the snake accordingly
    player.snake.push({ ...player.pos}); // append the new position of the snake to the body
    if (food.x === player.pos.x && food.y === player.pos.y){
        // The snake will get one square longer and it will appear as if the snake didn't move
        // because the appended square will be where the fruit was
        player.score++;
    }
    else{
        /* If the snake didn't eat a fruit remove the first element which is the tail of the
        snake to maintain the current length */
        player.snake.shift();
    }

    // Check if the snake of the player went off the grid
    if (player.pos.x < 0 || player.pos.x > GRID_SIZE-1 || player.pos.y < 0 || player.pos.y > GRID_SIZE-1) {
        console.log("Snake "+ player.id + " went off grid");
        return player.id;
    }

    // Check if the snake of the player ate itself
    if (player.vel.x || player.vel.y){
        /* The -1 in the conditional makes sure that it doesn't check for the last element
        because this corresponds to the head of the snake */
        for (let cell = 0; cell < player.snake.length - 1; cell++){ 
            if (player.snake[cell].x === player.pos.x && player.snake[cell].y === player.pos.y){
                console.log("Snake " + player.id + " ate itself");
                return player.id;
            }
        }
    }

    // This player didn't lose
    return 0;
}