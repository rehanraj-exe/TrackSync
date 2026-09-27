"""Optional OR-Tools CP-SAT block-window selector with priority and capacity."""

from typing import Dict, List, Tuple
import pandas as pd

try:
    from ortools.sat.python import cp_model
except ImportError:
    cp_model = None


class CPSATOptimizer:
    """Select feasible low-impact windows maximizing priority while checking capacity."""

    def select(self, tasks, blocks, forecast=None, max_blocks=None, resources=None) -> Tuple[object, str]:
        if cp_model is None or blocks.empty or tasks.empty:
            return blocks, "FALLBACK"
            
        sections = list(tasks["location"].unique())
        candidates = []
        
        # Calculate candidates
        for section in sections:
            section_tasks = tasks[tasks["location"] == section]
            if section_tasks.empty:
                continue
                
            required_duration = float(section_tasks["estimated_duration"].max())
            priority_val = int(round(section_tasks["priority_score"].astype(float).sum() * 100))
            
            # Department required for this section (simplified to take primary department of tasks)
            # Find the most common department or assume all apply
            dept_counts = section_tasks["department"].value_counts()
            primary_dept = dept_counts.index[0] if not dept_counts.empty else None
            
            for index, block in blocks[blocks["section"] == section].iterrows():
                if block["available_duration"] >= required_duration and block["start"] <= section_tasks["deadline"].min():
                    traffic = float(block.get("traffic_level", "MEDIUM") == "HIGH")
                    cost = int(round(100 * traffic + block["start"].timestamp() / 10**7))
                    candidates.append((section, index, priority_val, cost, required_duration, primary_dept))
                    
        if not candidates:
            return blocks.iloc[0:0], "INFEASIBLE"
            
        model = cp_model.CpModel()
        variables = [model.NewBoolVar(f"window_{i}") for i in range(len(candidates))]
        
        # Constraint 1: At most 1 block per section
        for section in sections:
            indexes = [i for i, item in enumerate(candidates) if item[0] == section]
            if indexes:
                model.Add(sum(variables[i] for i in indexes) <= 1)
                
        # Constraint 2: Maximum total blocks
        if max_blocks:
            model.Add(sum(variables) <= max_blocks)
            
        # Constraint 3: Department capacity
        if resources is not None and not resources.empty:
            departments = resources["department"].unique()
            for dept in departments:
                # Find candidates using this department
                dept_indexes = [i for i, item in enumerate(candidates) if item[5] == dept]
                if not dept_indexes:
                    continue
                # Get total capacity for this department (summing across sections, or overall)
                # To be safe, we just sum available hours for the department
                total_capacity = float(resources[resources["department"] == dept]["available_team_hours"].sum())
                # capacity * 10 (since we work with ints in CP-SAT, durations can be floats, but let's approximate)
                cap_int = int(round(total_capacity * 10))
                
                # Sum of durations of selected blocks must be <= capacity
                # candidates[i][4] is required_duration
                model.Add(sum(int(round(candidates[i][4] * 10)) * variables[i] for i in dept_indexes) <= cap_int)
                
        # Objective: Maximize total priority minus costs
        # CP-SAT only supports integers.
        model.Maximize(sum((candidates[i][2] * 1000 - candidates[i][3]) * variables[i] for i in range(len(candidates))))
        
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 5
        status = solver.Solve(model)
        
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return blocks.iloc[0:0], "INFEASIBLE"
            
        selected = [candidates[i][1] for i, variable in enumerate(variables) if solver.Value(variable)]
        return blocks.loc[selected], "OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE"
