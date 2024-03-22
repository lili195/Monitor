@echo off

REM Leer la variable de entorno del sistema
echo La ruta del Dockerfile es: %DOCKERFILE_DIR%

REM Verifica si existe el archivo que contiene el valor del contador
if not exist counter.txt (
    echo. > counter.txt
)

REM Lee el valor del contador desde el archivo
set /P CONTADOR=<contador.txt

REM Define el puerto como 4000 más el valor del contador
set /A PORT=5000+%CONTADOR%

REM Define el nombre de la imagen como "server" seguido del número del contador
set IMAGEN=serverimage%CONTADOR%

REM Define el nombre del contenedor como "server" seguido del número del contador
set CONTENEDOR=servercont%CONTADOR%

REM Incrementa el contador para la próxima ejecución
set /A CONTADOR+=1

REM Guarda el nuevo valor del contador en el archivo
echo %CONTADOR% > counter.txt

REM Puerto de mapeo del contenedor (puerto del host:puerto del contenedor)
set PUERTO_MAPEADO=%PORT%:%PORT%

REM Definición de variables de entorno para el comando Docker
set DATABASE_URL=your_database_url
set ID_SERVICE=server%CONTADOR%
set NODE_SERVICE_IP=172.17.0.%CONTADOR%
set NODE_SERVICE_PORT=%PORT%
set NODE_VERSION=18.19.1
set PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
set YARN_VERSION=1.22.19

REM Construye y ejecuta el comando Docker
docker build -t %IMAGEN% --build-arg PORT=%PORT% -f %DOCKERFILE_DIR%\Dockerfile %DOCKERFILE_DIR%
docker run -d -p %PUERTO_MAPEADO% --name %CONTENEDOR% -e DATABASE_URL -e ID_SERVICE -e NODE_SERVICE_IP -e NODE_SERVICE_PORT -e NODE_VERSION -e PATH -e YARN_VERSION %IMAGEN%

echo Contenedor creado exitosamente con nombre de imagen: %IMAGEN% y puerto mapeado: %PUERTO_MAPEADO%.
