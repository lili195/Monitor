require('dotenv').config()

const axios = require('axios');

const express = require('express')
const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

const cors = require('cors')
app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}))

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
    printLog('Servidor registrado:');
    console.log(serverUrl)
    printLog('Lista de servidores:'); // Mostrar la lista de servidores actualizada
    console.log(serversList)
    res.sendStatus(200);
});

// en milisegundos
const timeout = 2000
let resTime = 0

const checkServerStatus = async () => {
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
                } else {
                    printLog(`=========Servidor ${server} vivo =========`)
                }
            }
        } catch (error) {
            serversList.splice(serversList.indexOf(server), 1);
            printLog(`La solicitud fue rechazada, servidor ${server} eliminado`);
            printLog("Servidores restantes: ")
            console.log(serversList)
        }
    });
};

// Verificar el estado de los servidores cada 20 segundos
setInterval(checkServerStatus, 15000)


app.listen(port, () => {
    printLog(`Monitor escuchando en el puerto ${port}`)
})