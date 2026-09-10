// ==========================================
// 검전기 시뮬레이션 (접지 기능 버그 수정판)
// ==========================================

let nuclei = [];
let electrons = [];

let leafAngle = 0; 
let targetLeafAngle = 0;
let isGrounded = false; // ★ 접지 상태 변수 추가

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

  // ★★★ 수정된 부분: 접지 상태에 따른 전자 유출입 처리 ★★★
  if (isGrounded && frameCount % 6 === 0) {
    // 자유 전자 + "진입 중"인 전자까지 모두 이미 확보된 몫으로 카운트
    // (기존 코드는 isFree인 전자만 세서, 진입 애니메이션이 끝나기 전까지
    //  목표치보다 훨씬 많은 전자를 계속 스폰하는 버그가 있었음)
    let reservedElectrons = electrons.filter(e => !e.isEscaping && !e.toDelete && (e.isFree || e.isEntering));
    let targetCount = 10; // 중성일 때 목표 개수
    
    if (rod.type === 'positive') targetCount = 16; // 전자가 지구에서 들어옴
    if (rod.type === 'negative') targetCount = 4;  // 전자가 지구로 도망감

    if (reservedElectrons.length > targetCount) {
      // 자유 전자 중에서만 내보내기 (이미 진입 중인 전자는 건드리지 않음)
      let freeElectrons = reservedElectrons.filter(e => e.isFree);
      if (freeElectrons.length > 0) {
        let e = freeElectrons[freeElectrons.length - 1];
        e.isEscaping = true;
        e.isFree = false;
      }
    } else if (reservedElectrons.length < targetCount) {
      // 전자가 부족하면 지구에서 새로 생성하여 유입 (진입 중인 전자도 이미 셌으므로 과다 생성 방지)
      let anchor = nuclei[int(random(4))]; // 금속판 원자핵 중 하나로 목표 설정
      let e = new Electron(480, 276, false, anchor); 
      e.isEntering = true;
      electrons.push(e);
    }
  }

  // 삭제 예약된 전자들 정리
  electrons = electrons.filter(e => !e.toDelete);

  // 금속박 각도 계산
  let leafElectrons = 0;
  for (let e of electrons) {
    if (e.y > 400 && e.isFree) leafElectrons++; 
  }
  
  let diff = leafElectrons - 4; 
  let angleMultiplier = 0.4; 
  
  // ★ 물리 핵심: 접지되어 있으면 전위차 0이므로 금속박은 무조건 닫힘 (0도)
  if (isGrounded) {
    targetLeafAngle = 0;
  } else {
    targetLeafAngle = constrain(abs(diff) * angleMultiplier, 0, PI/4);
  }
  
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

  drawGroundWire(); // 접지선 그리기
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
    e.nextFx = random(-0.02, 0.02); 
    e.nextFy = 0;
  }

  for (let i = 0; i < electrons.length; i++) {
    for (let j = i + 1; j < electrons.length; j++) {
      let e1 = electrons[i];
      let e2 = electrons[j];
      
      let dx = e1.x - e2.x;
      let dy = e1.y - e2.y;
      let distSq = dx * dx + dy * dy;
      distSq = max(distSq, 600); 
      let d = sqrt(distSq);
      
      let repulsionForce = min(2500 / distSq, 6); 
      let fx = (dx / d) * repulsionForce;
      let fy = (dy / d) * repulsionForce;
      
      e1.nextFx += fx;
      e1.nextFy += fy;
      e2.nextFx -= fx;
      e2.nextFy -= fy;
    }
  }

  for (let e of electrons) {
    let fx = e.nextFx;
    let fy = e.nextFy;

    if (q_rod !== 0) {
      let dx = e.x - rod.x;
      let dy = e.y - rod.y;
      let dSq = dx * dx + dy * dy; 
      dSq = max(dSq, 3000); 
      let d = sqrt(dSq);
      
      let forceMag = (q_rod * -1) * (150000 / dSq); 
      forceMag = constrain(forceMag, -15, 15);
      
      fx += (dx / d) * forceMag;
      fy += (dy / d) * forceMag;
    }

    if (e.isFree && e.anchor) {
      let restoreDx = e.anchor.x - e.x;
      let restoreDy = e.anchor.y - e.y;
      let restoreDist = max(dist(e.x, e.y, e.anchor.x, e.anchor.y), 1);
      
      let restoreFactor = (rod.type === 'neutral' || rod.y < 120) ? 0.15 : 0.03; 
      let restoreForce = min(restoreDist * restoreFactor, 2.5); 
      
      fx += (restoreDx / restoreDist) * restoreForce;
      fy += (restoreDy / restoreDist) * restoreForce;
    }

    e.update(fx, fy);
    e.draw();
  }
}

