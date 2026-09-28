import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any

from core_data_models import (
    MaintenanceDefect, OverdueTask, BlockAvailability, TrainSchedule,
    Corridor, DepartmentType, CriticalityLevel, MaintenanceStatus,
    BlockStatus, BlockPriority
)

import os
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "railway_planner.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create tables if they do not exist"""
    conn = get_connection()
    cur = conn.cursor()
    # Corridors
    cur.execute('''
        CREATE TABLE IF NOT EXISTS corridors (
            corridor_id TEXT PRIMARY KEY,
            name TEXT,
            source_station TEXT,
            destination_station TEXT,
            distance_km REAL,
            asset_type TEXT,
            department TEXT,
            criticality INTEGER
        )
    ''')
    # Defects
    cur.execute('''
        CREATE TABLE IF NOT EXISTS defects (
            defect_id TEXT PRIMARY KEY,
            corridor_id TEXT,
            asset_type TEXT,
            defect_type TEXT,
            department TEXT,
            severity INTEGER,
            description TEXT,
            reported_date TEXT,
            estimated_duration_hours REAL,
            status TEXT,
            impact_on_availability REAL,
            dependencies TEXT
        )
    ''')
    # Overdue Tasks
    cur.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            task_id TEXT PRIMARY KEY,
            corridor_id TEXT,
            task_type TEXT,
            department TEXT,
            due_date TEXT,
            overdue_days INTEGER,
            estimated_duration_hours REAL,
            criticality INTEGER,
            frequency TEXT,
            last_completed TEXT,
            status TEXT
        )
    ''')
    # Block Availability
    cur.execute('''
        CREATE TABLE IF NOT EXISTS blocks (
            block_id TEXT PRIMARY KEY,
            corridor_id TEXT,
            start_time TEXT,
            end_time TEXT,
            duration_hours REAL,
            status TEXT,
            block_type TEXT,
            number_of_trains_affected INTEGER,
            train_delay_potential REAL,
            is_weekend INTEGER,
            is_holiday INTEGER
        )
    ''')
    # Train Schedule
    cur.execute('''
        CREATE TABLE IF NOT EXISTS trains (
            train_number TEXT PRIMARY KEY,
            train_name TEXT,
            source_station TEXT,
            destination_station TEXT,
            scheduled_departure TEXT,
            scheduled_arrival TEXT,
            distance_km REAL,
            train_category TEXT,
            affected_corridors TEXT
        )
    ''')
    conn.commit()
    conn.close()


def serialize_list(lst: List[Any]) -> str:
    return json.dumps(lst)

def deserialize_list(txt: str) -> List[Any]:
    return json.loads(txt) if txt else []

# ---------- Insert helpers ----------

def insert_corridors(corridors: List[Corridor]):
    conn = get_connection()
    cur = conn.cursor()
    for c in corridors:
        cur.execute('''
            INSERT OR REPLACE INTO corridors
            (corridor_id, name, source_station, destination_station, distance_km, asset_type, department, criticality)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            c.corridor_id,
            c.name,
            c.source_station,
            c.destination_station,
            c.distance_km,
            c.asset_type,
            c.department.value,
            c.criticality.value
        ))
    conn.commit()
    conn.close()


def insert_defects(defects: List[MaintenanceDefect]):
    conn = get_connection()
    cur = conn.cursor()
    for d in defects:
        cur.execute('''
            INSERT OR REPLACE INTO defects
            (defect_id, corridor_id, asset_type, defect_type, department, severity, description,
             reported_date, estimated_duration_hours, status, impact_on_availability, dependencies)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            d.defect_id,
            d.corridor_id,
            d.asset_type,
            d.defect_type,
            d.department.value,
            d.severity.value,
            d.description,
            d.reported_date.isoformat(),
            d.estimated_duration_hours,
            d.status.value,
            d.impact_on_availability,
            serialize_list(d.dependencies)
        ))
    conn.commit()
    conn.close()


def insert_tasks(tasks: List[OverdueTask]):
    conn = get_connection()
    cur = conn.cursor()
    for t in tasks:
        cur.execute('''
            INSERT OR REPLACE INTO tasks
            (task_id, corridor_id, task_type, department, due_date, overdue_days,
             estimated_duration_hours, criticality, frequency, last_completed, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            t.task_id,
            t.corridor_id,
            t.task_type,
            t.department.value,
            t.due_date.isoformat(),
            t.overdue_days,
            t.estimated_duration_hours,
            t.criticality.value,
            t.frequency,
            t.last_completed.isoformat() if t.last_completed else None,
            t.status.value
        ))
    conn.commit()
    conn.close()


