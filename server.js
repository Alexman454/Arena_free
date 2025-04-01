const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Обработка подключения клиента
io.on("connection", (socket) => {
    console.log("Новый клиент подключился:", socket.id);

    // Пример получения события "move" от клиента
    socket.on("move", (data) => {
        console.log("Получено событие move:", data);
        // Рассылаем данные всем подключенным клиентам
        io.emit("playerMoved", data);
    });

    socket.on("disconnect", () => {
        console.log("Клиент отключился:", socket.id);
    });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server port: ${PORT}`);
});
