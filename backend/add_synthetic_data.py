import pandas as pd
import random
from datetime import datetime, timedelta
from pathlib import Path

# Base paths
base_dir = Path(r"c:\Users\KARRA RAJU\Desktop\TrackSync")
tasks_file = base_dir / "maintenance_tasks.csv"
history_file = base_dir / "maintenance_history.csv"
blocks_file = base_dir / "block_windows.csv"

# Configuration for generation
num_new_tasks = 120
num_new_history = 500
num_new_blocks = 50

corridors = [
    ("A-B", 0.72, 9), ("B-C", 0.58, 8), ("C-D", 0.41, 7), 
    ("D-E", 0.34, 6), ("E-F", 0.28, 5)
]
departments = [("Engineering", "Track"), ("S&T", "Signal"), ("TRD", "OHE")]
defect_types = {
    "Track": ["Rail fracture", "Tamping", "Ultrasonic inspection", "Ballast cleaning", "Weld repair"],
    "Signal": ["Signal inspection", "Signal testing", "Cable replacement", "Relay check", "Point machine service"],
    "OHE": ["OHE maintenance", "Insulator replacement", "Wire tensioning", "Pantograph check", "Mast adjustment"]
}
block_types = {"Track": "Traffic block", "Signal": "Traffic block", "OHE": "Power block"}

def generate_tasks(existing_df):
    new_rows = []
    start_id = len(existing_df) + 1
    
    today = datetime.now()
    
    for i in range(num_new_tasks):
        corridor, traffic, base_crit = random.choice(corridors)
        dept, asset_type = random.choice(departments)
        
        # Calculate start and end station from corridor (e.g. A-B -> A, B)
        start_station, end_station = corridor.split("-")
        
        asset_id = f"{asset_type[:3].upper()}-{corridor}-{random.randint(100, 999)}"
        defect = random.choice(defect_types[asset_type])
        
        # Priorities and metrics
        severity = random.randint(3, 10)
        safety = random.randint(3, 10)
        overdue = random.choice([0, 0, 0, random.randint(1, 15)])
        duration = round(random.uniform(1.0, 4.0), 1)
        block = block_types[asset_type]
        
        # Deadline between today and next 30 days
        deadline = (today + timedelta(days=random.randint(1, 30))).strftime('%Y-%m-%d')
        freq = random.choice(["Monthly", "Quarterly", "Bi-Annual"])
        hist = random.randint(0, 5)
        
        new_rows.append({
            "task_id": f"T{start_id + i:03d}",
            "source_system": random.choice(["TMS", "SMMS", "TDMS", "CMS"]),
            "department": dept,
            "asset_id": asset_id,
            "asset_type": asset_type,
            "location": corridor,
            "start_station": start_station,
            "end_station": end_station,
            "defect_type": defect,
            "severity": severity,
            "safety_criticality": safety,
            "overdue_days": overdue,
            "estimated_duration": duration,
            "required_block_type": block,
            "deadline": deadline,
            "maintenance_frequency": freq,
            "failure_history": hist,
            "asset_criticality": base_crit
        })
        
    return pd.concat([existing_df, pd.DataFrame(new_rows)], ignore_index=True)

def generate_history(existing_df):
    new_rows = []
    start_id = len(existing_df) + 1
    
    today = datetime.now()
    
    for i in range(num_new_history):
        corridor, traffic, _ = random.choice(corridors)
        dept, asset_type = random.choice(departments)
        
        # Date completed between 1 and 365 days ago
        days_ago = random.randint(1, 365)
        completed_date = today - timedelta(days=days_ago)
        reported_date = completed_date - timedelta(days=random.randint(1, 15))
        
        severity = random.randint(3, 10)
        safety = random.randint(3, 10)
        overdue = random.randint(0, 15)
        
        est_duration = round(random.uniform(1.0, 4.0), 1)
        actual_duration = round(est_duration * random.uniform(0.8, 1.5), 1)
        
        hist = random.randint(0, 5)
        
        is_completed = random.random() > 0.15 # 85% completion rate
        status = "COMPLETED" if is_completed else "DEFERRED"
        granted = "YES" if is_completed else "NO"
        
        # Higher delay if deferred or if actual > est
        delay = 0
        if not is_completed:
            delay = random.randint(0, 5)
        elif actual_duration > est_duration + 0.5:
            delay = random.randint(2, 15)
        else:
            delay = random.randint(0, 3)
            
        new_rows.append({
            "record_id": f"H{start_id + i:03d}",
            "task_id": f"H-T{random.randint(100, 999)}",
            "department": dept,
            "asset_type": asset_type,
            "section": corridor,
            "reported_date": reported_date.strftime('%Y-%m-%d'),
            "completed_date": completed_date.strftime('%Y-%m-%d'),
            "severity": severity,
            "safety_criticality": safety,
            "overdue_days": overdue,
            "estimated_duration": est_duration,
            "actual_duration": actual_duration,
            "failure_history": hist,
            "traffic_density": traffic,
            "block_granted": granted,
            "completion_status": status,
            "train_delay_minutes": delay
        })
        
    return pd.concat([existing_df, pd.DataFrame(new_rows)], ignore_index=True)

def generate_blocks(existing_df):
    new_rows = []
    start_id = len(existing_df) + 1
    
    today = datetime.now()
    
    for i in range(num_new_blocks):
        corridor, _, _ = random.choice(corridors)
        date = (today + timedelta(days=random.randint(0, 30)))
        start_hour = random.randint(0, 20)
        duration = random.randint(3, 6)
        end_hour = min(24, start_hour + duration)
        
        # Format times
        start_time = f"{start_hour:02d}:00"
        end_time = f"{end_hour:02d}:00"
        
        line = random.choice(["UP", "DN"])
        traffic_level = random.choice(["LOW", "MEDIUM", "HIGH"])
        
        new_rows.append({
            "block_id": f"B{start_id + i:03d}",
            "section": corridor,
            "date": date.strftime('%Y-%m-%d'),
            "start_time": start_time,
            "end_time": end_time,
            "available_duration": duration,
            "line": line,
            "traffic_level": traffic_level
        })
        
    return pd.concat([existing_df, pd.DataFrame(new_rows)], ignore_index=True)


if __name__ == "__main__":
    print("Loading existing data...")
    df_tasks = pd.read_csv(tasks_file)
    df_history = pd.read_csv(history_file)
    df_blocks = pd.read_csv(blocks_file)
    
    print("Generating new synthetic data...")
    df_tasks_new = generate_tasks(df_tasks)
    df_history_new = generate_history(df_history)
    df_blocks_new = generate_blocks(df_blocks)
    
    print(f"Writing to {tasks_file}...")
    df_tasks_new.to_csv(tasks_file, index=False)
    
    print(f"Writing to {history_file}...")
    df_history_new.to_csv(history_file, index=False)
    
    print(f"Writing to {blocks_file}...")
    df_blocks_new.to_csv(blocks_file, index=False)
    
    print("Done! Restart the backend server for changes to take effect.")