def insert_blocks(blocks: List[BlockAvailability]):
    conn = get_connection()
    cur = conn.cursor()
    for b in blocks:
        cur.execute('''
            INSERT OR REPLACE INTO blocks
            (block_id, corridor_id, start_time, end_time, duration_hours, status, block_type,
             number_of_trains_affected, train_delay_potential, is_weekend, is_holiday)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            b.block_id,
            b.corridor_id,
            b.start_time.isoformat(),
            b.end_time.isoformat(),
            b.duration_hours,
            b.status.value,
            b.block_type,
            b.number_of_trains_affected,
            b.train_delay_potential,
            int(b.is_weekend),
            int(b.is_holiday)
        ))
    conn.commit()
    conn.close()


def insert_trains(trains: List[TrainSchedule]):
    conn = get_connection()
    cur = conn.cursor()
    for t in trains:
        cur.execute('''
            INSERT OR REPLACE INTO trains
            (train_number, train_name, source_station, destination_station,
             scheduled_departure, scheduled_arrival, distance_km, train_category, affected_corridors)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            t.train_number,
            t.train_name,
            t.source_station,
            t.destination_station,
            t.scheduled_departure.isoformat(),
            t.scheduled_arrival.isoformat(),
            t.distance_km,
            t.train_category,
            serialize_list(t.affected_corridors)
        ))
    conn.commit()
    conn.close()

# ---------- Load helpers ----------

def load_corridors() -> List[Corridor]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute('SELECT * FROM corridors')
    rows = cur.fetchall()
    corridors = []
    for r in rows:
        corridors.append(Corridor(
            corridor_id=r['corridor_id'],
            name=r['name'],
            source_station=r['source_station'],
            destination_station=r['destination_station'],
            distance_km=r['distance_km'],
            asset_type=r['asset_type'],
            department=DepartmentType(r['department']),
            criticality=CriticalityLevel(r['criticality'])
        ))
    conn.close()
    return corridors


def load_defects() -> List[MaintenanceDefect]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute('SELECT * FROM defects')
    rows = cur.fetchall()
    defects = []
    for r in rows:
        defects.append(MaintenanceDefect(
            defect_id=r['defect_id'],
            corridor_id=r['corridor_id'],
            asset_type=r['asset_type'],
            defect_type=r['defect_type'],
            department=DepartmentType(r['department']),
            severity=CriticalityLevel(r['severity']),
            description=r['description'],
            reported_date=datetime.fromisoformat(r['reported_date']),
            estimated_duration_hours=r['estimated_duration_hours'],
            status=MaintenanceStatus(r['status']),
            impact_on_availability=r['impact_on_availability'],
            dependencies=deserialize_list(r['dependencies'])
        ))
    conn.close()
    return defects


def load_tasks() -> List[OverdueTask]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute('SELECT * FROM tasks')
    rows = cur.fetchall()
    tasks = []
    for r in rows:
        tasks.append(OverdueTask(
            task_id=r['task_id'],
            corridor_id=r['corridor_id'],
            task_type=r['task_type'],
            department=DepartmentType(r['department']),
            due_date=datetime.fromisoformat(r['due_date']),
            overdue_days=r['overdue_days'],
            estimated_duration_hours=r['estimated_duration_hours'],
            criticality=CriticalityLevel(r['criticality']),
            frequency=r['frequency'],
            last_completed=datetime.fromisoformat(r['last_completed']) if r['last_completed'] else None,
            status=MaintenanceStatus(r['status'])
        ))
    conn.close()
    return tasks


def load_blocks() -> List[BlockAvailability]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute('SELECT * FROM blocks')
    rows = cur.fetchall()
    blocks = []
    for r in rows:
        blocks.append(BlockAvailability(
            block_id=r['block_id'],
            corridor_id=r['corridor_id'],
            start_time=datetime.fromisoformat(r['start_time']),
            end_time=datetime.fromisoformat(r['end_time']),
            duration_hours=r['duration_hours'],
            status=BlockStatus(r['status']),
            block_type=r['block_type'],
            number_of_trains_affected=r['number_of_trains_affected'],
            train_delay_potential=r['train_delay_potential'],
            is_weekend=bool(r['is_weekend']),
            is_holiday=bool(r['is_holiday'])
        ))
    conn.close()
    return blocks


def load_trains() -> List[TrainSchedule]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute('SELECT * FROM trains')
    rows = cur.fetchall()
    trains = []
    for r in rows:
        trains.append(TrainSchedule(
            train_number=r['train_number'],
            train_name=r['train_name'],
            source_station=r['source_station'],
            destination_station=r['destination_station'],
            scheduled_departure=datetime.fromisoformat(r['scheduled_departure']),
            scheduled_arrival=datetime.fromisoformat(r['scheduled_arrival']),
            distance_km=r['distance_km'],
            train_category=r['train_category'],
            affected_corridors=deserialize_list(r['affected_corridors'])
        ))
    conn.close()
    return trains

# ---------- Convenience ----------

def seed_initial_data(sample_data: Dict[str, Any]):
    """Populate the database with the sample data if tables are empty"""
    init_db()
    if not load_corridors():
        insert_corridors(sample_data.get('corridors', []))
    if not load_defects():
        insert_defects(sample_data.get('defects', []))
    if not load_tasks():
        insert_tasks(sample_data.get('tasks', []))
    if not load_blocks():
        insert_blocks(sample_data.get('blocks', []))
    if not load_trains():
        insert_trains(sample_data.get('trains', []))
