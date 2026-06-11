import { useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { type GalaxyPoints, type FilterItem } from '../services/api';

interface GalaxyCanvasProps {
  points: GalaxyPoints[];
  topics: FilterItem[];
}

const createCircleTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
};

function GalaxyPointsCloud({ points, topics }: GalaxyCanvasProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const circleTexture = useMemo(() => createCircleTexture(), []);
  
  // Référence vers l'élément DOM de l'info-bulle
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const { positionsArray, colorsArray } = useMemo(() => {
    const posArray = new Float32Array(points.length * 3);
    const colorArray = new Float32Array(points.length * 3);
    const threeColor = new THREE.Color();

    points.forEach((point, i) => {
      const multiplier = 0.8; 
      posArray[i * 3] = point.x * multiplier;
      posArray[i * 3 + 1] = point.y * multiplier;
      posArray[i * 3 + 2] = point.z * multiplier;

      const matchingModel = topics.find(t => t.name === point.topic);
      const hexColor = matchingModel ? matchingModel.color : '#9ca3af';
      
      threeColor.set(hexColor);

      colorArray[i * 3] = threeColor.r;
      colorArray[i * 3 + 1] = threeColor.g;
      colorArray[i * 3 + 2] = threeColor.b;
    });

    return { positionsArray: posArray, colorsArray: colorArray };
  }, [points, topics]);

  // 🖱️ GESTION DU SURVOL (Raycasting)
  const handlePointerMove = (e: any) => {
    // Bloque la rotation de la caméra OrbitControls pendant qu'on survole un point précis
    e.stopPropagation();

    // Récupère l'index du point le plus proche du curseur détecté par Three.js
    const index = e.index;
    
    if (index !== undefined && points[index]) {
      const hoveredPoint = points[index];
      
      // On cherche l'élément HTML de notre tooltip dans le DOM
      if (!tooltipRef.current) {
        tooltipRef.current = document.getElementById('galaxy-shared-tooltip') as HTMLDivElement;
      }

      if (tooltipRef.current) {
        // Injection dynamique des infos textuelles du point
        tooltipRef.current.innerHTML = `
          <strong>Modele : <em>${hoveredPoint.model}</em></strong>
          <div>Topic : ${hoveredPoint.topic || 'None'}</div>
          <span class="galaxy-tooltip-text">"${hoveredPoint.phrase}"</span>
        `;

        // Positionnement de l'info-bulle à côté de la souris (avec un décalage de 15px)
        tooltipRef.current.style.left = `${e.clientX + 15}px`;
        tooltipRef.current.style.top = `${e.clientY + 15}px`;
        tooltipRef.current.style.display = 'block';
      }
    }
  };

  const handlePointerOut = () => {
    if (tooltipRef.current) {
      tooltipRef.current.style.display = 'none';
    }
  };

  return (
    <points 
      ref={pointsRef}
      // On lie les écouteurs d'événements 3D de React Three Fiber
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positionsArray, 3]} />
        <bufferAttribute attach="attributes-color" args={[colorsArray, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.6}
        vertexColors={true}
        sizeAttenuation={true}
        map={circleTexture}
        transparent={true}
        alphaTest={0.5}
        opacity={0.9}
        depthWrite={true}
      />
    </points>
  );
}

export default function GalaxyCanvas({ points, topics }: GalaxyCanvasProps) {
  return (
    <div className="galaxy-canvas-wrapper">
      {/* 🌟 On place l'info-bulle HTML vide ici. Elle sera pilotée par Three.js */}
      <div id="galaxy-shared-tooltip" className="galaxy-tooltip"></div>

      <Canvas camera={{ position: [20, 20, 30], fov: 70 }}>
        <ambientLight intensity={1.5} />
        
        <GalaxyPointsCloud points={points} topics={topics} />
        
        <OrbitControls 
          enableDamping={true} 
          dampingFactor={0.05}
          maxDistance={40}
          minDistance={3}
        />
      </Canvas>
    </div>
  );
}