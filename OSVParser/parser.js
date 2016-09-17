var pg = require('pg');
//or native libpq bindings
//var pg = require('pg').native

var conString = "postgres://postgres:Asdfjkl1@localhost/gis";

var client = new pg.Client(conString);
client.connect(function(err) {
  if(err) {
    return console.error('could not connect to postgres', err);
  }
  var sql = "declare geo no scroll cursor with hold for "
  sql += "SELECT row_to_json(fc) from (select ST_AsGeoJSON(lg.way)::json As geometry "
  sql += ", row_to_json(lp) As properties "
  sql += "FROM planet_osm_line As lg "
  sql += "INNER JOIN (SELECT osm_id, name,highway FROM planet_osm_line where highway is not null) As lp "
  sql += "ON lg.osm_id = lp.osm_id) as fc;"
//sql = "select * from planet_osm_line limit 1"
  //console.log(sql)
  var num = 0;
  client.query(sql, function(err, result) {
    if(err) {
      return console.error('error running query', err);
    }
  })
  sql = "fetch forward 50 from geo "
  var work = function(){
  client.query(sql, function(err, result) {
  	var count = result.rowCount
  	num++
 	console.log(num)
  	if(!count || count == 0)
  	{
  		clearInterval(timer)
  		return
  	}
  	console.log(result.rowCount)
    for(i=0;i<count;i++)
    {
    	//console.log(result.rows[i].row_to_json.geometry.coordinates);
    	//console.log(result.rows[i].row_to_json.properties)
    		var tempchunks = coordArrayToChunks2(parseLinestringRoadtoLineCoords(result.rows[i].row_to_json.geometry.coordinates),result.rows[i].row_to_json.properties.name)
	//todo: return one chunk and pass it to mongo
			for (var c in tempchunks)//check each chunk that was just spit out from processing functions....
		{
			writeMongo(c)
		}
	}
	//parseOSMtoVoxeljs(result).length
	console.log(count)
	timer = setTimeout(work,100);
    //output: Tue Jan 15 2013 19:12:47 GMT-600 (CST)
    //client.end();
  });
  }
  timer = setTimeout(work,2000);
});

//^^^^^^^^^^^^^^^^^^^^OSM QUERIES^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//vvvvvvvvvvvvvvvvvvOSM to Chunk calculations =vvvvvvvvvvvvvvvvv


//Convert coords the use the equator to xy of an onscreen map for continous coords.
//hard values are max 3857 values.  IF is not needed, the math works that both 
//+ and - coords convert correctly with the same formula.
//Math.floor because I don't care about percents of a meter.
function convertEPSG3857toScreenXY(lat,lon)
{
	var xlat,ylon
	xlat = 20026376 + Math.floor(lat);
	ylon = 20048966 - Math.floor(lon);
	//console.log(lat,lon);
	return {x:xlat,y:ylon};
	//return [lat,lon];
}

//Code from 
//http://stackoverflow.com/questions/4672279/bresenham-algorithm-in-javascript
function calcStraightLine (startCoordinates, endCoordinates) 
{
    var coordinatesArray = new Array();
    // Translate coordinates
    var x1 = startCoordinates.x;
    var y1 = startCoordinates.y;
    var x2 = endCoordinates.x
    var y2 = endCoordinates.y;
    // Define differences and error check
    var dx = Math.abs(x2 - x1);
    var dy = Math.abs(y2 - y1);
    var sx = (x1 < x2) ? 1 : -1;
    var sy = (y1 < y2) ? 1 : -1;
    var err = dx - dy;
    // Set first coordinates
    coordinatesArray.push({y:y1, x:x1});
    //return coordinatesArray;
    // Main loop
    while (!((x1 == x2) && (y1 == y2))) {
      var e2 = err << 1;
      if (e2 > -dy) {
        err -= dy;
        x1 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y1 += sy;
      }
      // Set coordinates
      coordinatesArray.push({y:y1, x:x1});
      //console.log(x1,'+',y1);
    }
    // Return the result
    return coordinatesArray;
}


