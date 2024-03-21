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

const port = process.env.PORT_MONITOR || 3001;

let serversList = []; // Lista para almacenar los servidores en formato deseado

app.post('/monitor/register-server', (req, res) => {
    const { ip, port } = req.body;
    const serverUrl = `http://${ip}:${port}/cars`; // Construye la URL del servidor
    serversList.push(serverUrl); // Agrega la URL a la lista de servidores
    console.log('Servidor registrado:', serverUrl);
    console.log('Lista de servidores:', serversList.join(', ')); // Mostrar la lista de servidores actualizada
    res.sendStatus(200);
});

// en milisegundos
const timeout = 50

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
                    console.log(`Servidor ${server} eliminado por exceder el tiempo de respuesta.`);
                    io.emit('server_deleted', { server, responseTime: resTime }); // Emitir evento de eliminación de servidor con tiempo de respuesta
                } else {
                    console.log(`=========Servidor ${server} vivo =========`);
                    updatedServersList.push({ server, responseTime: resTime });
                }
            }
        } catch (error) {
            console.log(`La solicitud fue rechazada, servidor ${server} eliminado`);
            console.log("Servidores restantes: ", serversList);
            io.emit('server_deleted', { server, responseTime: null }); // Emitir evento de eliminación de servidor sin tiempo de respuesta
        }
    }

    // Emitir la lista actualizada de servidores junto con los tiempos de respuesta
    io.emit('update_servers', { servers: updatedServersList });
};

// Verificar el estado de los servidores cada 20 segundos
setInterval(checkServerStatus, 15000);

// Manejar conexiones de Socket.IO
io.on('connection', socket => {
    console.log('Cliente conectado:', socket.id);

    // Enviar la lista de servidores al cliente cuando se conecta
    socket.emit('servers_list', serversList);

    // Manejar desconexiones de clientes
    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

server.listen(port, () => {
    console.log(`Monitor escuchando en el puerto ${port}`);
});
