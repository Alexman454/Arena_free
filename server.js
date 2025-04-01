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
// Обработка подключения клиента
io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Пример получения события "move" от клиента
    socket.on("move", (data) => {
        console.log("Happend move:", data);
        // Рассылаем данные всем подключенным клиентам
        io.emit("playerMoved", data);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server port: ${PORT}`);
});
