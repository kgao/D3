function divEscapedContentElement(message) {
  return $('<div></div>').text(message);
}

function divSystemContentElement(message) {
  return $('<div></div>').html('<i>' + message + '</i>');
}

function divPrivateContentElement(id, name, hand) {
  //TODO: use CODE to validate the start hands for each player after game.
  return $('<div id='+ id +' style="background:#CCFF99"></div>').text('Code: '+ id.substring(0, 5) +' Player: '+ name + ' Start Hands: [ '+ hand +' ]');
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

  var chatWindow = $('#messages');

  function writeLine(line) {
    chatWindow.append(line);
    chatWindow.scrollTop(chatWindow.prop('scrollHeight'));
  }

  socket.on('nameResult', function(result) {
    var message;

    if (result.success) {
      message = 'You are now known as ' + result.name + '.';
    } else {
      message = result.message;
    }
    writeLine(divSystemContentElement(message));
  });

  socket.on('joinResult', function(result) {
    $('#room').text(result.room);
    writeLine(divSystemContentElement('Room changed.'));
  });

  socket.on('message', function (message) {
    var newElement = $('<div></div>').text(message.text);
    writeLine(newElement);
  });


  socket.on('pokerHand', function (result) {
    var message;
    if (result.success) {
    message = result.text;
    // TODO Poker Mode
    $('#poker-top').show();
    $('#poker-bottom').show();
    //Meanwhile: Open your own deck based on your username(socketID) for 2 dealed cards.
    $('#hand').html(divPrivateContentElement(result.id,result.name,result.hand));
    } else {
      message = 'Fail to start poker hand.';
    }
    writeLine(divSystemContentElement(message));
  });


  socket.on('pokerStart', function (result) {
    var message;
    if (result.success) {
      message = result.text;
      $('#poker-top').show();
      $('#poker-bottom').show();
    } else {
      message = 'Fail to start poker.';
    }
    writeLine(divSystemContentElement(message));
  });


  socket.on('pokerBet', function (result) {
    var message;

    if (result.success) {
      message = result.text;
    } else {
      message = 'Fail to get player bet.';
    }
    writeLine(divSystemContentElement(message));
  });

  socket.on('pokerCard', function (result) {
    var message;

    if (result.success) {
      message = result.text;
    } else {
      message = 'Fail to get player bet.';
    }
    writeLine(divSystemContentElement(message));
  });

  socket.on('rooms', function(rooms) {
    $('#room-list').empty();

    for(var room in rooms) {
      room = room.substring(1, room.length);
      if (room != '') {
        writeLine(divEscapedContentElement(room));
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
