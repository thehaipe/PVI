const fs = require('fs');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const {
  addRoomMember,
  buildChatMessage,
  createRoom,
  findRoom,
  removeRoomMember,
} = require('./chat-server-logic');

const hostname = '127.0.0.1';
const port = 3000;
const usersPath = path.join(__dirname, 'data', 'chat-users.json');
const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
const roomsPath = path.join(__dirname, 'data', 'chat-rooms.json');
const rooms = JSON.parse(fs.readFileSync(roomsPath, 'utf8'));

function saveRooms() {
  fs.writeFileSync(roomsPath, `${JSON.stringify(rooms, null, 2)}\n`, 'utf8');
}

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('PVI chat Socket.IO server is running\n');
});

const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  socket.on('joinChat', ({ userId }) => {
    const normalizedUserId = String(userId ?? '').trim();
    if (normalizedUserId !== '') {
      socket.join(`user:${normalizedUserId}`);
    }
  });

  socket.on('sendMessage', (payload, response) => {
    try {
      const message = buildChatMessage(payload, users, rooms);
      const deliveryRooms = new Set([
        `user:${message.senderId}`,
        ...message.recipientIds.map((recipientId) => `user:${recipientId}`),
      ]);

      deliveryRooms.forEach((deliveryRoom) => {
        io.to(deliveryRoom).emit('chatMessage', message);
      });

      if (typeof response === 'function') {
        response({ status: true, error: null, message });
      }
    } catch (error) {
      if (typeof response === 'function') {
        response({
          status: false,
          error: { message: error.message },
        });
      }
    }
  });

  socket.on('addRoomMember', (payload, response) => {
    try {
      const roomId = String(payload?.roomId ?? '').trim();
      const roomIndex = rooms.findIndex((room) => room.id === roomId);
      if (roomIndex === -1) throw new Error('Unknown room');

      rooms[roomIndex] = addRoomMember(rooms[roomIndex], payload.userId, users);
      saveRooms();
      io.emit('roomUpdated', rooms[roomIndex]);

      if (typeof response === 'function') {
        response({ status: true, error: null, room: rooms[roomIndex] });
      }
    } catch (error) {
      if (typeof response === 'function') {
        response({ status: false, error: { message: error.message } });
      }
    }
  });

  socket.on('removeRoomMember', (payload, response) => {
    try {
      const roomId = String(payload?.roomId ?? '').trim();
      const roomIndex = rooms.findIndex((room) => room.id === roomId);
      if (roomIndex === -1) throw new Error('Unknown room');

      rooms[roomIndex] = removeRoomMember(rooms[roomIndex], payload.userId);
      saveRooms();
      io.emit('roomUpdated', rooms[roomIndex]);

      if (typeof response === 'function') {
        response({ status: true, error: null, room: rooms[roomIndex] });
      }
    } catch (error) {
      if (typeof response === 'function') {
        response({ status: false, error: { message: error.message } });
      }
    }
  });

  socket.on('createRoom', (payload, response) => {
    try {
      const room = createRoom(payload, users, rooms);
      rooms.push(room);
      saveRooms();
      io.emit('roomCreated', room);

      if (typeof response === 'function') {
        response({ status: true, error: null, room });
      }
    } catch (error) {
      if (typeof response === 'function') {
        response({ status: false, error: { message: error.message } });
      }
    }
  });
});

server.listen(port, hostname, () => {
  console.log(`Socket.IO chat server running at http://${hostname}:${port}/`);
});
