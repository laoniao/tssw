<template>
  <div ref="hostRef" class="robot-3d" aria-hidden="true">
    <canvas ref="canvasRef" class="robot-3d__canvas" />
    <div v-if="loadError" class="robot-3d__error">
      3D 模型未加载：请确认已包含 public/models/Robot3D.glb
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { useMounted } from '@vueuse/core'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/**
 * 模型放在 public/models，打包/发给别人时一定会带上。
 * 使用 BASE_URL，兼容子路径部署；加版本参数避免旧缓存。
 */
const MODEL_URL = `${import.meta.env.BASE_URL}models/Robot3D.glb?v=20260804`
const DRACO_PATH = `${import.meta.env.BASE_URL}draco/`

const hostRef = ref(null)
const canvasRef = ref(null)
const loadError = ref(false)
const isMounted = useMounted()

let renderer
let scene
let camera
let robot
let mixer
let keyLight
let animId = 0
let resizeObserver
let pmrem
let envMap
let dracoLoader
let disposed = false
let robotBaseY = 0

const disposeObject = (obj) => {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose()
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      mats.forEach((m) => {
        m.map?.dispose?.()
        m.normalMap?.dispose?.()
        m.emissiveMap?.dispose?.()
        m.metalnessMap?.dispose?.()
        m.roughnessMap?.dispose?.()
        m.aoMap?.dispose?.()
        m.dispose?.()
      })
    }
  })
}

/** 模型居中、归一化尺寸 */
const normalizeModel = (object) => {
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())

  object.position.sub(center)

  const maxDim = Math.max(size.x, size.y, size.z) || 1
  object.scale.setScalar(1 / maxDim)

  const fitted = new THREE.Box3().setFromObject(object)
  object.position.y -= fitted.min.y
  robotBaseY = object.position.y
}

/** 按画布比例与 FOV 自动取景 */
const frameCamera = (object, padding = 1.18) => {
  if (!camera || !object) return

  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())

  const fov = THREE.MathUtils.degToRad(camera.fov)
  const fitHeight = size.y / (2 * Math.tan(fov / 2))
  const fitWidth = size.x / (2 * Math.tan(fov / 2) * camera.aspect)
  const distance = Math.max(fitHeight, fitWidth) * padding

  camera.position.set(center.x + distance * 0.02, center.y + size.y * 0.02, distance)
  camera.near = Math.max(0.01, distance / 100)
  camera.far = Math.max(100, distance * 20)
  camera.lookAt(center.x, center.y, center.z)
  camera.updateProjectionMatrix()
}

const setSize = () => {
  const host = hostRef.value
  const canvas = canvasRef.value
  if (!host || !renderer || !camera || !canvas) return
  const w = host.clientWidth || 280
  const h = host.clientHeight || 340
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  renderer.setPixelRatio(dpr)
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  if (robot) {
    const ry = robot.rotation.y
    const py = robot.position.y
    robot.rotation.y = 0
    robot.position.y = robotBaseY
    frameCamera(robot)
    robot.rotation.y = ry
    robot.position.y = py
  }
}

const loadRobot = () =>
  new Promise((resolve, reject) => {
    dracoLoader = new DRACOLoader()
    // 使用项目内 public/draco，发给别人离线也能解码
    dracoLoader.setDecoderPath(DRACO_PATH)

    const loader = new GLTFLoader()
    loader.setDRACOLoader(dracoLoader)
    loader.load(MODEL_URL, resolve, undefined, reject)
  })

