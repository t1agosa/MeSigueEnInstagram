# Mirá quién no te sigue de vuelta en Instagram

Una página para ver **a quién seguís que no te sigue**, a quién **no seguís de vuelta** y quiénes se siguen entre sí.

👉 **Usala acá:** https://t1agosa.github.io/MeSigueEnInstagram/

---

## ✅ Es el método más seguro

- **Nunca te pide tu usuario ni tu contraseña.**
- **Tus archivos no se suben a ningún lado.** Todo se procesa dentro de tu navegador, en tu propio celular o computadora.
- No hay servidor, no hay cuentas, no hay anuncios.
- Usa los archivos oficiales que te da Instagram, así que a Instagram no le cambia nada.

## ⚠️ Ojo con los otros métodos

Hay muchas páginas y aplicaciones que te piden tu usuario y tu contraseña para hacer lo mismo. **No las uses.**

- Pueden **robarte la cuenta**.
- Instagram **prohíbe** esas herramientas y puede **limitarte o bloquearte la cuenta**.
- Si ya le diste tu contraseña a alguna, cambiala ahora.

**Regla de oro: tu contraseña de Instagram se escribe solo en Instagram.**

---

## Paso a paso

Necesitás unos 5 minutos. Podés hacerlo desde el celular o desde la computadora.

### Paso 1. Entrá a la exportación

En Instagram, seguí este camino:

**Perfil › ☰ Tres rayitas › Centro de cuentas › Tu información y permisos › Exportar información › Crear exportación › Elegí tu usuario › Exportar al dispositivo**

### Paso 2. Elegí estos ajustes

| En este campo | Elegí |
|---|---|
| **Personalizar información** | Destildá todo y dejá tildado **solo** ✅ **Seguidores y seguidos** |
| **Intervalo de fechas** | **Desde el principio** si lo hacés desde el celular, o **Cualquier fecha** si lo hacés desde la computadora |
| **Formato** | **JSON** |
| **Calidad del contenido multimedia** | **Calidad media** (da igual para lo que queremos hacer) |

> No elijas otro intervalo de fechas: Instagram te daría solo una parte de la lista.

### Paso 3. Iniciá la exportación

Tocá **Iniciar exportación**. Si te pide la contraseña, ponela tranquilo: es seguro porque estás dentro de Instagram.

### Paso 4. Esperá y descargá

No debería tardar mucho. Si tarda, podés volver más tarde.

Cuando aparezca el botón **Descargar** junto a tu solicitud, tocalo. Si no aparece, actualizá la página del navegador.

Se descarga un **.zip**. **No hace falta abrirlo ni descomprimirlo.**

### Paso 5. Subilo a la página

1. Abrí la página: https://t1agosa.github.io/MeSigueEnInstagram/
2. **Arrastrá el .zip** a la página, o tocá **Subí tu archivo** y elegilo.
3. Listo. Vas a ver quiénes no te siguen de vuelta, y algunas cositas más.

También podés subir los archivos `followers_1.json` y `following.json` sueltos si ya descomprimiste el .zip. La página entiende `.zip`, `.json` y `.html`.

> Los nombres de los menús de Instagram pueden cambiar un poquito según tu versión. Si no encontrás algo, buscá «Exportar información» en el buscador de Instagram.

---

## Qué podés hacer con los resultados

La página muestra cuántos te siguen, a cuántos seguís y qué parte de las cuentas que seguís te sigue de vuelta. Y tiene tres listas:

| Lista | Qué significa |
|---|---|
| **No te siguen** | Cuentas que seguís vos y no te siguen a vos. |
| **No seguís** | Cuentas que te siguen a vos y vos no seguís. |
| **Mutuos** | Cuentas que se siguen entre sí. |

En cada lista podés:

