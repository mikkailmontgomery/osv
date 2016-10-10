//Compile with:
//export PKG_CONFIG_PATH=/usr/local/lib/pkgconfig
//c++ --std=c++11 parser.cpp -o parser.out -L/usr/local/lib -lpq $(pkg-config --cflags --libs libmongocxx) && ./parser.out
//run with:
//./parser.out
/*
this link has an INVALID use of the driver.  Don't use it.
https://docs.mongodb.com/getting-started/cpp/update/
Use this instead:
https://github.com/mongodb/mongo-cxx-driver/blob/master/examples/mongocxx/update.cpp
thanks article: http://stackoverflow.com/questions/38845214/mongodb-c-tutorial-program-fails-mongocxxv-noabilogic-error
*/

#include <stdio.h>
#include <string>
#include <iostream>
#include <libpq-fe.h>
#include <math.h>
#include <vector>
#include <sstream>

#include <list>

#include <bsoncxx/builder/stream/document.hpp>
#include <bsoncxx/json.hpp>

//#include <mongocxx/options/find_one_and_replace.hpp>
#include <mongocxx/client.hpp>
#include <mongocxx/stdx.hpp>
#include <mongocxx/instance.hpp>
#include <mongocxx/uri.hpp>
using bsoncxx::builder::stream::document;
using bsoncxx::builder::stream::open_document;
using bsoncxx::builder::stream::close_document;
using bsoncxx::builder::stream::open_array;
using bsoncxx::builder::stream::close_array;
using bsoncxx::builder::stream::finalize;


struct point {
  int x;
  int y;
};

struct voxelxyz {
  int x;
  int y;
  int z;
  std::string nameFromXYZ()
  {
    return std::to_string(x) + '|' + std::to_string(y)  + '|' + std::to_string(z);
  }
};

struct chunk {
  std::string roadname;
  voxelxyz position;
  int dims[3];
  std::vector<int> voxels;
};


point convertEPSG3857toScreenXY(float lat,float lon)
{
  //todo: code for all 4 regions of global map.
  point p;
  p.x = 20026376 + floor(lat);
  p.y = 20048966 - floor(lon);
  return p;
}

std::vector<point> calcStraightLine (point startCoordinates, point endCoordinates)
{
    //puts("calcStraightLine");
    std::vector<point> coordinatesArray;
    // Translate coordinates
    int x1 = startCoordinates.x;
    int y1 = startCoordinates.y;
    int x2 = endCoordinates.x;
    int y2 = endCoordinates.y;
    // Define differences and error check
    int dx = abs(x2 - x1);
    int dy = abs(y2 - y1);
    int sx = (x1 < x2) ? 1 : -1;
    int sy = (y1 < y2) ? 1 : -1;
    int err = dx - dy;
    // Set first coordinates
    point p;
    p.x = x1;
    p.y = y1;
    coordinatesArray.push_back(p);
    //return coordinatesArray;
    // Main loop
    while (!((x1 == x2) && (y1 == y2))) {
      int e2 = err << 1;
      if (e2 > -dy) {
        err -= dy;
        x1 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y1 += sy;
      }
      // Set coordinates
      point p;
      p.x = x1;
      p.y = y1;
      coordinatesArray.push_back(p);
      //console.log(x1,'+',y1);
    }
    // Return the result
    return coordinatesArray;
}





//Loop through linestring with points that should form a line.
//convert each point from gps to xy
//form line of xy's between each xy.
//combine all those lines together.
std::vector<point> parseLinestringRoadtoLineCoords(std::vector<point> LineStringArray)
{
  //puts("parseLinestringRoadtoLineCoords");
	std::vector<point> lineCoordsArray;
	for (int i = 0;i < LineStringArray.size() - 1;i++)
	{
    //ref#http://stackoverflow.com/questions/3177241/what-is-the-best-way-to-concatenate-two-vectors
		std::vector<point> B = calcStraightLine(
		 convertEPSG3857toScreenXY(LineStringArray[i].x,LineStringArray[i].y),
		 convertEPSG3857toScreenXY(LineStringArray[i+1].x,LineStringArray[i+1].y)
   );
    lineCoordsArray.reserve( lineCoordsArray.size() + B.size() ); // preallocate memory
    lineCoordsArray.insert( lineCoordsArray.end(), B.begin(), B.end() );
	}
	//console.log(lineCoordsArray);
	return lineCoordsArray;
}

voxelxyz calcChunkCoordsFromCoords(int xlat,int ylon,int dims)
{
  voxelxyz pos;
  pos.x = floor(xlat / (dims+1));
  pos.y = 0;
  pos.z = floor(ylon / (dims+1));
  return pos;
}

std::string calcChunkNameFromCoords(int xlat,int ylon,int dims)
{
	return std::to_string(floor(xlat / (dims+1))) + "|0|" + std::to_string(floor(ylon / (dims+1)));
}