//Loop through linestring with points that should form a line.
//convert each point from gps to xy
//form line of xy's between each xy.
//combine all those lines together.
function parseLinestringRoadtoLineCoords(LineStringArray)
{
	var lineCoordsArray = new Array();
	for (i = 0;i < LineStringArray.length - 1;i++)
	{
		lineCoordsArray = lineCoordsArray.concat(
							calcStraightLine(
								convertEPSG3857toScreenXY(LineStringArray[i][0],LineStringArray[i][1]),
								convertEPSG3857toScreenXY(LineStringArray[i+1][0],LineStringArray[i+1][1])
								)
							)
	}
	//console.log(lineCoordsArray);
	return lineCoordsArray;
}


function calcChunkNameFromCoords(xlat,ylon,dims)
{
	return Math.floor(xlat / (dims+1)) + '|0|' + Math.floor(ylon / (dims+1));
}

function translatedChunkName(chunk)
{
	//return (chunk.position[0] - 303792) + "|0|" + (chunk.position[2] - 438258)
    return (chunk.position[0] - 294668) + "|0|" + (chunk.position[2] - 424954)
}

function calcChunkCoordsFromCoords(xlat,ylon,dims)
{
	return {x:Math.floor(xlat / (dims+1)),y:0,z:Math.floor(ylon / (dims+1))};
}

function coordArrayToChunks2(coordArray,roadname)
{

	//console.log(coordArray[0] , 'to' , coordArray[coordArray.length-1])
	var chunks = new Array();
	var chunkCoords = new Array();
	var voxels = new Int8Array(32 * 32 * 32);
	for (v=0;v < voxels.length;v++)
	{
		voxels[v] = 0;
	}	
	//console.log(coordArray.length, ' line points to parse.')
	for (i =0;i < coordArray.length;i++)
	{
		var x = coordArray[i].x 
		var y = coordArray[i].y 
		var chunkc = calcChunkCoordsFromCoords(x,y,32)
		var chunkname = calcChunkNameFromCoords(x,y,32)
		if (chunkname in chunks)
		{}
		else
		{
			chunks[chunkname] = 
			{
			roadname: roadname,
		    position : [chunkc.x,chunkc.y,chunkc.z],
			dims : [32,32,32],
			voxels : new Int8Array(32*32*32)
			}
			for(v1=0;v1<31;v1++){
				for(v2 = 0;v2 < 31;v2++){
					chunks[chunkname].voxels[(32*32*v1)+v2] = 1
				}
			}

		}
			var px,py,pz,pos
			px = x - (chunkc.x * (32 + 1))
			py = (chunkc.y * (32 + 1))
			pz = y - (chunkc.z * (32 + 1))
			pos = (32 * 32 * pz) + 0 + (px)
			chunks[chunkname].voxels[pos] = 2
			//fill sides of road center
			if (chunks[chunkname].voxels[pos-2] != 2) {chunks[chunkname].voxels[pos-2] = 3}
			if (chunks[chunkname].voxels[pos-1] != 2) {chunks[chunkname].voxels[pos-1] = 3}
			if (chunks[chunkname].voxels[pos+1] != 2) {chunks[chunkname].voxels[pos+1] = 3}
				if (chunks[chunkname].voxels[pos+2] != 2) {chunks[chunkname].voxels[pos+2] = 3}
			if (chunks[chunkname].voxels[(32*32)+pos] !=2) {chunks[chunkname].voxels[(32*32)+pos]= 3}
			if (chunks[chunkname].voxels[pos-(32*32)] !=2) {chunks[chunkname].voxels[pos-(32*32)] = 3}
			if (chunks[chunkname].voxels[(32*32*2)+pos] !=2) {chunks[chunkname].voxels[(32*32*2)+pos]= 3}
			if (chunks[chunkname].voxels[pos-(32*32*2)] !=2) {chunks[chunkname].voxels[pos-(32*32*2)] = 3}
	}
	return chunks;
}

