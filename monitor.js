require('dotenv').config();

const axios = require('axios');
const { Server } = require('socket.io');
const express = require('express')
const http = require('http');
const cors = require('cors');

const app = express()
const server = http.createServer(app);

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}))

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    }
});

const port = process.env.PORT_MONITOR;

let serversList = [];

app.post('/monitor/register-server', (req, res) => {
    const { ip, port } = req.body;
    const serverUrl = `http://${ip}:${port}/cars`;
    serversList.push(serverUrl);
    console.log('Servidor registrado:', serverUrl);
    console.log('Lista de servidores:', serversList.join(', '));
    res.sendStatus(200);
});

// en milisegundos
const timeout = 50
let resTime=0

const checkServerStatus = async () => {
    const updatedServersList = [];
    for (const server of serversList) {
        console.log(`Iniciando chequeo para el servidor: ${server} ....`);
        try {
            const url = server + "/monitor/healthchek";
            console.log("Enviando peticiones a:" + url);

            const start = Date.now();
            const res = await axios.get(url);
            if (res) {
                const end = Date.now(); // Momento de recepción de la respuesta
                const resTime = end - start;
                console.log(`==============Tiempo de respuesta del servidor en milisegundos ${server} es ${resTime}ms`);
                if (resTime >= timeout) {
                    serversList.splice(serversList.indexOf(server),1);
                    console.log(`Servidor ${server} eliminado por exceder el tiempo de respuesta.`);
                    io.emit('server_deleted', { server, responseTime: resTime });
                } else {
                    console.log(`=========Servidor ${server} vivo =========`);
                    updatedServersList.push({ server, responseTime: resTime });
                }
            }
        } catch (error) {
            serversList.splice(serversList.indexOf(server),1);
            console.log(`La solicitud fue rechazada, servidor ${server} eliminado`);
            console.log("Servidores restantes: ", serversList);
            io.emit('server_deleted', { server, responseTime: null });
        }
    }


    io.emit('update_servers', { servers: updatedServersList });
};


setInterval(checkServerStatus, 3000);


io.on('connection', socket => {
    console.log('Cliente conectado:', socket.id);


    socket.emit('servers_list', serversList);

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

server.listen(port, () => {
    console.log(`Monitor escuchando en el puerto ${port}`);
});
