require('dotenv').config();

const axios = require('axios');
const { Server } = require('socket.io');
const express = require('express')
const http = require('http');
const cors = require('cors');
const { spawn } = require('child_process');


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
const timeout = 10
let resTime=0

// Función para detener el servidor
const stopServer = (serverUrl) => {
    serverUrl.close
    console.log(`Deteniendo el servidor ${serverUrl}`);
};

// Función para lanzar una nueva instancia
function launchNewInstance() {
    console.log('Lanzando nueva instancia...');
    try {
        const scriptPath = 'newInstance.bat';
        const batProcess = spawn('cmd', ['/c', scriptPath]);

        // Captura y muestra la salida estándar del proceso
        batProcess.stdout.on('data', (data) => {
            console.log('Salida estándar:', data.toString());
        });

        // Captura y muestra la salida de error del proceso
        batProcess.stderr.on('data', (data) => {
            console.error('Proceso:', data.toString());
        });

        // Maneja los eventos de cierre del proceso
        batProcess.on('close', (code) => {
            console.log('Proceso de nueva instancia finalizado con código de salida', code);
        });
    } catch (error) {
        console.error('Error al lanzar nueva instancia:', error);
    }
}




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
                    launchNewInstance();
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
