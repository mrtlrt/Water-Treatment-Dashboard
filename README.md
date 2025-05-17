# Water Treatment Plant Dashboard
A real-time monitoring dashboard for water treatment plants built with React and Recharts.

## Features
- Real-time monitoring of water flow rates, chemical levels, and quality parameters
- Anomaly detection and alert system
- Actuator state visualization
- Responsive layout for different screen sizes

## Setup Instructions
Run these commands in your terminal.

1. Clone the repository:

```bash
git clone https://github.com/mrtlrt/Water-Treatment-Dashboard.git cd water-treatment-dashboard
```
2. Install dependencies:

```bash
npm install
```
This will install the required packages:

- React
- React DOM
- Recharts (for visualizations)
- Papaparse (for CSV parsing)
- Lucide React (for icons)

3. Start the development server:

```bash
npm start
```
4. Open `http://localhost:3000` in your browser. (You might have to agree to a change of port depending on apps running on your localhost.)

## Data Source
The dashboard uses a CSV file with simulated water treatment plant data. The data includes:

- Flow rates (inflow and outflow)
- Chemical levels (chlorine and alum)
- Quality parameters (pH and turbidity)
- Energy consumption
- Actuator states

This file is present in the `public` folder, titled `water_treatment_5days_1sec_data.csv`.

## Technologies Used
- React
- Recharts for data visualization
- Papa Parse for CSV parsing
- Lucide React for icons
