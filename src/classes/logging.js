const chalk = require('chalk');

const logx = (msg, color) => console.log(chalk.keyword(color)(`[Oddyserver] ${msg}`));

const info = function(msg) {
    logx(msg, "green");
}

const warn = function(msg) {
    logx(msg, "yellow");
}

const error = function(msg) {
    logx(msg, "red");
}

const debug = function(msg) {
    logx(msg, "blue");
}

const log = function(msg) {
    logx(msg, "white");
}

const special = function(h1, h2) {
    const half = Math.floor(h1.length / 2);

    console.log(chalk.hex('#EC2B7A')(h1.slice(0, half)) 
    + chalk.hex('#8F5BFF')(h1.slice(half, h1.length) + h2.slice(0, half)) 
    + chalk.hex('#EC2B7A')(h2.slice(half, h2.length)));
}

module.exports = { log, info, warn, error, debug, special }