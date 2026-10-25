# 📱 Control de Asistencia para Celular de Tienda

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FbyAdrian30%2Fcontrol-asistencia)

Aplicación web progresiva (PWA / Mobile-First) diseñada específicamente para usarse en el **celular de tienda**, con almacenamiento de datos en **Supabase**, despliegue en **Vercel**, auto-deslogueo a la **1:00 AM** y notificaciones automáticas al bot de **Telegram al mediodía**.

---

## 🚀 Características Principales

1. **Modo Celular de Tienda (Kiosko)**:
   - Pantalla vertical táctil, rápida y amigable.
   - **Opción A - Selección de Nombre:** El colaborador pulsa su nombre en la lista, ingresa su PIN de 4 dígitos y pulsa **"Iniciar Jornada"** o **"Finalizar Jornada"**.
   - **Opción B - Teclado Numérico Directo:** Modo PIN donde el colaborador solo teclea sus 4 dígitos e inmediatamente el sistema identifica quién es y le muestra su acción.
   - Retroalimentación auditiva (chimes), háptica (vibración en celular) y visual (confeti al marcar entrada).
   - Temporizador de retorno automático de 3.2 segundos para dejar libre el celular al siguiente compañero.

2. **Auto-Deslogueo Automático a la 1:00 AM**:
   - Si un colaborador olvidó marcar su salida al terminar su jornada, el sistema ejecuta automáticamente una tarea programada a la **1:00 AM del día siguiente** que cierra la jornada abierta y le asigna la etiqueta `Auto-cierre nocturno`.
   - Implementado mediante **Vercel Cron** (`/api/cron/auto-checkout`).

3. **Malla Horaria y Alertas de Tardanza en Telegram (12:00 PM)**:
   - Permite definir los horarios de cada empleado por día de la semana (ej: Lunes a Sábado de 09:00 a 18:00, con tolerancia en minutos).
   - Todos los días a las **12:00 PM**, el sistema evalúa la asistencia del día y envía un reporte detallado a tu bot de **Telegram**:
     - Quiénes llegaron tarde y **por cuántos minutos exactos**.
     - Quiénes llegaron a tiempo.
     - Resumen general del día.

4. **Panel de Administración Protegido**:
   - Acceso con PIN de Admin (por defecto `1234`).
   - Agregar, editar o eliminar colaboradores.
   - Configurar o ajustar la Malla Horaria.
   - Configurar y probar el Bot de Telegram con 1 clic.
   - Disparar manualmente el auto-cierre o el reporte de Telegram en cualquier momento.

---

## 🗄️ 1. Configuración de la Base de Datos (Supabase)

1. Ingresa a [supabase.com](https://supabase.com) y crea un nuevo proyecto gratuito.
2. Ve al apartado **SQL Editor** en el menú lateral izquierdo.
3. Abre el archivo [`supabase/schema.sql`](supabase/schema.sql) de este proyecto, copia todo su contenido y pégalo en el editor SQL de Supabase.
4. Presiona **Run**. Esto creará automáticamente:
   - Tabla `employees` (colaboradores y códigos PIN).
   - Tabla `schedules` (malla horaria por día de la semana).
   - Tabla `attendance` (entradas, salidas, minutos de tardanza y auto-cierre).
   - Tabla `system_settings` (configuraciones).
   - Políticas de seguridad (RLS).
5. Ve a **Project Settings** -> **API** y copia:
   - **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - **anon / public key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **service_role key** (`SUPABASE_SERVICE_ROLE_KEY`) (para los cron jobs del servidor)

---

## 🤖 2. Configuración del Bot de Telegram

1. Abre Telegram y busca al bot oficial `@BotFather`.
2. Envía el comando `/newbot` y sigue las instrucciones para ponerle nombre y usuario a tu bot.
3. Copia el **HTTP API Token** generado (ej: `7123456789:ABCdefGhIjk...`).
4. Para obtener tu **Chat ID**:
   - Inicia conversación con tu bot (o agrégalo al grupo de supervisores donde quieras recibir el reporte).
   - Puedes obtener tu Chat ID hablándole a bots como `@userinfobot` o reenviando un mensaje a `@getidsbot`.
5. Puedes ingresar estas credenciales directamente desde la app en el **Panel Admin -> Bot Telegram** y pulsar **"Probar Conexión"**.

---

## ☁️ 3. Despliegue en Vercel

### Opción A: Mediante GitHub (Recomendada)
1. Sube este repositorio a tu cuenta de GitHub:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/control-asistencia.git
   git push -u origin main
   ```
2. Ve a [vercel.com](https://vercel.com) -> **Add New...** -> **Project**.
3. Importa tu repositorio de GitHub.
4. En la sección **Environment Variables**, agrega las siguientes:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `STORE_NAME` (ej: "Tienda Principal")
5. Haz clic en **Deploy**. ¡Listo!

### Tareas Programadas (Vercel Cron)
El archivo [`vercel.json`](vercel.json) ya viene preconfigurado con:
- `0 6 * * *` -> 06:00 UTC (01:00 AM hora de Perú UTC-5): Auto-deslogueo de colaboradores.
- `0 17 * * *` -> 17:00 UTC (12:00 PM hora de Perú UTC-5): Notificación de tardanzas a Telegram.

---

## 💻 4. Ejecución Local (Desarrollo)

Para probar la aplicación en tu computadora o en la red local de tu tienda:

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev
```

Abre en tu navegador: `http://localhost:3000`

---

## 🔐 Credenciales Iniciales de Prueba

- **PIN de Administrador**: `1234`
- **Empleados de prueba incluidos**:
  - Carlos Mendoza: PIN `1001`
  - Lucía Ramírez: PIN `1002`
  - Mateo Salazar: PIN `1003`
  - Andrea Vargas: PIN `1004`
