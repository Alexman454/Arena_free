const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const cors = require("cors");
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));

const players = {};
const bullets = [];
const obstacles = [
    { x: 200, y: 150, width: 100, height: 20 },
    { x: 500, y: 300, width: 20, height: 100 },
    { x: 300, y: 450, width: 150, height: 20 },
];

// Проверка на коллизию при спавне
function isSpawnValid(x, y) {
    return !obstacles.some(o =>
        x < o.x + o.width &&
        x + 30 > o.x &&
        y < o.y + o.height &&
        y + 30 > o.y
    );
}

function getSafeSpawn() {
    let x, y, attempts = 0;
    do {
        x = Math.random() * (800 - 30);
        y = Math.random() * (600 - 30);
        attempts++;
        if (attempts > 50) break;
    } while (!isSpawnValid(x, y));
    return { x, y };
}

function killPlayer(id) {
    console.log(`Player ${id} was killed`);
    delete players[id];
    io.emit("playerLeft", id);
}

io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    const spawn = getSafeSpawn();
    const newPlayer = {
        x: spawn.x,
        y: spawn.y,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        hp: 100
    };
    players[socket.id] = newPlayer;

    socket.emit("init", { id: socket.id, players });
    socket.emit("obstacles", obstacles);
    socket.broadcast.emit("playerJoined", { id: socket.id, player: newPlayer });

    socket.on("move", (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;

            socket.broadcast.emit("update", {
                id: socket.id,
                x: data.x,
                y: data.y,
                hp: players[socket.id].hp
            });
        }
    });

    socket.on("shoot", (data) => {
        const bullet = {
            x: data.x,
            y: data.y,
            dir: data.dir,
            owner: socket.id
        };
        bullets.push(bullet);
        io.emit("bulletFired", bullet);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        delete players[socket.id];
        socket.broadcast.emit("playerLeft", socket.id);
    });
});

setInterval(() => {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];

        b.x += b.dir.x * 8;
        b.y += b.dir.y * 8;

        if (b.x < 0 || b.x > 800 || b.y < 0 || b.y > 600) {
            bullets.splice(i, 1);
            continue;
        }

        for (const id in players) {
            if (id === b.owner) continue;

            const p = players[id];
            if (
                b.x > p.x &&
                b.x < p.x + 30 &&
                b.y > p.y &&
                b.y < p.y + 30
            ) {
                p.hp -= 25;
                bullets.splice(i, 1);

                io.emit("update", {
                    id,
                    x: p.x,
                    y: p.y,
                    hp: p.hp
                });

                if (p.hp <= 0) killPlayer(id);
                break;
            }
        }
    }
}, 1000 / 120);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
