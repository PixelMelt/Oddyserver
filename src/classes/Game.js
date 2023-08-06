const {WebSocket, WebSocketServer} = require('ws');
const mapGen = require("../mapGen");
const {Ship} = require("./Ship");
const Utils = require("../util");
const config = require("../config.json");
const log = require("./logging.js")
const matter = require('matter-js');

class Game {
    constructor(options = {}) {
        const self = this;

        self.doTick = false;
        self.iteration = 0;
        self.targetTPS = 60;

        self.util = {};

        self.util.serverStartTime = Date.now();

        self.mode = {
            options: {}
        };

        self.mode.options.version = options.version ?? 85;
        self.mode.options.region = options.region ?? "America";
        self.mode.options.name = options.name ?? "Secret Ohio Server";
        self.mode.options.root_mode = options.root_mode ?? "survival";
        self.mode.options.reset_tree = options.reset_tree ?? false;
        self.mode.options.ships = options.ships ?? [];
        self.mode.options.map_size = options.map_size ?? 80;
        self.mode.options.size = self.mode.options.map_size * 10;
        self.mode.options.soundtrack = options.soundtrack ?? "procedurality.mp3";
        self.mode.options.max_players = options.max_players ?? 120;
        self.mode.options.crystal_value = options.crystal_value ?? 1;
        self.mode.options.lives = options.lives ?? 4;
        self.mode.options.max_tier_lives = options.max_tier_lives ?? 0;
        self.mode.options.max_level = options.max_level ?? 7;
        self.mode.options.friendly_colors = options.friendly_colors ?? 0;
        self.mode.options.map_name = options.map_name ?? null;
        self.mode.options.survival_level = options.survival_level ?? 8;
        self.mode.options.starting_ship = options.starting_ship ?? 101;
        self.mode.options.starting_ship_maxed = options.starting_ship_maxed ?? true;
        self.mode.options.asteroids_strength = options.asteroids_strength ?? 1;
        self.mode.options.friction_ratio = options.friction_ratio ?? 1; // TODO: implement friction
        self.mode.options.strafe = options.strafe ?? 0;
        self.mode.options.speed_mod = options.speed_mod ?? 1;
        self.mode.options.rcs_toggle = options.rcs_toggle ?? true;
        self.mode.options.map_id = options.map_id ?? 5000;
        self.mode.options.map_density = options.map_density ?? -1;
        self.mode.options.weapon_drop = options.weapon_drop ?? 0;
        self.mode.options.crystal_drop = options.crystal_drop ?? 1;
        self.mode.options.release_crystal = options.release_crystal ?? false;
        self.mode.options.mines_self_destroy = options.mines_self_destroy ?? true;
        self.mode.options.mines_destroy_delay = options.mines_destroy_delay ?? 18000;
        self.mode.options.healing_enabled = options.healing_enabled ?? false;
        self.mode.options.healing_ratio = options.healing_ratio ?? 1;
        self.mode.options.shield_regen_factor = options.shield_regen_factor ?? 1;
        self.mode.options.power_regen_factor = options.power_regen_factor ?? 1;
        self.mode.options.invulnerable_ships = options.invulnerable_ships ?? false;
        self.mode.options.weapons_store = options.weapons_store ?? true;
        self.mode.options.radar_zoom = options.radar_zoom ?? 2;
        self.mode.options.auto_refill = options.auto_refill ?? false;
        self.mode.options.projectile_speed = options.projectile_speed ?? 1;
        self.mode.options.choose_ship = options.choose_ship ?? undefined;
        self.mode.options.collider = options.collider ?? true;
        self.mode.options.large_grid = options.large_grid ?? false;

        // Survival mode specific options
        if (self.mode.options.root_mode === "survival") {
            self.mode.options.survival_time = options.survival_time ?? 60;
            self.mode.options.bouncing_lasers = options.bouncing_lasers ?? 0;
        } else if (self.mode.options.root_mode === "team") {

        }

        /* Team mode specific options
        // station_regeneration: 1,
        // station_size: 2,
        // station_crystal_capacity: 1,
        // station_repair_threshold: 0.25,
        // auto_assign_teams: false,
        // all_ships_can_dock: false,
        // all_ships_can_respawn: false,

        // Deathmatch mode specific options
        // ship_groups: [],*/

        self.state = {};

        self.state.players = [];
        self.state.aliens = [];
        self.state.bases = [];
        self.state.lasers = [];
        self.state.map = mapGen.createMapByID(self.mode.options.map_size, self.mode.options.map_id, self.mode.options.root_mode, false);


        self.physics = matter.Engine.create();
        self.physics.world.gravity.y = 0;

        self.lastUpdated = Date.now();

    }

    start() {
        const self = this;

        if (config.MODE === "SECURE") {
            self.https.listen(config.PORT || 1212);
        }
        log.info(`Server listening on ${self.url}`);
        log.info(`Joinable through https://starblast.io/#${self.mode.options.map_id}@thirdparty!${self.url}`);
        log.warn(`Make sure you have the userscript installed in order to connect!`)

        self.interval = setInterval(() => {
            self.tick();
        }, 1000/self.targetTPS);
        //matter.Engine.run(self.physics);
    }

