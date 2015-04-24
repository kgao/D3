var Chat = function(socket) {
  this.socket = socket;
};

Chat.prototype.sendMessage = function(room, text) {
  var message = {
    room: room,
    text: text
  };
  this.socket.emit('message', message);
};

Chat.prototype.changeRoom = function(room) {
  this.socket.emit('join', {
    newRoom: room
  });
};

Chat.prototype.processCommand = function(command) {
  var words = command.split(' '),
  command = words[0]
                .substring(1, words[0].length)
                .toLowerCase(),
  message = false;
  words.shift();
  var msg = words.join(' ');
  switch(command) {
    case 'join':
      this.changeRoom(msg);
      break;
    case 'nick':
      this.socket.emit('nameAttempt', msg);
      break;
    case 'poker':
      this.socket.emit('poker', msg);
      break;
    case 'bet':
      this.socket.emit('bet', msg);
      break;
    case 'show':
        this.socket.emit('show', msg);
        break;
    case 'message':
      var room = msg.split(':')[0];
      var message = msg.split(':')[1];
      this.sendMessage(room, message);
      break;
    default:
      this.socket.emit('message', 'Unrecognized command.');
      break;
  };

  return message;
};
