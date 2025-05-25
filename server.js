const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
let restarting = false;
const players = {};
const bullets = [];
const obstacles = [];

function generateObstacles() {
    obstacles.length = 0;
    for (let i = 0; i < 5; i++) {
        obstacles.push({
            x: Math.floor(Math.random() * 700),
            y: Math.floor(Math.random() * 500),
            w: 50,
            h: 50,
            color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        });
    }
}
generateObstacles();

function getRandomPositionAvoidingObstacles() {
    let x, y, valid;
    do {
        x = Math.floor(Math.random() * (800 - 30));
        y = Math.floor(Math.random() * (600 - 30));
        valid = true;
        for (const obs of obstacles) {
            if (
                x + 30 > obs.x &&
                x < obs.x + obs.w &&
                y + 30 > obs.y &&
                y < obs.y + obs.h
            ) {
                valid = false;
                break;
            }
        }
    } while (!valid);
    return { x, y };
}

function killPlayer(id) {
    console.log(`Player ${id} was killed`);
    delete players[id];
    io.emit("playerLeft", id);
}

function restartRound() {
    console.log("Restarting round...");
    generateObstacles();

    for (const id in players) {
        const pos = getRandomPositionAvoidingObstacles();
        players[id].x = pos.x;
        players[id].y = pos.y;
        players[id].hp = 100;
    }
    io.emit("roundRestart", { players, obstacles });
}

io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);
    const pos = getRandomPositionAvoidingObstacles();
    const newPlayer = {
        x: pos.x,
        y: pos.y,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        hp: 100,
    };
    players[socket.id] = newPlayer;

    socket.emit("init", { id: socket.id, players, obstacles });
    socket.broadcast.emit("playerJoined", { id: socket.id, player: newPlayer });

    socket.on("move", (data) => {
        if (players[socket.id]) {
            let newX = data.x;
            let newY = data.y;
            let collides = false;

            // Проверка столкновений с препятствиями
            for (const obs of obstacles) {
                if (
                    newX + 30 > obs.x &&
                    newX < obs.x + obs.w &&
                    newY + 30 > obs.y &&
                    newY < obs.y + obs.h
                ) {
                    collides = true;
                    break;
                }
            }

            // Проверка столкновений с другими игроками
            if (!collides) {
                for (const id in players) {
                    if (id === socket.id) continue;
                    const p = players[id];
                    if (
                        newX + 30 > p.x &&
                        newX < p.x + 30 &&
                        newY + 30 > p.y &&
                        newY < p.y + 30
                    ) {
                        collides = true;
                        break;
                    }
                }
            }

            if (!collides) {
                players[socket.id].x = newX;
                players[socket.id].y = newY;

                socket.broadcast.emit("update", {
                    id: socket.id,
                    x: newX,
                    y: newY,
                    hp: players[socket.id].hp,
                });
            }
        }
    });


    socket.on("shoot", (data) => {
        if (!players[socket.id]) return; // Игрок должен быть жив
        const bullet = {
            x: data.x,
            y: data.y,
            dir: data.dir,
            owner: socket.id,
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server port: ${PORT}`);
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
                    hp: p.hp,
                });
                if (p.hp <= 0) {
                    killPlayer(id);
                }
                break;
            }
        }
    }

    // Проверяем количество живых игроков
    const alivePlayers = Object.values(players).filter((p) => p.hp > 0);
    console.log(`Alive: ${alivePlayers.length}, Total: ${Object.keys(players).length}, Restarting: ${restarting}`);
    if (alivePlayers.length <= 1 && Object.keys(players).length > 1) {
        if (!restarting) {
            restarting = true;
            console.log("Scheduling round restart...");
            setTimeout(() => {
                restartRound();
                restarting = false;
            }, 1000);
        }
    }
}, 1000 / 120);
