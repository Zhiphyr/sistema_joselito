# TRANSPORTE JOSELITO - RESUMEN
# Tecnologías usadas
- NodeJS
- MySQL
- HTML y CSS puro
- JavaScript
- Antigravity IDE (Opcional se puede usar VScode normalmente, se usa antigravity para crear la interfaces)
# Estructura de Carpetas
<img width="442" height="415" alt="Pasted image 20260616235349" src="https://github.com/user-attachments/assets/b4b76329-808e-4862-92b9-b6a4130f3a71" />

## Carpeta "agents"
- Skill para antigravity para crear mejores interfaces
## Carpeta "config"
- Conexion a la BD
- Conexion a Cloudinary (Servicio para guardar imagenes en la nube, las rutas se generan al guardar y estas se almacenan en la bd)
## Carpeta "database"
- Scripts de creacion de tablas de la bd, usada para que antigravity tenga contexto de las tipos de los campos de cada tabla
- Esto no se guarda en el github
## Carpeta "frontend
<img width="451" height="171" alt="Pasted image 20260616234105" src="https://github.com/user-attachments/assets/b9879bd4-bb7f-41da-b060-c343077fc83e" />

### Carpeta "css"
<img width="458" height="112" alt="Pasted image 20260616234613" src="https://github.com/user-attachments/assets/c74f77b6-f7b6-42c5-9cfe-24de7ed30e6a" />

- Hojas de estilo de la pagina, solo se cuenta con dos archivos.
- La mayor parte de estilos se estan aplicando en las etiquetas de html (Deberia estar separado por cada modulo pero las interfaces lo crea antigravity; es por eso que algunos estilos estan en las mismas etiquetas html)
### Carpeta "JS"
<img width="461" height="497" alt="Pasted image 20260616234646" src="https://github.com/user-attachments/assets/5592ded2-b89d-4156-a8bf-a88591243cee" />

- Archivos .js usadas para las validaciones de cada modulo creado.
- Usada para inyectar html dinamicamente a los archivos html correspondientes (traer los datos para las tablas, para modales, etc...)
#### Carpeta "vistas"
- Archivos .js de cada vista separadas del login y del dashboard (Aún sin crear)
### Carpeta "vistas"
<img width="461" height="497" alt="Pasted image 20260616235015" src="https://github.com/user-attachments/assets/a68ebf15-4dc0-4730-812d-f20b3818ab23" />

- Archivos html, mayormente se inyecta el html correspondiente desde los archivos .js
## Archivo ".env"
- Archivo para guardar creedenciales, nombres de bd, api keys
## Archivo "app.js"
- Servidor del sistema, archivo que se usa para ejecutar el sistema
# Como prender el sistema
- Abrir la terminal
- Escribir: "node app.js"
- Presionar Enter
- En el navegador entrar a: "http://localhost:3000/login.html"
- Si se hace un cambio como de archivos js, controllers, models se tiene que reiniciar el sistema, cuando el servidor este encendido presionar "control + c" para detener el servidor y volver a ejecutar "node app.js"
# Creedenciales para entrar al sistema
- Usuario: admin
- Contraseña: 123456
- Usuario: developer
- Contraseña: developer123
- Contraseña o clave para anular un pago: 7788
# Git y GitHub
https://github.com/Zhiphyr/sistema_joselito
- Se esta usando gitflow
- Para crear nuevas ramas para un nuevo modulo llamarlas "feature/nombre-rama"

