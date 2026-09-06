// ==========================================
// 검전기 시뮬레이션 (버튼 UI 및 벡터 추가)
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
  type: 'neutral', // 'neutral', 'positive', 'negative'
  nuclei: [],
  electrons: []
};

function setup() {
  createCanvas(600, 700);
  
  // 1. 검전기 내부 원자핵 배치
  nuclei.push(new Nucleus(230, 215, 'plate'));
  nuclei.push(new Nucleus(280, 215, 'plate'));
  nuclei.push(new Nucleus(320, 215, 'plate'));
  nuclei.push(new Nucleus(370, 215, 'plate'));
  nuclei.push(new Nucleus(300, 290, 'stem'));
  nuclei.push(new Nucleus(300, 370, 'stem'));
  nuclei.push(new Nucleus(280, 460, 'leaf_L'));
  nuclei.push(new Nucleus(270, 520, 'leaf_L'));
  nuclei.push(new Nucleus(320, 460, 'leaf_R'));
  nuclei.push(new Nucleus(330, 520, 'leaf_R'));

  // 2. 검전기 내부 자유 전자 배치
  for (let n of nuclei) {
    electrons.push(new Electron(n.x + random(-5, 5), n.y + random(-5, 5), true));
  }

  // 3. 대전체 초기화
  setRodType('neutral');
}

function draw() {
  background(245);

  // 상단 UI 버튼 그리기
  drawUI();

  // 검전기 외형 그리기
  drawElectroscopeBody();

  // 대전체와 알짜힘 벡터 그리기
  drawRod();
  drawForceVectors();

  // 검전기 원자핵 렌더링
  for (let n of nuclei) {
    n.draw();
  }

  // 검전기 자유 전자 렌더링
  for (let e of electrons) {
    e.update(0, 0);
    e.draw();
  }
}

// ----------------------------------------------------
// UI 및 인터랙션 로직
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
// 알짜힘 벡터 (화살표) 그리기
// ----------------------------------------------------
function drawForceVectors() {
  // 거리가 가까워질수록 화살표가 길어지도록 매핑 (최대 길이 90, 최소 길이 20)
  let distFactor = map(rod.y, 80, 160, 20, 90);
  distFactor = constrain(distFactor, 20, 90);

  let attractLen = 0; // 붉은색 (인력)
  let repelLen = 0;   // 푸른색 (척력)

  if (rod.type === 'neutral') {
    attractLen = distFactor;
    repelLen = distFactor;
  } else if (rod.type === 'positive') {
    attractLen = distFactor * 1.5;
    repelLen = distFactor * 0.4;
  } else if (rod.type === 'negative') {
    attractLen = distFactor * 0.4;
    repelLen = distFactor * 1.5;
  }

  let startX = rod.x;
  let startY = rod.y + rod.h / 2 + 10;

  // 척력 화살표 (푸른색, 약간 왼쪽)
  drawArrow(startX - 15, startY, repelLen, color(70, 130, 240));
  // 인력 화살표 (붉은색, 약간 오른쪽)
  drawArrow(startX + 15, startY, attractLen, color(240, 90, 90));
}

function drawArrow(x, y, len, col) {
  push();
  stroke(col);
  strokeWeight(4);
  fill(col);
  translate(x, y);
  line(0, 0, 0, len);
  // 화살촉 그리기
  translate(0, len);
  triangle(-7, -9, 7, -9, 0, 3);
  pop();
}

// ----------------------------------------------------
// 대전체 전하량 설정 및 입자 생성
// ----------------------------------------------------
function setRodType(type) {
  rod.type = type;
  rod.nuclei = [];
  rod.electrons = [];
  
  // 원자핵은 항상 3개 고정
  let nCols = [-50, 0, 50];
  for (let ox of nCols) {
    rod.nuclei.push(new Nucleus(rod.x + ox, rod.y, 'rod'));
  }

  // 전하 종류에 따라 전자 개수 및 위치 조정
  let eCols = [];
  if (type === 'neutral') eCols = [-50, 0, 50]; // 3개 (균형)
  else if (type === 'positive') eCols = [0]; // 1개 (전자 부족)
  else if (type === 'negative') eCols = [-55, -25, 0, 25, 55]; // 5개 (전자 과잉)

  for (let ox of eCols) {
    // 가장 가까운 원자핵을 찾아 구속시킴
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
  // 1. UI 버튼 클릭 판정
  if (mouseY > 20 && mouseY < 60) {
    if (mouseX > 60 && mouseX < 180) setRodType('neutral');
    if (mouseX > 240 && mouseX < 360) setRodType('positive');
    if (mouseX > 420 && mouseX < 540) setRodType('negative');
    return; // 버튼을 눌렀다면 드래그 판정을 생략
  }

  // 2. 대전체 드래그 판정
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
    // UI(60) 아래, 금속판(170) 위에서만 움직이도록 제한
    rod.y = constrain(targetY, 90, 170);
  }
}

function mouseReleased() {
  rod.isDragging = false;
}

// ==========================================
// 클래스 정의 (Nucleus, Electron)
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
      this.vx *= 0.85; 
      this.vy *= 0.85;
      this.x += this.vx;
      this.y += this.vy;
    } else if (this.anchorNucleus) {
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
