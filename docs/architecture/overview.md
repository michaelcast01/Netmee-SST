# Arquitectura escalable

## Decisión principal

NETMEE EPP Seguro comienza como monolito modular porque el dominio aún debe estabilizarse. Distribuirlo desde el primer día añadiría despliegues, observabilidad, consistencia eventual y fallos de red sin aportar valor al MVP.

## Límites

- `app`: transporte HTTP, rutas y composición visual.
- `modules/*/domain`: reglas puras sin dependencias de Next.js ni Prisma.
- `modules/*/application`: casos de uso y puertos.
- `modules/*/infrastructure`: adaptadores para base de datos o proveedores.
- `lib`: infraestructura transversal, nunca reglas de negocio.

Los módulos no importan archivos internos de otro módulo; consumen su API pública (`index.ts`) o eventos.

## Datos y consistencia

PostgreSQL es la fuente de verdad. Prisma administra el esquema y las migraciones. Las operaciones que modifican inspección, inventario y auditoría deben ejecutarse en una sola transacción. Las evidencias se almacenan fuera de la base de datos con checksum, control de acceso y política de retención.

## Extracción futura de servicios

Extraer un módulo solo cuando exista una razón medible:

1. IA: uso intensivo de GPU/CPU o ciclo de despliegue independiente.
2. Evidencias: alto volumen, procesamiento asíncrono o requisitos de retención especiales.
3. Notificaciones: múltiples canales y reintentos independientes.
4. Reportes: consultas analíticas que afecten la carga transaccional.

La comunicación asíncrona debe usar un patrón outbox para no perder eventos entre la transacción y la cola.

## Seguridad

- RBAC con permisos específicos, no decisiones basadas únicamente en el nombre del rol.
- Autenticación, autorización y validación en cada Server Action y Route Handler.
- Evidencias con URLs firmadas de corta duración; nunca rutas públicas permanentes.
- Auditoría append-only para operaciones sensibles.
- Secretos fuera del repositorio y rotación por ambiente.
- Límites de tipo, tamaño y cantidad en cargas de archivos.

## Observabilidad

Cada solicitud debe propagar un correlation ID. Registrar métricas de latencia, errores, colas, análisis de IA y cumplimiento, sin incluir fotografías, tokens ni datos personales en logs.

## Fases

1. Identidad, permisos, actividades, matriz EPP e inspecciones.
2. Inventario, evidencias, acciones correctivas y auditoría.
3. Reportes operativos y notificaciones.
4. IA opcional, procesamiento asíncrono y extracción selectiva de servicios.
