const FRAME_RATE = 10;
const GRID_SIZE = 20;
const SINGLE_PLAYER_SCORE_LIMIT = (GRID_SIZE * GRID_SIZE) - 3;
const MULTIPLAYER_SCORE_LIMIT = 20;
const PLAYER_ONE = {
    pos: {
        x: 3,
        y: 10,
    },
    vel: {
        x: 1,
        y: 0,
    },
    snake: [
        {x: 1, y: 10},
        {x: 2, y: 10},
        {x: 3, y: 10},
    ],
    moves: [],
    score: 0,
    id: 1,
};
const PLAYER_TWO = {
    pos: {
        x: 16,
        y: 10,
    },
    vel: {
        x: -1,
        y: 0,
    },
    snake: [
        {x: 18, y: 10},
        {x: 17, y: 10},
        {x: 16, y: 10},
    ],
    moves: [],
    score: 0,
    id: 2,
}

module.exports = {
    FRAME_RATE,
    GRID_SIZE,
    SINGLE_PLAYER_SCORE_LIMIT,
    MULTIPLAYER_SCORE_LIMIT,
    PLAYER_ONE,
    PLAYER_TWO,
}