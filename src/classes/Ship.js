const {Game} = require("./Game");
const Utils = require("../util");
const shipData = require("../ships.json");
const {Vector2} = require("./Vector2");
const log = require("./logging.js");
const matter = require('matter-js');

const FMOD = function (t, e) {
    return t - e * Math.floor(t / e);
}


class Ship {
    constructor(game = new Game(), socket = new WebSocket(""), options = {}) {
        const self = this;

        self.game = game;
        self.socket = socket;
        self.id = options.id ?? -1;

        self.body = matter.Bodies.rectangle(0, 0, 5, 5, {
            inertia: Infinity,
            frictionAir: 0,
            rotationSpeed: 0,
        });
        matter.World.add(self.game.physics.world, self.body);

        self.position = new Vector2(0, 0);
        self.velocity = new Vector2(0, 0);
        self.acceleration = matter.Vector.create(0, 0);

        self.angularVelocity = 0;

        self.r = options.r ?? 0;
        self.angle = options.angle ?? 0;

        self.custom = options.custom ?? null;
        self.name = options.name ?? "CREWMATE";
        self.hue = options.hue ?? 0;

        self.idle = options.idle ?? false;
        self.alive = options.alive ?? true;
        self.type = options.type ?? 101;
        //self.encUpgrades = options.encUpgrades ?? 0b00010001000100010001000100010001;
        self.upgrades = {
            shieldCapacity: 1,
            shieldRegen: 1,
            energyCapacity: 1,
            energyRegen: 1,
            laserDamage: 1,
            laserSpeed: 1,
            shipSpeed: 1,
            shipAgility: 1
        }
        self.team = options.team ?? 1;
        self.score = options.score ?? 100;
        self.rank = options.rank ?? 1;
        self.shield = options.shield ?? 100;
        self.generator = options.generator ?? 100;
        self.crystals = options.crystals ?? 0;
        self.healing = options.healing ?? false;
        self.lives = options.lives ?? 5;

        self.rotationSpeed = 0;

        self.strafe_left = false;
        self.strafe_right = false;
        self.dash = false;
        self.guided = false;
        self.glide = false;
        self.invulnerable = false;
        self.dash_speed = 0;
        self.dash_inertia = 0;
        self.dashCountdown = 0;
        self.inertia = 0.98;
        self.rcs = false;

        self.up = options.up ?? 0;

        self.needsToSendMovementPacket = true;
        self.lastMovementself = {};

        self.lastUpdated = Date.now();

        log.info(`Created ship with id ${self.id}`);
    }
    
    // get velocity() {
    //     const self = this;

    //     return self.body.velocity;
    // }

    // get position() {
    //     const self = this;

    //     return self.position;
    // }


