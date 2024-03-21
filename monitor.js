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

const checkServerStatus = async () => {
    serversList.forEach(async server => {
        console.log(`Iniciando chequeo para el servidor: ${server} ....`)
        try {
            const url = server + "/monitor/healthchek"
            console.log("Enviando peticiones a:" + url)
            await axios.get(url)
            console.log(`=== Servidor ${server} vivo ===`)
        } catch (error) {
            serversList.splice(serversList.indexOf(server), 1);
            console.log(`La solicitud fue rechazada, servidor ${server} eliminado`);
            console.log("Servidores restantes: ", serversList)
        }
    });
};

// Verificar el estado de los servidores cada 5 segundos
setInterval(checkServerStatus, 10000)

app.listen(port, () => {
    console.log(`Monitor escuchando en el puerto ${port}`)
})