// 화면에 그려질 입자들을 담을 배열
let nuclei = [];
let electrons = [];

// 프로그램이 시작될 때 딱 한 번 실행되는 설정 함수
function setup() {
  createCanvas(600, 700); // 캔버스 크기 설정
  
  // 테스트용 입자 배치 (화면 중앙 금속판 위치쯤)
  nuclei.push(new Nucleus(300, 200, 'plate'));
  
  // 자유 전자 생성 (isFree = true)
  electrons.push(new Electron(310, 210, true));
}

// 초당 약 60번씩 반복 실행되며 화면을 다시 그리는 함수 (애니메이션 루프)
function draw() {
  background(255); // 배경을 매 프레임 흰색으로 지움

  // 원자핵 그리기
  for (let n of nuclei) {
    n.draw();
  }

  // 전자 위치 업데이트 및 그리기
  for (let e of electrons) {
    // TODO: 향후 여기에 대전체와의 거리/전하량에 따른 쿨롱 힘(fx, fy) 계산 로직이 들어갑니다.
    // 현재는 움직이지 않도록 0, 0을 줍니다.
    e.update(0, 0); 
    e.draw();
  }
}

// ======================================================================
// 아래에 앞서 작성한 Nucleus와 Electron 클래스 코드를 그대로 붙여넣습니다.
// ======================================================================
class Nucleus {
  constructor(x, y, region) {
    this.x = x;
    this.y = y;
    this.charge = 1;
    this.region = region; 
  }
  draw() {
    fill(255, 100, 100);
    noStroke();
    circle(this.x, this.y, 30); // 눈에 잘 띄게 크기 키움
    fill(255);
    textAlign(CENTER, CENTER);
    text('+', this.x, this.y);
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
      let targetX = this.anchorNucleus.x + fx * 5; 
      let targetY = this.anchorNucleus.y + fy * 5;
      let d = dist(this.anchorNucleus.x, this.anchorNucleus.y, targetX, targetY);
      let maxRadius = 15; 
      
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
      stroke(150, 150, 255, 150);
      strokeWeight(1);
      line(this.x, this.y, this.anchorNucleus.x, this.anchorNucleus.y);
    }
    fill(100, 100, 255);
    noStroke();
    circle(this.x, this.y, 16);
    fill(255);
    textSize(12);
    textAlign(CENTER, CENTER);
    text('-', this.x, this.y);
  }
}
