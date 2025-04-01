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
// ��������� ����������� �������
io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // ������ ��������� ������� "move" �� �������
    socket.on("move", (data) => {
        console.log("Happend move:", data);
        // ��������� ������ ���� ������������ ��������
        io.emit("playerMoved", data);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

// ������ �������
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server port: ${PORT}`);
});
