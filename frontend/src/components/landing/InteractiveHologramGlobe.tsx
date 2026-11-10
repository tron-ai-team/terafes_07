import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface InteractiveHologramGlobeProps {
  className?: string;
  mousePosition?: { x: number; y: number };
}

export const InteractiveHologramGlobe: React.FC<InteractiveHologramGlobeProps> = ({
  className = "",
  mousePosition = { x: 0, y: 0 },
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef = useRef<number>(0);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const ringRef = useRef<THREE.Group | null>(null);
  const isVisibleRef = useRef<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    // 1. Three.js Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.3);

    // 2. WebGL Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. Globe Master Group
    const globeGroup = new THREE.Group();
    globeGroupRef.current = globeGroup;
    scene.add(globeGroup);

    // ── A. Semi-transparent Holographic Core Sphere ──
    const sphereGeo = new THREE.SphereGeometry(1.0, 36, 36);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x0077ff,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const coreSphere = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(coreSphere);

    // ── B. Outer Atmospheric Glow Halo Sprite ──
    const haloCanvas = document.createElement("canvas");
    haloCanvas.width = 256;
    haloCanvas.height = 256;
    const hCtx = haloCanvas.getContext("2d");
    if (hCtx) {
      const grad = hCtx.createRadialGradient(128, 128, 60, 128, 128, 128);
      grad.addColorStop(0, "rgba(0, 229, 255, 0.45)");
      grad.addColorStop(0.5, "rgba(0, 140, 255, 0.2)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      hCtx.fillStyle = grad;
      hCtx.fillRect(0, 0, 256, 256);
    }
    const haloTexture = new THREE.CanvasTexture(haloCanvas);
    const haloMat = new THREE.SpriteMaterial({
      map: haloTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.85,
    });
    const haloSprite = new THREE.Sprite(haloMat);
    haloSprite.scale.set(2.8, 2.8, 1);
    globeGroup.add(haloSprite);

    // ── C. Holographic Latitude & Longitude Rings Wireframe ──
    const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(1.02, 22, 16));
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const wireLines = new THREE.LineSegments(wireGeo, wireMat);
    globeGroup.add(wireLines);

    // ── D. Inner Fine Hexagonal / Grid Layer ──
    const innerWireGeo = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.98, 2));
    const innerWireMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const innerWire = new THREE.LineSegments(innerWireGeo, innerWireMat);
    globeGroup.add(innerWire);

    // ── E. Luminous Surface Hologram Particle Nodes ──
    const particleCount = 180;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 1.03;
      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x67e8f9,
      size: 0.05,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const particlePoints = new THREE.Points(particleGeo, particleMat);
    globeGroup.add(particlePoints);

    // ── F. Orbiting Saturn-like Electric Cyan Energy Ring ──
    const ringGroup = new THREE.Group();
    ringRef.current = ringGroup;
    globeGroup.add(ringGroup);

    const ringGeo = new THREE.RingGeometry(1.24, 1.36, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI * 0.42;
    ringGroup.add(ring);

    // Outer thin accent orbital line
    const outerOrbLineGeo = new THREE.RingGeometry(1.44, 1.46, 64);
    const outerOrbLineMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const outerOrbLine = new THREE.Mesh(outerOrbLineGeo, outerOrbLineMat);
    outerOrbLine.rotation.x = Math.PI * 0.42;
    ringGroup.add(outerOrbLine);

    // ── G. Ultra-Brilliant 3D Holographic "AI" Core Typography ──
    const textCanvas = document.createElement("canvas");
    textCanvas.width = 512;
    textCanvas.height = 512;
    const ctx = textCanvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, 512, 512);

      // Multi-layer glowing text for high-end cinematic neon illumination
      ctx.font = "900 210px 'Segoe UI', system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Outer wide cyan glow
      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = 48;
      ctx.fillStyle = "rgba(0, 229, 255, 0.9)";
      ctx.fillText("AI", 256, 256);

      // Middle royal blue glow
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 24;
      ctx.fillStyle = "#ffffff";
      ctx.fillText("AI", 256, 256);

      // Inner crisp white core
      ctx.shadowBlur = 8;
      ctx.fillStyle = "#ffffff";
      ctx.fillText("AI", 256, 256);
    }
    const aiTexture = new THREE.CanvasTexture(textCanvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: aiTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 1.0,
    });
    const aiSprite = new THREE.Sprite(spriteMat);
    aiSprite.scale.set(1.15, 1.15, 1);
    globeGroup.add(aiSprite);

    // ── H. Projector Light Beam Cone (Connecting Palm to Globe) ──
    const coneGeo = new THREE.CylinderGeometry(0.55, 0.05, 1.35, 24, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const projectorBeam = new THREE.Mesh(coneGeo, coneMat);
    projectorBeam.position.set(0, -1.0, 0);
    globeGroup.add(projectorBeam);

    // Palm emitter beacon dot
    const emitterGeo = new THREE.CircleGeometry(0.12, 24);
    const emitterMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const emitterDot = new THREE.Mesh(emitterGeo, emitterMat);
    emitterDot.position.set(0, -1.65, 0);
    emitterDot.rotation.x = Math.PI * 0.5;
    globeGroup.add(emitterDot);

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w && h) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
    window.addEventListener("resize", handleResize);

    // Visibility Handler
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // 4. Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      if (!isVisibleRef.current) return;

      const elapsed = clock.getElapsedTime();

      if (!reducedMotion) {
        // Continuous smooth auto-rotation
        globeGroup.rotation.y += 0.0075;

        // Pointer-responsive rotation & tilt
        const targetRotX = mousePosition.y * 0.3;
        const targetRotZ = -mousePosition.x * 0.2;
        globeGroup.rotation.x += (targetRotX - globeGroup.rotation.x) * 0.06;
        globeGroup.rotation.z += (targetRotZ - globeGroup.rotation.z) * 0.06;

        // Subtle floating bobbing movement
        globeGroup.position.y = Math.sin(elapsed * 1.8) * 0.07;

        // Soft holographic pulse
        const pulse = 1 + Math.sin(elapsed * 2.4) * 0.024;
        coreSphere.scale.set(pulse, pulse, pulse);

        // Counter-rotation of orbital ring
        if (ringRef.current) {
          ringRef.current.rotation.z += 0.005;
        }

        // Inner grid counter-rotation
        innerWire.rotation.y -= 0.004;

        // Subtle pulsing of projector beam
        coneMat.opacity = 0.32 + Math.sin(elapsed * 5) * 0.08;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 5. Cleanup
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);

      sphereGeo.dispose();
      sphereMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      innerWireGeo.dispose();
      innerWireMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      outerOrbLineGeo.dispose();
      outerOrbLineMat.dispose();
      coneGeo.dispose();
      coneMat.dispose();
      emitterGeo.dispose();
      emitterMat.dispose();
      aiTexture.dispose();
      spriteMat.dispose();
      haloTexture.dispose();
      haloMat.dispose();

      renderer.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (!globeGroupRef.current || reducedMotion) return;
    const targetRotX = mousePosition.y * 0.3;
    const targetRotZ = -mousePosition.x * 0.2;
    globeGroupRef.current.rotation.x += (targetRotX - globeGroupRef.current.rotation.x) * 0.06;
    globeGroupRef.current.rotation.z += (targetRotZ - globeGroupRef.current.rotation.z) * 0.06;
  }, [mousePosition, reducedMotion]);

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
};

export default InteractiveHologramGlobe;