    tickPhysics() {
        const self = this;
        
        // let now = Date.now();
        // let dt = (now - self.lastUpdated) / 1000;   // Convert to seconds assuming self.lastUpdated is in milliseconds.
    
        // matter.Body.setMass(self.body, self.massStat);
    
        // let targetR = Utils.deg2rad(self.angle);
        // let deltaR = Utils.shortestCircularPath(self.r, targetR);
    
        // self.radiansPerSecond = self.turnSpeedStat * (2*Math.PI) / 60;
        // let appliedDeltaR = ((deltaR < 0) ? -1 : 1) * self.radiansPerSecond * dt;
    
        // if (Math.abs(appliedDeltaR) > Math.abs(deltaR)) {
        //     self.r += deltaR;
        // } else {
        //     self.r += appliedDeltaR;
        // }
    
        // self.r = self.r % (2*Math.PI);
    
        // const speed = self.up ? self.topSpeedStat / 60 : 0;  // Assuming self.topSpeedStat is per minute.
        // const xMovement = speed * Math.cos(self.r);
        // const yMovement = speed * Math.sin(self.r);
    
        // const inertia = self.up ? 1 - self.massStat : 1;  // Assuming higher mass means higher inertia
        

        // // Update velocities considering inertia
        // self.velocity.x = self.velocity.x * inertia + xMovement * (1 - inertia);
        // self.velocity.y = self.velocity.y * inertia + yMovement * (1 - inertia);

        // // Update positions
        // self.position.x += self.velocity.x * dt * 60;   // Convert to per minute assuming position is in some suitable unit.
        // self.position.y += self.velocity.y * dt * 60;   // Convert to per minute
    
        // matter.Body.setAngle(self.body, self.r);
        // matter.Body.applyForce(self.body, self.body.position, self.acceleration);
    
        // // slowly decelerate the body
        // matter.Body.setVelocity(self.body, matter.Vector.mult(self.body.velocity, 0.97));
    
        // self.lastUpdated = now;   // Update the lastUpdated time
        
        var inertia;
        var speed;
        var xMovement;
        var yMovement;
        var result;
        let game = self.game;

        if (self.alive) {

            // calculate inertia
            inertia = self.inertia;
            


            speed = self.topSpeedStat;

            if (self.dash && self.dash_speed != null) {
                speed = self.dash_speed;
            }

            speed *= game.mode.options.speed_mod;
            
            // speed is wrong so set this
            speed = 0.58;

            if (self.up || self.dash) {
                xMovement = speed * Math.cos(self.r);
                yMovement = speed * Math.sin(self.r);
                // console.log(`Speed: ${speed}, xMovement: ${xMovement}, yMovement: ${yMovement}, r: ${self.r}, place in code: 4`)
            } else if (self.rcs) {
                xMovement = -speed * Math.cos(self.r);
                yMovement = -speed * Math.sin(self.r);
            } else {
                xMovement = 0;
                yMovement = 0;
            }

            if (game.mode.options.strafe > 0) {
                if (self.strafe_left) {
                    xMovement -= speed * Math.sin(self.r) * game.mode.options.strafe;
                    yMovement += speed * Math.cos(self.r) * game.mode.options.strafe;
                    if ((result = Math.sqrt(xMovement * xMovement + yMovement * yMovement)) > speed) {
                        xMovement = xMovement / result * speed;
                        yMovement = yMovement / result * speed;
                    }
                }
                if (self.strafe_right) {
                xMovement += speed * Math.sin(self.r) * game.mode.options.strafe;
                yMovement -= speed * Math.cos(self.r) * game.mode.options.strafe;
                    if ((result = Math.sqrt (xMovement * xMovement + yMovement * yMovement)) > speed) {
                        xMovement = xMovement / result * speed;
                        yMovement = yMovement / result * speed;
                    }
                }
            }

            inertia = self.inertia;

            if (self.dash && self.dash_inertia != null) {
                inertia = self.dash_inertia;
            }

            if (!(game.mode == null || game.mode.options.friction_ratio == null || self.up || self.dash)) {
                inertia = Math.pow(inertia, game.mode.options.friction_ratio);
            }

            if (self.dashCountdown !== 0 || self.guided || !(self.up || self.strafe_left || self.strafe_right || self.dash) && self.glide) {
                if (self.dashCountdown === 0 && Math.sqrt(self.velocity.x * self.velocity.x + self.velocity.y * self.velocity.y) > ship.speed * game.mode.options.speed_mod) {
                    self.velocity.x = self.velocity.x * inertia;
                    self.velocity.y = self.velocity.y * inertia;
                }
                self.dashCountdown = Math.max(0, self.dashCountdown - 1);
            } else {
                self.velocity.x = self.velocity.x * inertia + xMovement * (1 - inertia);
                self.velocity.y = self.velocity.y * inertia + yMovement * (1 - inertia);
                // log all the variables
                // console.log(`Speed: ${speed}, xMovement: ${xMovement}, yMovement: ${yMovement}, inertia: ${inertia}, self.velocity.x: ${self.velocity.x}, self.velocity.y: ${self.velocity.y}, place in code: 0`)
            }

            self.position.x += self.velocity.x;
            self.position.y += self.velocity.y;
            // console.log(`self.position.x: ${self.position.x}, self.position.y: ${self.position.y}, place in code: 5`)
            self.position.x = FMOD(self.position.x + ((game.mode.options.map_size * 10) / 2), game.mode.options.size) - ((game.mode.options.map_size * 10) / 2);
            self.position.y = FMOD(self.position.y + ((game.mode.options.map_size * 10) / 2), game.mode.options.size) - ((game.mode.options.map_size * 10) / 2);
            // console.log(`self.position.x: ${self.position.x}, self.position.y: ${self.position.y}, place in code: 6`)
            // console.log(`Vars: ${state.x} ${state.y}, ${this.game.lO0OO}, ${this.game.size}`)
            // console.log(`Browser says: ${state.x} ${state.y}`)

            // console.log(`Vars: ${self.position.x} ${self.position.y}, ${((game.mode.options.map_size * 10) / 2)}, ${game.mode.options.size}`)
            // console.log(`Server says: ${self.position.x} ${self.position.y}`)
            if (self.dash && ship.dash_energy != null) {
                self.generator = Math.max(0, self.generator - ship.dash_energy / 60);
                if (self.generator === 0) {
                    self.dash = false;
                }
            }

            // console.log(self.velocity)
            // console.log(self.position)
        }
    }

