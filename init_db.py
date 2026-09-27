import pandas as pd
import sqlite3
from pathlib import Path

def init_db(data_dir="."):
    data_dir = Path(data_dir)
    db_path = data_dir / "railway_planner.db"
    
    # Create SQLite connection
    conn = sqlite3.connect(db_path)
    
    # List of CSV files to migrate
    csv_files = [
        "maintenance_tasks.csv",
        "train_schedule.csv",
        "block_windows.csv",
        "goods_train_forecast.csv",
        "maintenance_history.csv",
        "resource_capacity.csv",
        "geo_reference.csv"
    ]
    
    for file in csv_files:
        csv_path = data_dir / file
        if csv_path.exists():
            print(f"Migrating {file} to database...")
            df = pd.read_csv(csv_path)
            # Table name is filename without extension
            table_name = file.replace('.csv', '')
            df.to_sql(table_name, conn, if_exists='replace', index=False)
            print(f"Created table: {table_name}")
        else:
            print(f"Warning: {file} not found")
            
    conn.close()
    print("Database initialization complete!")

if __name__ == "__main__":
    init_db()
