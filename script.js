/* ===========================
   EDIT THIS: add your 10 tournaments here.
   For each tournament set:
   - id: unique id
   - name: title displayed
   - time: display time text
   - fee: display entry fee
   - slots: display slots
   - sheet: Google Form OR Google Sheet public link (open link)
   NOTE: If you want to use a Google Form, paste the form URL.
   If you prefer a Sheet (responses), paste its view link / OpenSheet link.
   =========================== */

const TOURNAMENTS = [
  { id:"T1", name:"Free Fire Clash #1", time:"4:00 PM", fee:"₹50", slots:50, sheet:"https://docs.google.com/forms/d/EXAMPLE1" },
  { id:"T2", name:"Free Fire Clash #2", time:"4:30 PM", fee:"₹50", slots:50, sheet:"https://docs.google.com/forms/d/EXAMPLE2" },
  { id:"T3", name:"Free Fire Clash #3", time:"5:00 PM", fee:"₹50", slots:50, sheet:"https://docs.google.com/forms/d/EXAMPLE3" },
  { id:"T4", name:"Free Fire Clash #4", time:"5:30 PM", fee:"₹50", slots:50, sheet:"https://docs.google.com/forms/d/EXAMPLE4" },
  { id:"T5", name:"Free Fire Clash #5", time:"6:00 PM", fee:"₹50", slots:50, sheet:"https://docs.google.com/forms/d/EXAMPLE5" },
  { id:"T6", name:"Free Fire Clash #6", time:"6:30 PM", fee:"₹50", slots:50, sheet:"https://docs.google.com/forms/d/EXAMPLE6" },
  { id:"T7", name:"Free Fire Clash #7", time:"7:00 PM", fee:"₹50", slots:50, sheet:"https://docs.google.com/forms/d/EXAMPLE7" },
  { id:"T8", name:"Free Fire Clash #8", time:"7:30 PM", fee:"₹50", slots:50, sheet:"https://docs.google.com/forms/d/EXAMPLE8" },
  { id:"T9", name:"Free Fire Clash #9", time:"8:00 PM", fee:"₹50", slots:50, sheet:"https://docs.google.com/forms/d/EXAMPLE9" },
  { id:"T10", name:"Free Fire Clash #10", time:"8:30 PM", fee:"₹50", slots:50, sheet:"https://docs.google.com/forms/d/EXAMPLE10" }
];

/* Render tournament cards */
const grid = document.getElementById('grid');
const countInfo = document.getElementById('countInfo');
function render() {
  grid.innerHTML = '';
  countInfo.textContent = `${TOURNAMENTS.length} listed`;
  TOURNAMENTS.forEach((t, idx) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="head">
        <div>
          <h4>${t.name}</h4>
          <div class="meta">${t.time} • Entry ${t.fee} • Slots ${t.slots}</div>
        </div>
        <div style="text-align:right;font-size:12px;color:var(--muted)">#${idx+1}</div>
      </div>
      <div style="margin-top:10px;color:var(--muted);font-size:13px">Quick join opens registration form / sheet.</div>
      <div class="footer">
        <div>
          <button class="btn" onclick="openLink('${t.sheet}')">Join</button>
          <button class="btn ghost" onclick="openLink('${t.sheet}')">Open</button>
        </div>
        <div style="font-size:12px;color:var(--muted)">Starts soon</div>
      </div>
    `;
    grid.appendChild(card);
    setTimeout(()=>card.classList.add('show'), idx*80);
  });
}
function openLink(u){ if(!u){ alert('Join link missing'); return;} window.open(u, '_blank', 'noopener'); }
render();

/* =========================
   Minimal 3D background using three.js
   - rotating trophy-like object (primitives)
   - particle field
   ========================= */
const canvas = document.getElementById('bgCanvas');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020617, 0.06);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 3.2);

const hemi = new THREE.HemisphereLight(0x7fb3d5, 0x081826, 0.8); scene.add(hemi);
const dir = new THREE.DirectionalLight(0x98e6ff, 1.2); dir.position.set(5,10,5); scene.add(dir);

// base disc
const base = new THREE.Mesh(
  new THREE.CylinderGeometry(2.6,2.8,0.2,64),
  new THREE.MeshStandardMaterial({color:0x071725, metalness:0.3, roughness:0.9})
);
base.position.y = -0.8; scene.add(base);

// trophy group
const trophy = new THREE.Group();
scene.add(trophy);

const goldMat = new THREE.MeshStandardMaterial({color:0xffd166, metalness:0.95, roughness:0.18});
const darkMat = new THREE.MeshStandardMaterial({color:0x062f3a, metalness:0.2, roughness:0.6});

const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.6,0.5,48), goldMat); cup.position.y = 0.1; trophy.add(cup);
const orb = new THREE.Mesh(new THREE.SphereGeometry(0.33,32,32), goldMat); orb.position.y = 0.6; trophy.add(orb);
const stand = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.14,0.9), darkMat); stand.position.y = -0.4; trophy.add(stand);

// simple particle stars
const particlesCount = 600;
const positions = new Float32Array(particlesCount * 3);
for(let i=0;i<particlesCount;i++){
  positions[i*3+0] = (Math.random()-0.5)*12;
  positions[i*3+1] = (Math.random()-0.2)*4;
  positions[i*3+2] = (Math.random()-0.5)*12;
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const mat = new THREE.PointsMaterial({size:0.03, color:0x60d1ff, transparent:true, opacity:0.8});
const points = new THREE.Points(geo, mat); scene.add(points);

// responsiveness
function onResize(){
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize); onResize();

// simple mouse parallax for camera
let mouseX = 0, mouseY=0;
window.addEventListener('mousemove', (e)=> {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 1.2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * -0.6;
});

let last = Date.now();
function animate(){
  const now = Date.now();
  const dt = (now - last) / 1000; last = now;

  // rotate trophy group
  trophy.rotation.y += 0.25 * dt;
  trophy.rotation.x = 0.08 * Math.sin(now*0.0008);

  // subtle camera follow mouse
  camera.position.x += (mouseX*0.6 - camera.position.x) * 0.06;
  camera.position.y += (1.6 + mouseY - camera.position.y) * 0.06;
  camera.lookAt(0,0,0);

  // floating particles slight move
  points.rotation.y += 0.02 * dt;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

/* handle high pixel ratio */
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