std::vector<chunk> coordArrayToChunks2(std::vector<point> coordArray, std::string roadname)
{
  //puts("coordArrayToChunks2");
	//console.log(coordArray[0] , 'to' , coordArray[coordArray.length-1])
	std::vector<chunk> chunks;
	std::vector<int> voxels(32 * 32 * 32);
	for (int v=0;v < voxels.size();v++)
	{
		voxels[v] = 0;
	}
  for(int v1=0;v1<31;v1++){
    for(int v2 = 0;v2 < 31;v2++){
      voxels[(32*32*v1)+v2] = 1;
    }
  }
	//console.log(coordArray.length, ' line points to parse.')
	for (int i =0;i < coordArray.size();i++)
	{
		int x = coordArray[i].x;
		int y = coordArray[i].y;
		voxelxyz chunkc = calcChunkCoordsFromCoords(x,y,32);
    int currentchunkindex = 0;
		//var chunkname = calcChunkNameFromCoords(x,y,32)
    bool found = false;
    for(int c=0;c<chunks.size();c++){
      if(chunks[c].position.x == chunkc.x && chunks[c].position.y == chunkc.y && chunks[c].position.z == chunkc.z){
        found = true;
        currentchunkindex = c;
        break;
      }
    }
		if (!found)
		{

      //console.log('no exist', chunkname)
      chunk tempchunk;
      tempchunk.roadname = roadname;
      tempchunk.position = chunkc;
      tempchunk.dims[0] = 32;
      tempchunk.dims[1] = 32;
      tempchunk.dims[2] = 32;
      tempchunk.voxels = voxels;
      chunks.push_back (tempchunk);
      currentchunkindex = chunks.size() - 1;
      //printf("%d",chunks.size());
		}
    //puts("try");
    int px = x - (chunkc.x * (32 + 1));
    int py = (chunkc.y * (32 + 1));
    int pz = y - (chunkc.z * (32 + 1));
    int pos = (32 * 32 * pz) + 0 + px;
    //std::cout << found << std::endl;
    //printf("%d,%d\n",currentchunkindex,pos);
    //printf("index = %d\n",currentchunkindex);
    //printf("%d %d %d %d %d %d %d %d %d %d",pos,pos-2,pos-1,pos+1,pos+1,pos+2,(32*32)+pos,pos-(32*32),(32*32*2)+pos,pos-(32*32*2));
    if(pos >= 0 && pos < (32*32*32)){
      //printf("%d\n",chunks.size());
      //printf("%d\n",chunks[currentchunkindex].voxels.size());
    chunks[currentchunkindex].voxels[pos] = 2;}
    //puts("success");
    //fill sides of road center
    if (pos-2 >= 0 && pos-2 < (32*32*32)) {if (chunks[currentchunkindex].voxels[pos-2] != 2) {chunks[currentchunkindex].voxels[pos-2] = 3;}}
    if (pos-1 >= 0 && pos-1 < (32*32*32)) {if (chunks[currentchunkindex].voxels[pos-1] != 2) {chunks[currentchunkindex].voxels[pos-1] = 3;}}
    if (pos+1 >= 0 && pos+1 < (32*32*32)) {if (chunks[currentchunkindex].voxels[pos+1] != 2) {chunks[currentchunkindex].voxels[pos+1] = 3;}}
    if (pos+2 >= 0 && pos+2 < (32*32*32)) {if (chunks[currentchunkindex].voxels[pos+2] != 2) {chunks[currentchunkindex].voxels[pos+2] = 3;}}
    if ((32*32)+pos >= 0 && (32*32)+pos < (32*32*32)) {if (chunks[currentchunkindex].voxels[(32*32)+pos] !=2) {chunks[currentchunkindex].voxels[(32*32)+pos]= 3;}}
    if (pos-(32*32) >= 0 && pos-(32*32) < (32*32*32)) {if (chunks[currentchunkindex].voxels[pos-(32*32)] !=2) {chunks[currentchunkindex].voxels[pos-(32*32)] = 3;}}
    if ((32*32*2)+pos >= 0 && (32*32*2)+pos < (32*32*32)) {if (chunks[currentchunkindex].voxels[(32*32*2)+pos] !=2) {chunks[currentchunkindex].voxels[(32*32*2)+pos]= 3;}}
    if (pos-(32*32*2) >= 0 && pos-(32*32*2) < (32*32*32)) {if (chunks[currentchunkindex].voxels[pos-(32*32*2)] !=2) {chunks[currentchunkindex].voxels[pos-(32*32*2)] = 3;}}
	}
  //console.log('chunk', chunks['294591|0|424978'])
  //puts("hmms");
	return chunks;
}

