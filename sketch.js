// ==========================================
// 검전기 시뮬레이션 (전자 이동 로직 전면 재작성판)
// - 힘(force) 기반 N체 시뮬레이션 대신
//   "슬롯 배치 + 부드러운 이동(lerp)" 방식으로 변경
// ==========================================

let nuclei = [];      // 고정된 양이온(+) 10개 — 시각적 격자, 위치 불변
let electrons = [];   // 자유 전자 풀 (개수 4~16 가변)

let leafAngle = 0;
let targetLeafAngle = 0;
let isGrounded = false;

const BASE_TOTAL = 10;       // 중성 상태 기준 전자 개수
const BASE_LEAF_FRACTION = 0.4; // 중성일 때 박 쪽에 있는 전자 비율 (10개 중 4개 기준)
const BASE_LEAF_COUNT = BASE_TOTAL * BASE_LEAF_FRACTION; // 기준값 4

let rod = {
  x: 300,
  y: 120,
  w: 160,
  h: 40,
  isDragging: false,
  offsetX: 0,
  offsetY: 0,
  type: 'neutral'
};

// 대전체 내부에 고정 표시되는 +/- 기호 (장식용, 물리 계산에 관여 안 함)
let rodNucleiOffsets = [-50, 0, 50];
let rodElectronOffsets = [];

function setup() {
  createCanvas(600, 700);

  // 고정 양이온 10개 (판 4 + 줄기 2 + 박 4) — 원본과 동일한 위치
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

  // 초기 자유 전자 10개 (중성 상태)
  for (let i = 0; i < BASE_TOTAL; i++) {
    electrons.push(new Electron(300 + random(-40, 40), 300 + random(-20, 20)));
  }

  setRodType('neutral');
}

function draw() {
  background(245);

  drawUI();

  // ------------------------------------------------
  // 1) 접지 상태일 때 전자 총량을 목표치로 서서히 조절
  //    (버그 수정 핵심: 배열에 들어간 순간 바로 카운트되므로
  //     목표치를 넘어서 과다 생성되는 일이 없음)
  // ------------------------------------------------
  if (isGrounded && frameCount % 6 === 0) {
    let target = BASE_TOTAL;
    if (rod.type === 'positive') target = 16; // 양전하 대전체 → 지구에서 전자 유입
    if (rod.type === 'negative') target = 4;  // 음전하 대전체 → 전자가 지구로 유출

    let activeCount = electrons.filter(e => !e.leaving).length;

    if (activeCount < target) {
      // 지구(접지선 끝)에서 전자 하나 유입 — 생성 즉시 activeCount에 반영됨
      electrons.push(new Electron(480, 276));
    } else if (activeCount > target) {
      // 활성 전자 중 하나를 골라 '떠나는 중' 표시 (즉시 activeCount에서 제외됨)
      for (let i = electrons.length - 1; i >= 0; i--) {
        if (!electrons[i].leaving) { electrons[i].leaving = true; break; }
      }
    }
  }

  electrons = electrons.filter(e => !e.toDelete);

  // ------------------------------------------------
  // 2) 현재 전자 총량 + 대전체 유도 효과로 "박 쪽으로 가야 할 전자 수" 계산
  // ------------------------------------------------
  let activeElectrons = electrons.filter(e => !e.leaving);
  let total = activeElectrons.length;

  let leafFraction = BASE_LEAF_FRACTION;
  if (!isGrounded && rod.type !== 'neutral') {
    // 대전체가 가까울수록(= rod.y가 170에 가까울수록) 유도 효과가 강해짐
    let closeness = constrain(map(rod.y, 90, 170, 0, 1), 0, 1);
    let maxShift = 0.35;
    let shift = closeness * maxShift;
    // 양(+)전하는 전자를 판 쪽(자기 자신)으로 끌어당김 → 박 쪽 비율 감소
    // 음(-)전하는 전자를 밀어냄 → 박 쪽 비율 증가
    leafFraction = (rod.type === 'positive') ? BASE_LEAF_FRACTION - shift
                                              : BASE_LEAF_FRACTION + shift;
    leafFraction = constrain(leafFraction, 0.05, 0.95);
  }

  let leafCount = round(total * leafFraction);
  leafCount = constrain(leafCount, 0, total);
  let nonLeafCount = total - leafCount;

  // ------------------------------------------------
  // 3) 박 벌어지는 각도 계산
  //    - 접지 중엔 무조건 0 (전위차 없음)
  //    - 아니면 기준값(4)과의 편차로 계산
  //      → 유도 효과(재분배) & 대전 후 총량 변화(영구 대전) 둘 다 자동 반영됨
  // ------------------------------------------------
  if (isGrounded) {
    targetLeafAngle = 0;
  } else {
    let diff = leafCount - BASE_LEAF_COUNT;
    targetLeafAngle = constrain(abs(diff) * 0.4, 0, PI / 4);
  }
  leafAngle = lerp(leafAngle, targetLeafAngle, 0.1);

  // 고정 양이온(리프 부분)도 각도에 맞춰 회전
  for (let n of nuclei) {
    if (n.region === 'leaf_L') {
      n.x = 300 - 8 * cos(leafAngle) - n.distY * sin(leafAngle);
      n.y = 430 - 8 * sin(leafAngle) + n.distY * cos(leafAngle);
    } else if (n.region === 'leaf_R') {
      n.x = 300 + 8 * cos(-leafAngle) - n.distY * sin(-leafAngle);
      n.y = 430 + 8 * sin(-leafAngle) + n.distY * cos(-leafAngle);
    }
  }

  // ------------------------------------------------
  // 4) 활성 전자들에게 슬롯(목표 좌표) 배정
  // ------------------------------------------------
  assignElectronSlots(activeElectrons, nonLeafCount, leafCount);

  // ------------------------------------------------
  // 5) 그리기
  // ------------------------------------------------
  drawGroundWire();
  drawElectroscopeBody();
  drawRod();
  drawStemVectors();

  for (let n of nuclei) n.draw();

  for (let e of electrons) {
    e.update();
    e.draw();
  }
}

