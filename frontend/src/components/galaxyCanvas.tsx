
import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import PointDetailsPanel from './pointPanel';
import { type GalaxyPoints, type FilterItem, fetchPointDetails } from '../services/api';

interface GalaxyCanvasProps {
  points: GalaxyPoints[];
  topics: FilterItem[];
}

interface HoveredInfo {
    point: GalaxyPoints;
    x: number;
    y: number;
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

function GalaxyPointsCloud({ points, topics, onHover, onHoverOut, onPointClick }: GalaxyCanvasProps & {
    onHover: (point: GalaxyPoints, x: number, y: number) => void;
    onHoverOut: () => void;
    onPointClick: (point: GalaxyPoints) => void;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const circleTexture = useMemo(() => createCircleTexture(), []);
    const [activate3DPoint, setActive3DPoint] = useState<GalaxyPoints | null>(null);

    useFrame(() => {
        if (groupRef.current && !activate3DPoint) {
            groupRef.current.rotation.y += 0.002;
        }
    });

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

    const activePointColor = useMemo(() => {
        if (!activate3DPoint) return '#ffffff';
        const matchingTopic = topics.find(t => t.name === activate3DPoint.topic);
        return matchingTopic ? matchingTopic.color : '#ffffff';
    }, [activate3DPoint, topics]);

    const activePointPosition = useMemo(() => {
        if (!activate3DPoint) return null;
        return new Float32Array([
          activate3DPoint.x * 0.8,
          activate3DPoint.y * 0.8,
          activate3DPoint.z * 0.8
        ]);
    }, [activate3DPoint]);

    const handlePointerMove = (e: any) => {
        e.stopPropagation();
        const index = e.index;
        
        if (index !== undefined && points[index]) {
            const currentPoint = points[index];
            setActive3DPoint(currentPoint);
            onHover(points[index], e.clientX, e.clientY);
        }
    };

    const handlePointerClick = (e: any) => {
        e.stopPropagation();
        const index = e.index;
        if (index !== undefined && points[index]) {
            onPointClick(points[index]);
        }
    };

    const handlePointerOut = () => {
        setActive3DPoint(null);
        onHoverOut();
    };

    return (
      <group ref={groupRef}>
        <points
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
          onClick={handlePointerClick}
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

        {activePointPosition && (
            <points>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[activePointPosition, 3 ]}/>
                </bufferGeometry>
                <pointsMaterial
                    size={1.5}
                    color={activePointColor}
                    sizeAttenuation={true}
                    map={circleTexture}
                    transparent={true}
                    opacity={1.0}
                    depthWrite={false}
                />
            </points>
        )}
      </group>
    );
}

export default function GalaxyCanvas({ points, topics }: GalaxyCanvasProps) {
    const [hoveredInfo, setHoveredInfo] = useState<HoveredInfo | null>(null);
    const [selectedPoint, setSelectedPoint] = useState<GalaxyPoints | null>(null);

    const [panelData, setPanelData] = useState<{ phrases: any[], models: any[], neighbors: any[] } | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

    const handleHover = (point: GalaxyPoints, x: number, y: number) => {
        setHoveredInfo({ point, x, y});
        document.body.style.cursor = 'pointer';
    };

    const handleHoverOut = () => {
        setHoveredInfo(null);
        document.body.style.cursor = 'default';
    };

    const panelColor = useMemo(() => {
        if (!selectedPoint) return '#B700FF';
        const matchingTopic = topics.find(t => t.name === selectedPoint.topic);
        return matchingTopic ? matchingTopic.color : '#B700FF';
    }, [selectedPoint, topics]);

    const handlePointClick = async (point: GalaxyPoints) => {
        setSelectedPoint(point);
        setIsLoadingDetails(true);
        setPanelData(null);

        try {
            const data = await fetchPointDetails(point.id);
            setPanelData(data);
        } catch (error) {
            console.error("Erreur lors de la récupération des détails :", error);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    return (
    <div className="galaxy-canvas-wrapper" style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>
        {hoveredInfo && (
            <div className='galaxy-tooltip'
                 style={{
                     left: `${hoveredInfo.x + 15}px`,
                     top: `${hoveredInfo.y + 15}px`,
                     position: 'fixed',
                     zIndex: 10
                 }}
            >
                <div className='tooltip-meta-line'>
                    <span className='material-symbols-outlined'>neurology</span>
                    <strong>Model : </strong>
                    <span>{hoveredInfo.point.model}</span>
                </div>

                <div className='tooltip-meta-line'>
                    <span className='material-symbols-outlined'>info</span>
                    <strong>Topic : </strong>
                    <span>{hoveredInfo.point.topic}</span>
                </div>

                <hr className='tooltip-divider'></hr>
                <p className='tooltip-phrase'>{hoveredInfo.point.phrase}</p>
            </div>
        )}

      {/* Conteneur principal pour le Canvas 3D */}
      <div style={{ flex: 1, height: '100%' }}>
        <Canvas camera={{ position: [40, 40, 30], fov: 70 }}>
          <ambientLight intensity={1.5} />
          
          <GalaxyPointsCloud 
              points={points} 
              topics={topics} 
              onHover={handleHover} 
              onHoverOut={handleHoverOut}
              onPointClick={handlePointClick}
          />
          
          <OrbitControls 
            enableDamping={true} 
            dampingFactor={0.05}
            maxDistance={60}
            minDistance={3}
          />
        </Canvas>
      </div>

      {/* 🌟 Intégration de l'affichage du panneau latéral droit */}
      {selectedPoint && (
        <div style={{ padding: '10px', height: '100%', display: 'flex', alignItems: 'center', zIndex: 20 }}>
          {isLoadingDetails ? (
            <div className="details-panel-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '350px' }}>
              <span style={{ color: '#9ca3af' }}>Chargement des données...</span>
            </div>
          ) : (
            panelData && (
              <PointDetailsPanel 
                onClose={() => {
                  setSelectedPoint(null);
                  setPanelData(null);
                }}
                activeColor={panelColor}
                phrases={panelData.phrases}
                models={panelData.models}
                neighbors={panelData.neighbors}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
