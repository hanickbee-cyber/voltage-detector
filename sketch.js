// ==========================================
// 검전기 시뮬레이션 (구속 전자 겹침 버그 수정)
// ==========================================

let nuclei = [];
let electrons = [];

let leafAngle = 0; 
let targetLeafAngle = 0;

let rod = {
  x: 300,
  y: 120,
  w: 160,
  h: 40,
  isDragging: false,
  offsetX: 0,
  offsetY: 0,
  type: 'neutral',
  nuclei: [],
  electrons: []
};

function setup() {
  createCanvas(600, 700);
  
  nuclei.push(new Nucleus(240, 215, 'plate'));
  nuclei.push(new Nucleus(280, 215, 'plate'));
  nuclei.push(new Nucleus(320, 215, 'plate'));
  nuclei.push(new Nucleus(360, 215, 'plate'));
  nuclei.push(new Nucleus(300, 290, 'stem'));
  nuclei.push(new Nucleus(300, 370, 'stem'));
  
  let nl1 = new Nucleus(292, 460, 'leaf_L'); nl1.distY = 30; nuclei.push(nl1);
  let nl2 = new Nucleus(292, 520, 'leaf_L'); nl2.distY = 90; nuclei.push(nl2);
  let nr1 = new Nucleus(308, 460, 'leaf_R'); nr1.distY = 30; nuclei.push(nr1);
  let nr2 = new Nucleus(308, 520, 'leaf_R'); nr2.distY = 90; nuclei.push(nr2);

  for (let n of nuclei) {
    electrons.push(new Electron(n.x, n.y, true, n));
  }

  setRodType('neutral');
}

function draw() {
  background(245);

  drawUI();

  // 금속박 각도 계산
  let leafElectrons = 0;
  for (let e of electrons) {
    if (e.y > 420) leafElectrons++; 
  }
  
  let netCharge = abs(4 - leafElectrons);
  targetLeafAngle = constrain(netCharge * 0.2, 0, PI/4);
  leafAngle = lerp(leafAngle, targetLeafAngle, 0.1);

  for (let n of nuclei) {
    if (n.region === 'leaf_L') {
      n.x = 300 - 8 * cos(leafAngle) - n.distY * sin(leafAngle);
      n.y = 430 - 8 * sin(leafAngle) + n.distY * cos(leafAngle);
    } else if (n.region === 'leaf_R') {
      n.x = 300 + 8 * cos(-leafAngle) - n.distY * sin(-leafAngle);
      n.y = 430 + 8 * sin(-leafAngle) + n.distY * cos(-leafAngle);
    }
  }

  drawElectroscopeBody();
  drawRod();
  drawStemVectors();

  for (let n of nuclei) {
    n.draw();
  }

  let q_rod = 0;
  if (rod.type === 'positive') q_rod = 1;
  if (rod.type === 'negative') q_rod = -1;

  for (let e of electrons) {
    let fx = random(-0.3, 0.3);
    let fy = 0;

    if (q_rod !== 0) {
      let dx = e.x - rod.x;
      let dy = e.y - rod.y;
      let dSq = dx * dx + dy * dy; 
      dSq = max(dSq, 3000); 
      let d = sqrt(dSq);
      
      let forceMag = (q_rod * -1) * (150000 / dSq); 
      fx += (dx / d) * forceMag;
      fy += (dy / d) * forceMag;
    }

    if (e.isFree && e.anchor) {
      let restoreDx = e.anchor.x - e.x;
      let restoreDy = e.anchor.y - e.y;
      let restoreDist = max(dist(e.x, e.y, e.anchor.x, e.anchor.y), 1);
      
      let restoreFactor = (rod.type === 'neutral' || rod.y < 120) ? 0.1 : 0.02; 
      let restoreForce = min(restoreDist * restoreFactor, 2.5); 
      
      fx += (restoreDx / restoreDist) * restoreForce;
      fy += (restoreDy / restoreDist) * restoreForce;
    }

    e.update(fx, fy);
    e.draw();
  }
}

function drawUI() {
  drawBtn(120, 40, "중성 (0)", rod.type === 'neutral');
  drawBtn(300, 40, "(+) 대전체", rod.type === 'positive');
  drawBtn(480, 40, "(-) 대전체", rod.type === 'negative');
}

function drawBtn(x, y, txt, isActive) {
  push();
  rectMode(CENTER);
  if (isActive) {
    fill(220, 235, 255);
    stroke(100, 150, 255);
    strokeWeight(3);
  } else {
    fill(240);
    stroke(200);
    strokeWeight(1);
  }
  rect(x, y, 120, 40, 8);
  fill(isActive ? 30 : 120);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(15);
