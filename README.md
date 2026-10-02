# ¿Quién no te sigue de vuelta en Instagram?

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

Necesitás unos 5 minutos de tu tiempo, más lo que tarde Instagram en mandarte el mail.

### Paso 1. Pedile tus datos a Instagram

Hacelo desde el celular o la computadora, como prefieras.

1. Abrí Instagram y entrá a **tu perfil**.
2. Tocá las **tres rayitas** (☰) de arriba a la derecha.
3. Tocá **Centro de cuentas**.
4. Tocá **Tu información y permisos**.
5. Tocá **Descargar tu información**.
6. Tocá **Descargar o transferir información** y elegí tu cuenta de Instagram.
7. Elegí **Parte de tu información**.
8. Buscá y tildá **solamente** ✅ **Seguidores y seguidos**. Nada más.
9. Tocá **Descargar en el dispositivo**.
10. En **Intervalo de fechas** elegí **Cualquier fecha**. No elijas otro intervalo: Instagram te daría solo una parte de la lista. Con esta opción el mail puede tardar un poco más.
11. En **Formato** elegí **JSON**. *(Si dice HTML, cambialo a JSON. Igual la página también acepta HTML.)*
12. Tocá **Crear archivos**. Si te pide la contraseña, es la de Instagram y se la das a Instagram, nadie más.

> Los nombres de los menús pueden cambiar un poquito según tu versión de Instagram. Si no encontrás algo, buscá la palabra «Descargar» en el buscador de Instagram.

### Paso 2. Esperá el mail

Instagram te manda un mail cuando el archivo está listo. Puede tardar **desde unos minutos hasta unas horas**.

### Paso 3. Descargá el archivo

1. Abrí el mail de Instagram.
2. Tocá **Descargar información** e iniciá sesión en Instagram si te lo pide.
3. Descargá el archivo. Es un **.zip**. **No hace falta abrirlo ni descomprimirlo.**

### Paso 4. Subilo a la página

1. Abrí la página: https://t1agosa.github.io/MeSigueEnInstagram/
2. **Arrastrá el .zip** al recuadro celeste, o tocá el recuadro y elegilo.
3. Listo. Aparecen tus resultados.

También podés subir los archivos `followers_1.json` y `following.json` sueltos si ya descomprimiste el .zip. La página entiende `.zip`, `.json` y `.html`.

### Paso 5. Usá los resultados

La página tiene tres listas:

| Lista | Qué significa |
|---|---|
| **No te siguen de vuelta** | Cuentas que seguís vos y no te siguen a vos. |
| **No los seguís de vuelta** | Cuentas que te siguen a vos y vos no seguís. |
| **Mutuos** | Cuentas que se siguen entre sí. |

En cada lista podés:

- **Buscar** a alguien por su usuario.
- Tocar **Abrir perfil** para ir a su perfil en Instagram. Ahí tocás **Siguiendo** y después **Dejar de seguir** (o **Seguir**, según la lista).
- Marcar la casilla ☑ cuando **ya lo revisaste**. Queda tachado, y si volvés otro día y subís el archivo de nuevo, **sigue tachado**. Esas marcas se guardan solo en tu navegador.
- Tildar **Ocultar los que ya revisé** para ver únicamente los que te faltan.

> 💡 **Consejo:** no dejes de seguir a muchas cuentas de golpe. Instagram puede pensar que sos un robot y limitarte la cuenta. Hacelo de a poco, unas pocas por día.

---

## Preguntas frecuentes

**Los números no coinciden con los de mi perfil.**
Instagram prepara el archivo en el momento en que lo pedís, y puede tardar horas en llegarte. Todo lo que hagas después (seguir o dejar de seguir a alguien) no aparece en el archivo. Podés seguir usando la lista y marcar las casillas, o pedir un archivo nuevo. Si lo hacés, las casillas que ya marcaste se mantienen, porque se guardan en tu navegador.

**Me muestra muy pocos seguidores o seguidos.**
Seguramente elegiste un intervalo de fechas distinto de «Cualquier fecha». Instagram filtra por la fecha en que empezó cada relación, así que te da solo una parte de la lista. Pedí el archivo de nuevo con «Cualquier fecha». No trae a quienes ya dejaron de seguirte: trae tu lista tal como está el día que lo pedís.

**No me llega el mail.**
Esperá un rato más, puede tardar horas. Revisá la carpeta de spam. El mail llega a la dirección que tenés cargada en Instagram.

**La página me dice que el archivo no sirve.**
Seguramente pediste más cosas que «Seguidores y seguidos» o elegiste otra información. Volvé al Paso 1 y tildá **solamente** «Seguidores y seguidos».

**Me dice que falta el archivo de seguidores o de seguidos.**
La página necesita los dos. Si subiste el .zip completo, están los dos. Si subiste archivos sueltos, subí también el que falta (`followers_1.json` o `following.json`).

**Mi .zip pesa muchísimo.**
Pediste más datos de la cuenta. Volvé a pedirlo con **solo** «Seguidores y seguidos»: pesa muy poco.

**Tengo muchos seguidores y hay varios archivos `followers_2.json`, `followers_3.json`…**
Está bien. Si subís el .zip, la página los junta sola. Si los subís sueltos, subilos todos juntos.

**¿Alguien ve mis datos?**
No. Los archivos se leen dentro de tu navegador y no se envían a ningún servidor. Si querés comprobarlo, abrí las herramientas de desarrollo de tu navegador (tecla F12 en computadora), andá a la pestaña **Red** (*Network*), subí el archivo y vas a ver que no sale ninguna conexión.

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
