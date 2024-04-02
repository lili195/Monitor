const Docker = require('dockerode');
const docker = new Docker();

function printLog(message) {
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    console.log(`[Fecha: ${date}] [Hora: ${time}] [Mensaje: ${message}]`);
}


async function stopServer(containerId) {
    try {
      const container = await docker.getContainer(containerId);
      await container.stop();
  
      printLog(`Container with ID ${containerId} stopped.`);
      return containerId;
    } catch (error) {
      printLog(`Error stopping container with ID ${containerId}: ${error}`);
      return null;
    }
  }

const chaosMonkey = async () => {
    try {
        const containers = await docker.listContainers();

        const containerIds = containers.map(container => container.Id);

        // Elegir un contenedor aleatorio
        const randomIndex = Math.floor(Math.random() * containerIds.length);
        const containerId = containerIds[randomIndex];
        printLog(`Chaos Monkey selecciona el contenedor con ID ${containerId} para detener.`);

        await stopServer(containerId);

        printLog(`Contenedor con ID ${containerId} detenido por Chaos Monkey.`);
        return containerId;
    } catch (error) {
        printLog(`Error al detener el contenedor: ${error}`);
        return null;
    }
};

module.exports = {chaosMonkey};

