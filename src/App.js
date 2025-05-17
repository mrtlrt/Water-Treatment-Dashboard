import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, DropletOff, Thermometer, Loader, Play, Pause } from 'lucide-react';
import './App.css';
import Papa from 'papaparse';

function App() {
  // State management
  const [data, setData] = useState([]);
  const [currentData, setCurrentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [alertFilters, setAlertFilters] = useState({
    'Backflow Risk': true,
    'Abnormal PH': true,
    'High Chlorine': true,
    'High Turbidity': true,
    'High Alum': true,
    'Normal': false
  });
  const [activeAlerts, setActiveAlerts] = useState([]);

  // Load CSV data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Use fetch API to get the CSV file
        const response = await fetch('/water_treatment_5days_1sec_data.csv');
        const csvContent = await response.text();
        
        Papa.parse(csvContent, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedData = results.data.map((row, index) => ({
              ...row,
              id: index,
              // Parse alerts into array - make sure to properly trim whitespace
              anomaly_alerts: row.anomaly_alerts 
                ? row.anomaly_alerts.split(',').map(alert => alert.trim()) 
                : ['Normal']
            }));
            setData(parsedData);
            setCurrentData(parsedData.slice(0, 30)); // Initial data window
            setLoading(false);
          }
        });
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };
  
    loadData();
  }, []);

  // Update data every second to simulate real-time data
  useEffect(() => {
    if (!data.length || !isPlaying) return;

    const interval = setInterval(() => {
      if (currentIndex < data.length - 2) {
        // Add two new rows to the current data
        const newRows = data.slice(currentIndex, currentIndex + 2);
        setCurrentData(prevData => {
          // Keep last 30 data points for visualization
          const updatedData = [...prevData, ...newRows].slice(-30);
          return updatedData;
        });

        // Update alerts based on new rows
        const newAlerts = newRows
        .flatMap(row => {
          // Only process rows that have anomaly_alerts
          if (!row.anomaly_alerts) return [];
          
          // Create an alert for each anomaly type in this row
          return row.anomaly_alerts
            .filter(alert => alert !== 'Normal' && alertFilters[alert])
            .map(alertType => ({
              id: `${row.id}-${alertType}`,
              timestamp: row.timestamp,
              type: alertType,
              values: {
                pH: row.pH,
                turbidity: row.turbidity_NTU,
                chlorine: row.chlorine_mg_per_l,
                alum: row.alum_mg_per_l,
                inflow: row.water_inflow_m3,
                outflow: row.water_outflow_m3
              }
            }));
        });

        setActiveAlerts(prev => {
          const combined = [...prev, ...newAlerts];
          // Keep only alerts that match current filter settings and the 10 most recent
          return combined
            .filter(alert => alertFilters[alert.type])
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // Sort by timestamp, newest first
            .slice(0, 10); // Keep only the 10 most recent
        });

        setCurrentIndex(prevIndex => prevIndex + 2);
      } else {
        // Loop back to the beginning for demo purposes
        setCurrentIndex(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [data, currentIndex, isPlaying, alertFilters]);

  const togglePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  const toggleAlertFilter = (alertType) => {
    setAlertFilters(prev => {
      const newFilters = {
        ...prev,
        [alertType]: !prev[alertType]
      };
      
      // If turning a filter back ON, we need to potentially add alerts back
      if (newFilters[alertType]) {
        // Find all matching alerts in current visible data
        const alertsToAdd = currentData
        .flatMap(row => {
          if (!row.anomaly_alerts || !row.anomaly_alerts.includes(alertType)) return [];
          
          // Create an alert for this anomaly type
          return [{
            id: `${row.id}-${alertType}`,
            timestamp: row.timestamp,
            type: alertType,
            values: {
              pH: row.pH,
              turbidity: row.turbidity_NTU,
              chlorine: row.chlorine_mg_per_l,
              alum: row.alum_mg_per_l,
              inflow: row.water_inflow_m3,
              outflow: row.water_outflow_m3
            }
          }];
        });
  
        // Update alerts - keep existing filtered alerts and add newly enabled ones
        setActiveAlerts(current => {
          const combinedAlerts = [
            ...current.filter(alert => newFilters[alert.type]), 
            ...alertsToAdd
          ];
          // Sort by timestamp (newest first) and keep only the 10 most recent
          return combinedAlerts
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
        });
      } else {
        // Filter out alerts of the disabled type
        setActiveAlerts(current => 
          current.filter(alert => alert.type !== alertType)
        );
      }
      
      return newFilters;
    });
  };

  const getActuatorStatus = (status) => {
    switch (status) {
      case 'ON':
        return { className: 'status-on', label: 'ON' };
      case 'OFF':
        return { className: 'status-off', label: 'OFF' };
      case 'MAINTENANCE':
        return { className: 'status-maintenance', label: 'MAINT' };
      default:
        return { className: 'status-unknown', label: 'N/A' };
    }
  };

  // Get the latest actuator states
  const latestData = currentData.length > 0 ? currentData[currentData.length - 1] : null;

  if (loading) {
    return (
      <div className="loading-container">
        <Loader className="loading-spinner" />
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Water Treatment Plant Real-Time Monitoring</h1>
        <div className="controls">
          <button className="control-button" onClick={togglePlayPause}>
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? 'Pause' : 'Play'} Simulation
          </button>
          <span className="timestamp">
            Last Update: {latestData ? new Date(latestData.timestamp).toLocaleString() : 'N/A'}
          </span>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="main-panel">
          <div className="charts-grid">
            <div className="chart-container">
              <h2>Flow Rates (m³/s)</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={currentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(tick) => new Date(tick).toLocaleTimeString()} 
                    interval={5}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                    formatter={(value, name) => {
                      // Use the actual dataKey to determine the label
                      const labels = {
                        'water_inflow_m3': 'Inflow',
                        'water_outflow_m3': 'Outflow'
                      };
                      return [value.toFixed(2), labels[name] || name];
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="water_inflow_m3" 
                    stroke="#8884d8" 
                    name="Inflow" 
                    dot={false} 
                    isAnimationActive={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="water_outflow_m3" 
                    stroke="#82ca9d" 
                    name="Outflow" 
                    dot={false} 
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container">
              <h2>Chemical Levels</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={currentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(tick) => new Date(tick).toLocaleTimeString()} 
                    interval={5}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                    formatter={(value, name) => {
                      const labels = {
                        'chlorine_mg_per_l': 'Chlorine',
                        'alum_mg_per_l': 'Alum'
                      };
                      return [value.toFixed(2), labels[name] || name];
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="chlorine_mg_per_l" 
                    stroke="#ff7300" 
                    name="Chlorine" 
                    dot={false} 
                    isAnimationActive={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="alum_mg_per_l" 
                    stroke="#0088FE" 
                    name="Alum" 
                    dot={false} 
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container">
              <h2>Quality Parameters</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={currentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(tick) => new Date(tick).toLocaleTimeString()} 
                    interval={5}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                    formatter={(value, name) => {
                      const labels = {
                        'pH': 'pH',
                        'turbidity_NTU': 'Turbidity'
                      };
                      return [value.toFixed(2), labels[name] || name];
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="pH" 
                    stroke="#ff4757" 
                    name="pH" 
                    yAxisId="left" 
                    dot={false} 
                    isAnimationActive={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="turbidity_NTU" 
                    stroke="#546de5" 
                    name="Turbidity" 
                    yAxisId="right" 
                    dot={false} 
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container">
              <h2>Energy Consumption (kWh)</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={currentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(tick) => new Date(tick).toLocaleTimeString()} 
                    interval={5}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                    formatter={(value) => [value.toFixed(2), 'Energy']}  
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="energy_kwh" 
                    stroke="#2ed573" 
                    name="Energy" 
                    dot={false} 
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="side-panel">
          <div className="actuator-panel">
            <h2>Actuator States</h2>
            {latestData && (
              <div className="actuator-controls">
                <div className="actuator-control">
                  <div className="actuator-label">Inflow Pump</div>
                  <div className={`actuator-status ${getActuatorStatus(latestData.inflow_pump_state).className}`}>
                    {getActuatorStatus(latestData.inflow_pump_state).label}
                  </div>
                </div>
                <div className="actuator-control">
                  <div className="actuator-label">Chemical Doser</div>
                  <div className={`actuator-status ${getActuatorStatus(latestData.chemical_doser_state).className}`}>
                    {getActuatorStatus(latestData.chemical_doser_state).label}
                  </div>
                </div>
                <div className="actuator-control">
                  <div className="actuator-label">Filtration Unit</div>
                  <div className={`actuator-status ${getActuatorStatus(latestData.filtration_unit_state).className}`}>
                    {getActuatorStatus(latestData.filtration_unit_state).label}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="alerts-panel">
            <h2>Latest Anomaly Alerts</h2>
            <div className="alert-filters">
              <span className="filter-label">Filter:</span>
              {Object.keys(alertFilters).filter(alert => alert !== 'Normal').map(alertType => (
                <button 
                  key={alertType}
                  className={`filter-button ${alertFilters[alertType] ? 'active' : ''}`}
                  onClick={() => toggleAlertFilter(alertType)}
                >
                  {alertType}
                </button>
              ))}
            </div>
            <div className="alerts-container">
              {activeAlerts.length === 0 ? (
                <div className="no-alerts">
                  <p>No active alerts</p>
                </div>
              ) : (
                activeAlerts.map(alert => (
                  <div className={`alert-item alert-${alert.type.replace(/\s+/g, '-').toLowerCase()}`} key={alert.id}>
                    <div className="alert-header">
                      <AlertCircle size={16} />
                      <span className="alert-type">{alert.type}</span>
                      <span className="alert-time">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="alert-details">
                      {alert.type === 'Backflow Risk' && (
                        <p>Inflow: {alert.values.inflow.toFixed(2)} m³ | Outflow: {alert.values.outflow.toFixed(2)} m³</p>
                      )}
                      {alert.type === 'Abnormal PH' && (
                        <p>pH Level: {alert.values.pH.toFixed(2)}</p>
                      )}
                      {alert.type === 'High Chlorine' && (
                        <p>Chlorine: {alert.values.chlorine.toFixed(2)} mg/L</p>
                      )}
                      {alert.type === 'High Turbidity' && (
                        <p>Turbidity: {alert.values.turbidity.toFixed(2)} NTU</p>
                      )}
                      {alert.type === 'High Alum' && (
                        <p>Alum: {alert.values.alum.toFixed(2)} mg/L</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="dashboard-footer">
        <p>Siddharth Ganesh | Water Treatment Plant Monitoring System | {new Date().getFullYear()} | Total Rows: {data.length} | Current Index: {currentIndex}</p>
      </footer>
    </div>
  );
}

export default App;