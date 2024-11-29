let width = 0;
let height = 0;

let qvga = {width: {exact: 320}, height: {exact: 240}};

let vga = {width: {exact: 640}, height: {exact: 480}};

const list_logos = [
  {
      name: "BOI",
      url: "https://storage.googleapis.com/avatar-system/test/Logos/BOI_black_cropped.jpg",
      threshold: 0.6,
      greyscale_threshold: 80,
      scale: 1.3
  },
  {
      name: "AXIS",
      url: "https://storage.googleapis.com/avatar-system/test/Logos/Logos%20_Axis-Bank_cropped.jpg",
      threshold: 0.53,
      greyscale_threshold: 100,
      scale: 1.5
  },
  {
      name: "hdfc",
      url: "https://storage.googleapis.com/avatar-system/test/Logos/Logos%20_HDFC_cropped.jpg",
      threshold: 0.51,
      greyscale_threshold: 100,
      scale: 1.6
  },
  {
      name: "SBI",
      url: "https://storage.googleapis.com/avatar-system/test/Logos/Logos%20_SBI-1_inverted.jpg",
      threshold: 0.55,
      greyscale_threshold: 100,
      scale: 1.6
  },
];

const list_rupay_symbols = [
  {
      name: "Rupay",
      url: "https://storage.googleapis.com/avatar-system/test/Logos/Rupay_white_cropped%20(1).jpg",
      threshold: 0.6,
      greyscale_threshold: 80,
      scale: 0.8
  },
  {
      name: "Rupay",
      url: "https://storage.googleapis.com/avatar-system/test/Logos/Rupay_black_cropped.jpg",
      threshold: 0.6,
      greyscale_threshold: 200,
      scale: 0.7
  },

];

const list_nfc_symbols = [
  {
      name: "NFC",
      url: "https://storage.googleapis.com/avatar-system/test/Logos/NFC_black.jpg",
      threshold: 0.53,
      greyscale_threshold: 80,
      scale: 0.56
  },
  {
      name: "NFC",
      url: "https://storage.googleapis.com/avatar-system/test/Logos/NFC_white.jpg",
      threshold: 0.53,
      greyscale_threshold: 80,
      scale: 0.8
  },

];

let resolution = qvga;

let streaming = false;

let video = document.getElementById("video");
let stream = null;
let vc = null;

let info = document.getElementById('info');
let container = document.getElementById('container');

function loadImageFromUrl(url, callback) {
  let img = new Image();
  img.crossOrigin = "Anonymous";
  img.onload = function() {
    let mat = cv.imread(img);
    callback(mat);
  };
  img.src = url;
}

let logoMats = [];
let rupayMats = [];
let NFCMats = [];
let precomputedLogos = [];
let precomputedRupay = [];
let precomputedNFC = [];

function startCamera() {
  let imagesLoaded = 0;


  list_logos.forEach(logo => {
    loadImageFromUrl(logo.url, function(mat) {
      console.log("received", logo.name);
      let processedMat = preprocessTemplate(mat, logo.greyscale_threshold);
      logoMats.push({name: logo.name, mat: processedMat, threshold: logo.threshold, scale: logo.scale, greyscale_threshold: logo.greyscale_threshold});
      precomputeScalesAndRotations(logo, processedMat);
      imagesLoaded++;
      if (imagesLoaded === list_logos.length) {
        get_rupay();
      }
    });
  });

function get_rupay(){
  imagesLoaded = 0;
  list_rupay_symbols.forEach(symbol => {
  loadImageFromUrl(symbol.url, function(mat) {
    console.log("received", symbol.name);
    let processedMat = preprocessTemplate(mat, symbol.greyscale_threshold);
    rupayMats.push({name: symbol.name, mat: processedMat, threshold: symbol.threshold, scale: symbol.scale, greyscale_threshold: symbol.greyscale_threshold});
    precomputeScalesAndRotationsRupay(symbol, processedMat);
    imagesLoaded++;
    if (imagesLoaded === list_rupay_symbols.length) {
      get_NFC();
    }
  });
});
}
function get_NFC(){
  imagesLoaded = 0;
  list_nfc_symbols.forEach(symbol => {
  loadImageFromUrl(symbol.url, function(mat) {
    console.log("received", symbol.name);
    let processedMat = preprocessTemplate(mat, symbol.greyscale_threshold);
    NFCMats.push({name: symbol.name, mat: processedMat, threshold: symbol.threshold, scale: symbol.scale, greyscale_threshold: symbol.greyscale_threshold});
    precomputeScalesAndRotationsNFC(symbol, processedMat);
    imagesLoaded++;
    if (imagesLoaded === list_rupay_symbols.length) {
      proceedWithCamera();
    }
  });
});
}
  function proceedWithCamera() {
    // cv.imshow("canvasOutput2", rupayMats[0].mat);
    if (streaming) return;
    navigator.mediaDevices.getUserMedia({video: resolution, audio: false})
      .then(function(s) {
      stream = s;
      video.srcObject = s;
      video.play();
    })
      .catch(function(err) {
      console.log("An error occurred! " + err);
    });

    video.addEventListener("canplay", function(ev){
      if (!streaming) {
        height = video.videoHeight;
        width = video.videoWidth;
        video.setAttribute("width", width);
        video.setAttribute("height", height);
        streaming = true;
        vc = new cv.VideoCapture(video);
      }
      startVideoProcessing();
    }, false);
  }
}