// ----------------------------------------------------
// UI 및 렌더링 함수
// ----------------------------------------------------
function drawUI() {
  drawBtn(120, 40, "중성 (0)", rod.type === 'neutral');
  drawBtn(300, 40, "(+) 대전체", rod.type === 'positive');
  drawBtn(480, 40, "(-) 대전체", rod.type === 'negative');
  
  // ★ 하단 중앙에 커다란 접지 토글 버튼 추가
  drawBtn(300, 650, isGrounded ? "접지 해제 ✘" : "손가락 대기 (접지)", isGrounded, 180, isGrounded ? color(255, 200, 200) : color(240));
}

function drawBtn(x, y, txt, isActive, w = 120, bgCol = null) {
  push();
  rectMode(CENTER);
  if (isActive) {
    fill(bgCol ? bgCol : color(220, 235, 255));
    stroke(bgCol ? color(255, 100, 100) : color(100, 150, 255));
    strokeWeight(3);
  } else {
    fill(bgCol ? bgCol : 240);
    stroke(200);
    strokeWeight(1);
  }
  rect(x, y, w, 40, 8);
  fill(isActive ? 30 : 120);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(15);
  textStyle(BOLD);
  text(txt, x, y);
  pop();
}

// ★ 우측에 접지선과 접지 기호 렌더링
function drawGroundWire() {
  if (!isGrounded) return;
  push();
  stroke(120, 200, 120); // 초록색 도선
  strokeWeight(4);
  noFill();
  
  beginShape();
  vertex(400, 215); // 금속판 우측
  vertex(480, 215);
  vertex(480, 260);
  endShape();
  
  // 표준 접지 기호
  stroke(100);
  strokeWeight(3);
  line(460, 260, 500, 260);
  line(468, 268, 492, 268);
  line(476, 276, 484, 276);
  
  fill(100, 180, 100);
  noStroke();
  textSize(13);
  textAlign(LEFT, CENTER);
  text("지구 (Earth)", 505, 260);
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
  push();
  fill(210, 235, 255, 70); 
  stroke(180, 210, 240);
  strokeWeight(4);
  
  beginShape();
  vertex(260, 235); 
  vertex(260, 360); 
  bezierVertex(140, 420, 140, 580, 240, 580); 
  vertex(360, 580); 
  bezierVertex(460, 580, 460, 420, 340, 360); 
  vertex(340, 235); 
  endShape(CLOSE);

  noFill();
  stroke(255, 255, 255, 200);
  strokeWeight(3);
  beginShape();
  vertex(270, 370);
  bezierVertex(165, 425, 165, 560, 245, 560);
  endShape();
  pop();

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
  // 상단 대전체 버튼
  if (mouseY > 20 && mouseY < 60) {
    if (mouseX > 60 && mouseX < 180) setRodType('neutral');
    if (mouseX > 240 && mouseX < 360) setRodType('positive');
    if (mouseX > 420 && mouseX < 540) setRodType('negative');
    return;
  }
  
  // ★ 하단 접지 버튼 판정
  if (mouseY > 630 && mouseY < 670 && mouseX > 210 && mouseX < 390) {
    isGrounded = !isGrounded;
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
    
    // ★ 애니메이션 플래그
    this.isEscaping = false; 
    this.isEntering = false;
    this.toDelete = false;
  }
  
  update(fx, fy) {
    // 1. 도망가는 전자 애니메이션
    if (this.isEscaping) {
      let targetX = 480;
      let targetY = 276;
      this.x = lerp(this.x, targetX, 0.1);
      this.y = lerp(this.y, targetY, 0.1);
      if (dist(this.x, this.y, targetX, targetY) < 5) this.toDelete = true;
      return; 
    }
    
    // 2. 들어오는 전자 애니메이션
    if (this.isEntering) {
      let targetX = 390; 
      let targetY = 215;
      this.x = lerp(this.x, targetX, 0.1);
      this.y = lerp(this.y, targetY, 0.1);
      if (dist(this.x, this.y, targetX, targetY) < 5) {
        this.isEntering = false;
        this.isFree = true; // 금속판에 도달하면 물리 엔진에 합류
      }
      return; 
    }

    if (this.isFree) {
      this.vx += fx;
      this.vy += fy;
      this.vx *= 0.60; 
      this.vy *= 0.60;
      this.x += this.vx;
      this.y += this.vy;
      
      this.y = constrain(this.y, 200, 545); 
      
      if (this.y < 235) {
        this.x = constrain(this.x, 210, 390); 
      } else if (this.y < 420) {
        this.x = constrain(this.x, 288, 312); 
      } else {
        let dy = this.y - 430; 
        if (this.x < 300) {
          let centerX = 300 - 8 - dy * Math.tan(leafAngle);
          this.x = constrain(this.x, centerX - 12, centerX + 12);
        } else {
          let centerX = 300 + 8 + dy * Math.tan(leafAngle);
          this.x = constrain(this.x, centerX - 12, centerX + 12);
        }
      }
    } 
  }
  
  draw() {
    if (!this.isFree && this.anchor && !this.isEntering && !this.isEscaping) {
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
