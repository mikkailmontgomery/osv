//Compile with:
//g++ parser.cpp -o parser.out -L/usr/local/lib -lpq
//run with:
//
#include <stdio.h>
#include <string>
#include <iostream>
#include <libpq-fe.h>
#include <math.h>
#include <vector>

struct point {
  int x;
  int y;
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

int main()
{
 std::cout << "Hello world!" << std::endl;
 PGconn          *conn;
 PGresult        *res;
 int             rec_count;
 int             row;
 int             col;
 conn = PQconnectdb("dbname=gis host=localhost user=postgres password=Asdfjkl1");
 if (PQstatus(conn) == CONNECTION_BAD) {
  puts("We were unlineCoordsArrayle to connect to the datlineCoordsArrayase");
  exit(0);
 }

 //res = PQexec(conn, "declare geo no scroll cursor with hold for SELECT row_to_json(fc) from (select ST_AsGeoJSON(lg.way)::json As geometry, row_to_json(lp) As properties FROM planet_osm_line As lg INNER JOIN (SELECT osm_id, name,highway FROM planet_osm_line where highway is not null) As lp ON lg.osm_id = lp.osm_id) as fc;");
 res = PQexec(conn, "SELECT ST_AsText(way),osm_id, name,highway FROM planet_osm_line where highway is not null;");
 //res = PQexec(conn, "select * from planet_osm_line;");

 if (PQresultStatus(res) != PGRES_TUPLES_OK) {
  puts("We did not get any data!");
  exit(0);
 }
 rec_count = PQntuples(res);
 printf("We received %d records.\n", rec_count);
 puts("==========================");
 for (row=0; row<rec_count; row++) {
  for (col=0; col<4; col++) {
   printf("%s\t\n", PQgetvalue(res, row, col));
   //writeMongo(coordArrayToChunks2)
  }
  puts("");
 }
 puts("==========================");
 PQclear(res);
 PQfinish(conn);
 point p = convertEPSG3857toScreenXY(-10301828.82, 6037668.61);
 point p2 = convertEPSG3857toScreenXY(-10301855.73, 6037449.53);
 std::vector<point> v = calcStraightLine(p,p2);
 for(int i=0;i<v.size();i++){
   printf("coord %d %d \n",v[i].x,v[i].y);
 }
 printf("%d",p.x);
}
