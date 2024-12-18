(function () {
    var oldAddEventListener = WebSocket.prototype.addEventListener;
    WebSocket.prototype.addEventListener = function (eventName, callback) {
        return oldAddEventListener.apply(this, [eventName,
            (e) => {
                if (e.type == "message" && e.data.type == "websocket_received")
                    return
                if (e.type == "message") {
                    console.log("ws: receiving data", e.data);
                    window.postMessage({ "type": "websocket_received", "data": e.data }, "*");
                }
                callback(e)
            }
        ])
    };
})();
