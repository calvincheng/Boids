'use strict'

const canvasElement = document.getElementById('canvas');
const ctx = canvasElement.getContext('2d');

const scale = window.devicePixelRatio;
canvasElement.width = window.innerWidth; // * scale;
canvasElement.height = window.innerHeight; // * scale;

function rotate(point, center, angle) {
  // Rotates a point with respect to a given center by an angle
  // Angle in radians
  let x = center[0] 
          + (point[0] - center[0]) * Math.cos(angle) 
          - (point[1] - center[1]) * Math.sin(angle);

  let y = center[1] 
          + (point[0] - center[0]) * Math.sin(angle) 
          - (point[1] - center[1]) * Math.cos(angle);

  return [x, y];
}

class Vector2D {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(otherVector) {
    if (!otherVector instanceof Vector2D) {
      throw (new TypeError('Argument must be a 2D Vector.'));
      return;
    }
    let newX = this.x + otherVector.x;
    let newY = this.y + otherVector.y;
    return new Vector2D(newX, newY);
  }

  sub(otherVector) {
    return this.add(otherVector.mul(-1));
  }

  mul(A) {
    // Performs scalar (dot) multiplication by A
    try {
      let newX = this.x * A;
      let newY = this.y * A;
      return new Vector2D(newX, newY);
    } catch {
      throw (new TypeError('Argument must be a scalar number'));
      return;
    }
  }

  div(A) {
    return this.mul(1 / A);
  }

  magnitude() {
    return Math.sqrt(this.x**2 + this.y**2);
  }

  angle() {
    return Math.atan2(this.y, this.x);
  }

  normalise() {
    // Returns unit vector
    let magnitude = this.magnitude();
    let newX = this.x / magnitude;
    let newY = this.y / magnitude;
    return new Vector2D(newX, newY);
  }
}

let mouse = {
  radius: 22,
  pos: new Vector2D(-this.radius, -this.radius),

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI, false);
    ctx.closePath();

    ctx.strokeStyle = '#fff';
    ctx.stroke();
  }
}

class Boid {
  constructor(x, y, vx, vy) {
    this.pos = new Vector2D(x, y);
    this.vel = new Vector2D(vx, vy);
    this.angle = this.vel.angle();

    // Physical features
    this.length = 8;
    this.theta = 25 * Math.PI / 180;
  }

  draw(ctx) {
    // Calculate orientation
    let newAngle = this.vel.angle();

    // Limit turn speed
    const turnSpeed = 0.1;
    let angleDiff = newAngle - this.angle;
    if (angleDiff > turnSpeed) {
      this.angle += turnSpeed;
    } else if (angleDiff < -0.15) {
      this.angle -= turnSpeed;
    } else {
      this.angle += angleDiff;
    }
    
    // Calculate vertices for triangle
    let center = [this.pos.x, this.pos.y];
    let _v = [this.pos.x + this.length, this.pos.y]; // "base" vector
    let v1 = rotate(_v, center, this.angle)
    let v2 = rotate(_v, center, this.theta + Math.PI + this.angle);
    let v3 = rotate(_v, center, -this.theta + Math.PI + this.angle);

    // Draw
    ctx.beginPath();
    ctx.moveTo(...v1);
    ctx.lineTo(...v2);
    ctx.lineTo(...v3);
    ctx.closePath();

    ctx.strokeStyle = '#fff';
    ctx.stroke();
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
      let dv_coh = this.calcCohesion(boid);
      let dv_sep = this.calcSeparation(boid);
      let dv_ali = this.calcAlignment(boid);
      let dv_mou = this.calcMouseAvoidance(boid);


      // Apply forces
      boid.vel = boid.vel.add(dv_coh.mul(0.002)
                              .add(dv_sep.mul(0.1))
                              .add(dv_ali.mul(0.2))
                              .add(dv_mou.mul(0.1)) 
                             );

      // Enforce speed limits
      if (boid.vel.magnitude() > speedLimit) {
        boid.vel = boid.vel.normalise().mul(speedLimit);
      }

      // Update positions
      boid.pos = boid.pos.add(boid.vel);

      // Wrap-around borders
      if (boid.pos.x <= 0 || boid.pos.x >= window.innerWidth) {
        boid.pos.x = (boid.pos.x + window.innerWidth) % window.innerWidth;
      }
      if (boid.pos.y <= 0 || boid.pos.y >= window.innerHeight) {
        boid.pos.y = (boid.pos.y + window.innerHeight) % window.innerHeight;
      }
    }
  }

  calcCohesion(boid) {
    // Calculates cohesive force to boid
    let meanPos = new Vector2D(0, 0);
    let count = 0;

    for (let otherBoid of this.population) {
      if (otherBoid === boid) continue;

      let dist = (otherBoid.pos.sub(boid.pos)).magnitude();
      if (dist > 8 && dist < 40) {
        meanPos = meanPos.add(otherBoid.pos);
        count += 1;
      }
    }

    if (count > 0) {
      meanPos = meanPos.div(count);
      return meanPos.sub(boid.pos);
    } else {
      return meanPos
    }
  }

  calcSeparation(boid) {
    // Calculates separative force to boid
    let force = new Vector2D(0, 0);

    for (let otherBoid of this.population) {
      if (otherBoid === boid) continue;

      let dist = (otherBoid.pos.sub(boid.pos)).magnitude();
      if (dist <= 18) {
        // Add to repelling force if neighbour boid is too close
        // Repelling force is inversely proportional to distance
        force = force.add( (boid.pos.sub(otherBoid.pos)).div(dist) );
      }
    }

    return force;
  }

  calcAlignment(boid) {
    // Calculates alignment force to boid
    let meanVelocity = new Vector2D(0, 0);
    let count = 0;

    for (let otherBoid of this.population) {
      if (otherBoid === boid) continue;

      let dist = (otherBoid.pos.sub(boid.pos)).magnitude();
      if (dist <= 40) {
        meanVelocity = meanVelocity.add(otherBoid.vel);
        count += 1;
      }
    }

    if (count > 0) {
      meanVelocity = meanVelocity.div(count);
    }

    return meanVelocity;
  }

  calcMouseAvoidance(boid) {
    // Calculates force needed to avoid mouse
    let dist = mouse.pos.sub(boid.pos).magnitude();
    if (dist < mouse.radius) {
      return boid.pos.sub(mouse.pos);
    }
    return new Vector2D(0, 0);
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
  let vx = Math.random() * 2 - 1;
  let vy = Math.random() * 2 - 1;
  f.population.push(new Boid(x, y, vx, vy));
}

// Animate
let lastRender = Date.now();
const fps = 90;
let rAF = requestAnimationFrame(animate);

function animate() {
  requestAnimationFrame(animate);
  let now = Date.now();
  if (now > lastRender + 1000 / fps) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    f.render(ctx);
    f.update();
    mouse.draw(ctx);
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
      let vx = Math.random() * 2 - 1;
      let vy = Math.random() * 2 - 1;
      f.population.push(new Boid(x, y, vx, vy));
    }
  } else {
    // Too many boids -- remove
    for (let i = populationDeficit; i < 0; i++) {
      f.population.pop();
    }
  }
  
  // Resume animation
  animate();
}

// Mouse events
window.addEventListener('mousemove', function(e) {
  mouse.pos.x = e.x;
  mouse.pos.y = e.y;
});

window.addEventListener('click', function(e) {
  let vx = Math.random() * 2 - 1;
  let vy = Math.random() * 2 - 1;
  f.population.push(new Boid(mouse.pos.x, mouse.pos.y, vx, vy));
});


