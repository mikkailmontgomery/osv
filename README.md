# osv

Solution Overview:
Server<----->client
  ^             ^
  |             |
  v             |
mongodb         |
  ^             |
  |             |
parser          |
  ^             |
  |             |
pgsql------>tile-server

Server
Serves multi-player server logic
Serves chat
Serves chunks for a chunkcache
Populates chunkcache based on player(client) location.
(chunkcache logic in both server and client is future)
chunkcache is populated from mongodb database.(future)
syncs block changes back to mongodb(future)
install via "npm install"
run via "npm start"

client
Serves up html5 game client
Connects to server for chunk information.
populates a slightly smaller chunkcache.(future)
install via "npm install"
run via "npm start"

mongodb
(more details needed)
install however you need on your machine.
hosts chunk data from parser output
saves changes to chunks from "server"(future)

parser
queries data from pgsql db and translates them to chunkformat
stores the chunks in mongodb
run with "node parser.js"

pgsql
install however you need on your system(need more specifics)
host openstreetmaps dataset for parser and tile-server.

tile-server
creates image "tiles" to display world map on client.
serves up image "tiles" to client.
