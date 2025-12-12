import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three"; 
import { 
  ArrowDown, RefreshCw, Activity, Box, 
  RotateCcw, Calculator, Play, CheckCircle2,
  Sigma, MousePointer2 
} from "lucide-react";

// --- Configuration ---
const COLORS = {
  bg: 0x0f172a, // Slate 900
  grid: 0x334155,
  drone: 0x38bdf8, // Sky Blue
  payload: 0xfacc15, // Yellow
  impact: 0xef4444, // Red
  text: "text-slate-200"
};

export default function DroneDropSim() {
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  
  // --- Simulation State ---
  const [simState, setSimState] = useState("READY"); 
  const [telemetry, setTelemetry] = useState({
    height: 10.0,
    velocity: -3.0,
    ke: 0,
    pe: 0,
    totalE: 0
  });

  // --- HARD-CODED Physics Parameters ---
  const PARAMS = {
    droneMass: 8.0,      
    payloadMass: 2.0,    
    descentSpeed: 3.0,   
    dropHeight: 1.5,     
    gravity: 9.81
  };

  // --- Physics Kernel ---
  const updatePhysics = (state, dt) => {
    if (state.phase === "DESCENDING") {
      state.droneY -= PARAMS.descentSpeed * dt;
      state.payloadY = state.droneY - 0.5; 
      state.payloadVel = -PARAMS.descentSpeed;
      
      if (state.droneY <= PARAMS.dropHeight + 0.5) {
         state.phase = "DROPPED";
         setSimState("DROPPED");
      }
    }
    
    if (state.phase === "DROPPED") {
       state.droneY += 2.0 * dt; 
       state.payloadVel -= PARAMS.gravity * dt;
       state.payloadY += state.payloadVel * dt;
       
       if (state.payloadY <= 0) {
          state.payloadY = 0;
          state.payloadVel = 0;
          state.phase = "IMPACT";
          setSimState("IMPACT");
       }
    }
    return state;
  };

  // --- 3D Engine ---
  useEffect(() => {
    let frameId;
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.bg);
    
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(8, 6, 22); 
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(renderer.domElement);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 10), new THREE.MeshBasicMaterial({ color: 0x334155 }));
    floor.position.y = -0.1;
    scene.add(floor);
    
    const createMarker = (y) => {
       const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2, y, 0), new THREE.Vector3(2, y, 0)]);
       const lineMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.3 });
       scene.add(new THREE.Line(lineGeo, lineMat));
    };
    createMarker(0); createMarker(1.5); createMarker(3.0); createMarker(10.0);
    
    const droneGroup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 1), new THREE.MeshBasicMaterial({ color: COLORS.drone }));
    droneGroup.add(body);
    const rotorGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.05, 8);
    const rotorMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.5 });
    [-0.8, 0.8].forEach(x => {
        const r = new THREE.Mesh(rotorGeo, rotorMat);
        r.position.set(x, 0.3, 0);
        droneGroup.add(r);
    });
    scene.add(droneGroup);
    
    const payload = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: COLORS.payload }));
    scene.add(payload);

    const dropLineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1, 1.5, 0), new THREE.Vector3(1, 1.5, 0)]);
    const dropLineMat = new THREE.LineDashedMaterial({ color: 0xff4444, dashSize: 0.2, gapSize: 0.1 });
    const dropLine = new THREE.Line(dropLineGeo, dropLineMat);
    dropLine.computeLineDistances();
    scene.add(dropLine);

    const grid = new THREE.GridHelper(20, 20, 0x475569, 0x1e293b);
    scene.add(grid);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const state = { phase: "READY", droneY: 10, payloadY: 9.5, payloadVel: 0 };
    const cameraState = { radius: 25, theta: 0.3, phi: 1.3, target: new THREE.Vector3(0, 4, 0), isDragging: false, lastMouse: { x: 0, y: 0 } };

    const handleMouseDown = (e) => { cameraState.isDragging = true; cameraState.lastMouse = { x: e.clientX, y: e.clientY }; };
    const handleMouseMove = (e) => {
        if (!cameraState.isDragging) return;
        const dx = e.clientX - cameraState.lastMouse.x;
        const dy = e.clientY - cameraState.lastMouse.y;
        cameraState.theta -= dx * 0.005;
        cameraState.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraState.phi - dy * 0.005));
        cameraState.lastMouse = { x: e.clientX, y: e.clientY };
    };
    const handleMouseUp = () => { cameraState.isDragging = false; };
    const handleWheel = (e) => { cameraState.radius = Math.max(5, Math.min(50, cameraState.radius + e.deltaY * 0.05)); };

    const canvas = renderer.domElement;
    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("wheel", handleWheel);

    engineRef.current = {
       start: () => { state.phase = "DESCENDING"; setSimState("DESCENDING"); },
       reset: () => { state.phase = "READY"; state.droneY = 10; state.payloadY = 9.5; state.payloadVel = 0; droneGroup.position.y = 10; payload.position.y = 9.5; setSimState("READY"); }
    };

    const animate = () => {
       frameId = requestAnimationFrame(animate);
       const dt = 0.016;
       updatePhysics(state, dt);
       
       droneGroup.position.y = state.droneY;
       payload.position.y = state.payloadY;
       
       const { radius, theta, phi, target } = cameraState;
       camera.position.set(
           target.x + radius * Math.sin(phi) * Math.sin(theta),
           target.y + radius * Math.cos(phi),
           target.z + radius * Math.sin(phi) * Math.cos(theta)
       );
       camera.lookAt(target);

       const v = Math.abs(state.payloadVel);
       const h = state.payloadY;
       const m = PARAMS.payloadMass;
       const ke = 0.5 * m * v * v;
       const pe = m * PARAMS.gravity * h;
       
       setTelemetry({ height: h, velocity: state.payloadVel, ke: ke, pe: pe, totalE: ke + pe });
       renderer.render(scene, camera);
    };
    animate();

    return () => { cancelAnimationFrame(frameId); renderer.dispose(); window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
       <div ref={containerRef} className="flex-1 relative border-r border-slate-800 cursor-move">
           <div className="absolute bottom-4 left-4 text-xs text-slate-500 font-mono flex items-center bg-black/50 p-2 rounded pointer-events-none">
             <MousePointer2 className="w-3 h-3 mr-2" /> DRAG TO ROTATE • SCROLL TO ZOOM
           </div>
       </div>
       <div className="w-96 bg-slate-900 flex flex-col z-10 shadow-2xl">
          <div className="p-6 border-b border-slate-800 bg-slate-900">
             <h1 className="text-xl font-bold text-white flex items-center mb-2"><Box className="w-6 h-6 mr-2 text-sky-400" /> Physics Solver</h1>
             <p className="text-xs text-slate-500 uppercase tracking-widest">Problem 2: Conservation of Energy</p>
          </div>
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
             <div className="bg-slate-800 p-4 rounded-lg text-xs text-slate-300 border-l-2 border-indigo-500 shadow-lg">
                <h3 className="font-bold text-white mb-3 uppercase tracking-wider">Given Constants</h3>
                <ul className="space-y-2 font-mono">
                  <li className="flex justify-between"><span>Payload Mass (m)</span> <span className="text-yellow-400">2.0 kg</span></li>
                  <li className="flex justify-between"><span>Initial Velocity (v0)</span> <span className="text-sky-400">-3.0 m/s</span></li>
                  <li className="flex justify-between"><span>Drop Height (h)</span> <span className="text-emerald-400">1.5 m</span></li>
                </ul>
             </div>
             <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-4 shadow-inner">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase"><span>Real-Time Telemetry</span><Activity className="w-4 h-4 text-emerald-500 animate-pulse" /></div>
                <div className="grid grid-cols-2 gap-4">
                   <Stat label="Height (h)" value={telemetry.height.toFixed(2)} unit="m" />
                   <Stat label="Velocity (v)" value={telemetry.velocity.toFixed(2)} unit="m/s" />
                   <Stat label="Kinetic (K)" value={telemetry.ke.toFixed(1)} unit="J" color="text-sky-400" />
                   <Stat label="Potential (U)" value={telemetry.pe.toFixed(1)} unit="J" color="text-amber-400" />
                </div>
                <div className="pt-4 border-t border-slate-800"><div className="flex justify-between items-end"><span className="text-xs text-slate-500 font-bold">TOTAL ENERGY (E)</span><span className="text-2xl font-mono text-white font-bold">{telemetry.totalE.toFixed(1)} J</span></div></div>
             </div>
             {simState === "IMPACT" && (
                <div className="bg-emerald-900/30 border border-emerald-500 rounded-lg p-4 animate-in fade-in zoom-in duration-500">
                   <div className="flex items-center justify-between mb-2"><span className="text-emerald-400 font-bold text-sm flex items-center"><CheckCircle2 className="w-4 h-4 mr-2" /> FINAL ANSWER</span></div>
                   <div className="text-center"><span className="text-3xl font-black text-white tracking-tight">38.43 J</span><div className="text-[10px] text-emerald-300/60 mt-1 font-mono">TOTAL MECHANICAL ENERGY AT IMPACT</div></div>
                </div>
             )}
             <div className="mt-4 p-3 bg-black/40 rounded border border-slate-700 font-mono text-xs shadow-inner">
                <div className="flex items-center text-sky-400 mb-3 font-bold border-b border-slate-700 pb-2 tracking-wider"><Calculator className="w-3 h-3 mr-2" /> KINEMATIC DERIVATION</div>
                <div className="mb-3"><div className="text-slate-500 mb-1 flex items-center"><Sigma className="w-3 h-3 mr-1"/> 1. Kinetic Energy (K0)</div><div className="text-slate-300 pl-4">K = ½mv²</div><div className="text-sky-300 pl-4">= 0.5 * 2.0kg * (-3.0m/s)²</div><div className="text-right text-white font-bold border-b border-slate-800 pb-1">= 9.00 J</div></div>
                <div className="mb-3"><div className="text-slate-500 mb-1 flex items-center"><Sigma className="w-3 h-3 mr-1"/> 2. Potential Energy (U0)</div><div className="text-slate-300 pl-4">U = mgh</div><div className="text-amber-300 pl-4">= 2.0kg * 9.81m/s² * 1.5m</div><div className="text-right text-white font-bold border-b border-slate-800 pb-1">= 29.43 J</div></div>
                <div><div className="text-slate-500 mb-1 flex items-center"><Sigma className="w-3 h-3 mr-1"/> 3. Total Mechanical Energy</div><div className="text-slate-300 pl-4">E = K + U</div><div className="text-emerald-300 pl-4">= 9.00J + 29.43J</div><div className="text-right text-emerald-400 font-bold text-sm bg-emerald-900/20 p-1 rounded mt-1">= 38.43 J</div></div>
             </div>
          </div>
          <div className="p-4 bg-slate-900 border-t border-slate-800 grid grid-cols-2 gap-3">
             <button onClick={() => engineRef.current?.reset()} className="py-3 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center transition-colors border border-slate-700"><RotateCcw className="w-4 h-4 mr-2" /> RESET</button>
             <button onClick={() => engineRef.current?.start()} disabled={simState !== "READY"} className={`py-3 rounded text-white text-xs font-bold flex items-center justify-center transition-all ${simState === "READY" ? "bg-sky-600 hover:bg-sky-500 shadow-lg shadow-sky-900/30" : "bg-slate-800 text-slate-500 cursor-not-allowed"}`}>{simState === "DESCENDING" ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}{simState === "READY" ? "SIMULATE DROP" : simState}</button>
          </div>
       </div>
    </div>
  );
}

const Stat = ({ label, value, unit, color = "text-white" }) => (
  <div>
    <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">{label}</div>
    <div className={`font-mono text-lg ${color}`}>{value} <span className="text-xs text-slate-600">{unit}</span></div>
  </div>
);
