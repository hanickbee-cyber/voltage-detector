// ==========================================
// 검전기 시뮬레이션 (거리 비례 물리엔진 및 복원력 적용)
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

  // 자유 전자 생성 시, 자신의 짝꿍(Home) 원자핵을 기억하도록 설정
  for (let n of nuclei) {
    electrons.push(new Electron(n.x, n.y, true, n));
  }

  setRodType('neutral');
}

function draw() {
  background(245);

  drawUI();
  drawElectroscopeBody();
  drawRod();
  drawStemVectors(); // 화살표는 시각적 안내 역할만 수행

  for (let n of nuclei) {
    n.draw();
  }

  // ----------------------------------------------------
  // 핵심 물리 엔진: 대전체와 자유 전자 간의 쿨롱의 힘 계산
  // ----------------------------------------------------
  let q_rod = 0;
  if (rod.type === 'positive') q_rod = 1;
  if (rod.type === 'negative') q_rod = -1;

  for (let e of electrons) {
    let fx = random(-0.3, 0.3); // 자연스러운 미세 진동
    let fy = 0;

    // 대전체가 중성이 아닐 때만 외부 힘 작용
    if (q_rod !== 0) {
      let dx = e.x - rod.x;
      let dy = e.y - rod.y;
      let dSq = dx * dx + dy * dy; // 거리의 제곱
      dSq = max(dSq, 3000); // 0으로 나누어지는 오류(무한대 힘) 방지
      
      let d = sqrt(dSq);
      
      // 쿨롱의 법칙 응용: 거리가 가까울수록 힘이 기하급수적으로 강해짐
      // q_rod가 +1이면 인력(-방향), -1이면 척력(+방향)
      let forceMag = (q_rod * -1) * (150000 / dSq); 
      
      fx += (dx / d) * forceMag;
      fy += (dy / d) * forceMag;
    }

    e.update(fx, fy);
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
// 기둥 양옆 알짜힘 벡터 (화살표 시각화)
// ----------------------------------------------------
function drawStemVectors() {
  // [수정됨] 거리가 가까워질수록(170) 화살표 길이가 커지도록(120) 매핑 
  let distFactor = map(rod.y, 90, 170, 30, 120);
  distFactor = constrain(distFactor, 30, 120);

  let upLen = 0;   
  let downLen = 0; 

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
    this.anchor = anchor; // 자유 전자의 경우 '고향 원자핵' 위치 기억용
  }
  update(fx, fy) {
    if (this.isFree) {
      // [수정됨] 중성일 때 원래 자리로 돌아가려는 미세한 복원력(Restoring Force) 작용
      if (this.anchor) {
        let dx = this.anchor.x - this.x;
        let dy = this.anchor.y - this.y;
        let d = max(dist(this.x, this.y, this.anchor.x, this.anchor.y), 1);
        
        // 외부 대전체의 힘이 강하면 이 복원력을 무시하고 끌려가도록 최대값을 작게 제한
        let restoreForce = min(d * 0.03, 1.5); 
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
      } else if (this.y < 430) {
        this.x = constrain(this.x, 285, 315); 
      } else {
        this.x = constrain(this.x, 260, 340); 
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