    stop() {
        const self = this;

        self.doTick = false;
    }

    generateWelcomePacket() {
        const self = this;

        return {
            name: "welcome",
            data: {
                mode: self.mode,
                name: self.mode.options.name,
                region: "Ohio",
                seed: self.mode.options.map_id,
                size: self.mode.options.map_size*10,
                systemid: self.mode.options.map_id,
                version: self.mode.options.version
            }
        }
    }

    generateRadarPacket() {
        const self = this;

        const activePlayers = self.state.players.filter(ship => ship != null);

        const packet = new ArrayBuffer(2 + (8 * activePlayers.length)); // numShips is the number of ships to include in the packet
        const view = new DataView(packet);
        view.setUint8(0, 0xc8); // set first byte to C8
        view.setUint8(1, activePlayers.length);

        for (let i = 0; i < activePlayers.length; i++) {
            let ship = activePlayers[i];
            let alive = ship.alive ? 1 : 0; // convert boolean alive value to 1 or 0
            let tier = Math.floor(ship.type / 100) - 1; // extract tier from ship type
            let model = (ship.type % 100) - 1; // extract model from ship type
            let type = (tier << 5) + alive; // combine alive, tier, and model into a single byte

            view.setUint8(2 + (i * 8), ship.id); // set id of ship
            view.setUint8(3 + (i * 8), Math.floor(ship.position.x / self.mode.options.map_size / 5 * 128)); // set x position of ship
            view.setUint8(4 + (i * 8), Math.floor(ship.position.y / self.mode.options.map_size / 5 * 128)); // set y position of ship
            view.setUint8(5 + (i * 8), type); // set type of ship (alive, tier, model)
            view.setUint32(6 + (i * 8), ship.score & 0xffffff, true);
            view.setUint8(9 + (i * 8), model);
            //view.setUint16(6 + (i * 8), Math.floor(ship.score / 65536) * 256 + (ship.score & 0xffff), true); // set score of ship
        }
        return packet;
    }

    createLaserPacket(shipType, ammoAmount, laser) {
        // Create an ArrayBuffer with a length of 40 bytes (8 bytes header + 32 bytes laser data)
        const packet = new ArrayBuffer(40);
        const dataView = new DataView(packet);
        
        dataView.setUint8(0, 0x64); // Set first byte to 64 (hexadecimal for 100)

        // Set ship type (second byte)
        dataView.setUint8(1, shipType);
    
        // Set ammo amount if shipType matches player's ship
        if (shipType === 1) { // Assuming player's ship type is 1
            dataView.setUint16(2, ammoAmount, true);
        }
    
        // Set time (bytes 4-7)
        dataView.setUint32(4, laser.time, true);
    
        // Set laser data (bytes 8-39)
        const offset = 8;
        dataView.setFloat32(offset, laser.x, true);
        dataView.setFloat32(offset + 4, laser.y, true);
        dataView.setFloat32(offset + 8, laser.z, true);
        dataView.setFloat32(offset + 12, laser.xVelo, true);
        dataView.setFloat32(offset + 16, laser.yVelo, true);
        dataView.setFloat32(offset + 20, laser.speed, true);
        dataView.setUint16(offset + 24, laser.id, true);
        dataView.setFloat32(offset + 26, laser.angle, true);
        dataView.setUint8(offset + 30, laser.type);
        dataView.setUint8(offset + 31, laser.damage);
    
        return packet;
    }

    getNewId() {
        const self = this;

        for (let x=1; x <= self.mode.options.max_players; x++) {
            if (!self.state.players[x]) {
                return x;
            }
        }

        return -1;
    }

    get serverTime() {
        const self = this;

        return Date.now() - self.util.serverStartTime;
    }

    initWebSocketServer() {
        const self = this;

        let port = config.PORT ?? 1212;
        let host = config.HOST ?? "localhost";
        let protocol = (config.MODE === "UNSECURE") ? "ws" : "wss";
        self.url = `${protocol}://${host}:${port}`;

        if (config.MODE === "SECURE") {
            const {createServer} = require("https");
            const {readFileSync} = require("fs");
            let server = createServer({
                cert: readFileSync(config.CERT),
                key: readFileSync(config.KEY)
            });
            self.server = new WebSocketServer({server});
            self.https = server;
        } else {
            self.server = new WebSocketServer({
                port: port
            });
        }

        self.server.on("connection", (socket) => {
            self.handleIncomingConnection(socket);
        });
    }

