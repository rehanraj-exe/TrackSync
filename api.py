"""FastAPI interface for the BDMS/COA AI optimization layer."""

from pathlib import Path
from typing import Optional

from planning_service import PlanningService

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    from pydantic import BaseModel
    import os
except ImportError:
    FastAPI = None
    BaseModel = None


service = PlanningService(Path(__file__).parent)
app = FastAPI(title="Railway AI Block Planning API", version="1.0.0") if FastAPI else None


import joblib

if app:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health():
        return {"status": "operational", "system": "BDMS/COA AI optimization layer"}

    @app.get("/predictions")
    def predictions():
        try:
            model = joblib.load(Path(__file__).parent / "defect_predictor.joblib")
            import pandas as pd
            import numpy as np
            
            # Load real maintenance data
            data_dir = Path(__file__).parent
            tasks = pd.read_csv(data_dir / "maintenance_tasks.csv")
            history = pd.read_csv(data_dir / "maintenance_history.csv")
            corridors = pd.read_csv(data_dir / "corridor_reference.csv")
            
            # Build real asset features from tasks and history
            asset_type_map = {"Track": 0, "Signal": 1, "OHE": 2}
            records = []
            
            # From current tasks
            for _, row in tasks.iterrows():
                at = str(row.get("asset_type", "Track")).strip()
                records.append({
                    "asset_id": str(row.get("asset_id", row.get("task_id", ""))),
                    "type": at,
                    "asset_type": asset_type_map.get(at, 0),
                    "traffic_density": float(row.get("asset_criticality", 5)) / 10.0,
                    "failure_history": int(row.get("failure_history", 0)),
                    "days_since_maintenance": int(row.get("overdue_days", 0)) + 30,
                })
            
            # From historical records
            for _, row in history.iterrows():
                at = str(row.get("asset_type", "Track")).strip()
                records.append({
                    "asset_id": f"H-{row.get('record_id', '')}",
                    "type": at,
                    "asset_type": asset_type_map.get(at, 0),
                    "traffic_density": float(row.get("traffic_density", 0.5)),
                    "failure_history": int(row.get("failure_history", 0)),
                    "days_since_maintenance": int(row.get("overdue_days", 0)) + 30,
                })
            
            if not records:
                return {"high_risk_assets": []}
            
            df = pd.DataFrame(records)
            feature_df = df[["asset_type", "traffic_density", "failure_history", "days_since_maintenance"]]
            
            probs = model.predict_proba(feature_df)[:, 1]
            
            results = []
            for i in range(len(df)):
                if probs[i] > 0.5:
                    results.append({
                        "asset_id": df.iloc[i]["asset_id"],
                        "type": df.iloc[i]["type"],
                        "risk_probability": round(float(probs[i]) * 100, 1),
                        "days_since_maintenance": int(df.iloc[i]["days_since_maintenance"]),
                        "failure_history": int(df.iloc[i]["failure_history"])
                    })
                    
            results.sort(key=lambda x: x["risk_probability"], reverse=True)
            return {"high_risk_assets": results}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/tasks")
    def tasks():
        return service.score_tasks(service.load()).to_dict(orient="records")

    @app.get("/plans/{horizon}")
    def plan(horizon: str, traffic_level: str = "NORMAL", maintenance_level: str = "ALL"):
        if horizon not in {"daily", "weekly", "monthly"}:
            raise HTTPException(status_code=400, detail="horizon must be daily, weekly, or monthly")
        result = service.horizons(traffic_level, maintenance_level)[horizon]
        return result.to_dict()

    @app.get("/what-if")
    def what_if(traffic_level: str = "HIGH"):
        normal = service.run("Normal traffic", "NORMAL")
        scenario = service.run("What-if scenario", traffic_level)
        return {"normal": normal.to_dict(), "scenario": scenario.to_dict()}

    @app.post("/plans/{plan_id}/submit")
    def submit(plan_id: str, user: str = "operator"):
        try:
            # Auto-create plan record if it doesn't exist yet
            try:
                service.workflow.get(plan_id)
            except KeyError:
                service.workflow.create(plan_id, user)
            return service.workflow.transition(plan_id, "SUBMITTED", user).__dict__
        except (KeyError, ValueError) as error:
            raise HTTPException(status_code=400, detail=str(error))

    @app.post("/plans/{plan_id}/approve")
    def approve(plan_id: str, user: str = "approver", comment: str = ""):
        try:
            # Auto-create and submit plan if it doesn't exist yet
            try:
                record = service.workflow.get(plan_id)
                if record.status == "DRAFT":
                    service.workflow.transition(plan_id, "SUBMITTED", user)
            except KeyError:
                service.workflow.create(plan_id, user)
                service.workflow.transition(plan_id, "SUBMITTED", user)
            return service.workflow.transition(plan_id, "APPROVED", user, comment).__dict__
        except (KeyError, ValueError) as error:
            raise HTTPException(status_code=400, detail=str(error))

    @app.get("/audit")
    def audit():
        return service.workflow.audit()

    @app.get("/corridors")
    def get_corridors():
        import pandas as pd
        data_dir = Path(__file__).parent
        try:
            df = pd.read_csv(data_dir / "corridor_reference.csv")
            return df.to_dict(orient="records")
        except Exception:
            return []

    @app.get("/plans/{plan_id}/status")
    def plan_status(plan_id: str):
        try:
            return service.workflow.get(plan_id).__dict__
        except KeyError:
            raise HTTPException(status_code=404, detail=f"Plan {plan_id} not found")

    if BaseModel:
        class ChatMessage(BaseModel):
            message: str

        @app.post("/chat")
        def chat(chat_message: ChatMessage):
            msg = chat_message.message.lower()
            try:
                data = service.load()
                tasks = service.score_tasks(data)
                result = service.run("Weekly plan", "NORMAL", "ALL", 7)

                if "critical" in msg or "priority" in msg:
                    critical_count = len(tasks[tasks["priority_class"] == "CRITICAL"])
                    high_count = len(tasks[tasks["priority_class"] == "HIGH"])
                    ids = ", ".join(tasks[tasks["priority_class"] == "CRITICAL"]["task_id"].tolist()[:5])
                    return {"response": f"There are {critical_count} CRITICAL and {high_count} HIGH priority tasks. Critical IDs: {ids or 'none'}. These are prioritized by the CP-SAT engine."}

                if "unscheduled" in msg or "unmet" in msg:
                    unmet = len(result.unmet_task_ids) if result else 0
                    unmet_ids = ", ".join(result.unmet_task_ids[:5]) if result and result.unmet_task_ids else "none"
                    return {"response": f"There are {unmet} unscheduled tasks. IDs: {unmet_ids}. Consider adding more block windows."}

                if "delay" in msg or "train" in msg:
                    delay = result.total_delay_minutes if result else 0
                    blocks_count = len(result.recommendations) if result else 0
                    return {"response": f"Estimated train delay: {delay:.1f} minutes across {blocks_count} blocks. Low-traffic windows were selected to minimize disruptions."}

                if "conflict" in msg or "violation" in msg or "resource" in msg:
                    violations = result.resource_violations if result else []
                    if not violations:
                        return {"response": "No resource conflicts or capacity violations detected. All departments have sufficient team-hours."}
                    return {"response": f"Capacity violations: {'; '.join(violations)}. Consider redistributing workload."}

                if "department" in msg or "sync" in msg or "coordination" in msg:
                    util = (result.block_utilization * 100) if result else 0
                    dept_summary = tasks.groupby("department")["task_id"].count().to_dict()
                    dept_str = ", ".join(f"{k}: {v}" for k, v in dept_summary.items())
                    return {"response": f"Block utilization: {util:.1f}%. Department workload: {dept_str}. Activities are bundled for maximum track utilization."}

                if "overdue" in msg:
                    overdue = tasks[tasks["overdue_days"] > 0]
                    count = len(overdue)
                    max_od = int(overdue["overdue_days"].max()) if not overdue.empty else 0
                    return {"response": f"{count} overdue tasks. Most overdue: {max_od} days past deadline. These receive a priority boost."}

                if "block" in msg or "schedule" in msg or "plan" in msg:
                    return {"response": f"Weekly plan: {result.scheduled_tasks}/{result.total_tasks} tasks scheduled. Solver: {result.solver_status}. Utilization: {result.block_utilization*100:.0f}%."}

                if "section" in msg or "corridor" in msg:
                    sections = tasks["location"].value_counts().to_dict()
                    s_str = ", ".join(f"{k}: {v}" for k, v in sections.items())
                    return {"response": f"Tasks by section: {s_str}. Use the Risk Map for spatial assessments."}

                if "status" in msg or "health" in msg or "system" in msg:
                    return {"response": f"System operational. {result.total_tasks} tasks, {result.scheduled_tasks} scheduled. Solver: {result.solver_status}. {result.deadline_alerts} deadline alerts."}

                if "help" in msg or "what can" in msg:
                    return {"response": "I can help with: critical tasks, train delays, resource conflicts, unscheduled tasks, overdue items, block schedule, department sync, section status, system health."}

                return {"response": f"AI Co-Pilot active. Tracking {result.total_tasks} tasks, {result.scheduled_tasks} scheduled. Ask about critical tasks, delays, conflicts, departments, or type 'help'."}
            except Exception as e:
                return {"response": f"Error analyzing data: {str(e)}"}