function precomputeScalesAndRotations(logo, mat) {
  let scales = [0.3, 0.25,0.15];
  let angles = [0];
  let resizedLogo = new cv.Mat();
  let rotatedLogo = new cv.Mat();

  scales.forEach(scale => {
    scale= logo.scale * scale;
    angles.forEach(angle => {

      cv.resize(mat, resizedLogo, new cv.Size(),  scale,  scale, cv.INTER_LINEAR);
      let rotationMatrix = cv.getRotationMatrix2D(new cv.Point(resizedLogo.cols / 2, resizedLogo.rows / 2), angle, 1.0);
      cv.warpAffine(resizedLogo, rotatedLogo, rotationMatrix, new cv.Size(resizedLogo.cols, resizedLogo.rows));
      precomputedLogos.push({name: logo.name, mat: rotatedLogo.clone(), threshold: logo.threshold, scale:  scale, angle: angle});
    });
  });

  resizedLogo.delete();
  rotatedLogo.delete();
}

function precomputeScalesAndRotationsRupay(logo, mat) {
  let scales = [0.35,0.30,0.25];
  let angles = [0];
  let resizedLogo = new cv.Mat();
  let rotatedLogo = new cv.Mat();

  scales.forEach(scale => {
    scale= logo.scale * scale;
    angles.forEach(angle => {

      cv.resize(mat, resizedLogo, new cv.Size(),  scale,  scale, cv.INTER_LINEAR);
      let rotationMatrix = cv.getRotationMatrix2D(new cv.Point(resizedLogo.cols / 2, resizedLogo.rows / 2), angle, 1.0);
      cv.warpAffine(resizedLogo, rotatedLogo, rotationMatrix, new cv.Size(resizedLogo.cols, resizedLogo.rows));
      precomputedRupay.push({name: logo.name, mat: rotatedLogo.clone(), threshold: logo.threshold, scale:  scale, angle: angle});
    });
  });

  resizedLogo.delete();
  rotatedLogo.delete();
}
function precomputeScalesAndRotationsNFC(logo, mat) {
  let scales = [0.4,0.35,0.3];
  let angles = [0,-10,10];
  let resizedLogo = new cv.Mat();
  let rotatedLogo = new cv.Mat();

  scales.forEach(scale => {
    scale= logo.scale * scale;
    angles.forEach(angle => {

      cv.resize(mat, resizedLogo, new cv.Size(),  scale,  scale, cv.INTER_LINEAR);
      let rotationMatrix = cv.getRotationMatrix2D(new cv.Point(resizedLogo.cols / 2, resizedLogo.rows / 2), angle, 1.0);
      cv.warpAffine(resizedLogo, rotatedLogo, rotationMatrix, new cv.Size(resizedLogo.cols, resizedLogo.rows));
      precomputedNFC.push({name: logo.name, mat: rotatedLogo.clone(), threshold: logo.threshold, scale:  scale, angle: angle});
    });
  });

  resizedLogo.delete();
  rotatedLogo.delete();
}

let vid =null
let src = null;
let dstC1 = null;
let dstC3 = null;
let dstC4 = null;

