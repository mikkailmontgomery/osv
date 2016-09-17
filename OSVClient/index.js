var createGame = require('voxel-engine')
var highlight = require('voxel-highlight')
var player = require('voxel-player')
var skin = require('minecraft-skin')
var voxel = require('voxel')
var extend = require('extend')
var fly = require('voxel-fly')
var walk = require('voxel-walk')
var http = require('http')
var textures = "http://commondatastorage.googleapis.com/voxeltextures/"
var createClient = require('voxel-client')
var duplexEmitter = require('duplex-emitter')
var io = require('socket.io-client/socket.io.js')('http://localhost:8080')
var game




module.exports = function(opts, setup) {
  setup = setup || defaultSetup

  



  
  var defaults = {
    generateChunks: false,
    chunkDistance: 3,
    textures : './textures/',
    materials: [['grass', 'dirt', 'grass_dirt'], 'road', 'roadside', 'dirt'],
    materialFlatColor: false,
    worldOrigin: [0, 0, 0],
    controls: { discreteFire: true }
  }
  opts = extend({}, defaults, opts || {})


  // setup the game and add some trees
  game = createGame(opts)
  var container = opts.container || document.body
  window.game = game // for debugging
  game.appendTo(container)
  if (game.notCapable()) return game
  
  var createPlayer = player(game)

  // create the player from a minecraft skin file and tell the
  // game to use it as the main player
  var avatar = createPlayer(opts.playerSkin || 'player.png')
  avatar.possess()
  avatar.yaw.position.set(2, 14, 4)
//avatar.yaw.position.set(32 *303876,0, 32 *438233)
  setup(game, avatar)
 //window.avatar = avatar
  function sendState() {
    //console.log('sendstate')
    if (!io.connected) return
    var player = game.controls.target()
    var state = {
      position: player.yaw.position,
      rotation: {
        y: player.yaw.rotation.y,
        x: player.pitch.rotation.x
      }
    }
    io.emit('stateUpdate', state)
  }

  game.controls.on('data', function(state) {
    var interacting = false
    Object.keys(state).map(function(control) {
      if (state[control] > 0) interacting = true
    })
    if (interacting) sendState()
  })
  
  return game
}
players = {}

      io.on('stateUpdateServer', function(msg){
          //console.log(msg)
          //for(i=0;i<players.length;i++)
          //{
          var player = players[msg.id]
              if(!player)
              {
                      var dude = skin(game.THREE, 'substack.png', {
      scale: new game.THREE.Vector3(0.04, 0.04, 0.04)
    }).createPlayerObject()
      //var createPlayer = player(game)
      //var dude = {id:id,body:createPlayer('substack.png')}
      dude.position.set(2, 14, 4)
      game.scene.add(dude)
      players[msg.id] = dude
      var player = players[msg.id]
              }

              
                 players[msg.id].position.set( msg.position.x,msg.position.y,msg.position.z )
                 players[msg.id].children[0].rotation.y = msg.rotation.y + (Math.PI / 2)
                 players[msg.id].head.rotation.x = scale(msg.rotation.x, -1.5, 1.5, -0.75, 0.75)
                 //players[i].body.mesh.position.copy(playerMesh.position.lerp(msg.position, 0.1))
                 //players[i].body.mesh.position.copy(players[i].body.mesh.position.lerp(msg.position, 0.1))
                 //console.log("yo")
              
          //}
      })

      io.on('join',function(id){
      var dude = skin(game.THREE, 'substack.png', {
      scale: new game.THREE.Vector3(0.04, 0.04, 0.04)
    }).createPlayerObject()
      //var createPlayer = player(game)
      //var dude = {id:id,body:createPlayer('substack.png')}
      dude.position.set(2, 14, 4)
      game.scene.add(dude)
      players[id] = dude
      })
  //setTimeout(3000,function(){
    //if(io.connected)
    //{
     // io.emit('getplayers')
    //}
  //})
function scale( x, fromLow, fromHigh, toLow, toHigh ) {
  return ( x - fromLow ) * ( toHigh - toLow ) / ( fromHigh - fromLow ) + toLow
}
  function v2h(value) {
    value = parseInt(value).toString(16)
    return value.length < 2 ? '0' + value : value
  }

  function rgb2hex(rgb) {
    return '#' + v2h( rgb[ 0 ] * 255 ) + v2h( rgb[ 1 ] * 255 ) + v2h( rgb[ 2 ] * 255 );
  }

