(function () {
  var oldAddEventListener = WebSocket.prototype.addEventListener;
  WebSocket.prototype.addEventListener = function (eventName, callback) {
    return oldAddEventListener.apply(this, [
      eventName,
      (e) => {
        if (
          e.type == "message" &&
          e.data.type &&
          (e.data.type == "websocket_received" ||
            e.data.type == "websocket_sent")
        )
          return;
        if (e.type == "message") {
          console.log("ws: receiving data", e.data);
          window.postMessage({ type: "websocket_received", data: e.data }, "*");
        }
        callback(e);
      },
    ]);
  };

  //send message
  const originalSend = WebSocket.prototype.send;
  if (originalSend) {
    WebSocket.prototype.send = function (dataToSend) {
      window.postMessage(
        {
          type: "websocket_sent",
          data: dataToSend,
        },
        "*"
      );
      console.log("ws: sent data", dataToSend);
      return originalSend.apply(this, [dataToSend]);
    };
  } else {
    console.error("MAIN: WebSocket.prototype.send not found. Patching failed.");
  }
})();