# Giro del Negocio
"Transporte Joselito" empresa con sede principal en Lima, dedicada al rubro del transporte de mercancía entre las ciudades de Lima y Chiclayo. Ubicado principalmente en el mercado Santa Anita de Lima, esta empresa actúa como intermediario entre los comerciantes limeños con los comerciantes chiclayanos.
## Proceso actual
1. Comerciante chiclayano se comunica con el comerciante de lima para solicitar algún tipo de producto del mercado de Santa Anita.
2. Realizado su trato (no nos interesa en el sistema) el comerciante de lima se comunica el jefe de la sede de lima y pregunta si algún camión sale en el día o si algunos de los que van a salir hoy tienen espacio para una carga que quieren enviar.
3. Sede de Lima confirma al comerciante de lima que hay camiones que saldrán en el día y aún tienen espacio para la carga que desea enviar.
4. Comerciante de lima envía su carga o pide que vayan a recogerlo en su puesto del mercado Santa Anita (Previamente el comerciante de lima al bulto le pone un tipo de marca (Bolsa de algún color, rafia de algún color, nombre en el saco, etc...)
5. Se pesan los bultos y se suben al camión correspondiente, mientras se sube el jefe va anotando en su cuaderno los siguientes datos por viaje (camión que va a salir): Remitente, destinatario, cantidad de sacos o bultos, nombre del producto, peso total por producto.
6. El camión sale de lima, mientras el camión esta en ruta, el jefe de lima envía una foto de sus notas al jefe de Chiclayo y este por su parte vuelve a anotar como una copia de la lista que le enviaron en otro cuaderno para que tenga un registro y una evidencia de lo que viene.
7. Cuando esta por llegar a Chiclayo se llama al jefe de la sede de Chiclayo para alertar de que ya están cerca y puedan ir a entregar la carga.
8. En destino, el jefe de Chiclayo comparte con sus trabajadores la listas enviadas para que sepan a quien entregar cada producto con su marca correspondiente, en las entregas como es una empresa muy apegada al mercado es por eso que cuando llega un producto lo envían directamente sin hace un cobro previo, esto debido a que como siempre son los mismos clientes frecuentes que reciben las cargas en Chiclayo entonces la cobranza se hace luego una vez entregada.
9. El encargado de cobrar los fletes a los comerciantes de Chiclayo, va puesto por puesto de los que se han entregado sus productos para cobrar el flete correspondiente (el flete se tiene una tarifa estándar para todos por kg, esta tarifa puede cambiar por aumentos de los peajes, combustible, etc...). Los comerciantes mayormente no pagan al momento, asi que aveces se hacen llamadas para preguntar si va a pagar hoy, más tarde, mañana, etc.. Otras veces el encargado va puesto por puesto cobrando, algunos le dicen que vuelva mañana o más tarde porque aun no venden, etc... (Asi que la empresa tiene como fletes por cobrar, cada flete se puede pagar parcialmente, pero no es que se este dando a credito y que se cobra un dia de cada mes, o semanalmente etc, el cobro mayormente se va a haciendo diariamente a cada uno de los deudores)
10. Mientras el encargado va cobrando, el jefe de la sede de chiclayo al finalizar de entregar todoslos productos se le acerca al camionero contratado previamente con una tarifa acordada (menor al flete que se lo cobra a los comerciantes de chiclayo, ya que a los camioneros se le pagan igualmente por kg traidos). Al momento de pagar se hacen los calculos de cuanto trajo (peso) y lo multiplican por lo acordado con el jefe de lima para calcular lo que se le debe pagar al camionero. Ocurren casos de que aveces en lima se solicita un adelanto (ya sea para que el camionero pague su combustible o peajes, etc... esto no nos interesa para que lo pide) si es que pidio adelanto entonces se hace como un descuento de su pago total para quitarle lo adelantado. Se puede dar el caso de que algun producto viene dañado, se pierde en el viaje, se malogra por la tardanza del camionero, etc; si esto pasa tambien se le hace un descuento al camionero por las perdidas generadas.
11. Y asi finaliza, las deudas de los fletes de los comerciantes de chiclayo se siguen cobrando los dias posteriores.
<img width="899" height="1599" alt="Pasted image 20260617001609" src="https://github.com/user-attachments/assets/ab4a864c-fb4f-402e-93ed-5ce4bf47a7c6" />


