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

rem Si no se recibe un segundo parámetro, se usa el valor predeterminado 10
rem Si el segundo parámetro no es un número, se muestra un mensaje de error

set "port_number=%2"

if "%port_number%"=="" (
  echo Error: Debe ingresar un número como parámetro.
  exit 1
)

rem **Muestra el número recibido**
echo Número recibido: %port_number%



rem **Cierra la ventana del símbolo del sistema**
exit