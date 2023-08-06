const {Game} = require("./classes/Game")
const log = require("./classes/logging")

const game = new Game();
log.special("Oddy", "Server");
log.special("by Dank", " and Pix");

game.initWebSocketServer();
game.start();