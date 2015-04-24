var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};
var chips = {};
var hands = {};

exports.listen = function(server) {
  io = socketio.listen(server);
  io.set('log level', 1);
  io.sockets.on('connection', function (socket) {
    guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
    joinRoom(socket, 'Lobby');
    handleMessageBroadcasting(socket, nickNames);
    handleNameChangeAttempts(socket, nickNames, namesUsed);
    handleRoomJoining(socket);
    handlePokerRoom(socket);
    handlePokerBet(socket);
    handlePokerHand(socket);
    socket.on('rooms', function() {
      socket.emit('rooms', io.sockets.manager.rooms);
    });
    handleClientDisconnection(socket, nickNames, namesUsed);
  });
};

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
  var name = 'Guest' + guestNumber;
  nickNames[socket.id] = name;
  socket.emit('nameResult', {
    success: true,
    name: name
  });
  namesUsed.push(name);
  return guestNumber + 1;
}

function joinRoom(socket, room) {
  socket.join(room);
  currentRoom[socket.id] = room;
  socket.emit('joinResult', {room: room});
  socket.broadcast.to(room).emit('message', {
    text: nickNames[socket.id] + ' has joined ' + room + '.'
  });

  var usersInRoom = io.sockets.clients(room);
  if (usersInRoom.length > 1) {
    var usersInRoomSummary = 'Users currently in ' + room + ': ';
    for (var index in usersInRoom) {
      var userSocketId = usersInRoom[index].id;
      if (userSocketId != socket.id) {
        if (index > 0) {
          usersInRoomSummary += ', ';
        }
        usersInRoomSummary += nickNames[userSocketId];
      }
    }
    usersInRoomSummary += '.';
    socket.emit('message', {text: usersInRoomSummary});
  }
}

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
  socket.on('nameAttempt', function(name) {
    if (name.indexOf('Guest') == 0) {
      socket.emit('nameResult', {
        success: false,
        message: 'Names cannot begin with "Guest".'
      });
    } else {
      if (namesUsed.indexOf(name) == -1) {
        var previousName = nickNames[socket.id];
        var previousNameIndex = namesUsed.indexOf(previousName);
        namesUsed.push(name);
        nickNames[socket.id] = name;
        delete namesUsed[previousNameIndex];
        socket.emit('nameResult', {
          success: true,
          name: name
        });
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
          text: previousName + ' is now known as ' + name + '.'
        });
      } else {
        socket.emit('nameResult', {
          success: false,
          message: 'That name is already in use.'
        });
      }
    }
  });
}

function handleMessageBroadcasting(socket) {
  socket.on('message', function (message) {
    //global msg
    socket.broadcast.to(message.room).emit('message', {
      text: nickNames[socket.id] + ': ' + message.text
    });

  });
}

function handleRoomJoining(socket) {
  socket.on('join', function(room) {
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
}

function handleClientDisconnection(socket) {
  socket.on('disconnect', function() {
    var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
    delete namesUsed[nameIndex];
    delete nickNames[socket.id];
  });
}

function handlePokerRoom(socket) {

  socket.on('poker', function (buyin) {
    // TODO: buyin validation
    chips[nickNames[socket.id]] = buyin; //init chips
    hands[nickNames[socket.id]] = randomCard(2);

    socket.emit('pokerHand', {
      success: true,
      id: socket.id,
      name: nickNames[socket.id],
      hand: hands[nickNames[socket.id]],
      text: 'You are now in game with $' + buyin + ' buy-in.'
    });

    socket.broadcast.to(currentRoom[socket.id]).emit('pokerStart', {
      success: true,
      text: 'Player '+ nickNames[socket.id] +' is now in game with $' + buyin + ' buy-in.'
    });
  });
}


function handlePokerHand(socket) {

  socket.on('show', function () {
    socket.emit('pokerCard', {
      success: true,
      id: socket.id,
      name: nickNames[socket.id],
      text: 'You hands: ' + hands[nickNames[socket.id]] + '.'
    });

    socket.broadcast.to(currentRoom[socket.id]).emit('pokerCard', {
      success: true,
      text: nickNames[socket.id] +' show hands: ' + hands[nickNames[socket.id]] + '.'
    });
  });
}

////////////////////Init hands://////////////////

function randomCard(numToExtract) {
  var Ace = 1;
  var Face = 10;
  var symbols = [Ace, 2, 3, 4, 5, 6, 7, 8, 9, 10, Face, Face, Face];
  var suits = ['Hearts', 'Diamonds', 'Spades', 'Clubs'];
  result = [];
  for(var i=0;i<numToExtract;i++){
    var card_value = deal(symbols);
    var card_suit = suit(suits);
    result.push(card_value +' of ' + card_suit);
  }
  return result;
}

var deal = function(symbols) {
  var card = Math.random() * 51;
  return symbols[Math.floor(card % 12)];
}

var suit = function(suits) {
  var card = Math.random() * 3;
  return suits[Math.floor(card % 3)];
}

//////////////////End //////////////////

function handlePokerBet(socket) {
  socket.on('bet', function (amount) {
    // TODO: bet validation
    if(chips[nickNames[socket.id]] > amount){
      chips[nickNames[socket.id]] = chips[nickNames[socket.id]] - amount; //udpate chips
      socket.emit('pokerBet', {
        success: true,
        id: socket.id,
        name: nickNames[socket.id],
        text: 'You bet $' + amount +'.($'+ chips[nickNames[socket.id]] +' left)' //TODO global result
      });

      socket.broadcast.to(currentRoom[socket.id]).emit('pokerBet', {
        success: true,
        text: nickNames[socket.id] +' bet $' + amount + '.($'+ chips[nickNames[socket.id]] +' left)'
      });
    }else{
      //fail to bet
      chips[nickNames[socket.id]] = chips[nickNames[socket.id]] - amount; //udpate chips
      socket.emit('pokerBet', {
        success: true,
        id: socket.id,
        name: nickNames[socket.id],
        text: 'You fail to bet $' + amount +'.($'+ chips[nickNames[socket.id]] +' left)'
      });

      socket.broadcast.to(currentRoom[socket.id]).emit('pokerBet', {
        success: true,
        text: nickNames[socket.id] +' fail to bet $' + amount + '.($'+ chips[nickNames[socket.id]] +' left)'
      });
    }

  });
}
