Drone Drop Dynamics: Energy Conservation Solver

Drone Drop Dynamics is a focused physics simulation designed to visualize and solve a specific mechanics problem involving gravitational potential energy, kinetic energy, and conservation of mechanical energy.
Scenario:
A delivery drone with mass $10.0\text{ kg}$ descends at $3.0\text{ m/s}$. It releases a $2.0\text{ kg}$ payload $1.5\text{ m}$ above a roof. Calculate the total mechanical energy involved in the payload's impact.

The Physics Engine calculates:

Initial Kinetic Energy ($K_0$): Derived from the drone's descent velocity.

Gravitational Potential Energy ($U_0$): Derived from the drop height.

Total Mechanical Energy ($E$): The sum ($K_0 + U_0$) conserved through the fall.

 Features

3D Visualizer: A Three.js rendering of the drop scenario with accurate height markers.

Live Telemetry: Real-time HUD showing Velocity ($v$), Height ($h$), and Energy ($J$) as the simulation runs.

Step-by-Step Derivation: A dedicated panel that breaks down the math equations ($K = \frac{1}{2}mv^2$, $U = mgh$) and shows the work.

Verification Mode: Automatically highlights the correct final answer ($38.43\text{ J}$) upon impact.

 Quick Start

This project is built with Vite for fast local development.

Clone the Repository

git clone [https://github.com/samfrazerdutton/Drone-Drop.git](https://github.com/samfrazerdutton/Drone-Drop.git)
cd Drone-Drop


Install Dependencies

npm install


Run Simulation

npm run dev