std::vector<point> parselinestringtovector(std::string linestring){
  //puts("parselinestringtovector");
  //ref#http://stackoverflow.com/questions/1195675/convert-a-char-to-stdstring
  //ref#http://stackoverflow.com/questions/1894886/parsing-a-comma-delimited-stdstring
  std::string localls = linestring;
  std::vector<point> pointarr;
  localls.erase(0,11);
  localls.erase(localls.length()-1);
  //std::cout << localls << std::endl;
  std::stringstream ss(localls);
  std::vector<std::string> phase1;
  while( ss.good() )
  {
      std::string substr;
      getline( ss, substr, ',' );
      phase1.push_back( substr );
      //puts("hmm");
  }
  for(int i = 0;i<phase1.size();i++){
    //printf("%s",phase1[i]);
    //std::cout << phase1[i] << std::endl;
    point p;
    std::stringstream ss2(phase1[i]);
    std::vector<std::string> temp;
    while( ss2.good() )
    {
        std::string substr;
        getline( ss2, substr, ' ' );
        temp.push_back( substr );
    }
    //std::cout << temp[0] << std::endl;
    //std::cout << temp[1] << std::endl;
    p.x = atoi(temp[0].c_str());
    p.y = atoi(temp[1].c_str());
    //printf("%d %d\n", p.x,p.y);
    pointarr.push_back(p);
  }

  return pointarr;
}


int main()
{
 std::cout << "Hello world!" << std::endl;
 PGconn          *pgconn;
 PGresult        *res;
 int             rec_count;
 int             row;
 int             col;
 mongocxx::instance inst{};
 mongocxx::client conn{mongocxx::uri{}};
 auto db = conn["osblocks"];
 //mongocxx::collection collection = conn["osblocks"]["chunks"];
 pgconn = PQconnectdb("dbname=gis host=localhost user=postgres password=Asdfjkl1");
 if (PQstatus(pgconn) == CONNECTION_BAD) {
  puts("We were unlineCoordsArrayle to connect to the datlineCoordsArrayase");
  exit(0);
 }

 //res = PQexec(conn, "declare geo no scroll cursor with hold for SELECT row_to_json(fc) from (select ST_AsGeoJSON(lg.way)::json As geometry, row_to_json(lp) As properties FROM planet_osm_line As lg INNER JOIN (SELECT osm_id, name,highway FROM planet_osm_line where highway is not null) As lp ON lg.osm_id = lp.osm_id) as fc;");
 res = PQexec(pgconn, "SELECT ST_AsText(way),osm_id, name,highway FROM planet_osm_line where highway is not null;");
 //res = PQexec(conn, "select * from planet_osm_line;");

 if (PQresultStatus(res) != PGRES_TUPLES_OK) {
  puts("We did not get any data!");
  exit(0);
 }
 rec_count = PQntuples(res);
 printf("We received %d records.\n", rec_count);
 puts("==========================");
 for (row=0; row<rec_count; row++) {
   printf("Record# %d\n",row);
  //for (col=0; col<4; col++) {
   //printf("%s\t\n", PQgetvalue(res, row, col));
   //parselinestringtovector(std::string(PQgetvalue(res, row, 0)))
   //break;
   std::vector<chunk> c;

   /*
   printf("%d",
   coordArrayToChunks2(
    parseLinestringRoadtoLineCoords(
       parselinestringtovector(std::string(PQgetvalue(res, row, 0)))),
    std::string(PQgetvalue(res, row, 2))).size()
  );
  */
  c = coordArrayToChunks2(
   parseLinestringRoadtoLineCoords(
      parselinestringtovector(std::string(PQgetvalue(res, row, 0)))),
   std::string(PQgetvalue(res, row, 2)));
   for(int i=0;i<c.size();i++)
  {
    std::cout << c[i].position.nameFromXYZ() << std::endl;

//    std::list<int> aList(c[i].voxels.begin(),c[i].voxels.end());
//BSONArrayBuilder arrBuilder;
//arrBuilder.append(aList);
//bsoncxx::BsonArray barr;

    bsoncxx::builder::stream::document filter_builder;//,
    document replace_builder;

filter_builder << "cname"
               << "294591|0|424978";

replace_builder << "cname"
                << c[i].position.nameFromXYZ();
                //<< "294591|0|424978";
    auto replace_builder2 = replace_builder
                << "chuck"
                << open_array;
                //<< c[i].voxels
                for(int n=0;n<c[i].voxels.size();n++){
                  replace_builder2 << c[i].voxels[n];
                }

                replace_builder2 << close_array;
                bsoncxx::document::value doc = replace_builder << finalize;
                //std::cout << bsoncxx::to_json(doc) << std::endl;
                //<< finalize;

//db["chunks"].options.upsert(true);
mongocxx::options::update u{};


u.upsert(true);
db["chunks"].replace_one(filter_builder.view(), doc.view(),u);//,u.upsert(true));
//collection.replace_one(filter_builder.view(), replace_builder.view(),u);//,u.upsert(true));

/**/
  }
   //writeMongo(coordArrayToChunks2)
  //}
  puts("");
 }
 puts("==========================");
 int wait;
 std::cin >> wait;
 PQclear(res);
 PQfinish(pgconn);
 //point p = convertEPSG3857toScreenXY(-10301828.82, 6037668.61);
 //point p2 = convertEPSG3857toScreenXY(-10301855.73, 6037449.53);
 //std::vector<point> v = calcStraightLine(p,p2);
 //for(int i=0;i<v.size();i++){
//   printf("coord %d %d \n",v[i].x,v[i].y);
 //}
 //printf("%d",p.x);
 return 0;
}
