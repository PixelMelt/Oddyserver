// a matter.js physics engine backend server using node.js
const matter = require('matter-js');

// create a Matter.js engine
const engine = matter.Engine.create();

// remove gravity from the engine
engine.world.gravity.y = 0;

// create a box using the Bodies module
const box = matter.Bodies.rectangle(200, 100, 50, 50);

// add the box to the world
matter.World.add(engine.world, box);

// another box
const box2 = matter.Bodies.rectangle(200, 100, 50, 50);
matter.World.add(engine.world, box2);

// run the engine
matter.Engine.run(engine);

function mapWrap(objects, height, width){
    // if any object goes off of the world, make it wrap around to the other side
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

function moveObjInDir(obj, angle, speed){
    // move an object in a direction at a certain speed
    matter.Body.applyForce(obj, obj.position, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
}

// every 50 milliseconds, update the positions of the objects in the world
setInterval(() => {
    // get the new positions of the objects in the world include velocity
    const positions = engine.world.bodies.map(body => ({
        id: body.id,
        position: body.position,
        velocity: body.velocity,
    }));

    // mapWrap(engine.world.bodies, 1000, 1000);
}, 17);









// websocket server to send the positions to the client
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8465 });

wss.on('connection', ws => {
    // send the client the current positions of all the objects in the world
    ws.send(JSON.stringify(engine.world.bodies.map(body => ({
        id: body.id,
        position: body.position,
        velocity: body.velocity,
    }))));

    ws.on('message', message => {
        // let the player move the box using the arrow keys
        const data = JSON.parse(message);
        if (data.key === 'ArrowUp') {
            moveObjInDir(box, -Math.PI / 2, 0.01);
        }
        if (data.key === 'ArrowDown') {
            moveObjInDir(box, Math.PI / 2, 0.01);
        }
        if (data.key === 'ArrowLeft') {
            moveObjInDir(box, Math.PI, 0.01);
        }
        if (data.key === 'ArrowRight') {
            moveObjInDir(box, 0, 0.01);
        }
    });
});


// keep sending the positions to the client every 50 milliseconds
setInterval(() => {
    // get the new positions of the objects in the world include velocity
    const positions = engine.world.bodies.map(body => ({
        id: body.id,
        position: body.position,
        velocity: body.velocity,
    }));

    // send the new positions to all connected clients
    wss.clients.forEach(client => {
        client.send(JSON.stringify(positions));
    });
}, 50);