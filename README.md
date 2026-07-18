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
