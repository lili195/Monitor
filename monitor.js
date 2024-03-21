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
const resTime = 0

const checkServerStatus = async () => {
    serversList.forEach(async server => {
        console.log(`Iniciando chequeo para el servidor: ${server} ....`)
        try {
            const url = server + "/monitor/healthchek"
            console.log("Enviando peticiones a:" + url)

            const start = Date.now();
            const res = await axios.get(url)
            if (res) {
                const end = Date.now(); // Momento de recepción de la respuesta
                resTime = end - start;
                console.log(`==============Tiempo de respuesta del servidor en milisegundos ${server} es ${resTime}ms`)
                if (resTime >= timeout) {
                    serversList.splice(serversList.indexOf(server), 1);
                    console.log(`Servidor ${server} eliminado por exceder el tiempo de respuesta.`);
                } else {
                    console.log(`=========Servidor ${server} vivo =========`)
                }
            }
        } catch (error) {
            serversList.splice(serversList.indexOf(server), 1);
            console.log(`La solicitud fue rechazada, servidor ${server} eliminado`);
            console.log("Servidores restantes: ", serversList)
        }
    });
};

// Verificar el estado de los servidores cada 20 segundos
setInterval(checkServerStatus, 15000)


app.listen(port, () => {
    console.log(`Monitor escuchando en el puerto ${port}`)
})