function defaultSetup(game, avatar) {
  
  var makeFly = fly(game)
  var target = game.controls.target()
  game.flyer = makeFly(target)
  
  // highlight blocks when you look at them, hold <Ctrl> for block placement
  var blockPosPlace, blockPosErase
  var hl = game.highlighter = highlight(game, { color: 0xff0000 })
  hl.on('highlight', function (voxelPos) { blockPosErase = voxelPos })
  hl.on('remove', function (voxelPos) { blockPosErase = null })
  hl.on('highlight-adjacent', function (voxelPos) { blockPosPlace = voxelPos })
  hl.on('remove-adjacent', function (voxelPos) { blockPosPlace = null })

  // toggle between first and third person modes
  window.addEventListener('keydown', function (ev) {
    if (ev.keyCode === 'R'.charCodeAt(0)) avatar.toggle()
  })

  // block interaction stuff, uses highlight data
  var currentMaterial = 1

  game.on('fire', function (target, state) {
    var position = blockPosPlace //this ends up just being global voxel coodinates.
    if (position) {

      var e = document.createElement('div');
  e.className = 'voxel-share';
  var exportbtn = document.createElement('input');
  exportbtn.setAttribute("type","button");

  e.appendChild(exportbtn);
  var doc = document.createElement('div');
  e.appendChild(doc);
  document.body.appendChild(e);
  exportbtn.addEventListener("click", function(){
    //console.log(document.getElementById('doc').contentWindow.myjson)
    var littleblocks = document.getElementById('doc').contentWindow.Voxels
              var ngeometry = new game.THREE.CubeGeometry(1, 1, 1)
rollOverMaterial =  new game.THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: false} );
console.log(littleblocks.length)
      for (var i = 0;i<littleblocks.length;i++){
            var tempblock = new game.THREE.Mesh( ngeometry, new game.THREE.MeshBasicMaterial( { color: rgb2hex(littleblocks[i].color),  transparent: false} ) )
            littleblocks[i].block = tempblock
            littleblocks[i].block.scale.set(1/16,1/16,1/16)  //16 pixels on a face of a voxel, to 1/16 makes a 1 to 1 voxel in a voxel. 1/16,1/16,1/16 is the middle of the voxel.
            littleblocks[i].block.position.set(position[0]+((1/16) * littleblocks[i].x),position[1]+((1/16) *littleblocks[i].y),position[2]+((1/16) *littleblocks[i].z))
            game.scene.add(littleblocks[i].block)
            
      }

document.body.removeChild(e)
});
    doc.innerHTML='<iframe id="doc" src="builder/edit.html" width="700" height="450"></object>';

    }
    else {
      position = blockPosErase
      if (position) game.setBlock(position, 0)
    }
  })

  game.on('tick', function() {
    var chunkname = game.voxels.chunkAtPosition([target.position.x,target.position.y,target.position.z]).join("|")

  
  if(target !== undefined
    && target.position !== undefined
    && game.voxels !== undefined 
    && game.voxels.chunks !== undefined
    && game.voxels.chunks[chunkname]  !== undefined 
    && game.voxels.chunks[chunkname].roadname !== undefined)
  {
    console.log(game.voxels.chunks[game.voxels.chunkAtPosition([target.position.x,target.position.y,target.position.z]).join("|")].roadname)
  }
    walk.render(target.playerSkin)
    var vx = Math.abs(target.velocity.x)
    var vz = Math.abs(target.velocity.z)
    if (vx > 0.001 || vz > 0.001) walk.stopWalking()
    else walk.startWalking()
  })



       
        var geometry = new game.THREE.Geometry();
rollOverMaterial = new game.THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
geometry.vertices.push(
  new game.THREE.Vector3( -10,  10, 0 ),
  new game.THREE.Vector3( -10, -10, 0 ),
  new game.THREE.Vector3(  10, -10, 0 )
);

rollOverMesh = new game.THREE.Mesh( geometry, rollOverMaterial );
        game.scene.add( rollOverMesh );

geometry.faces.push( new game.THREE.Face3( 0, 1, 2 ) );

geometry.computeBoundingSphere();
        

var chunkSize = 32

game.voxels.on('missingChunk', function(p) {
  //var voxels = generator(p, chunkSize)


var fetch = http.request({
  host: "localhost",
  port: 8000,
  path: "/?chunk=" + (p[0] + 294586) + "|" + p[1] + "|" + (p[2] + 424977),
  method: "GET",
  withCredentials: false // this is the important part
}, function(res) {
    var result = ""
    res.on('data', function(chunk) {
        result += chunk;
    });
    res.on('end', function() {
      //console.log(result)
    var chunk = JSON.parse(result)
    chunk.position = [p[0] , p[1] , p[2]]
    //console.log(chunk)
  game.showChunk(chunk)
console.log("hmm")
    });
});
fetch.end();

})

game.paused = false

window.game = game

}