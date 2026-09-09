// ==========================================
// 검전기 시뮬레이션 (전자 간 척력 추가)
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

  // 전자 위치 업데이트 전, 각 전자가 받을 최종 힘을 누적할 변수 초기화
  for (let e of electrons) {
    e.nextFx = random(-0.3, 0.3); // 미세 진동
    e.nextFy = 0;
  }

  // ★ 추가된 물리 로직: 자유 전자들 사이의 상호 척력 (O(N^2) 계산)
  for (let i = 0; i < electrons.length; i++) {
    for (let j = i + 1; j < electrons.length; j++) {
      let e1 = electrons[i];
      let e2 = electrons[j];
      
      let dx = e1.x - e2.x;
      let dy = e1.y - e2.y;
      let distSq = dx * dx + dy * dy;
      
      // 전자들이 너무 가까워졌을 때 힘이 폭주하여 화면 밖으로 튕기는 것을 방지
      distSq = max(distSq, 900); // 최소 거리 제한 강화 (30px)
      
      let d = sqrt(distSq);
      
      // 척력의 세기 (값이 클수록 서로 강하게 밀어냄)
      // (+) 대전체가 다가왔을 때 금속판(넓은 공간)에서 전자들이 고르게 퍼지도록 돕습니다.
      let repulsionForce = 3500 / distSq; 
      
      let fx = (dx / d) * repulsionForce;
      let fy = (dy / d) * repulsionForce;
      
      // e1은 밀려나고, e2는 반대 방향으로 밀려남 (작용-반작용)
      e1.nextFx += fx;
      e1.nextFy += fy;
      e2.nextFx -= fx;
      e2.nextFy -= fy;
    }
  }

  // 대전체의 힘 및 복원력 적용
  for (let e of electrons) {
    let fx = e.nextFx;
    let fy = e.nextFy;

    // 1. 대전체의 쿨롱 힘
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

    // 2. 고향 원자핵으로 돌아가려는 복원력
    if (e.isFree && e.anchor) {
      let restoreDx = e.anchor.x - e.x;
      let restoreDy = e.anchor.y - e.y;
      let restoreDist = max(dist(e.x, e.y, e.anchor.x, e.anchor.y), 1);
      
      // 전자 간 척력이 추가되었으므로 복원력을 약간 더 강하게 설정하여 형태 유지
      let restoreFactor = (rod.type === 'neutral' || rod.y < 120) ? 0.15 : 0.04; 
      let restoreForce = min(restoreDist * restoreFactor, 3.0); 
      
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
  textStyle(BOLD);
  text(txt, x, y);
  pop();
}

function drawStemVectors() {
  let distFactor = map(rod.y, 90, 170, 30, 120);
  distFactor = constrain(distFactor, 30, 120);

  let upLen = (rod.type === 'neutral') ? distFactor * 0.5 : (rod.type === 'positive') ? distFactor * 1.5 : distFactor * 0.2;
  let downLen = (rod.type === 'neutral') ? distFactor * 0.5 : (rod.type === 'positive') ? distFactor * 0.2 : distFactor * 1.5;

  let centerY = 330;
  let leftX = 240;  
  let rightX = 360; 

  drawArrow(leftX, centerY + upLen/2, leftX, centerY - upLen/2, color(240, 90, 90));
  fill(240, 90, 90); noStroke(); textAlign(CENTER); textSize(14);
  text("인력", leftX, centerY + upLen/2 + 20);

  drawArrow(rightX, centerY - downLen/2, rightX, centerY + downLen/2, color(70, 130, 240));
  fill(70, 130, 240); noStroke(); textAlign(CENTER); textSize(14);
  text("척력", rightX, centerY - downLen/2 - 10);
}

function drawArrow(x1, y1, x2, y2, col) {
  push();
  stroke(col);
  strokeWeight(5);
  fill(col);
  line(x1, y1, x2, y2);
  let angle = atan2(y2 - y1, x2 - x1);
  translate(x2, y2);
  rotate(angle);
  triangle(-12, -8, -12, 8, 0, 0);
  pop();
}

function setRodType(type) {
  rod.type = type;
  rod.nuclei = [];
  rod.electrons = [];
  
  let nCols = [-50, 0, 50];
  for (let ox of nCols) {
    rod.nuclei.push(new Nucleus(rod.x + ox, rod.y, 'rod'));
  }

  let eCols = [];
  if (type === 'neutral') {
    eCols = [-50, 0, 50]; 
  } else if (type === 'positive') {
    eCols = [0]; 
  } else if (type === 'negative') {
    eCols = [-60, -30, 0, 30, 60]; 
  }
  
  for (let ox of eCols) {
    let anchor = rod.nuclei[1]; 
    let minDist = 999;
    for (let n of rod.nuclei) {
      let d = abs(ox - (n.x - rod.x));
      if (d < minDist) { minDist = d; anchor = n; }
    }
    let e = new Electron(rod.x + ox, rod.y, false, anchor);
    e.ox = ox; 
    rod.electrons.push(e);
  }
}

function drawRod() {
  rectMode(CENTER);
  stroke(150);
  strokeWeight(2);
  fill(250, 250, 210, 220); 
  rect(rod.x, rod.y, rod.w, rod.h, 8);

  for (let i = 0; i < rod.nuclei.length; i++) {
    let ox = (i - 1) * 50;
    rod.nuclei[i].x = rod.x + ox;
    rod.nuclei[i].y = rod.y;
    rod.nuclei[i].draw();
  }

  for (let e of rod.electrons) {
    e.x = rod.x + e.ox;
    e.y = rod.y + 12; 
    e.draw(); 
  }
}

function drawElectroscopeBody() {
  stroke(180);
  strokeWeight(3);
  fill(235, 235, 240);
  rectMode(CENTER);
  
  rect(300, 215, 200, 40, 10);
  rect(300, 330, 24, 200);

  push();
  translate(300, 430);
  rotate(leafAngle);
  rect(-8, 60, 16, 120, 4);
  pop();

  push();
  translate(300, 430);
  rotate(-leafAngle);
  rect(8, 60, 16, 120, 4);
  pop();
}

function mousePressed() {
  if (mouseY > 20 && mouseY < 60) {
    if (mouseX > 60 && mouseX < 180) setRodType('neutral');
    if (mouseX > 240 && mouseX < 360) setRodType('positive');
    if (mouseX > 420 && mouseX < 540) setRodType('negative');
    return;
  }
  if (mouseX > rod.x - rod.w / 2 && mouseX < rod.x + rod.w / 2 &&
      mouseY > rod.y - rod.h / 2 && mouseY < rod.y + rod.h / 2) {
    rod.isDragging = true;
    rod.offsetX = rod.x - mouseX;
    rod.offsetY = rod.y - mouseY;
  }
}

function mouseDragged() {
  if (rod.isDragging) {
    rod.x = mouseX + rod.offsetX;
    let targetY = mouseY + rod.offsetY;
    rod.y = constrain(targetY, 90, 170);
  }
}

function mouseReleased() {
  rod.isDragging = false;
}

class Nucleus {
  constructor(x, y, region) {
    this.x = x;
    this.y = y;
    this.region = region; 
    this.distY = 0; 
  }
  draw() {
    fill(240, 90, 90);
    noStroke();
    circle(this.x, this.y, 22);
    fill(255);
    textSize(14);
    textAlign(CENTER, CENTER);
    text('+', this.x, this.y - 1);
  }
}

class Electron {
  constructor(x, y, isFree, anchor = null) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.isFree = isFree; 
    this.anchor = anchor; 
    this.ox = 0; 
    this.nextFx = 0;
    this.nextFy = 0;
  }
  
  update(fx, fy) {
    if (this.isFree) {
      this.vx += fx;
      this.vy += fy;
      // 마찰을 조금 더 주어 전자들이 부들부들 떠는 것을 진정시킴
      this.vx *= 0.75; 
      this.vy *= 0.75;
      this.x += this.vx;
      this.y += this.vy;
      
      this.y = constrain(this.y, 200, 560);
      if (this.y < 235) {
        this.x = constrain(this.x, 210, 390); 
      } else if (this.y < 430) {
        this.x = constrain(this.x, 280, 320); 
      } else {
        this.x = constrain(this.x, 220, 380); 
      }
    } 
  }
  
  draw() {
    if (!this.isFree && this.anchor) {
      stroke(180, 180, 220);
      strokeWeight(1);
      line(this.x, this.y, this.anchor.x, this.anchor.y);
    }
    fill(70, 130, 240);
    noStroke();
    circle(this.x, this.y, 16);
    fill(255);
    textSize(12);
    textAlign(CENTER, CENTER);
    text('-', this.x, this.y - 1);
  }
}
