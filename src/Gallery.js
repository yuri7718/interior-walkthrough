import { useLoader } from "@react-three/fiber"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { useEffect } from "react";

export function Gallery() {  
  
  const gltf = useLoader(
    GLTFLoader,
    process.env.PUBLIC_URL + "/models/DJI_20251230163815_0158_D_stabilized.glb"
  );
  
  useEffect(() => {
    // gltf.scene.scale.set(0.05,0.05,0.05);
    gltf.scene.position.set(0, 1.5,0);
    // gltf.scene.rotation.set(0, Math.PI * 0.5, 0);
    console.log(gltf.scene.position);
    // gltf.scene.traverse((object) => {
    //   if (object instanceof Mesh) {
    //     object.castShadow = true;
    //     object.receiveShadow = true;
    //     object.material.envMapIntensity = 20;
    //   }
    // });
  }, [gltf]);

  return <primitive object={gltf.scene} />;
}