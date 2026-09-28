import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

def generate_synthetic_data(num_samples=1000):
    np.random.seed(42)
    
    # Generate features
    asset_types = np.random.choice([0, 1, 2], size=num_samples) # 0: Track, 1: Signal, 2: OHE
    traffic_density = np.random.uniform(0.1, 1.0, size=num_samples)
    failure_history = np.random.poisson(lam=1.5, size=num_samples)
    days_since_maintenance = np.random.randint(10, 200, size=num_samples)
    
    # Determine probability of defect based on rules
    # More traffic, more history, longer since maintenance = higher risk
    risk_score = (traffic_density * 2.0) + (failure_history * 1.5) + (days_since_maintenance / 50.0)
    
    # Add some noise
    risk_score += np.random.normal(0, 0.5, size=num_samples)
    
    # Threshold for defect
    # E.g. top 25% of risk scores have a defect
    threshold = np.percentile(risk_score, 75)
    defect_occurred = (risk_score >= threshold).astype(int)
    
    df = pd.DataFrame({
        'asset_type': asset_types,
        'traffic_density': traffic_density,
        'failure_history': failure_history,
        'days_since_maintenance': days_since_maintenance,
        'defect_occurred': defect_occurred
    })
    
    return df

def train_model():
    print("Generating synthetic data...")
    df = generate_synthetic_data(1000)
    
    X = df[['asset_type', 'traffic_density', 'failure_history', 'days_since_maintenance']]
    y = df['defect_occurred']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training RandomForestClassifier...")
    clf = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
    clf.fit(X_train, y_train)
    
    print("Evaluating model...")
    y_pred = clf.predict(X_test)
    print(classification_report(y_test, y_pred))
    
    print("Saving model to defect_predictor.joblib...")
    joblib.dump(clf, "defect_predictor.joblib")
    print("Model saved successfully.")

if __name__ == "__main__":
    train_model()
