require('dotenv').config()

const axios = require('axios');
const { Server } = require('socket.io');
const express = require('express')
const http = require('http')
const cors = require('cors')
const { spawn } = require('child_process');
const { exec } = require('child_process');
const readline = require('readline')
const { chaosMonkey } = require('./chaosMonkey');
const { setTimeout } = require('timers');

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


function isValidIP(ip) {
    const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    if (!ipPattern.test(ip)) return false;

    const parts = ip.split('.').map(Number);
    return parts.every(part => part >= 0 && part <= 255);
}

let port_new_instance = 16000

function launchNewInstance() {
    console.log("               **********************************************************")
    printLog('Lanzando nueva instancia...');

    try {
        const reader = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        reader.question('Introduzca la dirección IP a donde se va a conectar el nuevo servicio: \n', (ip_address) => {
            reader.close();

            if (!isValidIP(ip_address)) {
                console.log('La dirección IP introducida no es válida. Por favor, introduzca una dirección IP válida.');
                launchNewInstance(); // Vuelve a solicitar la dirección IP
                return;
            }

            const scriptPath = 'build_new_back_instance.bat';
            const batProcess = spawn('cmd', ['/c', scriptPath, port_new_instance, ip_address]);
            port_new_instance = ++port_new_instance;
            console.log("NUEVO PUERTO:" + port_new_instance)

            // Captura y muestra la salida estándar del proceso
            batProcess.stdout.on('data', (data) => {
                printLog("[[ Sistema anfitrión dice ]]: " + data.toString());
            });

            // Captura y muestra la salida de error del proceso
            batProcess.stderr.on('data', (data) => {
                console.error('Ocurrió un error:', data.toString());
                printLog("Intentando de nuevo....")
                launchNewInstance();
            });

            // Maneja los eventos de cierre del proceso
            batProcess.on('close', (code) => {
                printLog('Proceso de nueva instancia finalizado con código de salida', code);
                printLog('Esperando 20 segundos antes de iniciar nuevos chequeos de estado...');
                setTimeout(() => {
                    printLog('Iniciando nuevos chequeos de estado...');
                    checkServerStatus();
                }, 120000); // Esperar 2 minutos (120000 ms) antes de iniciar nuevos chequeos de estado
            });
        })
    } catch (error) {
        console.error('Error al lanzar nueva instancia:', error);
        printLog("Intentando de nuevo....")
        launchNewInstance();
    }
}



const runChaosMonkey = async () => {
    try {
      const stoppedContainerId = await chaosMonkey();
      if (stoppedContainerId) {
        printLog(`Se detuvo el contenedor con el puerto: ${stoppedContainerId}`);
      } else {
        // Lógica en caso de error al detener el servidor
        printLog('Error al detener el servidor.');
      }
    } catch (error) {
      console.error('Error al ejecutar Chaos Monkey:', error.message);
    }
  
    setTimeout(runChaosMonkey, 60000); 
};


// en milisegundos
const timeout = 150
let resTime = 0

const checkServerStatus = async () => {
    const updatedServersList = [];
    for (const server of serversList) {
        printLog(`Iniciando chequeo para el servidor: ${server} ....`)
        try {
            const url = server + "/monitor/healthchek"
            printLog("Enviando peticiones a:" + url)

            const start = Date.now();
            const res = await axios.get(url)
            if (res) {
                const end = Date.now(); // Momento de recepción de la respuesta
                resTime = end - start;
                printLog(`=>    Tiempo de respuesta del servidor en milisegundos ${server} es ${resTime}ms`)
                if (resTime >= timeout) {
                    serversList.splice(serversList.indexOf(server), 1);
                    printLog(`Servidor ${server} eliminado por exceder el tiempo de respuesta.`);
                    printLog("+++++++++++ Servidores restantes +++++++++++ \n")
                    console.log(serversList)
                    launchNewInstance();
                    io.emit('server_deleted', { server, responseTime: resTime });
                } else {
                    updatedServersList.push({ server, responseTime: resTime });
                    printLog(`=========     Servidor ${server} vivo     =========`)
                }
            }
        } catch (error) {
            serversList.splice(serversList.indexOf(server), 1);
            printLog(`La solicitud fue rechazada, servidor ${server} eliminado`);
            printLog("+++++++++++ Servidores restantes +++++++++++ \n")
            console.log(serversList)
            io.emit('server_deleted', { server, responseTime: null });
            launchNewInstance();
        }
    }
    io.emit('update_servers', { servers: updatedServersList })
};


// Verificar el estado de los servidores cada 10 segundos
setInterval(checkServerStatus, 10000)
setTimeout(runChaosMonkey, 60000);

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

