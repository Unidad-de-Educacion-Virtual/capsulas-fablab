# 📚 Cápsulas Educativas — FabLab UFPS

Plataforma de visualización de cápsulas de aprendizaje del Laboratorio de Fabricación Digital (FabLab) de la Universidad Francisco de Paula Santander. Las cápsulas garantizan el sostenimiento del temario de los cursos ante la rotación de practicantes del laboratorio.

---

## 🚀 Demo

[Ver en GitHub Pages](https://tu-organizacion.github.io/capsulas-fablab)

---

## 🛠️ Tecnologías

- HTML5, CSS3, Vanilla JavaScript
- Docker + Nginx
- Google Fonts (Montserrat)
- GitHub Pages (Deployment)

---

## 📦 Correr en Local

Requiere **Docker Desktop** instalado y corriendo.

```bash
docker compose up --build
```

Accede en: **http://localhost:8080**

> Para detener el contenedor: `Ctrl + C` en la terminal o `docker compose down`

---

## 📁 Estructura del Proyecto

```
capsulas-fablab/
├── docker/
│   ├── Dockerfile          # Imagen nginx:alpine
│   └── nginx.conf          # Configuración del servidor
├── src/
│   ├── pages/
│   │   ├── index.html      # Selector de cursos
│   │   ├── course.html     # Vista de cápsulas del curso
│   │   ├── about.html      # Acerca del proyecto
│   │   └── terms.html      # Política de uso
│   ├── assets/
│   │   ├── css/
│   │   │   ├── styles.css  # Estilos globales
│   │   │   ├── course.css  # Estilos de la vista de cápsulas
│   │   │   └── static.css  # Estilos de páginas estáticas
│   │   ├── js/
│   │   │   ├── main.js     # Lógica del selector de cursos
│   │   │   ├── course.js   # Lógica de la vista de cápsulas
│   │   │   └── static.js   # Script compartido (about, terms)
│   │   └── img/            # Imágenes y logos
│   └── data/
│       └── courses.json    # Datos de cursos y cápsulas
├── docker-compose.yml
├── .gitignore
├── LICENSE
└── README.md
```


## 📝 Gestión de Contenidos

Gracias a la integración con Google, no es necesario modificar el código fuente para añadir contenido:

1. **Cursos:** Registre el nuevo curso en la hoja 'Cursos'. El backend actualizará el Formulario de Google automáticamente.
2. **Cápsulas:** Al enviar el formulario de cápsulas, la información se almacenará en la hoja 'Cápsulas'.
3. **Vinculación:** El sistema vincula automáticamente las cápsulas con los cursos utilizando el campo de título como llave relacional.
4. **Multimedia:** Para imágenes y archivos, utilice enlaces compartidos de Google Drive. La plataforma utiliza la utilidad `fixDriveUrl()` para transformar estos enlaces en rutas de descarga directa o visualización.

**Valores válidos para los filtros:**

| Campo | Valores aceptados |
|---|---|
| `area` | `modelado-3d`, `fabricacion`, `electronica`, `diseño` |
| `nivel` | `basico`, `intermedio`, `avanzado` |
| `software` | `blender`, `fusion360`, `arduino`, `cura` |

> Para agregar un área o software nuevo, edita el objeto `FILTER_LABELS` en `main.js`.

---

## 🖼️ Agregar Imágenes

1. Coloca la imagen en `src/assets/img/`
2. Referénciala en el JSON con ruta absoluta: `/assets/img/nombre-imagen.png`

Para los archivos del curso (`.glb`, `.blend`, texturas), sube los archivos a Google Drive y usa el enlace de descarga directa:
```
https://drive.google.com/uc?export=download&id=ID_DEL_ARCHIVO
```

---

## 🔗 Navegación de la Plataforma

| Ruta | Descripción |
|---|---|
| `/` → `/pages/index.html` | Selector de cursos con filtros |
| `/pages/course.html?id=ID` | Cápsulas de un curso específico |
| `/pages/about.html` | Información del proyecto y el FabLab |
| `/pages/terms.html` | Política de uso del contenido |

---

## ⚙️ Configuración de Nginx

El archivo `docker/nginx.conf` sirve el proyecto desde la carpeta `src/`. La raíz `/` redirige internamente a `/pages/index.html`. Todos los assets se sirven con caché de 1 hora durante desarrollo.

---

## 👤 Autor

**Mauro Leandro Rios Churta**
Practicante Profesional — FabLab UFPS 2026 

---

## 🏛️ Institución

**Laboratorio de Fabricación Digital — FabLab**
Universidad Francisco de Paula Santander
Tercer Piso, Aula Sur, Cúcuta, Colombia
fablab@ufps.edu.co

---

## 📝 Licencia

MIT — Ver archivo [LICENSE](./LICENSE)