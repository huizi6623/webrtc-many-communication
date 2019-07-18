var THREEx = THREEx || {}

/**
 * Handle jsaruco markers
 * @constructor
 */
THREEx.JsArucoMarker = function(){
	var _this = this
    this.modelSize = 10 // millimeter


	/**
	 * convert a jsaruco marker to a THREE.Object3D
	 *
	 * @param {Object[]} marker   - a found marker
	 * @param {THREE.Object3D} object3d - the object3d to move
	 */
	this.markerToObject3D = function(marker_temp, object3d){

        // ctx.clearRect(0,0,window.innerWidth, window.innerHeight);

        canvasElement_width = 640
        canvasElement_height = 480
        // canvasElement_width = 300
        // canvasElement_height = 150

        console.log(marker_temp)
		// convert corners coordinate - not sure why
		var corners = []//marker_temp;
		var sumx = 0
		var sumy = 0
		for (var i = 0; i < marker_temp.length; ++ i){
        	sumx = sumx + marker_temp[i].x
			sumy = sumy + marker_temp[i].y
			corners.push({
				// x : marker_temp[i].x - (canvasElement_width / 2),
				// y : (canvasElement_height / 2) - marker_temp[i].y,

                x : (marker_temp[i].x - (canvasElement_width / 2)),
                y : (canvasElement_height / 2) - marker_temp[i].y ,

                // x : (marker_temp[i].x - (canvasElement_width / 2))/3.35,
                // y : (canvasElement_height / 2) - marker_temp[i].y/3.35 ,
			})
		}
        console.log('pos1',sumx/4, sumy/4)
		sumx = 0
		sumy = 0
        for (var i = 0; i < marker_temp.length; ++ i){
            sumx = sumx + corners[i].x
            sumy = sumy + corners[i].y
        }
        console.log('pos2',sumx/4, sumy/4)


		// compute the pose from the canvas
		var posit = new POS.Posit(this.modelSize, canvasElement_width);

        var pose = posit.pose(corners);
		// console.assert(pose !== null)
		if( pose === null )	return;

		//////////////////////////////////////////////////////////////////////////////////
		//		Translate pose to THREE.Object3D
		//////////////////////////////////////////////////////////////////////////////////
		var rotation = pose.bestRotation
		var translation = pose.bestTranslation

		object3d.scale.x = this.modelSize;
		object3d.scale.y = this.modelSize;
		object3d.scale.z = this.modelSize;

		object3d.rotation.x = -Math.asin(rotation[1][2])  ;
        // object3d.rotation.x = -Math.asin(-rotation[1][2])  ;
		object3d.rotation.y = -Math.atan2(rotation[0][2], rotation[2][2])  ;
		object3d.rotation.z = Math.atan2(rotation[1][0], rotation[1][1])  ;

		object3d.position.x =  translation[0];
		object3d.position.y =  translation[1];
		object3d.position.z =  -translation[2];;

		console.log('position',translation)
	}

	return



}
