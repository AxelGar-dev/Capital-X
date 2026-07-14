# CapitalX API

API REST para una empresa de factoraje financiero. Los clientes (empresas) ceden facturas por cobrar y CapitalX les adelanta el mismo día un porcentaje de su valor (aforo); después, CapitalX cobra la factura directamente al deudor.

Prueba técnica — Desarrollador Full Stack.

## Stack

- Node.js + TypeScript (ESM)
- Express 5
- MySQL 8 (vía `mysql2/promise`)
- Vitest para pruebas unitarias
- Docker Compose (API + base de datos)

## Cómo ejecutar el proyecto

### Opción A — Con Docker (recomendada)

Requiere tener [Docker](https://www.docker.com/) y Docker Compose instalados. No requiere instalar Node, MySQL, ni configurar variables de entorno manualmente. Todas las variables necesarias ya están definidas en `docker-compose.yml`.

```bash
docker compose up --build
```

Esto levanta dos servicios:

- `db`: MySQL 8, con el esquema (`db/init.sql`) ejecutándose automáticamente en el primer arranque.
- `api`: la API en `http://localhost:3000`, que espera a que `db` esté saludable (`healthcheck`) antes de arrancar.

Para reiniciar desde cero (borra los datos):

```bash
docker compose down -v
docker compose up --build
```

### Opción B — Local, sin Docker

Requiere una instancia de MySQL propia y un archivo `.env` (ver `.env.example`) con:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=capitalx_user
DB_PASSWORD=capitalx_password
DB_NAME=capitalx
PORT=3000
```

```bash
npm install
npm run dev
```

### Pruebas

```bash
npm test
```

Todas las pruebas usan repositorios en memoria (`InMemoryClientRepository`, `InMemoryOperationRepository`) — no requieren MySQL corriendo.

---

## Endpoints

| Método | Ruta                   | Descripción                                               |
| ------ | ---------------------- | --------------------------------------------------------- |
| POST   | `/clients`             | Alta de un cliente nuevo (estatus inicial: `pending`)     |
| PATCH  | `/clients/:id/approve` | Aprueba a un cliente pendiente                            |
| POST   | `/operations`          | Origina una operación de factoraje con una o más facturas |
| GET    | `/clients/:id/summary` | Resumen agregado de operaciones de un cliente             |

El documento de la prueba especifica las rutas en español (`/clientes`, `/aprobar`, `/resumen`); se tradujeron a inglés como convención personal — ver la sección de **Convenciones de idioma** más abajo.

### `POST /clients`

```json
{
    "businessName": "Comercializadora Azteca SA de CV",
    "rfc": "CAZ850615AB1",
    "email": "contacto@azteca.com"
}
```

### `PATCH /clients/:id/approve`

Sin body.

### `POST /operations`

```json
{
    "clientId": 1,
    "invoices": [
        {
            "folio": "A-001",
            "debtor": "Comercial XYZ",
            "amount": 15000,
            "issueDate": "2026-06-01",
            "dueDate": "2026-08-10"
        }
    ]
}
```

Respuesta (201): la operación creada, con `totalAmount`, `advancedAmount`, `commission`, `amountToDeposit` y el detalle de facturas.

Si alguna factura es inválida o hay folios duplicados, responde 422 con un arreglo `details` — un `{ folio, reason }` por cada factura rechazada, no solo la primera.

### `GET /clients/:id/summary`

```json
{
    "operationsCount": 2,
    "totalAdvancedAmount": 19550,
    "nearestDueDate": "2026-08-01"
}
```

---

## Convenciones de idioma

- **Rutas de la API, body de requests/respuestas y todo el código interno en inglés** (`/clients`, `/clients/:id/approve`, `/operations`, `/clients/:id/summary`, `businessName`, `clientId`, `issueDate`, etc.): el documento de la prueba especifica las rutas en español (`/clientes`, `/aprobar`, `/resumen`), pero se decidió traducir también ese contrato público a inglés, como convención personal. La razón es evitar un proyecto con código mixto (rutas y payloads en español, pero variables/tipos/base de datos en inglés), lo cual generaría fricción constante de traducción en cada capa (controller, service, repository) y aumentaría el riesgo de bugs por mapeo inconsistente de nombres entre idiomas. Al mantener las rutas, el contrato de datos y el dominio interno en un solo idioma de punta a punta, el código resulta más legible y consistente. Es una convención fácilmente reversible a español si así lo requiriera el equipo — no afecta la arquitectura ni la lógica de negocio.
- **Mensajes de error en español**: son para el consumidor final de la API (humano o frontend), por lo que se mantienen en el idioma del negocio, independientemente del idioma de las rutas, el código o el payload.

---

## Reglas de negocio implementadas

### Alta de clientes

- RFC de persona moral: 12 caracteres, 3 letras + 6 dígitos (fecha AAMMDD válida, incluyendo bisiestos) + 3 alfanuméricos. Se normaliza a mayúsculas antes de validar y guardar.
- RFC único en el sistema (409 si ya existe).
- Cliente nuevo inicia en `pending`; `PATCH /clientes/:id/aprobar` lo cambia a `approved`.

### Originación de operaciones

- El cliente debe existir (404) y estar aprobado (403).
- Cada factura: `amount > 0`; `issueDate` no puede ser futura; `dueDate` debe ser posterior a **hoy**; el plazo restante (`dueDate - hoy`) debe estar entre 15 y 120 días, inclusive.
- Un mismo folio de un mismo cliente no puede financiarse dos veces, ni entre operaciones distintas, ni dentro de la misma solicitud.
- Si cualquier factura incumple, la operación completa se rechaza (422), reportando **todas** las facturas rechazadas con su folio y motivo — no solo la primera.
- Si todo pasa: `totalAmount` = suma de montos; `advancedAmount = totalAmount × 0.85`; `commission = totalAmount × 0.015`; `amountToDeposit = advancedAmount - commission`. Redondeo estándar a 2 decimales.

### Resumen por cliente

- Número de operaciones, monto adelantado acumulado (suma de `advancedAmount` de todas sus operaciones), y la fecha de vencimiento más próxima entre las facturas **vigentes** (`due_date > hoy`) de todas sus operaciones.

---

## Supuestos y decisiones de diseño

- **PK numérica autoincremental** en `clients`, `operations` e `invoices` — no se usa el RFC como PK; queda como campo `UNIQUE` separado.
- Las rutas que requieren identificar un cliente (`/aprobar`, `/resumen`) usan el `id` numérico, tal como especifica el documento — mejora futura: aceptar también el RFC como identificador alterno.
- `client_id` desnormalizado en `invoices`, para poder declarar el índice `UNIQUE(client_id, folio)` directamente en esa tabla — garantiza a nivel de base de datos (no solo en código) que un mismo folio de un mismo cliente nunca se financie dos veces, incluso ante condiciones de carrera entre dos solicitudes simultáneas.
- `businessName` y `rfc` se recortan (`trim`) antes de validar y guardar.
- Validación de email con regex estricta tipo RFC 5322, con TLD obligatorio.
- Para el año de nacimiento del RFC (validación de bisiesto), se usa `2000 + YY` como año de referencia.
- Volver a aprobar un cliente ya `approved` responde 409 (no es una operación idempotente).
- Un `id` no numérico en la URL responde 400 (no 404) — se valida explícitamente en el controller antes de tocar la base de datos.
- No se valida unicidad de email entre clientes — el documento solo pide unicidad de RFC. Decisión consciente, a evaluar con negocio si se requiere en el futuro.
- El plazo de una factura se calcula **desde hoy hasta el vencimiento**, no desde la fecha de emisión — así lo especifica el documento explícitamente ("el plazo restante, de hoy al vencimiento"). La fecha de emisión solo se valida de forma independiente (no futura); no participa en el cálculo del plazo. Se mantiene además una validación defensiva de que `dueDate` sea posterior a `issueDate`, aunque en la práctica es difícil de alcanzar si las demás reglas se cumplen — queda como salvaguarda ante datos inconsistentes.
- Folio repetido dentro de la misma solicitud (mismo `POST /operaciones`) se rechaza con el mismo criterio que un folio ya financiado históricamente.
- Una operación sin facturas (`invoices: []`) se rechaza con 400.
- Redondeo estándar (0.5 hacia arriba) para montos financieros, a 2 decimales. Se consideró _banker's rounding_ pero se descartó por ser menos intuitivo para quien consuma la API.
- "Facturas vigentes" para el resumen = únicamente las no vencidas (`due_date > hoy`).
- Comparaciones de fecha ("hoy", vencimientos) normalizadas a **medianoche UTC**, para evitar que la hora del servidor introduzca imprecisión en el cálculo de días. Es un supuesto explícito: el servidor no distingue la zona horaria de quien hace la solicitud.
- **`GET /clientes/:id/resumen` con un cliente que existe pero no tiene operaciones** responde **200** (no un error) con `{ operationsCount: 0, totalAdvancedAmount: 0, nearestDueDate: null }` — no está especificado en el documento; se decidió así porque un cliente sin operaciones es un estado válido del negocio, no una condición de error.
- Códigos HTTP semánticos aplicados de forma consistente: 400 (formato/request inválido), 403 (cliente no aprobado intentando operar), 404 (no encontrado), 409 (conflicto/duplicado en clientes), 422 (rechazo de reglas de negocio en facturas).
- **Organización de rutas por prefijo de URL, no por el servicio que resuelve la lógica.** `GET /clients/:id/summary` vive en `clientController.ts`/`clientRoutes.ts` aunque internamente depende de `OperationService` (la agregación de datos requiere `operations` e `invoices`). Se prefirió esta consistencia (toda ruta que empieza con `/clients` vive en la capa de clientes) en vez de organizar por dueño de la lógica, para que la ubicación de cada ruta sea predecible solo con ver la URL.

---

## Decisiones de arquitectura

- **Express en vez de NestJS**: el documento permite framework libre (Express, NestJS, Fastify, etc.). Se eligió Express por ser un proyecto pequeño y acotado (4 endpoints, sin autenticación, sin módulos de dominio adicionales) — NestJS aporta más valor en proyectos de mayor escala, donde su estructura opinionada (módulos, decoradores, inyección de dependencias integrada, guards, pipes) ayuda a mantener orden a medida que crece el número de dominios y equipos trabajando en paralelo. Para este alcance, esa estructura habría significado overhead sin beneficio proporcional: la misma separación por capas (`models` / `repositories` / `services` / `controllers` / `routes`) y la misma inversión de dependencias se logran con Express de forma manual y explícita, con menos código de por medio. Con más tiempo, valdría la pena migrar a NestJS si el proyecto fuera a crecer — sobre todo por su soporte nativo de inyección de dependencias (evitando la construcción manual de servicios/repositorios en `app.ts`) y su convención estándar para módulos, que facilitaría escalar a más entidades de negocio (pagos, deudores, reportes, etc.) sin que la estructura de carpetas se vuelva ambigua.
- **Arquitectura por capas**: `models/` → `repositories/` (interfaz + implementación) → `services/` → `controllers/` → `routes/`.
- **Inversión de dependencias (DIP)**: los servicios dependen de interfaces de repositorio (`ClientRepository`, `OperationRepository`), nunca de MySQL directamente. Esto permite probar toda la lógica de negocio con repositorios en memoria (`InMemoryClientRepository`, `InMemoryOperationRepository`), sin necesitar base de datos real en las pruebas.
- **Errores acumulados, no fail-fast**: al validar las facturas de una operación, se recolectan todos los errores antes de responder — es la UX correcta para un envío por lote, ya que le permite a quien consume la API corregir todo de una vez en vez de una factura a la vez.
- **`AppError` con `details` opcional**: la clase de error central (`statusCode`, `message`) se extendió con un campo `details` opcional para poder adjuntar el arreglo de errores por factura sin forzar un solo mensaje genérico.
- **Transacciones SQL** (`beginTransaction` / `commit` / `rollback`) para la creación de una operación junto con sus facturas — atomicidad garantizada: o se guardan ambas cosas, o ninguna. La validación de negocio (folios duplicados, reglas por factura) ocurre _antes_ de la transacción, en `OperationService`; la transacción es la última línea de defensa ante condiciones de carrera (dos solicitudes simultáneas con el mismo folio), respaldada por el índice `UNIQUE(client_id, folio)` a nivel de base de datos.
- **Factory functions** (`buildClientController`, `buildOperationController`, etc.) en vez de clases para controllers/rutas, con `asyncHandler` aplicado dentro del controller (envolviendo cada handler), no en la capa de rutas.

---

## Herramientas de IA utilizadas

- **Claude (Anthropic)** como asistente de arquitectura y revisión de código a lo largo de todo el desarrollo: especificación de interfaces y modelos antes de implementarlos, revisión de cada archivo implementado (señalando bugs reales, problemas de naming y de diseño), explicación del razonamiento detrás de cada corrección, y ayuda para depurar errores de TypeScript/MySQL puntuales (tipos, transacciones, zonas horarias, encoding). El código fue implementado y probado manualmente por el autor en cada paso; la IA no generó el proyecto de forma autónoma ni sin revisión humana en cada entrega.
- **Codex** para la creación de pruebas unitarias y para correr casos de uso de forma autónoma, acelerando la cobertura de escenarios sin tener que ejecutar cada prueba manualmente uno por uno.

---

## Qué mejoraría con más tiempo

- Una versión del proyecto usando NestJS en vez de Express, si el alcance creciera más allá de estos 4 endpoints (ver justificación en Decisiones de arquitectura).
- Un frontend en React que consuma esta API, ya que el documento no lo exige pero permite agregarlo. Junto con esto, agregar autenticación (por ejemplo con JWT, dado que el reto actual no la requiere) y manejo de sesión en el cliente con `localStorage` en caso de ser necesario para mantener al usuario autenticado entre recargas.
- Documentación de contrato consumible por herramientas (Swagger/OpenAPI, o al menos una colección de Postman exportada con ejemplos de éxito y error por endpoint).
- Aceptar el RFC como identificador alterno en las rutas que hoy solo aceptan `id` numérico.
- Validación de unicidad de email entre clientes, si el negocio lo requiere.
- Manejo más robusto de precisión decimal en los cálculos financieros (evaluar una librería de precisión decimal en vez de aritmética de punto flotante nativa de JS).
- Pruebas de integración contra MySQL real (actualmente las pruebas automatizadas usan únicamente repositorios en memoria; la verificación contra MySQL real se hizo de forma manual vía Postman).
- CI básico (GitHub Actions) que corra `npm test` y valide el build de Docker en cada push.
