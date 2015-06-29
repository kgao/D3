var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};
var chips = {};
var hands = {};
var busted = {};
var pot = 0;

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
    handleWinInfo(socket);
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
    //default
  if(chips[nickNames[socket.id]]){
    buyin = chips[nickNames[socket.id]];
  }else{
    buyin = 300;
  }

  if(busted[nickNames[socket.id]] && chips[nickNames[socket.id]] === 0){
    socket.emit('pokerHand', {
      success: true,
      id: socket.id,
      name: nickNames[socket.id],
      hand: hands[nickNames[socket.id]],
      text: 'Sorry You are busted out, please wait next game.'
    });
    socket.broadcast.to(currentRoom[socket.id]).emit('pokerStart', {
      success: true,
      text: 'Player '+ nickNames[socket.id] +' is busted out, join game for watching.'
    });

  }
  else{
    busted[nickNames[socket.id]] = 1;

    chips[nickNames[socket.id]] = buyin; //init chips
    hands[nickNames[socket.id]] = randomCard(2);

    socket.emit('pokerHand', {
      success: true,
      id: socket.id,
      name: nickNames[socket.id],
      hand: hands[nickNames[socket.id]],
      text: 'You are now in game with $' + buyin + '(default) buy-in.'
    });

    socket.broadcast.to(currentRoom[socket.id]).emit('pokerStart', {
      success: true,
      text: 'Player '+ nickNames[socket.id] +' is now in game with $' + buyin + ' buy-in.'
     });
   }
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

function handleWinInfo(socket) {
  // commander win
  socket.on('win', function (name) {
    if(nickNames[socket.id] === 'Kev'){
      var temp = pot;
      chips[name] += parseInt(pot); //update chips;
      pot = 0; //update pot;

      socket.emit('winInfo', {
        success: true,
        text: 'You won pot $' + temp + ' with hands:' + hands[name] + '!'
      });

      socket.broadcast.to(currentRoom[socket.id]).emit('winInfo', {
        success: true,
        text: name + ' won pot $' + temp + ' with hands:' + hands[name] + '!'
      });
    }else{
      socket.emit('winInfo', {
        success: true,
        text: 'You can not use dealer command.'
      });

      socket.broadcast.to(currentRoom[socket.id]).emit('winInfo', {
        success: true,
        text: name + ' is not dealer, can not use dealer command.'
      });
    }

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
    if(chips[nickNames[socket.id]] >= amount){
      chips[nickNames[socket.id]] = chips[nickNames[socket.id]] - amount; //udpate chips
      pot += parseInt(amount); //update pot, only int!
      socket.emit('pokerBet', {
        success: true,
        id: socket.id,
        name: nickNames[socket.id],
        text: 'You bet $' + amount +'($'+ chips[nickNames[socket.id]] +' left), and pot: $' + pot //TODO global result
      });

      socket.broadcast.to(currentRoom[socket.id]).emit('pokerBet', {
        success: true,
        text: nickNames[socket.id] +' bet $' + amount + '($'+ chips[nickNames[socket.id]] +' left), and pot: $'+ pot
      });
    }else{
      //fail to bet
      // chips[nickNames[socket.id]] = chips[nickNames[socket.id]] - amount; //no chips udpate
      socket.emit('pokerBet', {
        success: true,
        id: socket.id,
        name: nickNames[socket.id],
        text: 'You fail to bet more than you have ($'+ chips[nickNames[socket.id]] +' left)'
      });

      socket.broadcast.to(currentRoom[socket.id]).emit('pokerBet', {
        success: true,
        text: nickNames[socket.id] +' fail to bet $' + amount + '.($'+ chips[nickNames[socket.id]] +' left)'
      });
    }

  });
}
