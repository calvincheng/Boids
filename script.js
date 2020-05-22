'use strict'

const canvasElement = document.getElementById('canvas');
const ctx = canvasElement.getContext('2d');

const scale = window.devicePixelRatio;
canvasElement.width = window.innerWidth; // * scale;
canvasElement.height = window.innerHeight; // * scale;

function rotate(point, center, angle) {
  let x = center[0] 
          + (point[0] - center[0]) * Math.cos(angle) 
          - (point[1] - center[1]) * Math.sin(angle);

  let y = center[1] 
          + (point[0] - center[0]) * Math.sin(angle) 
          - (point[1] - center[1]) * Math.cos(angle);

  return [x, y];
}

let mouse = {
  x: 0,
  y: 0,
  radius: 24,
}

class Boid {
  constructor(x, y, v) {
    this.x = x;
    this.y = y;
    this.v = v;
  }

  draw(ctx) {
    const radius = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, 2 * Math.PI, false);
    ctx.closePath();

    ctx.fillStyle = '#eee';
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
      const speedLimit = 2;
      // Calculate forces

      // Base rules
      let dv_coh = this.calcCohesion(boid);
      let dv_sep = this.calcSeparation(boid);
      let dv_ali = this.calcAlignment(boid);

      // Added rules
      let dv_mou = this.calcMouseAvoidance(boid);

      // Apply forces
      boid.v[0] += (0.003 * dv_coh[0] + 0.1 * dv_sep[0] 
                    + 0.08 * dv_ali[0] + 0.1 * dv_mou[0] 
                    + Math.random() * 0.6 - 0.3);
      boid.v[1] += (0.003 * dv_coh[1] + 0.1 * dv_sep[1] 
                    + 0.08 * dv_ali[1] + 0.1 * dv_mou[1] 
                    + Math.random() * 0.6 - 0.3);

      // Enforce speed limits
      if (boid.v[0] > speedLimit) {
        boid.v[0] = speedLimit;
      } else if (boid.v[0] < -speedLimit) {
        boid.v[0] = -speedLimit;
      }

      if (boid.v[1] > speedLimit) {
        boid.v[1] = speedLimit;
      } else if (boid.v[1] < -speedLimit) {
        boid.v[1] = -speedLimit;
      }

      // Update positions
      boid.x += boid.v[0];
      boid.y += boid.v[1];
      if (boid.x <= 0 || boid.x >= window.innerWidth) {
        boid.x = (boid.x + window.innerWidth) % window.innerWidth;
      }
      if (boid.y <= 0 || boid.y >= window.innerHeight) {
        boid.y = (boid.y + window.innerHeight) % window.innerHeight;
      }
    }
  }

  calcCohesion(boid) {
    // Calculates cohesive force to boid
    let meanX = 0;
    let meanY = 0;
    let count = 0;

    for (let otherBoid of this.population) {
      if (otherBoid === boid) continue;

      let dist = Math.sqrt((otherBoid.x - boid.x)**2 + (otherBoid.y - boid.y)**2);
      if (dist > 8 && dist < 60) {
        meanX += otherBoid.x;
        meanY += otherBoid.y;
        count += 1;
      }
    }

    if (count > 0) {
      meanX /= (count);
      meanY /= (count);
      return [meanX - boid.x, meanY - boid.y];
    }
    return [0, 0];
  }

  calcSeparation(boid) {
    // Calculates separative force to boid
    let dv = [0, 0];

    for (let otherBoid of this.population) {
      if (otherBoid === boid) continue;
      let dist = Math.sqrt( (otherBoid.x - boid.x) ** 2 
                            + (otherBoid.y - boid.y) ** 2 );
      if (dist <= 14) {
        // Add to repelling force if neighbour boid is too close
        dv[0] += (boid.x - otherBoid.x) / dist;
        dv[1] += (boid.y - otherBoid.y) / dist;
      }
    }

    return dv;
  }

  calcAlignment(boid) {
    // Calculates alignment force to boid
    let meanVx = 0;
    let meanVy = 0;
    let count = 0;

    for (let otherBoid of this.population) {
      if (otherBoid === boid) continue;

      let dist = Math.sqrt((otherBoid.x - boid.x)**2 + (otherBoid.y - boid.y)**2);
      if (dist <= 60) {
        meanVx += otherBoid.v[0];
        meanVy += otherBoid.v[1];
        count += 1;
      }
    }

    if (count > 0) {
      meanVx /= count;
      meanVy /= count;
      return [meanVx, meanVy];
    }
    return [0, 0];
  }

  calcMouseAvoidance(boid) {
    // Calculates force needed to avoid mouse
    let dist = Math.sqrt((mouse.x - boid.x)**2 + (mouse.y - boid.y)**2);
    if (dist < mouse.radius) {
      return [boid.x - mouse.x, boid.y - mouse.y];
    }
    return [0, 0];
  }

}

/**** DRIVER CODE ****/

// Populate flock
let f = new Flock([]);
const populationDensity = 3000;
let populationSize = Math.floor(
  window.innerHeight * window.innerWidth / populationDensity
);

for (let i = 0; i < populationSize; i++) {
  let x = Math.random() * window.innerWidth;
  let y = Math.random() * window.innerHeight;
  let v = [Math.random() * 2 - 1, Math.random() * 2 - 1];
  f.population.push(new Boid(x, y, v));
}

// Animate
let lastRender = 0;
const fps = 90;
let rAF = requestAnimationFrame(animate);

function animate() {
  requestAnimationFrame(animate);
  let now = Date.now();
  if (now > lastRender + 1000 / fps) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    f.render(ctx);
    f.update();
    lastRender = now;
  }
}

animate();

// Handle window resizing
window.onresize = function() {
  // Stop animation
  cancelAnimationFrame(rAF);

  // Resize canvas
  canvasElement.width = window.innerWidth;
  canvasElement.height = window.innerHeight;

  // Adjust population
  populationSize = Math.floor(
    window.innerHeight * window.innerWidth / populationDensity
  );
  let populationDeficit = populationSize - f.population.length;

  if (populationDeficit > 0) {
    // Not enough boids -- add
    for (let i = 0; i < populationDeficit; i++) {
      let x = Math.random() * window.innerWidth;
      let y = Math.random() * window.innerHeight;
      let v = [Math.random() * 2 - 1, Math.random() * 2 - 1];
      f.population.push(new Boid(x, y, v));
    }
  } else {
    // Too many boids -- remove
    for (let i = populationDeficit; i < 0; i++) {
      f.population.pop();
    }
  }
  console.log(populationSize, f.population.length);
  
  // Resume animation
  animate();
}

// Get mouse position

window.addEventListener('mousemove', function(e) {
  mouse.x = e.x;
  mouse.y = e.y;
});

window.addEventListener('click', function(e) {
  let v = [Math.random() * 2 - 1, Math.random() * 2 - 1];
  f.population.push(new Boid(mouse.x, mouse.y, v));
});