// ----------------------------------------------------
// 전자 슬롯 배치 로직 (핵심 재작성 부분)
// ----------------------------------------------------
function assignElectronSlots(activeElectrons, nonLeafCount, leafCount) {
  let plateCount = min(nonLeafCount, 4);
  let stemCount = nonLeafCount - plateCount;

  let idx = 0;

  // 판(plate) 영역
  for (let i = 0; i < plateCount; i++) {
    let e = activeElectrons[idx++];
    let t = plateCount > 1 ? i / (plateCount - 1) : 0.5;
    e.targetX = lerp(222, 378, t) + e.jitterX;
    e.targetY = 215 + e.jitterY * 0.4;
  }

  // 줄기(stem) 영역
  for (let i = 0; i < stemCount; i++) {
    let e = activeElectrons[idx++];
    let t = stemCount > 1 ? i / (stemCount - 1) : 0.5;
    e.targetX = 300 + e.jitterX * 0.5;
    e.targetY = lerp(248, 408, t);
  }

  // 박(leaf) 영역 — 좌/우로 절반씩 분배
  let leftCount = ceil(leafCount / 2);
  let rightCount = leafCount - leftCount;
  let leftDone = 0, rightDone = 0;

  for (let i = 0; i < leafCount; i++) {
    let e = activeElectrons[idx++];
    let side, sideIndex, sideTotal;
    if (i % 2 === 0 && leftDone < leftCount) {
      side = -1; sideIndex = leftDone++; sideTotal = leftCount;
    } else if (rightDone < rightCount) {
      side = 1; sideIndex = rightDone++; sideTotal = rightCount;
    } else {
      side = -1; sideIndex = leftDone++; sideTotal = leftCount;
    }
    let t = sideTotal > 1 ? sideIndex / (sideTotal - 1) : 0.5;
    let distY = lerp(15, 105, t);
    let baseX = 300, baseY = 430;
    if (side === -1) {
      e.targetX = baseX - 8 * cos(leafAngle) - distY * sin(leafAngle) + e.jitterX * 0.4;
      e.targetY = baseY - 8 * sin(leafAngle) + distY * cos(leafAngle);
    } else {
      e.targetX = baseX + 8 * cos(-leafAngle) - distY * sin(-leafAngle) + e.jitterX * 0.4;
      e.targetY = baseY + 8 * sin(-leafAngle) + distY * cos(-leafAngle);
    }
  }
}

