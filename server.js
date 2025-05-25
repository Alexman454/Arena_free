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

io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // ������ ������ ������
    const newPlayer = {
        x: Math.random() * 700,
        y: Math.random() * 500,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16)
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

            // ���������� ������ ���������� �������
            socket.broadcast.emit("update", { id: socket.id, x: data.x, y: data.y });
        }
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        delete players[socket.id];
        socket.broadcast.emit("playerLeft", socket.id);
    });
    socket.on("shoot", (data) => {
        const bullet = {
            x: data.x,
            y: data.y,
            dir: data.dir,
            owner: socket.id
        };

        // ��������� ���� �������
        io.emit("bulletFired", bullet);
    });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server port: ${PORT}`);
});