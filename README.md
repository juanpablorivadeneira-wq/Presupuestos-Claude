# BuildKontrol — Presupuestos Claude

Sistema de gestión de presupuestos de construcción con analizador automático de cantidades de obra desde Revit.

---

## Módulos

| Módulo | Descripción |
|---|---|
| **Bases de Datos** | Gestión de ítems y rubros APU |
| **Presupuestos** | Generación y comparación de presupuestos |
| **Actualización** | Actualización de costos con nuevas bases de datos |
| **Medición** | Seguimiento de avance por rubro |
| **Cantidades Revit** | Análisis automático de CSV exportado desde Revit |

---

## Analizador de Cantidades Revit

### ¿Qué hace?

Recibe un archivo CSV exportado desde Revit (tablas de cantidades de obra concatenadas) y produce:

1. **Resumen ejecutivo** de cantidades por rubro (m², m³, ml, u)
2. **Listado de rubros sin datos** (modelado pendiente)
3. **Dashboard interactivo** con KPIs y top rubros
4. **Exportación a Excel** con 4 hojas listas para presupuesto

### Estructura del CSV de Revit

Revit exporta múltiples tablas separadas por filas de encabezado con el patrón:

```
01.01.01	Replanteo Topografico Ejes Estructurales
Tipo	Nombre	Cantidad
6.5mm Bubble	B	1
...
```

El parser detecta:
- Códigos de sección: `XX.XX`, `XX.XX.XX`, `XX.XX.XX.a/b/c`
- Columnas de métricas por nombre (Area/Área, Volume/Volumen, Length/Longitud)
- Grand Total de Revit vs suma calculada
- Secciones multi-categoría (múltiples bloques header+datos en la misma sección)
- Falsos positivos en tablas de puertas/ventanas al final del CSV

### Archivo de ejemplo

Ver `examples/Todas_las_Tablas.csv` — CSV de referencia con 74 secciones detectadas.
Ver `examples/cantidades_esperadas.xlsx` — Excel de salida esperado.

---

## Desarrollo local

### Prerequisitos

- Node.js 20+
- Python 3.11+

### Frontend (React + Vite)

```bash
npm install
npm run dev       # http://localhost:5173
```

### Backend Python (FastAPI)

```bash
cd /ruta/al/proyecto
pip install -r backend/requirements.txt
uvicorn backend.api.main:app --reload --port 8001
# API en http://localhost:8001/api/revit/docs
```

### Variables de entorno

Crear `.env.local` en la raíz:

```env
VITE_REVIT_API_URL=http://localhost:8001
```

---

## Despliegue con Docker

```bash
# Producción (imagen publicada)
docker compose up -d

# Build local
docker compose -f docker-compose.build.yml up --build
```

El contenedor expone:
- Puerto **3000** → Frontend + API Express (mapeado a 8080 externamente)
- Puerto **8001** → API Python FastAPI (Revit Analyzer)

---

## Tests

```bash
# Tests del parser y analizador Python
python3 -m pytest backend/tests/ -v

# Con cobertura
python3 -m pytest backend/tests/ --cov=backend --cov-report=term-missing
```

### Resultados de referencia (CSV `Todas_las_Tablas.csv`)

| Métrica | Valor |
|---|---|
| Secciones totales detectadas | 74 |
| Con datos en Revit | 27 |
| Sin datos (modelado pendiente) | 47 |
| Total m² | 16,484 |
| Total ml | 1,091 |

---

## API Revit Analyzer

Documentación interactiva disponible en `http://localhost:8001/api/revit/docs`

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/revit/health` | GET | Liveness check |
| `/api/revit/upload` | POST | Procesar CSV, retorna JSON de análisis |
| `/api/revit/download/{job_id}` | GET | Descargar Excel generado |

---

## Estructura del proyecto

```
/backend              ← Python FastAPI
  /parsers
    revit_csv.py      ← Parser de secciones, headers, grand totals
    schema.py         ← Dataclasses: Section, DataRow, GrandTotal
  /services
    analyzer.py       ← Lógica de prioridad Grand Total vs suma
    exporter.py       ← openpyxl → genera .xlsx con 4 hojas
    warnings.py       ← Estructura de advertencias
  /api
    main.py           ← FastAPI: POST /upload, GET /download/{id}
  /config
    capitulos.yaml    ← Mapa de capítulos configurable
  /tests
    fixtures/         ← CSV de referencia
    test_parser.py
    test_analyzer.py
    test_exporter.py

/src                  ← React + Vite frontend
  /components
    /revit
      RevitAnalyzerView.tsx  ← Vista principal + tabs
      UploadZone.tsx          ← Drag & drop CSV
      Dashboard.tsx           ← KPIs + tablas
      ResumenTable.tsx        ← Tabla con sort/filter
      SinDatosTable.tsx       ← Rubros sin datos
      WarningsPanel.tsx       ← Advertencias estructuradas
      types.ts                ← TypeScript interfaces

/examples
  Todas_las_Tablas.csv        ← CSV de referencia
  cantidades_esperadas.xlsx   ← Excel de salida esperado
```
