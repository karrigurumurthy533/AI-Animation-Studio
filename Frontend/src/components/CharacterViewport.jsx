import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

function CharacterModel() {
  return (
    <group position={[0, -0.1, 0]}>
      <mesh position={[0, 1.95, 0]} castShadow>
        <sphereGeometry args={[0.31, 32, 32]} />
        <meshStandardMaterial color="#9c7668" roughness={0.62} />
      </mesh>
      <mesh position={[0, 1.58, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.16, 0.35, 20]} />
        <meshStandardMaterial color="#51352e" roughness={0.78} />
      </mesh>
      <mesh position={[0, 1.02, 0]} castShadow>
        <capsuleGeometry args={[0.39, 0.66, 8, 20]} />
        <meshStandardMaterial
          color="#5c3931"
          roughness={0.72}
          metalness={0.08}
        />
      </mesh>
      <mesh position={[0, 1.2, 0.365]}>
        <boxGeometry args={[0.035, 0.31, 0.018]} />
        <meshStandardMaterial
          color="#e44839"
          emissive="#64140f"
          emissiveIntensity={0.5}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            position={[side * 0.54, 1.13, 0]}
            rotation={[0, 0, side * -0.13]}
            castShadow
          >
            <capsuleGeometry args={[0.13, 0.59, 6, 14]} />
            <meshStandardMaterial color="#796052" roughness={0.7} />
          </mesh>
          <mesh
            position={[side * 0.25, 0.28, 0]}
            rotation={[0, 0, side * 0.025]}
            castShadow
          >
            <capsuleGeometry args={[0.17, 0.92, 7, 16]} />
            <meshStandardMaterial color="#322723" roughness={0.79} />
          </mesh>
          <mesh position={[side * 0.25, -0.29, 0.11]} castShadow>
            <boxGeometry args={[0.27, 0.13, 0.47]} />
            <meshStandardMaterial color="#1c1716" roughness={0.62} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function GeneratedModel({ url }) {
  const gltf = useGLTF(url);
  return <primitive object={gltf.scene} />;
}

export default function CharacterViewport({ modelUrl }) {
  return (
    <div
      className="character-viewport-3d"
      aria-label="Interactive 3D character preview"
    >
      <Canvas
        camera={{ position: [3.8, 2.5, 5.3], fov: 35 }}
        shadows
        dpr={[1, 1.6]}
      >
        <color attach="background" args={["#11100f"]} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[4, 6, 5]} intensity={2.2} castShadow />
        <pointLight
          position={[-3, 1, 1]}
          intensity={18}
          color="#e84b3e"
          distance={8}
        />
        {modelUrl ? <GeneratedModel url={modelUrl} /> : <CharacterModel />}
        <OrbitControls
          enablePan={false}
          minDistance={3.4}
          maxDistance={8}
          minPolarAngle={0.65}
          maxPolarAngle={2.25}
        />
      </Canvas>
      <span>DRAG TO ORBIT | SCROLL TO ZOOM</span>
    </div>
  );
}
