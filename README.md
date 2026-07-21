# NETMEE EPP Seguro

Aplicación Full Stack para inspeccionar, controlar y dar trazabilidad a los elementos de protección personal antes de cada labor.

## Arquitectura

La primera etapa es un **monolito modular** con Next.js 16. Las reglas de negocio viven en `src/modules`; `src/app` solo compone interfaces y adaptadores HTTP. Esta separación permite extraer IA, evidencias o notificaciones como servicios cuando el volumen lo justifique.

```text
Navegador → App Router / API v1 → Casos de uso → Dominio → Puertos
                                                        ↓
                                     Prisma / PostgreSQL / servicios externos
```

El módulo `inspections` contiene un primer flujo vertical y una regla crítica probada: una inspección no puede enviarse a revisión si existe un EPP obligatorio sin verificar. La prioridad 1 de acceso incluye Better Auth, sesiones persistentes, recuperación por correo, rate limiting, RBAC y auditoría de asignaciones.

## Desarrollo local

Requisitos: Node.js 20.9 o superior y PostgreSQL.

```bash
copy .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Antes del seed, defina credenciales seguras para el administrador y las variables de Better Auth en `.env`. Abra `http://localhost:3000`. El endpoint operativo está en `GET /api/v1/health`.

## Verificación de EPP con IA

La carga de evidencias puede iniciar una verificación visual asíncrona con Gemini. El servidor descarga la imagen privada mediante una URL firmada de cinco minutos, la envía como datos inline y exige una respuesta JSON validada. La interfaz separa cada EPP en visible, no visible o no concluyente y nunca aprueba automáticamente una inspección: el resultado requiere validación humana de SST.

1. Cree una clave gratuita en [Google AI Studio](https://aistudio.google.com/apikey).
2. Configure `AI_PROVIDER="gemini"`, `GEMINI_API_KEY` y `AI_WORKER_SECRET` en `.env`.
3. Mantenga `GEMINI_MODEL` configurable; el valor inicial es `gemini-3.5-flash`.

El primer intento se ejecuta con `after()` sin bloquear la carga. PostgreSQL conserva el trabajo y sus reintentos; en producción, programe llamadas autenticadas a `POST /api/internal/ai/process` para drenar trabajos pendientes tras reinicios o límites de ejecución. Puede ejecutar varios workers: el bloqueo optimista evita procesar dos veces el mismo trabajo.

El nivel gratuito de Gemini no cobra tokens de entrada/salida, pero sus límites dependen del proyecto y Google indica que los datos enviados en ese nivel pueden usarse para mejorar sus productos. Para fotografías sensibles o producción regulada, evalúe el nivel de pago (donde Google indica que no usa los datos para ese fin), consentimiento, residencia de datos y políticas internas antes de habilitarlo.

## Calidad

```bash
npm run check
npm run build
```

## Convenciones

- TypeScript estricto y validación Zod en todas las entradas.
- Server Components por defecto; componentes cliente solo para interacción.
- Server Actions para mutaciones internas y Route Handlers para API, archivos e integraciones.
- Autenticación y autorización dentro de cada operación sensible, nunca solo en `proxy.ts`.
- Las imágenes se guardan en almacenamiento de objetos; PostgreSQL conserva metadatos y referencias.
- Los módulos se consumen únicamente desde su `index.ts` público.

Consulte [docs/architecture/overview.md](docs/architecture/overview.md) para límites, fases y decisiones de escalamiento.
# Netmee-SST
