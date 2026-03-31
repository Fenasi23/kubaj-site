import React, { useMemo, useRef } from 'react';
import { useFrame } from 'react-three-fiber';
import * as THREE from 'three';

const PointCloudViewer = ({ data }) => {
  const pointsRef = useRef();

  const { geometry, center } = useMemo(() => {
    if (!data || !data.positions) return { geometry: null, center: [0, 0, 0] };

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(data.positions);
    const colors = new Float32Array(data.colors || []);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Eğer renk verisi yoksa kot (Z) değerine göre renklendir
    if (colors.length === 0) {
      const zColors = new Float32Array(positions.length);
      let minZ = Infinity, maxZ = -Infinity;
      
      for (let i = 2; i < positions.length; i += 3) {
        const z = positions[i];
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }

      const range = maxZ - minZ || 1;
      for (let i = 0; i < positions.length; i += 3) {
        const z = positions[i + 2];
        const normalizedZ = (z - minZ) / range;
        
        // Kot Bazlı Renk Geçişi (Mavi -> Yeşil -> Sarı -> Kırmızı)
        zColors[i] = normalizedZ; // R
        zColors[i + 1] = 1 - normalizedZ; // G
        zColors[i + 2] = 0.5; // B
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(zColors, 3));
    } else {
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }

    geometry.computeBoundingSphere();
    const center = geometry.boundingSphere.center;

    return { geometry, center: [center.x, center.y, center.z] };
  }, [data]);

  useFrame(() => {
    // Hafif dönüş efekti istenirse buraya eklenebilir
  });

  if (!geometry) return null;

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial 
        size={0.05} 
        vertexColors 
        transparent 
        opacity={0.8} 
        sizeAttenuation={true}
      />
    </points>
  );
};

export default PointCloudViewer;
