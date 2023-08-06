const matter = require("matter-js");
const isJSON = function (str) {
    if ( /^\s*$/.test(str) ) return false;
    str = str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@');
    str = str.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']');
    str = str.replace(/(?:^|:|,)(?:\s*\[)+/g, '');
    return (/^[\],:{}\s]*$/).test(str);
}

const isNumber = function(str) {
    return str.match(/^[0-9]+$/);
}

const decodeMovementPacket = function(msg) {
    return {
        angle: msg & 511,
        up: (msg & 4096) > 0,
        shooting: (msg & 8192) > 0,
        rcsOff: (msg & 16384) > 0,
        strafeLeft: (msg & 32768) > 0,
        strafeRight: (msg & 65536) > 0,
        releaseCrystals: (msg & 131072) > 0
    }
}

const deg2rad = function(deg) {
    return deg * (Math.PI/180);
}

const shortestCircularPath = function(a, b) {
    let delta = b - a;
    if (delta > Math.PI) {
        return -((2*Math.PI) - delta);
    } else if (delta < -Math.PI) {
        return (2*Math.PI) + delta;
    }
    return delta;
}

const adjust = function(x, size) {
    return ((x + size / 2) % size) - (size / 2);
}

const mapWrap = function(objects, size){
    // if any object goes off of the world, make it wrap around to the other side
    // for (const body of objects) {
    //     matter.Body.setPosition(body, {x: adjust(body.position.x, size), y: adjust(body.position.y, size)})
    // }
    let height = size;
    let width = size;
    for (const body of objects) {
        if (body.position.x < 0) {
            matter.Body.setPosition(body, { x: width, y: body.position.y });
        }
        if (body.position.x > width) {
            matter.Body.setPosition(body, { x: 0, y: body.position.y });
        }
        if (body.position.y < 0) {
            matter.Body.setPosition(body, { x: body.position.x, y: height });
        }
        if (body.position.y > height) {
            matter.Body.setPosition(body, { x: body.position.x, y: 0 });
        }
    }
}

module.exports.isJSON = isJSON;
module.exports.isNumber = isNumber;
module.exports.decodeMovementPacket = decodeMovementPacket;
module.exports.deg2rad = deg2rad;
module.exports.shortestCircularPath = shortestCircularPath;
module.exports.mapWrap = mapWrap;