- **Buscar** a alguien por su usuario.
- Tocar **Abrir perfil** para ir a su perfil en Instagram. Ahí tocás **Siguiendo** y después **Dejar de seguir** (o **Seguir**, según la lista).
- Marcar la casilla ☑ cuando **ya lo revisaste**. Queda tachado, y si volvés otro día y subís el archivo de nuevo, **sigue tachado**. Esas marcas se guardan solo en tu navegador.
- Activar **Ocultar los que ya revisé** para ver únicamente los que te faltan.

> 💡 **Consejo:** no dejes de seguir a muchas cuentas de golpe. Instagram puede pensar que sos un robot y limitarte la cuenta. Hacelo de a poco, unas pocas por día.

Arriba de los resultados aparece la fecha en que Instagram preparó tu archivo («Datos del 2 oct, 11:28»). Si seguiste o dejaste de seguir a alguien después, no aparece: pedí un archivo nuevo para actualizar.

---

## Preguntas frecuentes

**Los números no coinciden con los de mi perfil.**
Instagram arma el archivo en el momento en que lo pedís. Todo lo que hagas después (seguir o dejar de seguir a alguien) no aparece. Podés seguir usando la lista y marcar las casillas, o pedir un archivo nuevo. Las casillas que ya marcaste se mantienen, porque se guardan en tu navegador.

**Me muestra muy pocos seguidores o seguidos.**
Seguramente elegiste otro intervalo de fechas. Instagram filtra por la fecha en que empezó cada relación, así que te da solo una parte de la lista. Pedí el archivo de nuevo con «Desde el principio» (celular) o «Cualquier fecha» (computadora).

**No me aparece el botón Descargar.**
Esperá un rato y actualizá la página del navegador. Instagram también puede avisarte por mail cuando el archivo esté listo, así que revisá la carpeta de spam.

**La página me dice que el archivo no sirve.**
Seguramente se exportó más información que «Seguidores y seguidos». Volvé al Paso 2 y destildá todo, menos «Seguidores y seguidos».

**Me dice que falta el archivo de seguidores o de seguidos.**
La página necesita los dos. Si subiste el .zip completo, están los dos. Si subiste archivos sueltos, subí también el que falta (`followers_1.json` o `following.json`).

**Mi .zip pesa muchísimo.**
Se exportó más información de la cuenta. Volvé a pedirlo con **solo** «Seguidores y seguidos»: pesa muy poco.

**Tengo varios archivos `followers_2.json`, `followers_3.json`…**
Está bien. Si subís el .zip, la página los junta sola. Si los subís sueltos, subilos todos juntos.

**¿Alguien ve mis datos?**
No. Los archivos se leen dentro de tu navegador y no se envían a ningún servidor. Para comprobarlo, abrí las herramientas de desarrollo de tu navegador (tecla F12 en la computadora), andá a la pestaña **Red** (*Network*), subí el archivo y vas a ver que no sale ninguna conexión.

**¿Instagram se entera de que usé esto?**
No. La página nunca se conecta con Instagram. Solo lee los archivos que vos le das.

---

## Para quien programa

Es una web estática sin dependencias ni proceso de compilación: `index.html`, `app.js`, `style.css` y `jszip.min.js` (JSZip 3.10.1, incluida en el repo para no depender de ningún CDN).

- La página tiene una política de seguridad (`Content-Security-Policy`) que **bloquea cualquier conexión de red**, así que el código no podría enviar tus datos aunque quisiera.
- Para probarla en tu máquina, abrí `index.html` en el navegador o levantá un servidor simple, por ejemplo `python3 -m http.server`.
- Para publicarla: subí estos archivos a un repositorio de GitHub y activá **Settings → Pages → Deploy from a branch → main / (root)**.

Este proyecto se publica bajo licencia MIT (ver `LICENSE`). JSZip se distribuye bajo licencia MIT o GPLv3 (ver `JSZIP-LICENSE.md`).

---

*Proyecto independiente. No tiene ninguna relación con Instagram ni con Meta. Los nombres de los menús de Instagram pueden cambiar con el tiempo.*
