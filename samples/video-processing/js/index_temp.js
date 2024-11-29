// Initial width and height calculations remain the same
let width = window.innerWidth - 40;
let height = Math.floor((width * 3) / 5);

if (height > window.innerHeight - 40) {
    height = window.innerHeight - 40;
    width = Math.floor((height * 5) / 3);
}

let resolution = {
    width: {exact: width},
    height: {exact: height}
};

// Logo detection state flags
let rupayLogoDetected = false;
let nfcLogoDetected = false;
let bankLogoDetected = false;

// Current detection mode
let currentMode = 'RUPAY'; // Starts with RUPAY detection
let isProcessing = true; // Flag to control video processing

function cleanupMatrices() {
    // Properly clean up existing matrices
    logoMats.forEach(logo => {
        if (logo.mat && !logo.mat.isDeleted()) {
            logo.mat.delete();
        }
    });
    
    precomputedLogos.forEach(logo => {
        if (logo.mat && !logo.mat.isDeleted()) {
            logo.mat.delete();
        }
    });
    
    logoMats = [];
    precomputedLogos = [];
}

function startCamera() {
    cleanupMatrices();
    startCameraForRupay();
}

const list_logos = [
  {
    name: "BOI",
    url: "https://storage.googleapis.com/avatar-system/test/Logos/BOI_black_cropped.jpg",
    threshold: 0.6,
    greyscale_threshold: 80,
    scale: 1.3,
    type: "BANK"
  },
  {
    name: "AXIS",
    url: "https://storage.googleapis.com/avatar-system/test/Logos/Logos%20_Axis-Bank_cropped.jpg",
    threshold: 0.53,
    greyscale_threshold: 100,
    scale: 1.5,
    type: "BANK"
  },
  {
    name: "hdfc",
    url: "https://storage.googleapis.com/avatar-system/test/Logos/Logos%20_HDFC_cropped.jpg",
    threshold: 0.51,
    greyscale_threshold: 100,
    scale: 1.8,
    type: "BANK"
  },
  {
    name: "SBI",
    url: "https://storage.googleapis.com/avatar-system/test/Logos/Logos%20_SBI-1_inverted.jpg",
    threshold: 0.55,
    greyscale_threshold: 100,
    scale: 1.8,
    type: "BANK"
  },
];

const list_rupay_symbols = [
  {
    name: "Rupay",
    url: "https://storage.googleapis.com/avatar-system/test/Logos/Rupay_white_cropped.jpg",
    threshold: 0.6,
    greyscale_threshold: 80,
    scale: 1,
    type: "RUPAY"
  },
  {
    name: "Rupay",
    url: "https://storage.googleapis.com/avatar-system/test/Logos/Rupay_black_cropped.jpg",
    threshold: 0.6,
    greyscale_threshold: 200,
    scale: 1,
    type: "RUPAY"
  },
];

const nfc_logos = [
  {
    name: "nfc",
    url: "https://storage.googleapis.com/zingcam/original/images/ia1ipiovuq8j52261k2elcmu.jpg",
    threshold: 0.55,
    greyscale_threshold: 100,
    scale: 0.9,
    type: "NFC"
  },
];

let streaming = false;
let video = document.getElementById("video");
let stream = null;
let vc = null;
let info = document.getElementById("info");
let container = document.getElementById("container");

function loadImageFromUrl(url, callback) {
  let img = new Image();
  img.crossOrigin = "Anonymous";
  img.onload = function () {
    let mat = cv.imread(img);
    callback(mat);
  };
  img.src = url;
}

let logoMatsRupay = [];
let precomputedLogosRupay = [];
let logoMatsNFC = [];
let precomputedLogosNDC = [];
let logoMatsBank = [];
let precomputedLogosBank = [];

function startCamera() {
  // Start with Rupay detection
  cleanupMatrices();
  startCameraForRupay();
}


function startCameraForBank() {
  let imagesLoaded = 0;

  list_logos.forEach((logo) => {
    loadImageFromUrl(logo.url, function (mat) {
      let processedMat = preprocessTemplate(mat, logo.greyscale_threshold);
      logoMats.push({
        name: logo.name,
        mat: processedMat,
        threshold: logo.threshold,
        scale: logo.scale,
        greyscale_threshold: logo.greyscale_threshold,
      });
      precomputeScalesAndRotations(logo, processedMat);
      imagesLoaded++;
      if (imagesLoaded === list_logos.length) {
        proceedWithCamera();
      }
    });
  });
}


