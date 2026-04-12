import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { ColorInterpolator, MarbleStates, StateColors } from '../app/marble/utils/colorUtils.js';
import { MarbleAnimator, AnimationPerformanceMonitor } from '../app/marble/utils/animationUtils.js';

const injectStyles = (id, css) => {
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }
};

const CSS = `
.marble-btn-container {
  display: inline-block;
  width: 44px;
  height: 44px;
  cursor: pointer;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
}
.marble-inner {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 50%;
  overflow: hidden;
  pointer-events: auto;
  z-index: 10;
}
.marble-canvas {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 50%;
  pointer-events: none;
}
.marble-fallback {
  width: 100%;
  height: 100%;
  border: none;
  background: #6b7280;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.marble-fallback.listening { background: #10b981; }
.marble-fallback.stopping { background: #ef4444; }
.marble-fallback.tts { background: #7344f0; }
`;

function checkWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}

export default function MarbleListenButton({ state = 'idle', disabled = false, ttsEnabled: ttsEnabledProp, onMarbleClick, onMarbleTTSToggle }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const marbleRef = useRef(null);
  const materialRef = useRef(null);
  const marbleUniformsRef = useRef(null);
  const animatorRef = useRef(null);
  const colorInterpolatorRef = useRef(null);
  const performanceMonitorRef = useRef(null);
  const animationIdRef = useRef(null);
  const clickTimeoutRef = useRef(null);
  const clickCountRef = useRef(0);
  const ttsEnabledRef = useRef(
    ttsEnabledProp !== undefined ? ttsEnabledProp : (localStorage.getItem('claire_tts_enabled') === 'true')
  );
  const stateRef = useRef(state);
  const isWebGLSupported = checkWebGLSupport();

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const getStateHSL = (s) => {
    const stateHSL = {
      [MarbleStates.IDLE]: { h: 22 / 360, s: 1.0, l: 0.5 },
      [MarbleStates.LISTENING]: { h: 142 / 360, s: 0.64, l: 0.5 },
      [MarbleStates.STOPPING]: { h: 0 / 360, s: 0.69, l: 0.5 },
      [MarbleStates.TTS]: { h: 250 / 360, s: 0.7, l: 0.55 },
    };
    return stateHSL[s] || stateHSL[MarbleStates.IDLE];
  };

  const createMarbleMaterial = useCallback(async () => {
    let heightMap, displacementMap;
    try {
      const textureLoader = new THREE.TextureLoader();
      heightMap = await new Promise((resolve, reject) => {
        textureLoader.load('./../assets/noise.jpg', resolve, undefined, reject);
      });
      displacementMap = await new Promise((resolve, reject) => {
        textureLoader.load('./../assets/noise3D.jpg', resolve, undefined, reject);
      });
      heightMap.minFilter = displacementMap.minFilter = THREE.NearestFilter;
      displacementMap.wrapS = displacementMap.wrapT = THREE.RepeatWrapping;
    } catch (error) {
      console.warn('[MarbleListenButton] Failed to load textures, using fallback');
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d');
      const imageData = ctx.createImageData(256, 256);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const noise = Math.random() * 255;
        imageData.data[i] = noise;
        imageData.data[i + 1] = noise;
        imageData.data[i + 2] = noise;
        imageData.data[i + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
      heightMap = new THREE.CanvasTexture(canvas);
      displacementMap = new THREE.CanvasTexture(canvas);
      displacementMap.wrapS = displacementMap.wrapT = THREE.RepeatWrapping;
    }

    const marbleUniforms = {
      time: { value: 0.0 },
      colorA: { value: new THREE.Color(0, 0, 0) },
      colorB: { value: new THREE.Color(0xff5f00) },
      heightMap: { value: heightMap },
      displacementMap: { value: displacementMap },
      iterations: { value: 43 },
      depth: { value: 0.90 },
      smoothing: { value: 0.09 },
      displacement: { value: 0.039 },
    };

    const material = new THREE.MeshStandardMaterial({
      color: StateColors ? StateColors[state] : 0xff5f00,
      transparent: true,
      opacity: 0.9,
      roughness: 0.09,
      metalness: 0.1,
    });

    material.onBeforeCompile = (shader) => {
      shader.uniforms = { ...shader.uniforms, ...marbleUniforms };
      shader.vertexShader = `varying vec3 v_pos;\nvarying vec3 v_dir;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(/void main\(\) {/, (match) => match + `\nv_dir = position - cameraPosition;\nv_pos = position;\n`);
      shader.fragmentShader = `
        #define FLIP vec2(1., -1.)
        uniform vec3 colorA;
        uniform vec3 colorB;
        uniform sampler2D heightMap;
        uniform sampler2D displacementMap;
        uniform int iterations;
        uniform float depth;
        uniform float smoothing;
        uniform float displacement;
        uniform float time;
        varying vec3 v_pos;
        varying vec3 v_dir;
      ` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(/void main\(\) {/, (match) => `
        vec3 displacePoint(vec3 p, float strength) {
          vec2 uv = equirectUv(normalize(p));
          vec2 scroll = vec2(time, 0.);
          vec3 displacementA = texture2D(displacementMap, uv + scroll).rgb;
          vec3 displacementB = texture2D(displacementMap, uv * FLIP - scroll).rgb;
          displacementA -= 0.5;
          displacementB -= 0.5;
          return p + strength * (displacementA + displacementB);
        }
        vec3 marchMarble(vec3 rayOrigin, vec3 rayDir) {
          float perIteration = 1. / float(iterations);
          vec3 deltaRay = rayDir * perIteration * depth;
          vec3 p = rayOrigin - (rayDir * depth * 0.5);
          float totalVolume = 0.;
          for (int i=0; i<48; ++i) {
            if (i >= iterations) break;
            vec3 displaced = displacePoint(p, displacement);
            vec2 uv = equirectUv(normalize(displaced));
            float heightMapVal = texture2D(heightMap, uv).r;
            float distanceFromCenter = length(p);
            float centerWeight = 1.0 - smoothstep(0.0, 0.8, distanceFromCenter);
            float cutoff = 1. - float(i) * perIteration;
            float slice = smoothstep(cutoff, cutoff + smoothing, heightMapVal);
            slice *= (1.0 + centerWeight * 2.0);
            totalVolume += slice * perIteration;
            p += deltaRay;
          }
          return mix(colorA, colorB, totalVolume);
        }
      ` + match);
      shader.fragmentShader = shader.fragmentShader.replace(/vec4 diffuseColor.*;/, `
        vec3 rayDir = normalize(v_dir);
        vec3 rayOrigin = v_pos;
        vec3 rgb = marchMarble(rayOrigin, rayDir);
        vec4 diffuseColor = vec4(rgb, 1.);
      `);
    };

    marbleUniformsRef.current = marbleUniforms;
    return material;
  }, []);

  useEffect(() => {
    injectStyles('marble-listen-btn-styles', CSS);
  }, []);

  useEffect(() => {
    if (!isWebGLSupported) return;

    let cancelled = false;

    const init = async () => {
      try {
        colorInterpolatorRef.current = new ColorInterpolator(MarbleStates.IDLE);
        animatorRef.current = new MarbleAnimator();
        performanceMonitorRef.current = new AnimationPerformanceMonitor();

        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        camera.position.z = 2;
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setSize(44, 44);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x000000, 0);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.outputEncoding = THREE.sRGBEncoding;
        rendererRef.current = renderer;

        const geometry = new THREE.SphereGeometry(1.2, 64, 64);
        const material = await createMarbleMaterial();
        if (cancelled) return;

        materialRef.current = material;
        const marble = new THREE.Mesh(geometry, material);
        marbleRef.current = marble;
        scene.add(marble);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(-1, -1, 1);
        scene.add(pointLight);

        animatorRef.current.start();

        const animate = () => {
          animationIdRef.current = requestAnimationFrame(animate);
          if (marbleRef.current) {
            if (marbleUniformsRef.current) {
              const hsl = getStateHSL(stateRef.current);
              marbleUniformsRef.current.colorB.value.setHSL(hsl.h, hsl.s, hsl.l);
              marbleUniformsRef.current.colorB.value.multiplyScalar(1.5);
            }
            animatorRef.current.getRotationForState(stateRef.current, marbleRef.current);
          }
          performanceMonitorRef.current?.update();
          renderer.render(scene, camera);
        };
        animate();
      } catch (error) {
        console.error('Failed to initialize marble:', error);
      }
    };

    init();

    const handleResize = () => {
      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.setSize(44, 44);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      if (animatorRef.current) animatorRef.current.destroy();
      if (rendererRef.current) rendererRef.current.dispose();
      if (marbleRef.current?.geometry) marbleRef.current.geometry.dispose();
      if (materialRef.current) materialRef.current.dispose();
    };
  }, []);

  useEffect(() => {
    if (colorInterpolatorRef.current) colorInterpolatorRef.current.setTargetState(state);
    if (marbleRef.current && animatorRef.current) {
      animatorRef.current.createStateTransition(marbleRef.current, stateRef.current, state);
      colorInterpolatorRef.current?.createPulseEffect(800);
    }
  }, [state]);

  const performSingleClick = useCallback(() => {
    if (marbleRef.current && animatorRef.current) {
      animatorRef.current.createClickRipple(marbleRef.current);
    }
    if (onMarbleClick) onMarbleClick({ state: stateRef.current });
  }, [onMarbleClick]);

  const handleDoubleClick = useCallback(() => {
    const originalState = stateRef.current;
    if (marbleRef.current && animatorRef.current) {
      animatorRef.current.createClickRipple(marbleRef.current);
      setTimeout(() => {
        if (marbleRef.current && animatorRef.current) {
          animatorRef.current.createClickRipple(marbleRef.current);
        }
      }, 100);
    }

    ttsEnabledRef.current = !ttsEnabledRef.current;
    try {
      localStorage.setItem('claire_tts_enabled', ttsEnabledRef.current.toString());
    } catch (e) {}

    if (onMarbleTTSToggle) {
      onMarbleTTSToggle({ ttsEnabled: ttsEnabledRef.current, originalState });
    }

    if (originalState === 'idle' && ttsEnabledRef.current) {
      setTimeout(() => performSingleClick(), 100);
    }
  }, [onMarbleTTSToggle, performSingleClick]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    clickCountRef.current += 1;
    if (clickCountRef.current === 1) {
      clickTimeoutRef.current = setTimeout(() => {
        performSingleClick();
        clickCountRef.current = 0;
      }, 300);
    } else if (clickCountRef.current === 2) {
      clearTimeout(clickTimeoutRef.current);
      handleDoubleClick();
      clickCountRef.current = 0;
    }
  }, [disabled, performSingleClick, handleDoubleClick]);

  const handleMouseEnter = useCallback(() => {
    if (marbleRef.current && animatorRef.current) {
      animatorRef.current.createHoverEffect(marbleRef.current, true);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (marbleRef.current && animatorRef.current) {
      animatorRef.current.createHoverEffect(marbleRef.current, false);
    }
  }, []);

  if (!isWebGLSupported) {
    return (
      <div className="marble-btn-container" onClick={handleClick}>
        <button className={`marble-fallback ${state}`} disabled={disabled}>
          {state === 'listening' ? '🎤' : state === 'stopping' ? '⏹' : '🎙'}
        </button>
      </div>
    );
  }

  return (
    <div
      className="marble-btn-container"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={containerRef}
      title="Click to listen, double-click to toggle agent voice"
    >
      <div className="marble-inner">
        <canvas className="marble-canvas" ref={canvasRef} />
      </div>
    </div>
  );
}
