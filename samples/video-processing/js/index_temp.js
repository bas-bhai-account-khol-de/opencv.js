let width = 0;
let height = 0;

let qvga = {width: {exact: 320}, height: {exact: 240}};

let vga = {width: {exact: 640}, height: {exact: 480}};




const list_logos = [
  // {
  //     name: "",
  //     url: "",
  //     threshold: 5
  // },
  // {
  //     name: "Maharastra Bank",
  //     url: "https://storage.googleapis.com/avatar-system/test/Logos/Logos%20_Bank-of-Maharashtra.png",
  //     threshold: 15
  // },
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
      scale: 1.8
  },
  {
      name: "SBI",
      url: "https://storage.googleapis.com/avatar-system/test/Logos/Logos%20_SBI-1_inverted.jpg",
      threshold: 0.55,
      greyscale_threshold: 100,
      scale: 1.8
  },
];

// let resolution = window.innerWidth < 640 ? qvga : vga;
let resolution = qvga

// whether streaming video from the camera.
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
function startCamera() {


  let imagesLoaded = 0;

  list_logos.forEach(logo => {
    loadImageFromUrl(logo.url, function(mat) {
      // cv.resize(mat, mat, new cv.Size(100, 100));
    //  try{ 
      console.log("recived" , logo.name);
      logoMats.push({name: logo.name, mat: preprocessTemplate(mat,logo.greyscale_threshold), threshold: logo.threshold , scale: logo.scale , greyscale_threshold: logo.greyscale_threshold});
    // }
    //  catch(e){
    //    console.log(e);
    //   }
      imagesLoaded++;
      if (imagesLoaded === list_logos.length) {
        proceedWithCamera();
      }
    });
  });

  function proceedWithCamera() {
    
    // cv.imshow("canvasOutput2", logoMats[0].mat);
    if (streaming) return;
    navigator.mediaDevices.getUserMedia({video: resolution, audio: false})
      .then(function(s) {
      stream = s;
      video.srcObject = s;
      video.play();
    })
      .catch(function(err) {
      console.log("An error occured! " + err);
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
  requestAnimationFrame(processVideo);
}

function passThrough(src) {
  return src;
}


function preprocessTemplate(src,greyscale_threshold){
  let result;
  result=gray(src);
  result=threshold(result,greyscale_threshold);

  return result;
}

function gray(src) {
  cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY);
  return src;
}


function dilate(src,kernal_size=2) {
  let ksize = new cv.Size(kernal_size, kernal_size);
  let anchor = new cv.Point(-1, -1);
  let kernel = cv.getStructuringElement(cv.MORPH_RECT, ksize);
  cv.dilate(src, src, kernel, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

  return src;
  // return dstC4;
}

function gaussianBlur(src) {
  cv.GaussianBlur(src, dstC4, {width: 3, height: 3}, 0, 0, cv.BORDER_DEFAULT);
  return dstC4;
}
function canny(src) {
  cv.cvtColor(src, dstC1, cv.COLOR_RGBA2GRAY);
  cv.Canny(dstC1, dstC1, 50, 80, 3, false);
  return src;
  // return dstC1;
}

function invertColors(src) {
  cv.bitwise_not(src, src);
  return src;
}
function threshold(src, threshold=80) {
  cv.threshold(src, src, threshold, 255, cv.THRESH_BINARY);
  return src;
}

function adaptiveThreshold(src) {
  let mat = new cv.Mat(height, width, cv.CV_8U);
  cv.cvtColor(src, mat, cv.COLOR_RGBA2GRAY);
  cv.adaptiveThreshold(mat, dstC1, 200, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, Number(controls.adaptiveBlockSize), 2);
  mat.delete();
  return dstC1;
}

function multiScaleTemplateMatching(src) {
  let bestMatch = {name: null, maxVal: 0, scale: 1, angle: 0, matchLoc: null};
  let scales = [0.3,0.25];
  let angles = [0,10,-10];
  let resizedLogo = new cv.Mat();
  let rotatedLogo = new cv.Mat();
  for (let i = 0; i < logoMats.length; i++) {
    let logo = logoMats[i];
    for (let j = 0; j < scales.length; j++) {
      let scale = logo.scale * scales[j];
      for (let k = 0; k < angles.length; k++) {
        let angle = angles[k];

        cv.resize(logo.mat, resizedLogo, new cv.Size(), scale, scale, cv.INTER_LINEAR);
        cv.getRotationMatrix2D(new cv.Point(resizedLogo.cols / 2, resizedLogo.rows / 2), angle, 1.0).copyTo(rotatedLogo);
        cv.warpAffine(resizedLogo, rotatedLogo, rotatedLogo, new cv.Size(resizedLogo.cols, resizedLogo.rows));

        let result = new cv.Mat();
        cv.matchTemplate(src, rotatedLogo, result, cv.TM_CCOEFF_NORMED);
        let minMax = cv.minMaxLoc(result);
        if (typeof minMax.maxVal === 'number' && minMax.maxVal > logo.threshold) {
          bestMatch = {
            name: logo.name,
            maxVal: minMax.maxVal,
            scale: scale,
            angle: angle,
            matchLoc: minMax.maxLoc,
            threshold: logo.threshold
            
          };
          break;
        }
        result.delete();
      }
    }
  }

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
  let result;
  result = dilate(threshold(gray(src),150));
  let bm =multiScaleTemplateMatching(result);
  drawBoundingBox(result, bm);
  console.log(bm);
  cv.imshow("canvasOutput", result);
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
  video.srcObject=null;
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
    console.log('Requred features are not ready.');
    return;
  }
  info.innerHTML = '';
  container.className = '';

  //init variabels 
  


  initUI();
  startCamera();

}