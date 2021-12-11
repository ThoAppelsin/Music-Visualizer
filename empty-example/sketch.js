var song
var fft
var phase
var waveEasing
var sizeEasing
var stride
var WAVE
var SIZE
var X
var Y
var sizeMin
var sizeNorm
var sizeAvg
var waveAmp
var hitSensitivityX
var hitSensitivityDecay
var lineColors
var colorIndex
var pastLines

var actionPotential
var actionThreshold
var PE
var inAction

var particles
var oldLine

var HUE

var canvas

function preload() {
  // song = loadSound('songs/Queens of the Stone Age - Villains of Circumstance.flac')
  // song = loadSound('songs/Mastodon - Black Tongue.mp3')
  // song = loadSound('songs/Massive Attack - Angel.mp3')
  // song = loadSound('songs/Corpo-Mente - Equus.mp3')
  song = loadSound('songs/Depeche Mode - Everything Counts.flac')
}

function changeSong(s) {
  song.stop()
  noLoop()
  song = loadSound(s.data)
}

function setup() {
  canvas = createCanvas(window.innerWidth - 10, window.innerHeight - 10);

  canvas.drop(changeSong)

  fft = new p5.FFT(0.8)
  stride = 32
  phase = 0
  waveEasing = 0.5
  sizeEasing = 0.2
  hitSensitivityX = 0
  hitSensitivitySkew = 0.01
  lineColors = ['red', 'green', 'blue']
  colorIndex = 0
  pastLines = []
  pastCount = 25

  PE = []

  WAVE = []
  X = []
  Y = []

  particles = []
  
  sizeMin = 50 * 1.5
  sizeNorm = 70 * 1.5
  sizeBig = 110 * 1.5

  waveAmp = 50 * 1.5

  SIZE = sizeNorm
  oldLine = []

  HUE = 0

  var wave = fft.waveform()

  angleMode(DEGREES)

  for (var i = 0; i < wave.length; i += stride) {
    var angle = map(i, 0, wave.length - 1, 40, 320)

    X[i] = sin(angle)
    Y[i] = cos(angle)
    WAVE[i] = 0
  }

  stroke(255)
  noFill()
  noLoop()
}

function draw() {
  background(0)
  
  translate(width / 2, height / 2)
  rotate(phase)
  phase += 0

  HUE += 1

  var wave = fft.waveform()
  var spectrum = fft.analyze()
  PE.push(fft.getEnergy(20, 200))

  var PED = []
  for (var i = 0; i < PE.length - 1; i++)
    PED[i] = PE[i+1] - PE[i]

  var size = 0

  var strokeColor = "white"

  if ((inAction
    && PED[PED.length-1] > -2
    && PED[PED.length-2] > -2
    )
    || (!inAction &&
      (
        (PED.length >= 3
        && PED[PED.length-1] > PED[PED.length-2]
        && PED[PED.length-2] > PED[PED.length-3]
        && PED[PED.length-3] > 0)
        || (PED.length >= 2
        && PED[PED.length-1] > PED[PED.length-2]
        && PED[PED.length-2] > 4)
        || (PED.length >= 1
        && PED[PED.length-1] > 10)
      )
    )) {
    size = logisticMap(PE[PE.length-1], sizeMin, sizeBig, 0.5, 180)
    inAction = true
    strokeColor = "red"
  }
  else {
    size = logisticMap(PE[PE.length-1], sizeMin, sizeNorm, 0.5, 180)
    if (inAction) {
      inAction = false
      PE = []
    }
  }

  for (var j = 0; j < pastLines.length; j++) {
    beginShape()
    if (strokeColor == "red") {
      colorMode(RGB, 255, 255, 255, 1)
      stroke(255, 0, 0, 0.7 * Math.pow(j / pastLines.length, 8))
    }
    else {
      colorMode(HSB)
      stroke((HUE + pastLines.length - 1 - j + 360) % 360, 100, 100, 0.7 * Math.pow(j / pastLines.length, 8))
    }
    strokeWeight(3 - j / pastLines.length)
    var pline = pastLines[j]
    for (var i = 0; i < pline.length; i++)
      curveVertex(pline[i].x, pline[i].y)
    endShape()
  }

  colorMode(RGB)

  SIZE = SIZE + (size - SIZE) * sizeEasing

  // hitSensitivityX = Math.max(Math.min(hitSensitivityX + hitSensitivitySkew * (sizeAvg - size), 2), -2)
  // hitSensitivity = logisticMap(hitSensitivitySkew * (sizeAvg - size) / 10, 0, 1, 1, 0)

  var line = []

  for (var i = 0; i < wave.length; i += stride) {
    WAVE[i] = WAVE[i] + (wave[i] - WAVE[i]) * waveEasing

    var r = WAVE[i] * waveAmp * sizeMin / SIZE + SIZE

    var x = r * X[i]
    var y = r * Y[i]
    line.push(createVector(x, y))
  }

  highEnergy = fft.getEnergy(15000, 20000)

  for (var i = 0; i < 5; i++) {
    if (random(400) < highEnergy) {
      var randomIndex = Math.floor(random(line.length))
      var randomPoint = line[randomIndex]
      var p = new Particle(randomIndex, randomPoint)
      particles.push(p)
    }
  }
  
  push()
  for (var i = 0; i < particles.length; i++) {
    particles[i].update(oldLine, line)
    particles[i].show()
  }
  pop()

  particles = particles.filter(p => !p.out())


  noFill()

  beginShape()
  stroke(strokeColor)
  for (var i = 0; i < line.length; i++)
    curveVertex(line[i].x, line[i].y)
  endShape()

  

  oldLine = line
  pastLines.push(line)
  if (pastLines.length > pastCount) {
    pastLines.splice(0, 1)
  }
}