function startVideoProcessing() {
  if (!streaming) { console.warn("Please startup your webcam"); return; }
  stopVideoProcessing();
  src = new cv.Mat(height, width, cv.CV_8UC4);
  dstC1 = new cv.Mat(height, width, cv.CV_8UC1);
  dstC3 = new cv.Mat(height, width, cv.CV_8UC3);
  dstC4 = new cv.Mat(height, width, cv.CV_8UC4);
  vid =new cv.Mat(height, width, cv.CV_8UC4);
  requestAnimationFrame(processVideo);
}

function preprocessTemplate(src, greyscale_threshold) {
  let result;
  result = gray(src);
  result = threshold(result, greyscale_threshold);
  return result;
}

function gray(src) {
  cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY);
  return src;
}

function dilate(src, kernal_size = 2) {
  let ksize = new cv.Size(kernal_size, kernal_size);
  let anchor = new cv.Point(-1, -1);
  let kernel = cv.getStructuringElement(cv.MORPH_RECT, ksize);
  cv.dilate(src, src, kernel, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
  return src;
}

function threshold(src, threshold = 80) {
  cv.threshold(src, src, threshold, 255, cv.THRESH_BINARY);
  return src;
}

function multiScaleTemplateMatching(src,pc) {
  let bestMatch = {name: null, maxVal: 0, scale: 1, angle: 0, matchLoc: null};

  let result = new cv.Mat();
  for (let i = 0; i < pc.length; i++) {
    let logo = pc[i];
    cv.matchTemplate(src, logo.mat, result, cv.TM_CCOEFF_NORMED);
    let minMax = cv.minMaxLoc(result);
    if (typeof minMax.maxVal === 'number' && minMax.maxVal > logo.threshold) {
      bestMatch = {
        name: logo.name,
        maxVal: minMax.maxVal,
        scale: logo.scale,
        angle: logo.angle,
        matchLoc: minMax.maxLoc,
        threshold: logo.threshold
      };
      break;
    }
  }
  result.delete();
  
  return bestMatch;
}

function drawBoundingBox(src, match) {
  if (src.type() === cv.CV_8UC1) {
    cv.cvtColor(src, src, cv.COLOR_GRAY2RGBA);
  }

  if (match.name && match.maxVal > match.threshold) {
    let point1 = new cv.Point(match.matchLoc.x, match.matchLoc.y);
    let point2 = new cv.Point(match.matchLoc.x + logoMats[0].mat.cols * match.scale, match.matchLoc.y + logoMats[0].mat.rows * match.scale);
    cv.rectangle(src, point1, point2, [0, 255, 0, 255], 2);
    cv.putText(src, match.name, new cv.Point(match.matchLoc.x, match.matchLoc.y - 10), cv.FONT_HERSHEY_SIMPLEX, 0.5, [0, 255, 0, 255], 2);
  }
}


function processVideo() {
  stats.begin();
  vc.read(src);
  console.log(vid.type() === cv.CV_8UC4);
  src.copyTo(vid);
  let result;
  result = dilate(threshold(gray(vid), 150));
  let bm1 = multiScaleTemplateMatching(result,precomputedRupay);
  let bm2 = multiScaleTemplateMatching(result,precomputedNFC);
if(bm1.name == "Rupay" ||  bm2.name == "NFC")
{  let bm = multiScaleTemplateMatching(result,precomputedLogos);

  drawBoundingBox(src, bm);
}
  drawBoundingBox(src, bm1);
  drawBoundingBox(src, bm2);
  // console.log(bm);
  cv.imshow("canvasOutput", src);
  stats.end();
  requestAnimationFrame(processVideo);
}

function stopVideoProcessing() {
  if (src != null && !src.isDeleted()) src.delete();
  if (dstC1 != null && !dstC1.isDeleted()) dstC1.delete();
  if (dstC3 != null && !dstC3.isDeleted()) dstC3.delete();
  if (dstC4 != null && !dstC4.isDeleted()) dstC4.delete();
}

function stopCamera() {
  if (!streaming) return;
  stopVideoProcessing();
  document.getElementById("canvasOutput").getContext("2d").clearRect(0, 0, width, height);
  video.pause();
  video.srcObject = null;
  stream.getVideoTracks()[0].stop();
  streaming = false;
}

var stats = null;

function initUI() {
  stats = new Stats();
  stats.showPanel(0);
  document.getElementById('container').appendChild(stats.domElement);
}

function opencvIsReady() {
  console.log('OpenCV.js is ready');
  if (!featuresReady) {
    console.log('Required features are not ready.');
    return;
  }
  info.innerHTML = '';
  container.className = '';
  initUI();
  startCamera();
}
