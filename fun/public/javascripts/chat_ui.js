function divEscapedContentElement(message) {
  return $('<div></div>').text(message);
}

function divSystemContentElement(message) {
  return $('<div></div>').html('<i>' + message + '</i>');
}

function divPrivateContentElement(id, name) {
  //TODO: use CODE to validate the start hands for each player after game.
  return $('<div id='+ id +'></div>').text('Code: '+ id.substring(0, 5) +' Player: '+ name + '<br/> Start Hands: [ '+ randomCard(2)+' ]');
}

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

function processUserInput(chatApp, socket) {
  var message = $('#send-message').val();
  var systemMessage;

  if (message.charAt(0) == '/') {
    systemMessage = chatApp.processCommand(message);
    if (systemMessage) {
      $('#messages').append(divSystemContentElement(systemMessage));
    }
  } else {
    chatApp.sendMessage($('#room').text(), message);
    $('#messages').append(divEscapedContentElement(message));
    $('#messages').scrollTop($('#messages').prop('scrollHeight'));
  }

  $('#send-message').val('');
}

var socket = io.connect();

$(document).ready(function() {
  var chatApp = new Chat(socket);

  socket.on('nameResult', function(result) {
    var message;

    if (result.success) {
      message = 'You are now known as ' + result.name + '.';
    } else {
      message = result.message;
    }
    $('#messages').append(divSystemContentElement(message));
  });

  socket.on('joinResult', function(result) {
    $('#room').text(result.room);
    $('#messages').append(divSystemContentElement('Room changed.'));
  });

  socket.on('message', function (message) {
    var newElement = $('<div></div>').text(message.text);
    $('#messages').append(newElement);
  });

  socket.on('pokerResult', function (result) {
    var message;

    if (result.success) {
      message = 'Player '+ result.name +' is now in game with $' + result.buyin + ' buy-in.';
      //TODO Poker Mode
      $('#poker-top').show();
      $('#poker-bottom').show();
      //Meanwhile: Open your own deck based on your username(socketID) for 2 dealed cards.
      $('#poker-bottom').append(divPrivateContentElement(result.id,result.name));
    } else {
      message = result.message;
    }
    $('#messages').append(divSystemContentElement(message));
  });

  socket.on('rooms', function(rooms) {
    $('#room-list').empty();

    for(var room in rooms) {
      room = room.substring(1, room.length);
      if (room != '') {
        $('#room-list').append(divEscapedContentElement(room));
      }
    }

    $('#room-list div').click(function() {
      chatApp.processCommand('/join ' + $(this).text());
      $('#send-message').focus();
    });
  });

  setInterval(function() {
    socket.emit('rooms');
  }, 1000);

  $('#send-message').focus();

  $('#send-form').submit(function() {
    processUserInput(chatApp, socket);
    return false;
  });
});