// ----------------------------------------------------
// UI 및 렌더링 함수 (원본과 동일)
// ----------------------------------------------------
function drawUI() {
  drawBtn(120, 40, "중성 (0)", rod.type === 'neutral');
  drawBtn(300, 40, "(+) 대전체", rod.type === 'positive');
  drawBtn(480, 40, "(-) 대전체", rod.type === 'negative');
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

function drawGroundWire() {
  if (!isGrounded) return;
  push();
  stroke(120, 200, 120);
  strokeWeight(4);
  noFill();

  beginShape();
  vertex(400, 215);
  vertex(480, 215);
  vertex(480, 260);
  endShape();

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

  drawArrow(leftX, centerY + upLen / 2, leftX, centerY - upLen / 2, color(240, 90, 90));
  fill(240, 90, 90); noStroke(); textAlign(CENTER); textSize(14);
  text("인력", leftX, centerY + upLen / 2 + 20);

  drawArrow(rightX, centerY - downLen / 2, rightX, centerY + downLen / 2, color(70, 130, 240));
  fill(70, 130, 240); noStroke(); textAlign(CENTER); textSize(14);
  text("척력", rightX, centerY - downLen / 2 - 10);
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
  rodElectronOffsets = [];
  if (type === 'neutral') rodElectronOffsets = [-50, 0, 50];
  else if (type === 'positive') rodElectronOffsets = [0];
  else if (type === 'negative') rodElectronOffsets = [-60, -30, 0, 30, 60];
}

function drawRod() {
  rectMode(CENTER);
  stroke(150);
  strokeWeight(2);
  fill(250, 250, 210, 220);
  rect(rod.x, rod.y, rod.w, rod.h, 8);

  fill(240, 90, 90);
  noStroke();
  for (let ox of rodNucleiOffsets) {
    circle(rod.x + ox, rod.y, 22);
    fill(255);
    textSize(14);
    textAlign(CENTER, CENTER);
    text('+', rod.x + ox, rod.y - 1);
    fill(240, 90, 90);
  }

  fill(70, 130, 240);
  for (let ox of rodElectronOffsets) {
    circle(rod.x + ox, rod.y + 12, 16);
    fill(255);
    textSize(12);
    textAlign(CENTER, CENTER);
    text('-', rod.x + ox, rod.y + 11);
    fill(70, 130, 240);
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
  if (mouseY > 20 && mouseY < 60) {
    if (mouseX > 60 && mouseX < 180) setRodType('neutral');
    if (mouseX > 240 && mouseX < 360) setRodType('positive');
    if (mouseX > 420 && mouseX < 540) setRodType('negative');
    return;
  }

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

// ----------------------------------------------------
// 클래스
// ----------------------------------------------------
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

// 전자: 물리력 없이, 매 프레임 배정된 targetX/targetY로 부드럽게 이동만 함
class Electron {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.leaving = false;
    this.toDelete = false;
    // 겹침 방지용 고정 지터 (전자 생성 시 한 번만 결정)
    this.jitterX = random(-6, 6);
    this.jitterY = random(-4, 4);
  }

  update() {
    if (this.leaving) {
      // 접지선을 통해 지구로 빠져나감
      this.x = lerp(this.x, 480, 0.12);
      this.y = lerp(this.y, 276, 0.12);
      if (dist(this.x, this.y, 480, 276) < 4) this.toDelete = true;
      return;
    }
    // 배정된 슬롯 위치로 부드럽게 이동 (신규 유입 전자는 지구 위치에서 시작해 자연스럽게 흘러들어옴)
    this.x = lerp(this.x, this.targetX, 0.08);
    this.y = lerp(this.y, this.targetY, 0.08);
  }

  draw() {
    fill(70, 130, 240);
    noStroke();
    circle(this.x, this.y, 16);
    fill(255);
    textSize(12);
    textAlign(CENTER, CENTER);
    text('-', this.x, this.y - 1);
  }
}
