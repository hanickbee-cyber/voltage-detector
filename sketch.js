// ==========================================
// 검전기 시뮬레이션 (분리된 알짜힘 벡터 및 전자 이동)
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

function setup() {
  createCanvas(600, 700);
  
  // 검전기 내부 원자핵 배치
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

  // 검전기 내부 자유 전자 배치 (원자핵 위치 기반으로 시작)
  for (let n of nuclei) {
    electrons.push(new Electron(n.x, n.y, true));
  }

  setRodType('neutral');
}

function draw() {
  background(245);

  drawUI();
  drawElectroscopeBody();
  drawRod();
  
  // 1. 기둥 양옆의 화살표 그리기 및 알짜힘 계산
  let netForceY = drawStemVectors();

  // 검전기 원자핵 렌더링
  for (let n of nuclei) {
    n.draw();
  }

  // 2. 자유 전자 이동 및 렌더링 (알짜힘 적용)
  for (let e of electrons) {
    // 자유전자에게 계산된 위아래 알짜힘(netForceY)을 전달
    // x축으로는 랜덤한 미세 진동을 주어 자연스럽게 흩어지게 함
    let randomX = random(-0.2, 0.2); 
    e.update(randomX, netForceY * 0.02); 
    e.draw();
  }
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
// 기둥 양옆 알짜힘 벡터 (화살표)
// ----------------------------------------------------
function drawStemVectors() {
  // 대전체가 가까울수록 벡터 길이가 커짐 (최대 100, 최소 30)
  let distFactor = map(rod.y, 90, 170, 100, 30);
  distFactor = constrain(distFactor, 30, 100);

  let upLen = 0;   // 위(금속판 방향)로 당기는 인력
  let downLen = 0; // 아래(금속박 방향)로 미는 척력

  if (rod.type === 'neutral') {
    upLen = distFactor * 0.5;
    downLen = distFactor * 0.5;
  } else if (rod.type === 'positive') {
    upLen = distFactor * 1.5;
    downLen = distFactor * 0.2;
  } else if (rod.type === 'negative') {
    upLen = distFactor * 0.2;
    downLen = distFactor * 1.5;
  }

  let centerY = 330;
  let leftX = 240;  // 기둥 좌측
  let rightX = 360; // 기둥 우측

  // 좌측: 위를 향하는 붉은색 화살표 (인력)
  drawArrow(leftX, centerY + upLen/2, leftX, centerY - upLen/2, color(240, 90, 90));
  fill(240, 90, 90); noStroke(); textAlign(CENTER); textSize(14);
  text("인력", leftX, centerY + upLen/2 + 20);

  // 우측: 아래를 향하는 푸른색 화살표 (척력)
  drawArrow(rightX, centerY - downLen/2, rightX, centerY + downLen/2, color(70, 130, 240));
  fill(70, 130, 240); noStroke(); textAlign(CENTER); textSize(14);
  text("척력", rightX, centerY - downLen/2 - 10);

  // 전자가 받을 최종 알짜힘 반환 (다운 길이 - 업 길이)
  // 양수면 아래로 이동, 음수면 위로 이동
  return downLen - upLen; 
}

// 시작점(x1, y1)에서 끝점(x2, y2)으로 화살표를 그리는 함수
function drawArrow(x1, y1, x2, y2, col) {
  push();
  stroke(col);
  strokeWeight(5);
  fill(col);
  line(x1, y1, x2, y2);
  
  let angle = atan2(y2 - y1, x2 - x1);
  translate(x2, y2);
  rotate(angle);
  triangle(-12, -8, -12, 8, 0, 0); // 화살촉
  pop();
}

// ----------------------------------------------------
// 대전체 및 검전기 외형
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

function drawElectroscopeBody() {
  stroke(180);
  strokeWeight(3);
  fill(235, 235, 240);
  rectMode(CENTER);
  rect(300, 215, 200, 40, 10);
  rect(300, 330, 24, 200);

  push();
  translate(300, 430);
  rotate(radians(-15));
  rect(-15, 60, 16, 120, 4);
  pop();

  push();
  translate(300, 430);
  rotate(radians(15));
  rect(15, 60, 16, 120, 4);
  pop();
}

// ----------------------------------------------------
// 이벤트 핸들러
// ----------------------------------------------------
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
    this.charge = 1;
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
  constructor(x, y, isFree, anchorNucleus = null) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.charge = -1;
    this.isFree = isFree; 
    this.anchorNucleus = anchorNucleus; 
  }
  update(fx, fy) {
    if (this.isFree) {
      this.vx += fx;
      this.vy += fy;
      this.vx *= 0.85; // 마찰력 (감속)
      this.vy *= 0.85;
      this.x += this.vx;
      this.y += this.vy;
      
      // ★ 자유 전자가 검전기 밖으로 나가지 못하게 경계선 설정
      // 금속판(y=200)부터 금속박(y=530)까지만 이동 가능
      this.y = constrain(this.y, 200, 530);
      
      // y위치에 따라 x축(가로) 이동 가능 범위를 제한하여 금속 모양 안에 가둠
      if (this.y < 235) {
        this.x = constrain(this.x, 220, 380); // 금속판 영역
      } else if (this.y < 430) {
        this.x = constrain(this.x, 285, 315); // 기둥 영역
      } else {
        this.x = constrain(this.x, 260, 340); // 금속박 영역
      }

    } else if (this.anchorNucleus) {
      // 대전체 내부 구속 전자
      let targetX = this.anchorNucleus.x + 8 + fx * 4; 
      let targetY = this.anchorNucleus.y + fy * 4;
      let d = dist(this.anchorNucleus.x, this.anchorNucleus.y, targetX, targetY);
      let maxRadius = 14; 
      if (d > maxRadius) {
        let angle = atan2(targetY - this.anchorNucleus.y, targetX - this.anchorNucleus.x);
        this.x = this.anchorNucleus.x + cos(angle) * maxRadius;
        this.y = this.anchorNucleus.y + sin(angle) * maxRadius;
      } else {
        this.x = targetX;
        this.y = targetY;
      }
    }
  }
  draw() {
    if (!this.isFree && this.anchorNucleus) {
      stroke(180, 180, 220);
      strokeWeight(1);
      line(this.x, this.y, this.anchorNucleus.x, this.anchorNucleus.y);
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
