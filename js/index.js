const displayLayer = document.getElementById("display");
const openCameraBtn = document.getElementById("openCamera");
const takePhotoBtn = document.getElementById("takePhoto");
const closeCameraBtn = document.getElementById("closeCamera");
const toggleRecordingBtn = document.getElementById("toggleRecording");
const closeToggleRecordingBtn = document.getElementById("closeToggleRecording");
const scanQrCodeBtn = document.getElementById("scanQrCode");
const getGeolocationBtn = document.getElementById("getGeolocation");

const cameraLayer = document.getElementById("camera-layer");
const camera = document.getElementById("camera");

// 老的浏览器可能根本没有实现 mediaDevices，所以我们可以先设置一个空的对象
if (navigator.mediaDevices === undefined) {
  navigator.mediaDevices = {};
}
if (navigator.mediaDevices.getUserMedia === undefined) {
  navigator.mediaDevices.getUserMedia = function (constraints) {
    // 首先，如果有getUserMedia的话，就获得它
    var getUserMedia =
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia;

    // 一些浏览器根本没实现它 - 那么就返回一个error到promise的reject来保持一个统一的接口
    if (!getUserMedia) {
      return Promise.reject(
        new Error("getUserMedia is not implemented in this browser")
      );
    }

    // 否则，为老的navigator.getUserMedia方法包裹一个Promise
    return new Promise(function (resolve, reject) {
      getUserMedia.call(navigator, constraints, resolve, reject);
    });
  };
}

getGeolocationBtn.onclick = () => {
  getGeolocation();
};
openCameraBtn.onclick = () => {
  startTakePhoto();
};
closeCameraBtn.onclick = () => {
  closeCamera();
};
takePhotoBtn.onclick = () => {
  takePhoto();
};
toggleRecordingBtn.onclick = () => {
  startRecording();
};
closeToggleRecordingBtn.onclick = () => {
  stopRecording();
};
scanQrCodeBtn.onclick = () => {
  scanQrCode();
};

//获取地理位置
function getGeolocation() {
  const option = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
  };

  const success = (pos) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    document.getElementById("result") &&
      displayLayer.removeChild(document.getElementById("result"));
    const text = document.createElement("span");
    text.innerText = "纬度：" + lat + ",经度：" + lon;
    text.style.wordBreak = "break-all";
    text.setAttribute("id", "result");
    displayLayer.appendChild(text);
  };

  const fail = (error) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        alert("您拒绝了地理位置服务");
        break;
      case error.PERMISSION_DENIED:
        alert("无法获取您的位置");
        break;
      case error.PERMISSION_DENIED:
        alert("超时");
        break;
    }
  };

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(success, fail, option);
  } else {
    alert("浏览器不支持navigator.geolocation");
  }
}

//调用摄像头
async function openCamera(facingMode) {
  window.mode = facingMode;
  const constraints = {
    video: { facingMode: facingMode },
    // video: { facingMode: { exact: "environment" } },
    audio: false,
  };
  try {
    window.stream = await navigator.mediaDevices.getUserMedia(constraints);
    cameraLayer.style.display = "block";
    if ("srcObject" in camera) {
      camera.srcObject = window.stream;
    } else {
      // 防止再新的浏览器里使用它，应为它已经不再支持了
      camera.src = window.URL.createObjectURL(window.stream);
    }
    window.stream.onloadedmetadata = function (e) {
      window.stream.play();
      //window.camera = true;
    };
  } catch (error) {
    console.error(error.name + ": " + error.message);
  }
}

//停止摄像头
function closeCamera() {
  camera.src = "";
  cameraLayer.style.display = "none";
  clearTimeout(window.timer);
  cameraLayer.classList.remove("scan");
  //window.camera = false;
  window.stream &&
    window.stream.getTracks().forEach(function (track) {
      track.stop();
    });
}

//切换摄像头
function switchCamera() {
  camera.src = "";
  window.stream &&
    window.stream.getTracks().forEach(function (track) {
      track.stop();
    });
  openCamera(window.mode === "user" ? "environment" : "user");
}

//拍照
function startTakePhoto() {
  closeToggleRecordingBtn.style.display = "none";
  takePhotoBtn.style.display = "block";
  openCamera('environment');
}

//拍照
function takePhoto() {
  document.getElementById("result") &&
    displayLayer.removeChild(document.getElementById("result"));
  let canvas = document.createElement("canvas");
  const image = document.createElement("img");
  canvas.setAttribute("id", "canvas");
  canvas.width = camera.videoWidth;
  canvas.height = camera.videoHeight;
  displayLayer.appendChild(canvas);
  canvas = document.getElementById("canvas");
  canvas.getContext("2d").drawImage(camera, 0, 0);
  let data = canvas.toDataURL("image/webp");
  image.setAttribute("id", "result");
  image.src = data;
  image.style.width = "100%";
  image.style.height = "100%";
  displayLayer.replaceChild(image, canvas);
  closeCamera();
}

//摄像
const startRecording = async () => {
  let options = { mimeType: "video/webm;codecs=h264" };
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options = { mimeType: "video/webm;codecs=vp8" };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: "video/webm" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "" };
      }
    }
  }

  try {
    closeToggleRecordingBtn.style.display = "block";
    takePhotoBtn.style.display = "none";
    await openCamera('environment');
    window.recordedBlobs = [];
    window.mediaRecorders = await new MediaRecorder(window.stream, options);
  } catch (e) {
    alert(
      "Exception while creating MediaRecorder: " +
        e +
        ". mimeType: " +
        options.mimeType
    );
    return;
  }
  mediaRecorders.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedBlobs.push(event.data);
    }
  };
  mediaRecorders.start(10); // collect 10ms of data
  console.log("MediaRecorder started");
};

//停止摄像
const stopRecording = async () => {
  await window.mediaRecorders.stop();
  const superBuffer = new Blob(recordedBlobs, { type: "video/mp4" });
  document.getElementById("result") &&
    displayLayer.removeChild(document.getElementById("result"));
  const video = document.createElement("video");
  video.setAttribute("id", "result");
  video.src = window.URL.createObjectURL(superBuffer);
  video.style.width = "100%";
  video.style.height = "100%";
  video.style.objectFit = "fill";
  video.controls = true;
  displayLayer.appendChild(video);
  closeCamera();
};

//扫描二维码
const scanQrCode = async () => {
  closeToggleRecordingBtn.style.display = "none";
  takePhotoBtn.style.display = "none";
  cameraLayer.classList.add("scan");
  await openCamera('environment');
  window.timer = null;
  window.timer = setTimeout(captureToCanvas, 500);
  qrcode.callback = (content) => {
    document.getElementById("result") &&
      displayLayer.removeChild(document.getElementById("result"));
    const text = document.createElement("span");
    text.innerText = content;
    text.style.wordBreak = "break-all";
    text.setAttribute("id", "result");
    displayLayer.appendChild(text);
    closeCamera();
  };
};

function captureToCanvas() {
  clearTimeout(window.timer);
  const canvas = document.getElementById("qr-canvas");
  canvas.width = camera.videoWidth;
  canvas.height = camera.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(camera, 0, 0);
  try {
    qrcode.decode();
  } catch (e) {
    window.timer = setTimeout(captureToCanvas, 500);
  }
}
