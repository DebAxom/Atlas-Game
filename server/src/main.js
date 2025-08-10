import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { places } from './places.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname,'assets');
const pagesDir = path.join(__dirname,'pages');

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const hostname = '0.0.0.0';
const port = process.env.PORT || 4000;

const gameRooms = {};

const server = createServer(async (req, res) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
    };
    if (req.url == "/index.html") {
        res.writeHead(302, { location: '/' });
        res.end();
        return;
    }
    if(req.url.startsWith("/assets")){
        let ext = path.extname(req.url);
        try {
            let data = await fs.promises.readFile(publicDir + req.url.replace('/assets', ''), 'utf-8');
            res.setHeader('Content-Type', mimeTypes[ext] || 'text/plain');
            res.writeHead(200, headers);
            res.end(data);
            return;
        } catch (error) {
            res.setHeader('Content-Type', mimeTypes[ext] || 'text/plain');
            res.writeHead(200, headers);
            res.end('no icon found');
            return;
        }
    }

    let data = fs.existsSync(pagesDir + req.url + '.html') ? await fs.promises.readFile(pagesDir + req.url + '.html', 'utf-8') : await fs.promises.readFile(path.join(pagesDir, 'index.html'), 'utf-8');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end(data);
    return;

});

function getRandomLetter() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters[Math.floor(Math.random() * letters.length)];
}

function isValidPlace(place, expectedLetter, roomId) {
    return places.includes(place) && place.startsWith(expectedLetter.toLowerCase()) && !gameRooms[roomId].usedPlaces.has(place.toLowerCase());
}

async function getActivePlayers(room) {
    let data = [];
    const sockets = await io.in(room).fetchSockets();
    sockets.forEach(socket => {
        if (socket.data.isActive) data.push({ name: socket.data.name, id: socket.data.hashedId, lives: socket.data.lives, socket: socket.id, photo: socket.data.photo });
    });
    return data;
}

async function findSocketById(id) {
    const sockets = await io.in(id).fetchSockets();
    if (sockets.length > 0) return sockets[0];
    return null
}

async function nextTurn(roomId) {
    const room = gameRooms[roomId];
    if (!room) return;
    const $Players = await getActivePlayers(roomId);
    const activePlayers = $Players.map(x => x.socket);

    if ($Players.length <= 1) {
        io.to(roomId).emit('game-over', $Players.length === 1 ? $Players[0] : null );
        delete gameRooms[roomId];
        return;
    }

    const currentIndex = room.currentPlayer ? activePlayers.indexOf(room.currentPlayer) : -1;
    const nextIndex = (currentIndex + 1) % activePlayers.length;
    room.currentPlayer = activePlayers[nextIndex];
    let usedPlaces = [...room.usedPlaces];
    room.currentLetter = usedPlaces.length === 0 ? getRandomLetter() : usedPlaces[usedPlaces.length - 1].slice(-1);
    room.turnStartTime = Date.now();

    let currentPlayer = await findSocketById(room.currentPlayer);
    io.to(roomId).emit('turn-update', {
        player: { name: currentPlayer.data.name, id: currentPlayer.data.hashedId },
        letter: room.currentLetter.toUpperCase(),
        players: $Players
    });

    setTimeout(() => checkTimeout(roomId), 15000);
}

async function checkTimeout(roomId) {
    const room = gameRooms[roomId];
    if (!room || !room.gameStarted) return;

    if (Date.now() - room.turnStartTime >= 15000) {
        const player = await findSocketById(room.currentPlayer);
        player.data.lives -= 1;
        io.to(roomId).emit('update-players', await getActivePlayers(roomId));

        if (player.data.lives <= 0) {
            player.data.isActive = false;
            io.to(roomId).emit('player-inactive',{id: player.data.hashedId, code: 0 });
            io.to(roomId).emit('update-players', await getActivePlayers(roomId));
        }

        nextTurn(roomId);
    }
}

const io = new Server(server);

io.on('connection', async socket => {

    socket.on('join-room', async data => {

        if (!gameRooms[data.room]) {
            gameRooms[data.room] = {
                players: new Set(),
                currentPlayer: null,
                currentLetter: null,
                usedPlaces: new Set(),
                turnStartTime: null,
                gameStarted: false
            };
        }

        if (gameRooms[data.room].gameStarted) {
            socket.data.isActive = false;
            socket.data.hashedId = data.hashedId;
            socket.join(data.room);
            io.to(data.room).emit('player-inactive',{id: socket.data.hashedId, code: 1 });
            return;
        }

        socket.data.hashedId = data.id;
        socket.data.name = data.name;
        socket.data.photo = data.photo;
        socket.data.activeRoom = data.room;
        socket.data.isActive = true;
        socket.data.lives = 3;

        gameRooms[data.room].players.add(socket.id);

        socket.join(data.room);
        io.to(data.room).emit('update-players', await getActivePlayers(data.room));
        io.to(data.room).emit('update-places', [...gameRooms[data.room].usedPlaces]);

    });

    socket.on('start-game', roomID => {
        if (gameRooms[roomID].players.size >= 2 && roomID.split('.')[1] === socket.data.hashedId && !gameRooms[roomID].gameStarted) {
            gameRooms[roomID].gameStarted = true;
            io.to(roomID).emit('msg', { msg: 'Game has started !', to: '*', code: 1 });
            setTimeout(() => nextTurn(roomID), 3000);
        }
    });

    socket.on('stop-game', roomID => {
        if(!gameRooms[roomID]) return;
        if(roomID.split('.')[1] === socket.data.hashedId){
            io.to(roomID).emit('game-stopped', socket.data.hashedId);
            try { delete gameRooms[roomID]; } catch (error) {}
        }
    });

    socket.on('submit-place', ({ place, roomId }) => {

        if (!gameRooms[roomId] || socket.id !== gameRooms[roomId].currentPlayer) return;

        const expectedLetter = gameRooms[roomId].currentLetter;
        if (isValidPlace(place, expectedLetter, roomId)) {

            gameRooms[roomId].usedPlaces.add(place.toLowerCase());

            io.to(roomId).emit('update-places', [...gameRooms[roomId].usedPlaces]);
            nextTurn(roomId);
        } else {
            if (gameRooms[roomId].usedPlaces.has(place.toLowerCase())) {
                io.to(socket.data.activeRoom).to(socket.id).emit('msg', { msg: 'Somebody already said that location !', to: socket.data.hashedId, code: 0 });
            } else {
                io.to(socket.data.activeRoom).to(socket.id).emit('msg', { msg: 'Invalid location !', to: socket.data.hashedId, code: 0 });
            }
        }
    });

    socket.on('disconnect', async () => {
        try {
            const roomId = socket.data.activeRoom;
            if (!gameRooms[roomId]) return;
            gameRooms[roomId].players.delete(socket.id);
            if (socket.id === gameRooms[roomId].currentPlayer) nextTurn(roomId);
            if(socket.data.isActive) io.to(roomId).emit('update-players', await getActivePlayers(roomId));
            if (gameRooms[roomId].players.size === 0) delete gameRooms[roomId]; // Clean up empty rooms
        } catch (error) {}
    });
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}`);
});