    tick() {
        const self = this;

        self.tickPhysics();

        if (self.needsToSendMovementPacket || self.game.iteration % 15 === 0) {
            self.socket.send(self.serialize());
            // Inform ships in the vicinity of updated behavior
            for (let ship of self.game.state.players) {
                if (ship && ship.id !== self.id) {
                    // TODO: make this only send to nearby ships (needs more logic than just a distance check)
                    ship.socket.send(self.serialize());
                }
            }

            self.needsToSendMovementPacket = false;
        }

        // set gems to max because why not
        let level = Math.floor(self.type/100);
        self.crystals = 20 * (level ** 2);

        // set upgrades to max because why not

        self.upgrades.shieldCapacity = level;
        self.upgrades.shieldRegen = level;
        self.upgrades.energyCapacity = level;
        self.upgrades.energyRegen = level;
        self.upgrades.laserDamage = level;
        self.upgrades.laserSpeed = level;
        self.upgrades.shipSpeed = level;
        self.upgrades.shipAgility = level;


        // 1. The ship's dash speed is calculated by multiplying the base dash speed (0.004) by the dash speed multiplier (this.I0000(this.type.specs.ship.dash.speed, this.levels[5])).
        // 2. The dash speed multiplier is calculated by taking the ship's dash speed multiplier (this.type.specs.ship.dash.speed) and multiplying it by the sixth upgrade level (this.levels[5]).
        // 3. The sixth upgrade level is the upgrade level of the ship's dash speed. This is because this.levels[5] is the sixth upgrade level.
        // 4. this.I0000 is a function that calculates the multiplier of an upgrade. It is defined in the code below.
        // t.prototype.I0000 = function (t, e) {
        //     var i;
        //     if (typeof t == "number") {
        //       return t;
        //     } else {
        //       i = e / this.type.level;
        //       return t[0] * (1 - i) + t[1] * i;
        //     }
        //   };
        // set dash speed, I0000 is not a function in the code, do not use it, but make sure that the dash is set the exact same way as the game does it
        self.dash_speed = 0.004 * (1 - self.upgrades.shipSpeed / self.type.level) + 0.004 * (self.upgrades.shipSpeed / self.type.level);



        // set shield to max because why not

        self.shield = self.shieldCapacityStat;

        // set energy to max because why not

        self.generator = self.energyCapacityStat;

        self.lastUpdated = Date.now();
    }