    handleIncomingConnection(socket) {
        const self = this;

        socket.custom = {};

        socket.onmessage = (messageObj) => {
            let data = messageObj.data;

            if (typeof data === "string") {
                if (data === "ping") {
                    // If message is just ping measurement
                    socket.send("pong");
                    socket.close();
                } else if (Utils.isNumber(data)) {
                    // Movement packet. This is sent by the game to inform the server of player
                    // input (ex: mouse click to shoot, mouse movement to turn)
                    let movementPacket = Utils.decodeMovementPacket(parseInt(data));

                    if (socket.custom.ship) {
                        let ship = socket.custom.ship;
                        ship.needsToSendMovementPacket = (ship.angle !== movementPacket.angle) || (ship.up !== movementPacket.up);
                        ship.angle = movementPacket.angle;
                        ship.r = movementPacket.angle * (Math.PI / 180);
                        ship.up = movementPacket.up;
                        // TODO: register other ship movement inputs
                    }
                } else if (Utils.isJSON(data)) {
                    // If message is JSON (ex: join packet, enter packet)
                    let message = JSON.parse(data);
                    if (message.name === "join" || message.name === "ùov()") {
                        // Join packet. We want to avoid creating ship object here as they might not "enter"
                        // (ServerList+ listeners join, but never enter the game)
                        socket.custom.joinPacket = message;
                        socket.custom.welcomed = true;
                        socket.send(JSON.stringify(self.generateWelcomePacket()));

                        if (message.data.ecp_key) {
                            socket.send(JSON.stringify({
                                name: "ecp_verified",
                                data: {
                                    key: message.data.ecp_key,
                                    valid: true
                                }
                            }));
                        }
                    } else if (message.name === "enter") {
                        // Enter packet. This is where we should actually create ship object
                        // as this communicates intent to actually play the game
                        if (!socket.custom.welcomed) {
                            socket.close();
                            return;
                        }

                        let id = self.getNewId();  // obtain an unused id
                        let ship = new Ship(self, socket, {
                            id: id,
                            hue: socket.custom.joinPacket.data.hue,
                            custom: socket.custom.joinPacket.data.ecp_custom,
                            name: socket.custom.joinPacket.data.player_name
                        });
                        self.state.players[id] = ship;  // store ship
                        socket.custom.ship = ship;

                        socket.send(JSON.stringify({
                            name: "entered",
                            data: {
                                hue: ship.hue,
                                servertime: self.serverTime,
                                shipid: ship.id
                            }
                        }));
                        socket.custom.entered = true;
                    } else if (message.name === "get_name") {
                        // Get name packet. This is the client requesting the player profile of a certain
                        // ship id (their ship hue, ECP customization, and name)
                        let ship = self.state.players[message.data.id];
                        if (ship) {
                            socket.send(JSON.stringify({
                                name: "player_name",
                                data: {
                                    id: message.data.id,
                                    hue: ship.hue,
                                    player_name: ship.name,
                                    custom: ship.custom
                                }
                            }))
                        }
                    } else if (message.name === "upgrade_ship") {
                        if (socket.custom.ship) {
                            socket.custom.ship.type = message.data;
                        }
                    }
                }
            }
        }

        socket.onclose = () => {
            if (socket.custom.ship) {
                matter.World.remove(self.physics.world, socket.custom.ship.body);
                delete self.state.players[socket.custom.ship.id];
                self.broadcast(JSON.stringify({
                    name: "ship_gone",
                    data: socket.custom.ship.id
                }));
            }
        }
    }

    broadcast(message) {
        const self = this;

        for (let ship of self.state.players) {
            if (ship) ship.socket.send(message);
        }
    }

    tick() {
        const self = this;

        for (let ship of self.state.players) {
            if (ship) {
                ship.tick();
            }
        }

        // broadcast scoreboard and radar if there are ships
        if (self.iteration % 60 === 0 && self.state.players.length > 0) self.broadcast(self.generateRadarPacket());

        // if there are any player bodies, send the positions to the client
        if (self.physics.world.bodies.length > 0) {
            // if (self.iteration % 10 === 0) {
            //     // type, timestamp, x, y, velocityX, velocityY, class, and damage.
            //     const exampleLaser = {
            //         time: self.iteration, // example time value
            //         // x: 0,
            //         // y: 0,
            //         // z: 0,
            //         // xVelo: 0,
            //         // yVelo: 0,
            //         // set to the player's ships state
            //         x: self.state.players[1].body.position.x,
            //         y: self.state.players[1].body.position.y,
            //         z: 0,
            //         xVelo: self.state.players[1].body.velocity.x + (0.5 * Math.cos(self.state.players[1].body.angle)),
            //         yVelo: self.state.players[1].body.velocity.y + (0.5 * Math.sin(self.state.players[1].body.angle)),
            //         speed: 0,
            //         id: Math.floor(Math.random() * 1000000),
            //         angle: self.state.players[1].body.angle,
            //         type: 1,
            //         damage: 20
            //     };
                
            //     const shipType = 0; // Assuming player's ship type is 1
            //     const ammoAmount = 100; // example ammo amount
                
            //     const packet = self.createLaserPacket(shipType, ammoAmount, exampleLaser);
            //     self.broadcast(packet);
    
            // }

        }

        matter.Engine.update(self.physics, 1000/self.targetTPS);
        Utils.mapWrap(self.physics.world.bodies, self.mode.options.map_size * 10);

        self.lastUpdated = Date.now();
        self.iteration++;


        /*if (self.doTick) {
            setTimeout(() => {
                self.tick();
            }, (1000/self.targetTPS) - (now - t1));
        }*/
    }

}

module.exports.Game = Game;