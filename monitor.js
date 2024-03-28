require('dotenv').config()

const axios = require('axios');
const { Server } = require('socket.io');
const express = require('express')
const http = require('http')
const cors = require('cors')
const { spawn } = require('child_process');
const readline = require('readline')

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}))

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    }
});

const port = process.env.PORT_MONITOR

let serversList = []; // Lista para almacenar los servidores en formato deseado

function printLog(message) {
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    console.log(`[Fecha: ${date}] [Hora: ${time}] [Mensaje: ${message}]`);
}

app.post('/monitor/register-server', (req, res) => {
    const { ip, port } = req.body;
    const serverUrl = `http://${ip}:${port}/cars`; // Construye la URL del servidor
    serversList.push(serverUrl); // Agrega la URL a la lista de servidores
    printLog('Servidor registrado: ' + serverUrl);
    printLog('Lista de servidores: ');
    console.log(serversList) // Mostrar la lista de servidores actualizada
    res.sendStatus(200);
});


function launchNewInstance() {
    printLog('Lanzando nueva instancia...');

    try {
        const readline = require('readline');

        const reader = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        reader.question('Introduzca la ruta de la carpeta donde esta el Dockerfile: ', (folderPath) => {

            reader.question('Introduzca el número para el puerto de la nueva instancia: ', (portNumber) => {
                // Cierra el lector de línea
                reader.close();

                const scriptPath = 'abrir_carpeta_parametro.bat';
                const batProcess = spawn('cmd', ['/c', scriptPath, folderPath, portNumber]);

                // Captura y muestra la salida estándar del proceso
                batProcess.stdout.on('data', (data) => {
                    printLog(data.toString());
                });

                // Captura y muestra la salida de error del proceso
                batProcess.stderr.on('data', (data) => {
                    console.error('Proceso:', data.toString());
                });

                // Maneja los eventos de cierre del proceso
                batProcess.on('close', (code) => {
                    printLog('Proceso de nueva instancia finalizado con código de salida', code);
                });
            });
        });
    } catch (error) {
        console.error('Error al lanzar nueva instancia:', error);
    }
}

// en milisegundos
const timeout = 2000
let resTime = 0

const checkServerStatus = async () => {
    const updatedServersList = [];
    serversList.forEach(async server => {
        printLog(`Iniciando chequeo para el servidor: ${server} ....`)
        try {
            const url = server + "/monitor/healthchek"
            printLog("Enviando peticiones a:" + url)

            const start = Date.now();
            const res = await axios.get(url)
            if (res) {
                const end = Date.now(); // Momento de recepción de la respuesta
                resTime = end - start;
                printLog(`==============Tiempo de respuesta del servidor en milisegundos ${server} es ${resTime}ms`)
                if (resTime >= timeout) {
                    serversList.splice(serversList.indexOf(server), 1);
                    printLog(`Servidor ${server} eliminado por exceder el tiempo de respuesta.`);
                    launchNewInstance();
                    io.emit('server_deleted', { server, responseTime: resTime });
                } else {
                    updatedServersList.push({ server, responseTime: resTime });
                    printLog(`=========Servidor ${server} vivo =========`)
                }
            }
        } catch (error) {
            serversList.splice(serversList.indexOf(server), 1);
            printLog(`La solicitud fue rechazada, servidor ${server} eliminado`);
            printLog("Servidores restantes: " + serversList)
            io.emit('server_deleted', { server, responseTime: null });
            launchNewInstance();
        }
    });
    io.emit('update_servers', { servers: updatedServersList })
};

// Verificar el estado de los servidores cada 20 segundos
setInterval(checkServerStatus, 15000)


io.on('connection', socket => {
    printLog('Cliente conectado: ' + socket.id);


    socket.emit('servers_list' + serversList);

    socket.on('disconnect', () => {
        printLog('Cliente desconectado: ' + socket.id);
    });
});

server.listen(port, () => {
    printLog(`Monitor escuchando en el puerto ${port}`);
});