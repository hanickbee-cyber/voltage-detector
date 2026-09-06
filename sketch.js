// ==========================================
// 검전기 시뮬레이션 (개선된 복원력 및 대전체 전하량)
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

  for (let e of electrons) {
    let fx = random(-0.3, 0.3);
    let fy = 0;

    // 대전체의 힘 계산
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

    // ★ 복원력 강화 로직: 대전체의 힘이 약할 때(멀거나 중성일 때) 복원력을 강하게 적용
    if (e.isFree && e.anchor) {
      let restoreDx = e.anchor.x - e.x;
      let restoreDy = e.anchor.y - e.y;
      let restoreDist = max(dist(e.x, e.y, e.anchor.x, e.anchor.y), 1);
      
      // 대전체가 중성이거나 거리가 멀면 복원력(0.1) 증가, 가까우면 쿨롱 힘이 이기도록 복원력(0.02) 감소
      let restoreFactor = (rod.type === 'neutral' || rod.y < 120) ? 0.1 : 0.02; 
      let restoreForce = min(restoreDist * restoreFactor, 2.5); // 최대 복원력 제한
      
      fx += (restoreDx / restoreDist) * restoreForce;
      fy += (restoreDy / restoreDist) * restoreForce;
    }

    e.update(fx, fy);
    e.draw();
  }
}

// ... (drawUI, drawBtn, drawStemVectors, drawArrow 함수는 이전과 동일)
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

// ----------------------------------------------------
// 대전체 및 검전기 외형 (수정됨)
// ----------------------------------------------------
function setRodType(type) {
  rod.type = type;
  rod.nuclei = [];
  rod.electrons = [];
  
  // 원자핵은 항상 3개 (x 좌표 오프셋)
  let nCols = [-50, 0, 50];
  for (let ox of nCols) {
    rod.nuclei.push(new Nucleus(rod.x + ox, rod.y, 'rod'));
  }

  // ★ 수정됨: 전하 종류에 따른 전자 개수 명확히 분리
  let eCols = [];
  if (type === 'neutral') {
    eCols = [-50, 0, 50]; // 3개
  } else if (type === 'positive') {
    eCols = [0]; // 1개 (전자 부족)
  } else if (type === 'negative') {
    // 5개 (전자 과잉). 시각적으로 균형 있게 배치
    eCols = [-60, -30, 0, 30, 60]; 
  }
  
  for (let ox of eCols) {
    // 가장 가까운 원자핵을 찾아 앵커로 설정
    let anchor = rod.nuclei[1]; 
    let minDist = 999;
    for (let n of rod.nuclei) {
      let d = abs(ox - (n.x - rod.x));
      if (d < minDist) { minDist = d; anchor = n; }
    }
    rod.electrons.push(new Electron(rod.x + ox + 8, rod.y, false, anchor));
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
    // 구속 전자는 외부 힘에 영향 받지 않고 그려지기만 함
    e.update(0, 0);
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

// ==========================================
// 클래스 정의
// ==========================================
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
  }
  
  update(fx, fy) {
    if (this.isFree) {
      // 복원력은 draw() 루프 안에서 외부 힘(fx, fy)에 더해져서 전달됨
      this.vx += fx;
      this.vy += fy;
      this.vx *= 0.82; 
      this.vy *= 0.82;
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
    } else if (this.anchor) {
      let targetX = this.anchor.x + 8 + fx * 4; 
      let targetY = this.anchor.y + fy * 4;
      let d = dist(this.anchor.x, this.anchor.y, targetX, targetY);
      let maxRadius = 14; 
      if (d > maxRadius) {
        let angle = atan2(targetY - this.anchor.y, targetX - this.anchor.x);
        this.x = this.anchor.x + cos(angle) * maxRadius;
        this.y = this.anchor.y + sin(angle) * maxRadius;
      } else {
        this.x = targetX;
        this.y = targetY;
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