function parseOSMtoVoxeljs(road){
//var chunks = coordArrayToChunks();
var chunks = new Array()// = coordArrayToChunks2();  //master array to hold chunks.
console.time('All-Meters');//Start a timer to track how long convertion from geojson to 
var polygons ={}
	for(i2 = 0;i2 < road.rowCount;i2++) //for every road in array/dataset
	{
		//i2 = road.features.length
		  //  	console.log(result.rows[i].row_to_json.geometry.coordinates);
    	//console.log(result.rows[i].row_to_json.properties)
		console.log(i2,"of",road.rowCount) //progress - how many roads do we have to left to process?
		var tempchunks = coordArrayToChunks2(parseLinestringRoadtoLineCoords(road.rows[i2].row_to_json.geometry.coordinates),road.rows[i2].row_to_json.properties.name)//processing functions - return assigned to temp varible.
		//console.log(road.features[i2].properties.name)
		for (var c in tempchunks)//check each chunk that was just spit out from processing functions....
		{
			//console.log(c.position)
			//process.exit();
			if (c in chunks)  //if a particular new chunk, already exists in the master array(in the same 3d space)..
			{
				//run logic to merge the new chunk to the existing chunk.  Don't overwrite air blocks?
				for(m = 0;m< (32*32*32);m++)
				{
					if(tempchunks[c].voxels[m] != 0)
					{
						chunks[tempchunks[c].position.join("|")].voxels[m] = tempchunks[c].voxels[m]
					}
				}

				chunks[tempchunks[c].position.join("|")].roadname += tempchunks[c].roadname
			}
			else
			{
			//if a particular chunk doesn't exist in the master array, add it to the master array.
			chunks[tempchunks[c].position.join("|")] = tempchunks[c]	
			}
			
		}

		//chunks.push.apply(chunks,coordArrayToChunks2(parseLinestringRoadtoLineCoords(road.features[i2].geometry.coordinates)))
	}

return chunks;
//console.log(Object.getOwnPropertyNames(chunks).sort());
}

function bytesToSize(input, precision)
{
    var unit = ['', 'K', 'M', 'G', 'T', 'P'];
    var index = Math.floor(Math.log(input) / Math.log(1024));
    if (unit >= unit.length) return input + ' B';
    return (input / Math.pow(1024, index)).toFixed(precision) + ' ' + unit[index] + 'B'
}

function displayMemUsage(){
var usage;
usage = process.memoryUsage();
console.log('RSS: ' + bytesToSize(usage.rss, 3), 'and Heap:', bytesToSize(usage.heapUsed, 3), 'of', bytesToSize(usage.heapTotal, 3), 'total');
console.timeEnd('All-Meters');
}

//vvvvvvvvvvvvvvvvvvvWrite calculations to MongoDBvvvvvvvvvvvvv

//process.exit();

// Example of a simple findOneAndReplace operation
function writeMongo(chunk){
//var chunks = new Array();
var chunkname = chunk.position.join("|");
/*
chunkname = '1|1|1'
chunks[chunkname] =
{
	//roadname: roadname,
    position : [1,1,1],
	dims : [32,32,32],
	voxels : new Int8Array(32*32*32)
}
*/
var MongoClient = require('mongodb').MongoClient,
  test = require('assert');
MongoClient.connect('mongodb://localhost:27017/osblocks', function(err, db) {
  // Get the collection
  var col = db.collection('chunks');
    col.findOneAndReplace({cname:chunkname}
      , {chunk:chunks[chunkname].voxels,cname:chunkname}
      , {
      	            projection: null
          , sort: null
          , returnOriginal: false
          , upsert: true
        }
      , function(err, r) {
        test.equal(null, err);
        test.equal(1, r.lastErrorObject.n);
        //test.equal(1, r.value.cname);

        db.close();
    });
});
}
