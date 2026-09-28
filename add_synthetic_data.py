import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
from pathlib import Path

# Indian Railway realistic setup
SECTIONS = [
    ('BCT', 'NGP', 'BCT-NGP'),
    ('NGP', 'HWH', 'NGP-HWH'),
    ('HWH', 'MAS', 'HWH-MAS'),
    ('MAS', 'LKO', 'MAS-LKO'),
    ('LKO', 'NDLS', 'LKO-NDLS')
]

DEPARTMENTS = ['Engineering', 'S&T', 'TRD']
SOURCE_SYSTEMS = ['TMS', 'SMMS', 'TDMS', 'CMS']

DEFECTS = {
    'Engineering': ['Rail fracture', 'Tamping', 'Weld repair', 'Deep screening', 'Ultrasonic inspection', 'USFD testing'],
    'S&T': ['Signal inspection', 'Point machine service', 'Relay check', 'Axle counter reset', 'Cable insulation test'],
    'TRD': ['OHE maintenance', 'Insulator replacement', 'Wire tensioning', 'Pantograph check', 'Mast adjustment']
}

BLOCK_TYPES = {
    'Engineering': 'Traffic block',
    'S&T': 'Traffic block',
    'TRD': 'Power block'
}

ASSET_PREFIX = {
    'Engineering': ['TRK', 'TRA', 'PTS'],
    'S&T': ['SIG', 'PNT', 'AXL'],
    'TRD': ['OHE', 'TSS', 'SP']
}

def generate_synthetic_data(num_records=500):
    np.random.seed(42)
    random.seed(42)
    
    data = []
    
    base_date = datetime.strptime("2026-09-28", "%Y-%m-%d")
    
    for i in range(1, num_records + 1):
        task_id = f"T{str(i).zfill(4)}"
        source = random.choice(SOURCE_SYSTEMS)
        dept = random.choice(DEPARTMENTS)
        
        start_st, end_st, loc = random.choice(SECTIONS)
        
        defect = random.choice(DEFECTS[dept])
        req_block = BLOCK_TYPES[dept]
        
        asset_type = 'Track' if dept == 'Engineering' else ('Signal' if dept == 'S&T' else 'OHE')
        asset_id = f"{random.choice(ASSET_PREFIX[dept])}-{loc}-{random.randint(100, 999)}"
        
        # Determine criticality and severity
        # Let's make some defects consistently higher severity
        if defect in ['Rail fracture', 'Wire tensioning', 'Point machine service']:
            severity = random.randint(7, 10)
            safety_criticality = random.randint(7, 10)
        else:
            severity = random.randint(3, 8)
            safety_criticality = random.randint(3, 8)
            
        overdue = 0
        if random.random() > 0.8:
            overdue = random.randint(1, 15)
            
        est_dur = round(random.uniform(1.0, 4.0), 1)
        
        # Deadlines (0 to 30 days out)
        deadline_days = random.randint(0, 30)
        if overdue > 0:
            deadline_date = base_date - timedelta(days=overdue)
        else:
            deadline_date = base_date + timedelta(days=deadline_days)
            
        deadline_str = deadline_date.strftime("%Y-%m-%d")
        
        freq = random.choice(['Monthly', 'Quarterly', 'Bi-Annual', 'Annual', 'Conditional'])
        history = random.randint(0, 5)
        asset_crit = random.randint(4, 9)
        
        data.append({
            'task_id': task_id,
            'source_system': source,
            'department': dept,
            'asset_id': asset_id,
            'asset_type': asset_type,
            'location': loc,
            'start_station': start_st,
            'end_station': end_st,
            'defect_type': defect,
            'severity': severity,
            'safety_criticality': safety_criticality,
            'overdue_days': overdue,
            'estimated_duration': est_dur,
            'required_block_type': req_block,
            'deadline': deadline_str,
            'maintenance_frequency': freq,
            'failure_history': history,
            'asset_criticality': asset_crit
        })
        
    df = pd.DataFrame(data)
    
    # Save to data directory
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    df.to_csv(data_dir / "maintenance_tasks.csv", index=False)
    print(f"Generated {num_records} synthetic Indian Railway tasks in data/maintenance_tasks.csv")

if __name__ == "__main__":
    generate_synthetic_data(500)
