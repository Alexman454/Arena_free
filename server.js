const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Разрешаем доступ со всех источников
        methods: ["GET", "POST"]
    }
});

const cors = require("cors"); // Устанавливаем CORS
app.use(cors({
    origin: "*", // Укажи точный адрес, с которого открываешь index.html
    methods: ["GET", "POST"]
}));
const players = {}; // Храним всех игроков по socket.id
const bullets = [];
function killPlayer(id) {
    console.log(`Player ${id} was killed`);
    delete players[id];
    io.emit("playerLeft", id);
}
io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Создаём нового игрока
    const newPlayer = {
        x: Math.random() * 700,
        y: Math.random() * 500,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        hp: 100 
    };
    players[socket.id] = newPlayer;

    // Отправляем клиенту его ID и список всех игроков
    socket.emit("init", { id: socket.id, players });

    // Уведомляем других клиентов о новом игроке
    socket.broadcast.emit("playerJoined", { id: socket.id, player: newPlayer });

    socket.on("move", (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;

            // Рассылаем позицию и здоровье другим
            socket.broadcast.emit("update", {
                id: socket.id,
                x: data.x,
                y: data.y,
                hp: players[socket.id].hp
            });
        }
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
        socket.broadcast.emit("playerLeft", socket.id);
    });
    socket.on("shoot", (data) => {
        console.log(`Shoot event from ${socket.id}:`, data);
        const bullet = {
            x: data.x,
            y: data.y,
            dir: data.dir,
            owner: socket.id
        };
        bullets.push(bullet);
        io.emit("bulletFired", bullet);
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

        // Удаляем пулю, если она вышла за пределы игрового поля
        if (b.x < 0 || b.x > 800 || b.y < 0 || b.y > 600) {
            bullets.splice(i, 1);
            continue;
        }

        // Проверяем попадание в игроков
        for (const id in players) {
            if (id === b.owner) continue;

            const p = players[id];
            if (
                b.x > p.x &&
                b.x < p.x + 30 &&
                b.y > p.y &&
                b.y < p.y + 30
            ) {
                // Уменьшаем здоровье
                p.hp -= 25;

                // Удаляем пулю
                bullets.splice(i, 1);

                // Обновляем всех клиентов по игроку
                io.emit("update", {
                    id,
                    x: p.x,
                    y: p.y,
                    hp: p.hp,
                });

                if (p.hp <= 0) {
                    killPlayer(id);
                }
            }
        }
    }
}, 1000 / 120);
