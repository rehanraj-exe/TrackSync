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
            
            # Generate mock current assets to evaluate
            np.random.seed(123)
            num_assets = 50
            asset_ids = [f"AST-{i:03d}" for i in range(1, num_assets+1)]
            asset_types = np.random.choice([0, 1, 2], size=num_assets)
            traffic_density = np.random.uniform(0.1, 1.0, size=num_assets)
            failure_history = np.random.poisson(lam=1.5, size=num_assets)
            days_since_maintenance = np.random.randint(10, 200, size=num_assets)
            
            df = pd.DataFrame({
                'asset_type': asset_types,
                'traffic_density': traffic_density,
                'failure_history': failure_history,
                'days_since_maintenance': days_since_maintenance
            })
            
            probs = model.predict_proba(df)[:, 1] # Probability of defect (class 1)
            
            results = []
            for i in range(num_assets):
                if probs[i] > 0.6: # High risk threshold
                    types = {0: "Track", 1: "Signal", 2: "OHE"}
                    results.append({
                        "asset_id": asset_ids[i],
                        "type": types[asset_types[i]],
                        "risk_probability": round(probs[i] * 100, 1),
                        "days_since_maintenance": int(days_since_maintenance[i]),
                        "failure_history": int(failure_history[i])
                    })
                    
            # Sort by risk descending
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
            return service.workflow.transition(plan_id, "SUBMITTED", user).__dict__
        except (KeyError, ValueError) as error:
            raise HTTPException(status_code=400, detail=str(error))

    @app.post("/plans/{plan_id}/approve")
    def approve(plan_id: str, user: str = "approver", comment: str = ""):
        try:
            return service.workflow.transition(plan_id, "APPROVED", user, comment).__dict__
        except (KeyError, ValueError) as error:
            raise HTTPException(status_code=400, detail=str(error))

    @app.get("/audit")
    def audit():
        return service.workflow.audit()

    if BaseModel:
        class ChatMessage(BaseModel):
            message: str
            
        @app.post("/chat")
        def chat(chat_message: ChatMessage):
            msg = chat_message.message.lower()
            try:
                # Get the current data and weekly run to answer dynamically
                data = service.load()
                tasks = service.score_tasks(data)
                result = service.horizons().get("weekly")
                
                if "critical" in msg or "priority" in msg:
                    critical_count = len(tasks[tasks["priority_class"] == "CRITICAL"])
                    return {"response": f"I analyzed the current schedule. There are {critical_count} tasks marked as CRITICAL across all corridors. High priority tasks are prioritized by the CP-SAT engine."}
                
                if "unscheduled" in msg or "unmet" in msg:
                    unmet = len(result.unmet_task_ids) if result else 0
                    return {"response": f"Based on the latest weekly plan, there are {unmet} unscheduled tasks that could not be fit into the available blocks due to constraints."}
                
                if "delay" in msg or "train" in msg:
                    delay = result.total_delay_minutes if result else 0
                    return {"response": f"The current weekly AI optimization plan has an estimated train delay impact of {delay:.1f} minutes, minimizing disruptions across {len(result.recommendations) if result else 0} blocks."}
                    
                if "conflict" in msg or "violation" in msg or "resource" in msg:
                    violations = result.resource_violations if result else []
                    if not violations:
                        return {"response": "I ran the optimization engine. No resource conflicts or department capacity violations were detected in the currently recommended block allocations."}
                    else:
                        v_str = ", ".join(violations)
                        return {"response": f"Warning: The optimization engine detected the following capacity violations: {v_str}."}
                    
                if "department" in msg or "sync" in msg:
                    util = (result.block_utilization * 100) if result else 0
                    return {"response": f"Multi-department synchronization is active. Block utilization score is {util:.1f}%. The AI engine bundled tasks to maximize track utilization."}

                return {"response": "I am your AI Co-Pilot powered by the BDMS/COA optimization engine. Ask me about 'critical' tasks, 'unscheduled' tasks, 'train delays', or 'resource conflicts'."}
            except Exception as e:
                return {"response": f"I encountered an error analyzing the data: {str(e)}"}
