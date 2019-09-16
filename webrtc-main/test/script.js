document.body.classList.add("loading");

let imgElement = document.getElementById('imageOriginal');
let inputElement = document.getElementById('imageInput');
inputElement.addEventListener('change', (e) => {
  imgElement.src = URL.createObjectURL(e.target.files[0]);
}, false);
let mat;

imgElement.onload = function() {
  mat = cv.imread(imgElement);
  cv.imshow('imageCanvas', mat);
  let temp = new cv.ORB();
  let points = new cv.KeyPointVector();
  temp.detect(mat, points);
  let output = new cv.Mat();
  cv.drawKeypoints(mat, points, output);
  cv.imwrite("sift_result.jpg", output);
};

document.getElementById('circlesButton').onclick = function() {
	this.disabled = true;

  	let mat = cv.imread('imageCanvas');
	let dst = mat.clone();
	let circles = new cv.Mat();
	cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY, 0);
	// You can try more different parameters
	cv.HoughCircles(mat, circles, cv.HOUGH_GRADIENT,
                1, 45, 75, 40, 0, 0);
	// draw circles
	for (let i = 0; i < circles.cols; ++i) {
    	let x = circles.data32F[i * 3];
    	let y = circles.data32F[i * 3 + 1];
    	let radius = circles.data32F[i * 3 + 2];
    	let center = new cv.Point(x, y);
    	cv.circle(dst, center, radius, [0, 0, 0, 255], 3);
	}
	
	cv.imshow('imageCanvas', dst);
	mat.delete();
	dst.delete();
	circles.delete();

	this.disabled = false;
};

document.getElementById('button').onclick = function() {
    this.href = document.getElementById("imageCanvas").toDataURL();
    this.download = "image.png";
};

function onOpenCvReady() {
    document.body.classList.remove("loading");
}