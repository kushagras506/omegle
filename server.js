const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let waiting = null;

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    if (waiting) {
        const partner = waiting;
        waiting = null;

        socket.partner = partner;
        partner.partner = socket;

        socket.emit('partner', partner.id);
        partner.emit('partner', socket.id);
    } else {
        waiting = socket;
        socket.emit('waiting');
    }

    socket.on('signal', (data) => {
        if (socket.partner) {
            socket.partner.emit('signal', data);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (socket.partner) {
            socket.partner.emit('partner-disconnected');
            socket.partner.partner = null;
        }
        if (waiting === socket) {
            waiting = null;
        }
    });
});

http.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