const startCameraForRupay = () => {
  let imagesLoaded = 0;

  list_rupay_symbols.forEach((logo) => {
    loadImageFromUrl(logo.url, function (mat) {
      let processedMat = preprocessTemplate(mat, logo.greyscale_threshold);
      logoMats.push({
        name: logo.name,
        mat: processedMat,
        threshold: logo.threshold,
        scale: logo.scale,
        greyscale_threshold: logo.greyscale_threshold,
      });
      precomputeScalesAndRotations(logo, processedMat);
      imagesLoaded++;
      if (imagesLoaded === list_rupay_symbols.length) {
        proceedWithCamera();
      }
    });
  });
}

const startCameraForNFC = () => {
  let imagesLoaded = 0;

  nfc_logos.forEach((logo) => {
    loadImageFromUrl(logo.url, function (mat) {
      let processedMat = preprocessTemplate(mat, logo.greyscale_threshold);
      logoMats.push({
        name: logo.name,
        mat: processedMat,
        threshold: logo.threshold,
        scale: logo.scale,
        greyscale_threshold: logo.greyscale_threshold,
      });
      precomputeScalesAndRotations(logo, processedMat);
      imagesLoaded++;
      if (imagesLoaded === nfc_logos.length) {
        proceedWithCamera();
      }
    });
  });
}

function proceedWithCamera() {
  if (streaming) return;
  navigator.mediaDevices
    .getUserMedia({ video: resolution, audio: false })
    .then(function (s) {
      stream = s;
      video.srcObject = s;
      video.play();
    })
    .catch(function (err) {
      console.log("An error occurred! " + err);
    });

  video.addEventListener(
    "canplay",
    function (ev) {
      if (!streaming) {
        height = video.videoHeight;
        width = video.videoWidth;
        video.setAttribute("width", width);
        video.setAttribute("height", height);
        streaming = true;
        vc = new cv.VideoCapture(video);
      }
      startVideoProcessing();
    },
    false
  );
}

function precomputeScalesAndRotations(logo, mat) {
  let scales = [0.3, 0.25, 0.15];
  let angles = [0];
  let resizedLogo = new cv.Mat();
  let rotatedLogo = new cv.Mat();

  scales.forEach((scale) => {
    scale = logo.scale * scale;
    angles.forEach((angle) => {
      cv.resize(mat, resizedLogo, new cv.Size(), scale, scale, cv.INTER_LINEAR);
      let rotationMatrix = cv.getRotationMatrix2D(
        new cv.Point(resizedLogo.cols / 2, resizedLogo.rows / 2),
        angle,
        1.0
      );
      cv.warpAffine(
        resizedLogo,
        rotatedLogo,
        rotationMatrix,
        new cv.Size(resizedLogo.cols, resizedLogo.rows)
      );
      precomputedLogos.push({
        name: logo.name,
        mat: rotatedLogo.clone(),
        threshold: logo.threshold,
        scale: scale,
        angle: angle,
      });
    });
  });

  resizedLogo.delete();
  rotatedLogo.delete();
}

let src = null;
let dstC1 = null;
let dstC3 = null;
let dstC4 = null;

