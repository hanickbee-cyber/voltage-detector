// ==========================================
// 검전기 및 대전체 시뮬레이션 기본 뼈대
// ==========================================

let nuclei = [];
let electrons = [];

// 대전체(막대) 객체 정의
let rod = {
  x: 300,
  y: 80,
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
  
  // 1. 검전기 내부 원자핵 배치 (총 10개)
  // 금속판 영역 (상단)
  nuclei.push(new Nucleus(230, 215, 'plate'));
  nuclei.push(new Nucleus(280, 215, 'plate'));
  nuclei.push(new Nucleus(320, 215, 'plate'));
  nuclei.push(new Nucleus(370, 215, 'plate'));

  // 금속 막대 영역 (중앙)
  nuclei.push(new Nucleus(300, 290, 'stem'));
  nuclei.push(new Nucleus(300, 370, 'stem'));

  // 금속박 영역 (하단 좌/우)
  nuclei.push(new Nucleus(280, 460, 'leaf_L'));
  nuclei.push(new Nucleus(270, 520, 'leaf_L'));
  nuclei.push(new Nucleus(320, 460, 'leaf_R'));
  nuclei.push(new Nucleus(330, 520, 'leaf_R'));

  // 2. 검전기 내부 자유 전자 배치 (원자핵 위치 부근에 1:1 생성)
  for (let n of nuclei) {
    electrons.push(new Electron(n.x + random(-5, 5), n.y + random(-5, 5), true));
  }

  // 3. 대전체 내부 입자 초기화
  initRodParticles();
}

function draw() {
  background(245);

  // 1. 검전기 외형(도체 테두리) 그리기
  drawElectroscopeBody();

  // 2. 대전체 그리기 및 내부 입자 업데이트
  drawRod();

  // 3. 검전기 원자핵 렌더링
  for (let n of nuclei) {
    n.draw();
  }

  // 4. 검전기 자유 전자 업데이트 및 렌더링
  for (let e of electrons) {
    // 경계선 제한 및 이동 업데이트 (현재는 정지 상태)
    e.update(0, 0);
    e.draw();
  }

  // 안내 텍스트
  fill(80);
  noStroke();
  textSize(14);
  textAlign(CENTER);
  text("상단의 대전체를 마우스나 터치로 드래그해 보세요.", width / 2, height - 30);
}

// ----------------------------------------------------
// 검전기 외형 렌더링
// ----------------------------------------------------
function drawElectroscopeBody() {
  stroke(180);
  strokeWeight(3);
  fill(235, 235, 240);

  // 상단 금속판 (타원 형태)
  rectMode(CENTER);
  rect(300, 215, 200, 40, 10);

  // 중앙 금속 막대
  rect(300, 330, 24, 200);

  // 하단 금속박 (좌/우 나뭇잎 형태)
  push();
  translate(300, 430);
  // 왼쪽 박
  rotate(radians(-15));
  rect(-15, 60, 16, 120, 4);
  pop();

  push();
  translate(300, 430);
  // 오른쪽 박
  rotate(radians(15));
  rect(15, 60, 16, 120, 4);
  pop();
}

// ----------------------------------------------------
// 대전체 내부 입자 설정
// ----------------------------------------------------
function initRodParticles() {
  rod.nuclei = [];
  rod.electrons = [];
  let cols = [-50, 0, 50];
  
  for (let ox of cols) {
    let n = new Nucleus(rod.x + ox, rod.y, 'rod');
    rod.nuclei.push(n);
    // 구속 전자: 원자핵에 묶여 있음 (isFree = false)
    rod.electrons.push(new Electron(rod.x + ox + 8, rod.y, false, n));
  }
}

// ----------------------------------------------------
// 대전체 렌더링 및 드래그 처리
// ----------------------------------------------------
function drawRod() {
  rectMode(CENTER);
  stroke(150);
  strokeWeight(2);
  fill(250, 250, 210, 220); // 절연체 느낌의 미색 막대
  rect(rod.x, rod.y, rod.w, rod.h, 8);

  // 대전체 내부 원자핵 및 구속 전자 동기화
  let cols = [-50, 0, 50];
  for (let i = 0; i < rod.nuclei.length; i++) {
    rod.nuclei[i].x = rod.x + cols[i];
    rod.nuclei[i].y = rod.y;
    rod.nuclei[i].draw();
  }

  for (let e of rod.electrons) {
    e.update(0, 0);
    e.draw();
  }
}

// ----------------------------------------------------
// 마우스/터치 드래그 인터랙션
// ----------------------------------------------------
function mousePressed() {
  // 대전체 영역을 클릭/터치했는지 검사
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
    
    // Y축 최소 접근 제한: 금속판(215) 위쪽으로 최소 거리 유지 (최대 접근: y = 140)
    let targetY = mouseY + rod.offsetY;
    rod.y = constrain(targetY, 40, 140);
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
      this.vx *= 0.85; 
      this.vy *= 0.85;
      this.x += this.vx;
      this.y += this.vy;
    } else if (this.anchorNucleus) {
      // 부도체 구속 전자: 원자핵 주변에 가볍게 묶임
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
