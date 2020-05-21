'use strict'

const canvasElement = document.getElementById('canvas');
const ctx = canvasElement.getContext('2d');

const scale = window.devicePixelRatio;
canvasElement.width = window.innerWidth; // * scale;
canvasElement.height = window.innerHeight; // * scale;

function rotate(point, center, angle) {
  let x1 = point[0] - center[0];
  let y1 = point[1] - center[1];

  let x2 = x1 * Math.cos(angle) - y1 * Math.sin(angle);
  let y2 = x1 * Math.sin(angle) - y1 * Math.cos(angle);

  let rotatedPoint = [x2 + center[0], y2 + center[1]];
  return rotatedPoint;
}

class Boid {
  constructor(x, y, v) {
    this.x = x;
    this.y = y;
    this.v = v;
  }

  draw(ctx) {
    const width = 8;
    const height = 12;

    let angle = Math.atan2(this.v[1], this.v[0])

//     let v1 = [this.x, this.y - height / 2];
//     let v2 = [this.x - width / 2, this.y + height / 2];
//     let v3 = [this.x + width / 2, this.y + height / 2];
// 
//     ctx.beginPath();
//     ctx.moveTo(...v1);
//     ctx.lineTo(...v2);
//     ctx.lineTo(...v3);
//     ctx.lineTo(...v1);
//     ctx.closePath();

    ctx.beginPath();
    ctx.arc(this.x, this.y, 4, 0, 2*Math.PI, false);
    ctx.closePath();

    ctx.fillStyle = '#fff';
    ctx.fill();
    
  }
}

class Flock {
  constructor(population) {
    this.population = population;
  }

  render(ctx) {
    for (let boid of this.population) {
      boid.draw(ctx);
    }
  }

  update() {
    for (let boid of this.population) {
      let dv_coh = this.calcCohesion(boid);
      let dv_sep = this.calcSeparation(boid);
      let dv_ali = [0, 0]; //this.calcAlignment(boid);
      boid.v[0] += (dv_coh[0] + dv_sep[0] + dv_ali[0]);
      boid.v[1] += (dv_coh[1] + dv_sep[1] + dv_ali[1]);

      boid.x += boid.v[0];
      boid.y += boid.v[1];
    }
  }

  calcCohesion(boid) {
    // Calculates cohesive force to boid
    let meanX = 0;
    let meanY = 0;

    for (let otherBoid of this.population) {
      if (otherBoid === boid) continue;
      meanX += otherBoid.x;
      meanY += otherBoid.y;
    }

    meanX /= (this.population.length - 1);
    meanY /= (this.population.length - 1);

    let dv = [(meanX - boid.x) / 1000, (meanY - boid.y) / 1000];
    return dv;
  }

  calcSeparation(boid) {
    // Calculates separative force to boid
    let dv = [0, 0];

    for (let otherBoid of this.population) {
      if (otherBoid === boid) continue;
      let dist = Math.sqrt( (otherBoid.x - boid.x) ** 2 
                            + (otherBoid.y - boid.y) ** 2 );
      if (dist <= 5) {
        // Add to repelling force if neighbour boid is too close
        dv[0] += ((boid.x - otherBoid.x) / 500);
        dv[1] += ((boid.y - otherBoid.y) / 500);
      }
    }

    return dv;
  }

  calcAlignment(boid) {
    // Calculates alignment force to boid
    let meanVx = 0;
    let meanVy = 0;

    for (let otherBoid of this.population) {
      if (otherBoid === boid) continue;

      let dist = Math.sqrt( (otherBoid.x - boid.x) ** 2 
                            + (otherBoid.y - boid.y) ** 2 );
      if (dist <= 400) {
        meanVx += otherBoid.v[0];
        meanVy += otherBoid.v[1];
      }

    meanVx /= (this.population.length - 1);
    meanVy /= (this.population.length - 1);
    }

    let dv = [meanVx / 200, meanVy / 200];
    return dv;
  }

}

let f = new Flock([]);
// Populate flock
const POPULATION_SIZE = 30;
for (let i = 0; i < POPULATION_SIZE; i++) {
  let x = 300 + Math.random(); //Math.random() * window.innerWidth;
  let y = 300 + Math.random(); //Math.random() * window.innerHeight;
  let v = [1, 0]; //[Math.random() * 3 - 1.5, Math.random() * 3 - 1.5];
  f.population.push(new Boid(x, y, v));
}

function animate() {
  requestAnimationFrame(animate);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  f.render(ctx);
  f.update();
}

animate();


