"""
FastAPI application — Revit Quantity Analyzer

Endpoints:
  POST /api/revit/upload           → parse + analyze CSV, returns analysis JSON
  GET  /api/revit/download/{job_id} → download Excel for a prior upload
  GET  /api/revit/health           → liveness check
"""

import uuid
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from ..parsers.revit_csv import parse
from ..services.analyzer import analyze
from ..services.exporter import export_to_bytes
from ..services.warnings import build_warning_list

app = FastAPI(
    title="Revit Quantity Analyzer",
    version="1.0.0",
    docs_url="/api/revit/docs",
    openapi_url="/api/revit/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job store (sufficient for single-user dev; replace with Redis/disk for prod)
_jobs: dict[str, dict[str, Any]] = {}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@app.get("/api/revit/health")
def health():
    return {"status": "ok"}


@app.post("/api/revit/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, detail="El archivo debe tener extensión .csv")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, detail=f"Archivo demasiado grande (máx {MAX_FILE_SIZE // 1024 // 1024} MB)")

    # Parse
    parse_result = parse(content)

    # Analyze
    analysis = analyze(parse_result)

    # Build structured warnings
    structured_warnings = build_warning_list(analysis.warnings)

    # Serialize result
    job_id = str(uuid.uuid4())

    summaries_json = [
        {
            "code": s.code,
            "description": s.description,
            "chapter_code": s.chapter_code,
            "chapter_name": s.chapter_name,
            "quantity": s.quantity,
            "unit": s.unit,
            "fuente": s.fuente,
            "element_count": s.element_count,
            "has_data": s.has_data,
        }
        for s in analysis.summaries
    ]

    warnings_json = [
        {
            "code": w.code,
            "level": w.level.value,
            "section_code": w.section_code,
            "message": w.message,
        }
        for w in structured_warnings
    ]

    chapter_stats = analysis.chapter_stats()
    totals_by_unit = analysis.totals_by_unit()
    top_area = [
        {"code": s.code, "description": s.description, "quantity": s.quantity}
        for s in analysis.top_by_unit("m²")
    ]

    response_body = {
        "job_id": job_id,
        "filename": file.filename,
        "total_sections": analysis.total_count,
        "with_data": len(analysis.with_data),
        "without_data": len(analysis.without_data),
        "pct_modeled": round(100 * len(analysis.with_data) / analysis.total_count, 1)
        if analysis.total_count else 0,
        "totals_by_unit": totals_by_unit,
        "summaries": summaries_json,
        "chapter_stats": chapter_stats,
        "top_area": top_area,
        "warnings": warnings_json,
    }

    # Store analysis for Excel download
    _jobs[job_id] = {"analysis": analysis}

    return response_body


@app.get("/api/revit/download/{job_id}")
def download_excel(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, detail="Job no encontrado — suba el CSV nuevamente")

    xlsx_bytes = export_to_bytes(job["analysis"])
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="cantidades_revit_{job_id[:8]}.xlsx"'
        },
    )
