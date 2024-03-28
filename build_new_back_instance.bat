@echo off

rem Recibe la ruta de la carpeta como parámetro
rem Si no se recibe un parámetro, muestra un mensaje de error
if "%1"=="" (
  echo Error: Debe especificar la ruta de la carpeta.
  exit 1
)

rem Comprueba si la ruta existe
if not exist "%1" (
  echo Error: La ruta "%1" no existe.
  exit 1
)

rem Cambia el directorio actual a la ruta especificada
cd "%1"

rem Muestra el contenido de la carpeta
echo Carpeta "%1" encontrada, mostrando contenidos:
dir

rem **Recibe el número como parámetro**

rem Si el segundo parámetro no es un número, se muestra un mensaje de error

set "port_number=%2"

if "%port_number%"=="" (
  echo Error: Debe ingresar un número como parámetro.
  exit 1
)

rem **Muestra el número recibido**
echo Número recibido: %port_number%

rem **Crear el nombre del contenedor**

set "container_name=backend_%port_number%"

rem **Construir el comando para ejecutar el contenedor"

set "docker_run_command=docker run -d --name %container_name% -e PORT=%port_number% -e DATABASE_URL=postgres://postgres:1234@192.168.0.101:5432/postgres -e BALANCER_URL=http://192.168.0.101:3000 -e MONITOR_URL=http://192.168.0.101:3001 -e IP_ADDRESS=192.168.0.101 -p %port_number%:%port_number% backend"

rem **Mostrar el comando creado**

echo Docker run command: %docker_run_command%

rem **Ejecutar el comando creado**

%docker_run_command%

rem **pausar el script**
pause

rem **Cierra la ventana del símbolo del sistema**
exit