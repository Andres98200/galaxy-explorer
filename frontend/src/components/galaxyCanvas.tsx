import { useRef, useMemo, useState, useEffect } from 'react'; 
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import PointDetailsPanel from './pointPanel';
import { type GalaxyPoints, type FilterItem, fetchPointDetails, fetchSourceTextData, type SourceTextData } from '../services/api';
import SourceTextPanel from './SourceTextPanel';
import { getColorFromString } from '../utils/colors';
import SourceTextPanelSkeleton from './Skeletons/SourceTextPanelSkeleton'
import PointDetailsPanelSkeleton from './Skeletons/PointDetailSkeleton';


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

function GalaxyPointsCloud({ 
    points, 
    topics, 
    selectedPoint,
    neighborsId,
    onHover, 
    onHoverOut, 
    onPointClick 
}: GalaxyCanvasProps & {
    selectedPoint: GalaxyPoints | null;
    neighborsId: number[];
    onHover: (point: GalaxyPoints, x: number, y: number) => void;
    onHoverOut: () => void;
    onPointClick: (point: GalaxyPoints) => void;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const geometryRef = useRef<THREE.BufferGeometry>(null);

    const circleTexture = useMemo(() => createCircleTexture(), []);
    const [activate3DPoint, setActive3DPoint] = useState<GalaxyPoints | null>(null);

    useFrame(() => {
        if (groupRef.current && !activate3DPoint && !selectedPoint) {
            groupRef.current.rotation.y += 0.002;
        }
    });

    const { positionsArray, colorsArray } = useMemo(() => {
        const posArray = new Float32Array(points.length * 3);
        const colorArray = new Float32Array(points.length * 3);
        const threeColor = new THREE.Color();

        const activeTopics = topics.filter(t => t.active);
        const isSingleTopic = activeTopics.length === 1;

        points.forEach((point, i) => {
            const multiplier = 0.8; 
            posArray[i * 3] = point.x * multiplier;
            posArray[i * 3 + 1] = point.y * multiplier;
            posArray[i * 3 + 2] = point.z * multiplier;

            let hexColor = '#9ca3af';
            if (isSingleTopic) {
                hexColor = getColorFromString(`cluster-${point.cluster}`);
            } else {
                const matchingTopic = topics.find(t => t.name === point.topic);
                hexColor = matchingTopic ? matchingTopic.color : '#9ca3af';
            }

            threeColor.set(hexColor);

            if (selectedPoint) {
                const isTarget = point.id === selectedPoint.id;
                const isNeighbor = neighborsId.includes(point.id);

                if (!isTarget && !isNeighbor) {
                    threeColor.multiplyScalar(0.15); 
                }
            }

            colorArray[i * 3] = threeColor.r;
            colorArray[i * 3 + 1] = threeColor.g;
            colorArray[i * 3 + 2] = threeColor.b;
        });

        return { positionsArray: posArray, colorsArray: colorArray };
    }, [points, topics, selectedPoint, neighborsId]);

    useEffect(() => {
        if (geometryRef.current) {
            geometryRef.current.computeBoundingSphere();
            
            const posAttr = geometryRef.current.getAttribute('position');
            const colorAttr = geometryRef.current.getAttribute('color');
            
            if (posAttr) posAttr.needsUpdate = true;
            if (colorAttr) colorAttr.needsUpdate = true;
        }
    }, [positionsArray, colorsArray]);

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

    const selectedPointPosition = useMemo(() => {
        if (!selectedPoint) return null;
        return new Float32Array([
          selectedPoint.x * 0.8,
          selectedPoint.y * 0.8,
          selectedPoint.z * 0.8
        ]);
    }, [selectedPoint]);

    const neighborsPositions = useMemo(() => {
        if (neighborsId.length === 0) return null;
        const coords: number[] = [];
        neighborsId.forEach(id => {
            const pt = points.find(p => p.id === id);
            if (pt) {
                coords.push(pt.x * 0.8, pt.y * 0.8, pt.z * 0.8);
            }
        });
        return coords.length > 0 ? new Float32Array(coords) : null;
    }, [neighborsId, points]);

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
        {/* galaxy */}
        <points
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
          onClick={handlePointerClick}
        >
          <bufferGeometry ref={geometryRef}>
            <bufferAttribute 
              key={positionsArray.length}
              attach="attributes-position" 
              args={[positionsArray, 3]} 
            />
            <bufferAttribute 
              key={colorsArray.length}
              attach="attributes-color" 
              args={[colorsArray, 3]} 
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.6}
            vertexColors={true}
            sizeAttenuation={true}
            map={circleTexture}
            transparent={true}
            alphaTest={0.5}
            opacity={0.9}
            depthWrite={false}
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

        {selectedPointPosition && (
            <points>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[selectedPointPosition, 3 ]}/>
                </bufferGeometry>
                <pointsMaterial
                    size={1.2}          
                    color="#f80000"    
                    sizeAttenuation={true}
                    map={circleTexture}
                    transparent={true}
                    opacity={1.0}
                    depthWrite={false}
                />
            </points>
        )}

        {neighborsPositions && (
            <points>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[neighborsPositions, 3]} />
                </bufferGeometry>
                <pointsMaterial
                    size={1.0}
                    color="#8700f5"
                    sizeAttenuation={true}
                    map={circleTexture}
                    transparent={true}
                    opacity={0.8}
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

    const [neighborsId, setNeighborsId] = useState<number[]>([]);

    const [panelData, setPanelData] = useState<{ phrases: any[], models: any[], neighbors: any[] } | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

    const [sourceTextData, setSourceTextData] = useState<SourceTextData | null>(null);
    const [isLoadingText, setIsLoadingText] = useState<boolean>(false);
    
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
        setIsLoadingText(true);
        setPanelData(null);
        setNeighborsId([]);

        Promise.all([
            fetchPointDetails(point.id).catch(err => {
                console.error("Error fetching details:", err);
                return null;
            }),
            fetchSourceTextData(point.id).catch(err => {
                console.error("Error fetching text:", err);
                return null;
            })
        ]).then(([detailsData, textData]) => {
            if (detailsData) {
                setPanelData(detailsData);
                if (detailsData.neighbors && Array.isArray(detailsData.neighbors)) {
                    const ids = detailsData.neighbors.map((n: any) => {
                        const match = n.name.match(/Neighbor\s*:\s*(\d+)/i);
                        return match ? parseInt(match[1], 10) : null;
                    }).filter((id: any) => id !== null) as number[];
                    setNeighborsId(ids);
                }
            }
            setIsLoadingDetails(false);

            if (textData) {
                setSourceTextData(textData);
            }
            setIsLoadingText(false);
        });
    };

    const closeAllPanels = () => {
        setSelectedPoint(null);
        setPanelData(null);
        setSourceTextData(null);
        setNeighborsId([]);
    };

    return (
    <div className="galaxy-canvas-wrapper">
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

        <Canvas 
          camera={{ position: [10, 10, 40], fov: 70 }}
          raycaster={{
            params: {
              Points: { threshold: 0.8 },
              Mesh: {},
              Line: { threshold: 1 },
              LOD: {},
              Sprite: {}
            }
          }}
        >
          <ambientLight intensity={1.5} />
          
          <GalaxyPointsCloud 
              points={points} 
              topics={topics} 
              selectedPoint={selectedPoint}
              neighborsId={neighborsId}
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

      {/* right pannel*/}
      {selectedPoint && (
        <div className='details-panel-container'>
          {isLoadingDetails ? (
            <PointDetailsPanelSkeleton onClose={closeAllPanels} />
          ) : (
            panelData && (
              <PointDetailsPanel 
                onClose={closeAllPanels}
                activeColor={panelColor}
                phrases={panelData.phrases}
                models={panelData.models}
                neighbors={panelData.neighbors}
              />
            )
          )}
        </div>
      )}
      
      {/* left pannel */}
      {selectedPoint && (
        <div className="details-panel-container-2"> 
          {isLoadingText ? (
            <SourceTextPanelSkeleton onClose={closeAllPanels} />
          ) : (
            sourceTextData && (
              <SourceTextPanel
                onClose={closeAllPanels}
                selectedPointId={selectedPoint.id}
                model={selectedPoint.model}
                topic={selectedPoint.topic}
                original_prompt={sourceTextData.original_prompt}
                full_response={sourceTextData.full_response}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}