    serialize() {
        const self = this;

        let buffer = new ArrayBuffer(56);
        let view = new DataView(buffer);

        view.setUint8(0, 0);
        view.setUint8(1, self.id);
        let stat1 = 0;
        stat1 = stat1 | (self.alive ? 1 : 0);
        stat1 = stat1 | (self.up ? 2 : 0);
        // stat1 = stat1 | (self.lives * 4) // dunno how to encode lives
        stat1 = stat1 | (self.lives << 2);
        stat1 = stat1 | (self.strafe_left ? 32 : 0);
        stat1 = stat1 | (self.strafe_right ? 64 : 0);
        view.setUint8(2, stat1);
        view.setUint8(3, Math.floor(self.hue * 256 / 360));
        view.setUint32(4, self.game.serverTime, true);
        view.setUint32(8, Math.floor(self.game.serverTime / (100/6)), true); // yes there's a separate field for tick count
        let stat2 = self.type;
        stat2 = stat2 | (self.healing ? 1024 : 0);
        stat2 = stat2 | (self.dash ? 2048 : 0);
        // stat2 = stat2 | (self.OOlI0 ? 4096 : 0);
        stat2 = stat2 | (4096); // OOlI0 seems to always be true except when loading in
        stat2 = stat2 | (self.guided ? 8192 : 0);
        stat2 = stat2 | (self.glide ? 16384 : 0);
        stat2 = stat2 | (self.invulnerable ? 32768 : 0);
        view.setUint16(12, Math.floor(self.angle), true);
        view.setUint16(14, stat2, true);
        view.setFloat32(16, self.position.x, true);
        view.setFloat32(20, self.position.y, true);
        view.setFloat32(24, self.velocity.x, true);
        view.setFloat32(28, self.velocity.y, true);
        view.setFloat32(32, self.r, true);
        view.setFloat32(36, self.rotationSpeed, true);
        // view.setUint8(40, self.lOlI0) // LIKELY DAMAGE COUNT (when you get bonked)
        view.setUint8(40, 0);
        view.setUint8(41, self.rank);
        view.setUint16(42, self.shield, true);
        view.setUint16(44, self.generator, true);
        // view.setUint16(46, self.O100l, true); // gem count?
        view.setUint16(46, self.crystals, true);
        view.setUint32(48, self.score, true);
        view.setUint32(52, self.encodedUpgrades, true);

        return buffer;
    }

    get encodedUpgrades() {
        const self = this;

        let output = 0;
        output = output | (self.upgrades.shieldCapacity << 0);
        output = output | (self.upgrades.shieldRegen << 4);
        output = output | (self.upgrades.energyCapacity << 8);
        output = output | (self.upgrades.energyRegen << 12);
        output = output | (self.upgrades.laserDamage << 16);
        output = output | (self.upgrades.laserSpeed << 20);
        output = output | (self.upgrades.shipSpeed << 24);
        output = output | (self.upgrades.shipAgility << 28);

        return output;
    }

    get topSpeedStat() {
        const self = this;

        let minSpeed = shipData[self.type].specs.ship.speed[0];
        let maxSpeed = shipData[self.type].specs.ship.speed[1];
        let progress = self.upgrades.shipSpeed / Math.floor(self.type / 100)

        return minSpeed + (progress * (maxSpeed - minSpeed));
    }

    get accelerationStat() {
        const self = this;

        let minAcceleration = shipData[self.type].specs.ship.acceleration[0];
        let maxAcceleration = shipData[self.type].specs.ship.acceleration[1];
        let progress = self.upgrades.shipAgility / Math.floor(self.type / 100)

        return minAcceleration + (progress * (maxAcceleration - minAcceleration));
    }

    get turnSpeedStat() {
        const self = this;

        let minTurnSpeed = shipData[self.type].specs.ship.rotation[0];
        let maxTurnSpeed = shipData[self.type].specs.ship.rotation[1];
        let progress = self.upgrades.shipAgility / Math.floor(self.type / 100)

        return minTurnSpeed + (progress * (maxTurnSpeed - minTurnSpeed));
    }

    get shieldCapacityStat() {
        const self = this;

        let minCapacity = shipData[self.type].specs.shield.capacity[0];
        let maxCapacity = shipData[self.type].specs.shield.capacity[1];
        let progress = self.upgrades.shieldCapacity / Math.floor(self.type / 100)

        return minCapacity + (progress * (maxCapacity - minCapacity));
    }

    get energyCapacityStat() {
        const self = this;

        let minCapacity = shipData[self.type].specs.generator.capacity[0];
        let maxCapacity = shipData[self.type].specs.generator.capacity[1];
        let progress = self.upgrades.energyCapacity / Math.floor(self.type / 100)

        return minCapacity + (progress * (maxCapacity - minCapacity));
    }

    get massStat() {
        const self = this;

        return shipData[self.type].specs.ship.mass;
    }

}

module.exports.Ship = Ship;