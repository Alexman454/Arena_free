const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // ��������� ������ �� ���� ����������
        methods: ["GET", "POST"]
    }
});

const cors = require("cors"); // ������������� CORS
app.use(cors({
    origin: "*", // ����� ������ �����, � �������� ���������� index.html
    methods: ["GET", "POST"]
}));
const players = {}; // ������ ���� ������� �� socket.id
const bullets = [];
function killPlayer(id) {
    console.log(`Player ${id} was killed`);
    delete players[id];
    io.emit("playerLeft", id);
}
io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // ������ ������ ������
    const newPlayer = {
        x: Math.random() * 700,
        y: Math.random() * 500,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        hp: 100 
    };
    players[socket.id] = newPlayer;

    // ���������� ������� ��� ID � ������ ���� �������
    socket.emit("init", { id: socket.id, players });

    // ���������� ������ �������� � ����� ������
    socket.broadcast.emit("playerJoined", { id: socket.id, player: newPlayer });

    socket.on("move", (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;

            // ��������� ������� � �������� ������
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

        // ������� ����, ���� ��� ����� �� ������� �������� ����
        if (b.x < 0 || b.x > 800 || b.y < 0 || b.y > 600) {
            bullets.splice(i, 1);
            continue;
        }

        // ��������� ��������� � �������
        for (const id in players) {
            if (id === b.owner) continue;

            const p = players[id];
            if (
                b.x > p.x &&
                b.x < p.x + 30 &&
                b.y > p.y &&
                b.y < p.y + 30
            ) {
                // ��������� ��������
                p.hp -= 25;

                // ������� ����
                bullets.splice(i, 1);

                // ��������� ���� �������� �� ������
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
