// Station models (.glb) load after the world is on screen, not during boot.
//
// Stations call loadModel() while they are built; the requests wait in a
// queue. setup() starts them once the first frames have been drawn, so the
// ~700 KB of models no longer competes with the world's code during boot
// and the island appears sooner. GLTFLoader itself (112 KB) is imported
// only then.
//
// Each model is added to its station when it arrives. The sun's shadow map
// is static, so it is redrawn once after each arrival to include the model.
const queue = [];
let started = false;

export function loadModel(url, onLoad) {
  queue.push({ url, onLoad });
}

// Two downloads at a time. The six models are small and all visible from
// the opening view, so they load in the order the stations are built.
const PARALLEL = 2;

export function startModels(stage) {
  if (started) return;
  started = true;
  import('three/addons/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
    const loader = new GLTFLoader();
    const next = () => {
      const job = queue.shift();
      if (!job) return;
      loader.load(job.url, gltf => {
        job.onLoad(gltf);
        stage.renderer.shadowMap.needsUpdate = true;
        next();
      }, undefined, err => { console.warn(`Model ${job.url} did not load`, err); next(); });
    };
    for (let i = 0; i < PARALLEL; i++) next();
  });
}
