// ==========================================
// 검전기 시뮬레이션 (힘 완화, 금속박 동적 개폐 적용)
// ==========================================

let nuclei = [];
let electrons = [];

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

// 금속박 각도 관련 상태값
let currentLeafAngle = 5; // 기본 살짝 벌어진 각도 (도 단위)

function setup() {
  createCanvas(600, 700);
  
  // 검전기 원자핵 배치
  nuclei.push(new Nucleus(240, 215, 'plate'));
  nuclei.push(new Nucleus(280, 215, 'plate'));
  nuclei.push(new Nucleus(320, 215, 'plate'));
  nuclei.push(new Nucleus(360, 215, 'plate'));
  nuclei.push(new Nucleus(300, 290, 'stem'));
  nuclei.push(new Nucleus(300, 370, 'stem'));
  nuclei.push(new Nucleus(285, 460, 'leaf_L'));
  nuclei.push(new Nucleus(275, 520, 'leaf_L'));
  nuclei.push(new Nucleus(315, 460, 'leaf_R'));
  nuclei.push(new Nucleus(325, 520, 'leaf_R'));

  for (let n of nuclei) {
    electrons.push(new Electron(n.x, n.y, true, n));
  }

  setRodType('neutral');
}

function draw() {
  background(245);

  drawUI();
  
  // 1. 하단 금속박의 알짜 전하량 계산 및 각도 업데이트
  updateLeafAngle();

  // 2. 검전기 외형 그리기 (동적 각도 반영)
  drawElectroscopeBody();
  
  drawRod();
  drawStemVectors();

  for (let n of nuclei) {
    n.draw();
  }

  // 3. 쿨롱 힘 계산 (70% 수준으로 스케일 다운)
  let q_rod = 0;
  if (rod.type === 'positive') q_rod = 1;
  if (rod.type === 'negative') q_rod = -1;

  for (let e of electrons) {
    let fx = random(-0.2, 0.2);
    let fy = 0;

    if (q_rod !== 0) {
      let dx = e.x - rod.x;
      let dy = e.y - rod.y;
      let dSq = dx * dx + dy * dy;
      dSq = max(dSq, 4000); // 근접 폭주 방지 완충값 상향
      
      let d = sqrt(dSq);
      
      // 기존 150000 -> 105000 (정확히 70% 수준으로 완화)
      let rawForce = (q_rod * -1) * (105000 / dSq);
      rawForce = constrain(rawForce, -3.5, 3.5); // 급발진 방지 상한선
      
      fx += (dx / d) * rawForce;
      fy += (dy / d) * rawForce;
    }

    e.update(fx, fy);
    e.draw();
  }
}

// ----------------------------------------------------
// 금속박 벌어짐 각도 계산 (물리적 척력 비례)
// ----------------------------------------------------
function updateLeafAngle() {
  // 하단(y > 420)에 위치한 전자 수 카운트
  let electronsInLeaves = 0;
  for (let e of electrons) {
    if (e.y > 420) electronsInLeaves++;
  }
  
  // 하단 원자핵 수 = 4개
  // 하단 영역의 순전하량 편차 = |전자 수 - 4|
  let chargeImbalance = abs(electronsInLeaves - 4);

  // 불균형 전하가 클수록 목표 각도 증가 (최소 5도 ~ 최대 42도)
  let targetAngle = map(chargeImbalance, 0, 4, 5, 42);
  targetAngle = constrain(targetAngle, 5, 42);

  // 부드러운 회전 보간 (LERP: 매 프레임 10%씩 목표값으로 접근)
  currentLeafAngle = lerp(currentLeafAngle, targetAngle, 0.1);
}

// ----------------------------------------------------
// 검전기 외형 렌더링 (수정된 금속박 회전 좌표계)
// ----------------------------------------------------
function drawElectroscopeBody() {
  stroke(180);
  strokeWeight(3);
  fill(235, 235, 240);

  // 상단 금속판 & 중앙 기둥
  rectMode(CENTER);
  rect(300, 215, 200, 40, 10);
  rect(300, 325, 24, 190);

  // 힌지 연결부 원
  fill(160);
  circle(300, 425, 14);

  // 좌측 금속박
  push();
  translate(300, 425);
  rotate(radians(-currentLeafAngle));
  fill(225, 225, 235);
  rectMode(CORNER);
  rect(-10, 0, 10, 110, 3);
  pop();

  // 우측 금속박
  push();
  translate(300, 425);
  rotate(radians(currentLeafAngle));
  fill(225, 225, 235);
  rectMode(CORNER);
  rect(0, 0, 10, 110, 3);
  pop();
}

// ----------------------------------------------------
// UI 및 상호작용
// ----------------------------------------------------
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

// ----------------------------------------------------
// 기둥 양옆 알짜힘 벡터
// ----------------------------------------------------
function drawStemVectors() {
  let distFactor = map(rod.y, 90, 170, 30, 110);
  distFactor = constrain(distFactor, 30, 110);

  let upLen = 0;   
  let downLen = 0; 

  if (rod.type === 'neutral') {
    upLen = distFactor * 0.5;
    downLen = distFactor * 0.5;
  } else if (rod.type === 'positive') {
    upLen = distFactor * 1.4;
    downLen = distFactor * 0.2;
  } else if (rod.type === 'negative') {
    upLen = distFactor * 0.2;
    downLen = distFactor * 1.4;
  }

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
// 대전체 설정
// ----------------------------------------------------
function setRodType(type) {
  rod.type = type;
  rod.nuclei = [];
  rod.electrons = [];
  
  let nCols = [-50, 0, 50];
  for (let ox of nCols) {
    rod.nuclei.push(new Nucleus(rod.x + ox, rod.y, 'rod'));
  }

  let eCols = [];
  if (type === 'neutral') eCols = [-50, 0, 50]; 
  else if (type === 'positive') eCols = [0]; 
  else if (type === 'negative') eCols = [-55, -25, 0, 25, 55]; 

  for (let ox of eCols) {
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
    e.update(0, 0);
    e.draw();
  }
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
      if (this.anchor) {
        let dx = this.anchor.x - this.x;
        let dy = this.anchor.y - this.y;
        let d = max(dist(this.x, this.y, this.anchor.x, this.anchor.y), 1);
        let restoreForce = min(d * 0.025, 1.2); 
        fx += (dx / d) * restoreForce;
        fy += (dy / d) * restoreForce;
      }

      this.vx += fx;
      this.vy += fy;
      this.vx *= 0.82; 
      this.vy *= 0.82;
      this.x += this.vx;
      this.y += this.vy;
      
      this.y = constrain(this.y, 200, 530);
      if (this.y < 235) {
        this.x = constrain(this.x, 220, 380); 
      } else if (this.y < 420) {
        this.x = constrain(this.x, 288, 312); 
      } else {
        // 금속박이 벌어지는 각도에 맞춰 하단 가로 이동 폭도 비례 확장
        let leafSpread = map(currentLeafAngle, 5, 42, 20, 65);
        this.x = constrain(this.x, 300 - leafSpread, 300 + leafSpread); 
      }
    } else if (this.anchor) {
      let targetX = this.anchor.x + 8 + fx * 3; 
      let targetY = this.anchor.y + fy * 3;
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