function startVideoProcessing() {
  if (!streaming) {
    console.warn("Please startup your webcam");
    return;
  }
  stopVideoProcessing();
  src = new cv.Mat(height, width, cv.CV_8UC4);
  dstC1 = new cv.Mat(height, width, cv.CV_8UC1);
  dstC3 = new cv.Mat(height, width, cv.CV_8UC3);
  dstC4 = new cv.Mat(height, width, cv.CV_8UC4);
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

function threshold(src, threshold = 80) {
  cv.threshold(src, src, threshold, 255, cv.THRESH_BINARY);
  return src;
}

function multiScaleTemplateMatching(src) {
  let bestMatch = {
      name: null,
      maxVal: 0,
      scale: 1,
      angle: 0,
      matchLoc: null
  };

  let result = new cv.Mat();
  for (let i = 0; i < precomputedLogos.length; i++) {
      let logo = precomputedLogos[i];
      if (!logo.mat.isDeleted()) {
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
    let point2 = new cv.Point(
      match.matchLoc.x + logoMats[0].mat.cols * match.scale,
      match.matchLoc.y + logoMats[0].mat.rows * match.scale
    );
    cv.rectangle(src, point1, point2, [0, 255, 0, 255], 2);
    cv.putText(
      src,
      match.name,
      new cv.Point(match.matchLoc.x, match.matchLoc.y - 10),
      cv.FONT_HERSHEY_SIMPLEX,
      0.5,
      [0, 255, 0, 255],
      2
    );
  }
}

function processVideo() {
  if (!isProcessing) return;

  try {
      vc.read(src);
      let result = src.clone();
      let grayResult = gray(result.clone());
      let bm = multiScaleTemplateMatching(grayResult);
      console.log(currentMode, bm);

      // Handle detections based on current mode
      if (bm.name && bm.maxVal > bm.threshold) {
          switch(currentMode) {
              case 'RUPAY':
                  if (!rupayLogoDetected) {
                      console.log('Rupay detected!');
                      rupayLogoDetected = true;
                      isProcessing = false; // Temporarily pause processing
                      cleanupMatrices();
                      switchToNFCDetection();
                  }
                  break;

              case 'NFC':
                  if (!nfcLogoDetected) {
                      console.log('NFC detected!');
                      nfcLogoDetected = true;
                      isProcessing = false; // Temporarily pause processing
                      cleanupMatrices();
                      switchToBankDetection();
                  }
                  break;

              case 'BANK':
                  if (!bankLogoDetected) {
                      console.log('Bank detected!');
                      bankLogoDetected = true;
                      updateRedirectButton();
                  }
                  break;
          }
      }

      cv.imshow("canvasOutput", result);
      grayResult.delete();
      result.delete();

      // Always request next frame if still processing
      if (isProcessing) {
          requestAnimationFrame(processVideo);
      }
  } catch (err) {
      console.error('Error in processVideo:', err);
      isProcessing = true; // Reset processing flag in case of error
      requestAnimationFrame(processVideo);
  }
}

function switchToNFCDetection() {
  currentMode = 'NFC';
  setTimeout(() => {
      startCameraForNFC();
      isProcessing = true; // Resume processing
      requestAnimationFrame(processVideo);
  }, 1);
}

function switchToBankDetection() {
  currentMode = 'BANK';
  setTimeout(() => {
      startCameraForBank();
      isProcessing = true; // Resume processing
      requestAnimationFrame(processVideo);
  }, 1);
}

function updateRedirectButton() {
  if (rupayLogoDetected && nfcLogoDetected && bankLogoDetected) {
      const redirectButton = document.getElementById('redirect-button');
      redirectButton.style.display = 'block';
      redirectButton.textContent = `Redirect to NPCI`;
  }
}

function multiScaleTemplateMatching(src) {
  let bestMatch = {
      name: null,
      maxVal: 0,
      scale: 1,
      angle: 0,
      matchLoc: null
  };

  let result = new cv.Mat();
  for (let i = 0; i < precomputedLogos.length; i++) {
      let logo = precomputedLogos[i];
      if (!logo.mat.isDeleted()) {
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
  }
  result.delete();
  return bestMatch;
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

function stopVideoProcessing() {
  if (src != null && !src.isDeleted()) src.delete();
  if (dstC1 != null && !dstC1.isDeleted()) dstC1.delete();
  if (dstC3 != null && !dstC3.isDeleted()) dstC3.delete();
  if (dstC4 != null && !dstC4.isDeleted()) dstC4.delete();
}

function stopCamera() {
  if (!streaming) return;
  stopVideoProcessing();
  document
    .getElementById("canvasOutput")
    .getContext("2d")
    .clearRect(0, 0, width, height);
  video.pause();
  video.srcObject = null;
  stream.getVideoTracks()[0].stop();
  streaming = false;
}

// var stats = null;

function initUI() {
  // stats = new Stats();
  // stats.showPanel(0);
  // document.getElementById('container').appendChild(stats.domElement);
}

// Update canvas size on window resize
window.addEventListener("resize", function () {
  let newWidth = window.innerWidth - 40; // Subtracting padding
  let newHeight = Math.floor((newWidth * 3) / 5); // Using 5:3 ratio

  if (newHeight > window.innerHeight - 40) {
    // Subtracting padding
    newHeight = window.innerHeight - 40;
    newWidth = Math.floor((newHeight * 5) / 3);
  }

  const canvas = document.getElementById("canvasOutput");
  canvas.width = newWidth;
  canvas.height = newHeight;

  if (streaming) {
    width = newWidth;
    height = newHeight;
    startVideoProcessing();
  }
});

function opencvIsReady() {
  console.log("OpenCV.js is ready");
  if (!featuresReady) {
    console.log("Required features are not ready.");
    return;
  }
  info.innerHTML = "";
  container.className = "";
  initUI();
  startCamera();
}