const initScene = async () => {
  const canvas = canvasRef.value
  if (!canvas) return
  disposed = false
  loadError.value = false

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(28, 280 / 340, 0.1, 100)
  camera.position.set(0, 0.55, 2.8)
  camera.lookAt(0, 0.5, 0)

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  pmrem = new THREE.PMREMGenerator(renderer)
  envMap = pmrem.fromScene(new RoomEnvironment(), 0.08).texture
  scene.environment = envMap

  const ambient = new THREE.AmbientLight(0xffffff, 0.75)
  const hemi = new THREE.HemisphereLight(0xffffff, 0xe8eef4, 0.5)
  keyLight = new THREE.DirectionalLight(0xffffff, 0.55)
  keyLight.position.set(2.2, 4.5, 3.5)
  const rimLight = new THREE.DirectionalLight(0xdbeafe, 0.35)
  rimLight.position.set(-2.5, 2.8, -2)
  const fill = new THREE.PointLight(0xffffff, 0.4, 18)
  fill.position.set(-1.8, 1.5, 3.2)
  const ringL = new THREE.PointLight(0xf0f9ff, 0.35, 14)
  ringL.position.set(1.6, 2.0, 2.8)
  scene.add(ambient, hemi, keyLight, rimLight, fill, ringL)

  setSize()

  if (typeof ResizeObserver !== 'undefined' && hostRef.value) {
    resizeObserver = new ResizeObserver(() => setSize())
    resizeObserver.observe(hostRef.value)
  }
  window.addEventListener('resize', setSize)

  try {
    const gltf = await loadRobot()
    if (disposed) {
      disposeObject(gltf.scene)
      return
    }

    robot = gltf.scene
    robot.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false
        child.receiveShadow = false
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          mats.forEach((m) => {
            if ('envMapIntensity' in m) m.envMapIntensity = 0.65
            m.needsUpdate = true
          })
        }
      }
    })

    normalizeModel(robot)
    scene.add(robot)

    if (gltf.animations?.length) {
      mixer = new THREE.AnimationMixer(robot)
      gltf.animations.forEach((clip) => {
        mixer.clipAction(clip).play()
      })
    }

    setSize()
    frameCamera(robot)
  } catch (err) {
    console.error('机器人模型加载失败:', MODEL_URL, err)
    loadError.value = true
  }

  const clock = new THREE.Clock()
  const animate = () => {
    animId = requestAnimationFrame(animate)
    const dt = clock.getDelta()
    const t = clock.elapsedTime

    if (mixer) mixer.update(dt)

    if (robot) {
      if (!mixer) {
        robot.rotation.y = Math.sin(t * 0.32) * 0.28
      } else {
        robot.rotation.y = Math.sin(t * 0.2) * 0.1
      }
      robot.position.y = robotBaseY + Math.sin(t * 1.2) * 0.012
    }

    if (keyLight) keyLight.intensity = 0.5 + Math.sin(t * 1.2) * 0.06

    renderer.render(scene, camera)
  }
  animate()
}

const teardown = () => {
  disposed = true
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', setSize)
  resizeObserver?.disconnect()
  resizeObserver = undefined
  mixer?.stopAllAction()
  mixer = undefined
  if (robot) {
    disposeObject(robot)
    scene?.remove(robot)
  }
  envMap?.dispose?.()
  pmrem?.dispose?.()
  dracoLoader?.dispose?.()
  renderer?.dispose()
  renderer = undefined
  scene = undefined
  camera = undefined
  robot = undefined
  keyLight = undefined
  pmrem = undefined
  envMap = undefined
  dracoLoader = undefined
}

watch(
  isMounted,
  (ready) => {
    if (ready) initScene()
  },
  { immediate: true },
)

onBeforeUnmount(teardown)
</script>

<style scoped lang="scss">
.robot-3d {
  width: min(280px, 100%);
  height: 340px;
  position: relative;
  margin: 0 auto $spacing-md;
  filter: drop-shadow(0 14px 28px rgba(15, 23, 42, 0.28));
}

.robot-3d__canvas {
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}

.robot-3d__error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(15, 23, 42, 0.35);
  border-radius: 12px;
}

@media (max-width: $breakpoint-md) {
  .robot-3d {
    width: 200px;
    height: 240px;
    margin-bottom: $spacing-sm;
  }
}
</style>
