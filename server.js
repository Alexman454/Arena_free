const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ��������� ����������� �������
io.on("connection", (socket) => {
    console.log("����� ������ �����������:", socket.id);

    // ������ ��������� ������� "move" �� �������
    socket.on("move", (data) => {
        console.log("�������� ������� move:", data);
        // ��������� ������ ���� ������������ ��������
        io.emit("playerMoved", data);
    });

    socket.on("disconnect", () => {
        console.log("������ ����������:", socket.id);
    });
});

// ������ �������
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server port: ${PORT}`);
});