function mouseClicked() {
  if (song.isPlaying()) {
    song.pause()
    noLoop()
  }
  else {
    song.play()
    loop()
  }
}

function logisticMap(x, minY, maxY, steepness, inflection) {
  return minY + (maxY - minY) / (1 + Math.exp(-steepness * (x - inflection)))
}

class Particle {
  constructor(lineIndex, pos) {
    this.pos = pos.mult(random(0.9, 1.1))
    this.opacity = random(255)
    this.ovel = 0
    this.oacc = random(0.1, 0.05)

    this.w = random(3, 5)
    this.wvel = 0
    this.wacc = random(0.001, 0.0005)

    this.lineIndex = lineIndex
    this.vel = createVector(0, 0)
  }
  update(oldLine, line) {
    this.ovel += this.oacc
    this.opacity -= this.ovel

    this.wvel += this.wacc
    this.w += this.wvel

    var newPos = p5.Vector.add(this.pos, this.vel)
    var posCenter = p5.Vector.lerp(this.pos, newPos, 0.5)

    if (posCenter.mag() < p5.Vector.dist(this.pos, newPos)) {
      this.opacity = 0
    }
    else {
      var lineCenter = p5.Vector.lerp(oldLine[this.lineIndex], line[this.lineIndex], 0.5)

      if (p5.Vector.dist(lineCenter, newPos) < p5.Vector.dist(lineCenter, line[this.lineIndex])) {
        this.vel = p5.Vector.sub(line[this.lineIndex], this.pos)
        this.pos = line[this.lineIndex]
      }
      else {
        this.pos = newPos
      }
    }
  }
  out() {
    return this.pos.x < -width / 2 ||
      this.pos.x >  width / 2 ||
      this.pos.y < -height / 2 ||
      this.pos.y >  height / 2 ||
      this.opacity <= 0
  }
  show() {
    noStroke()
    colorMode(RGB, 255, 255, 255, 255)
    fill(255, 255, 255, this.opacity)
    ellipse(this.pos.x, this.pos.y, this.w)
  }
}

window.onresize = function() {
  // assigns new values for width and height variables
  w = window.innerWidth;
  h = window.innerHeight;  
  canvas.size(w - 10, h - 10);
}