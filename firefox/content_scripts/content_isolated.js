window.addEventListener("message", (event) => {
  const rawData = event.data.data;
  const messageType = event.data.type;

  if (!rawData || !messageType) return;

  let parsedData;

  if (typeof rawData === "string") {
    try {
      parsedData = JSON.parse(rawData);
    } catch (error) {
      console.warn(
        `ISOLATED: Could not parse ${messageType} data as JSON. Raw data:`,
        rawData,
        error
      );
      return;
    }
  } else {
    parsedData = rawData;
  }

  if (messageType == "websocket_received") {
    console.log("ws: passing data to background", event);
    browser.runtime.sendMessage({
      type: "websocket_passed",
      data: parsedData,
    });
  } else if (messageType === "websocket_sent") {
    browser.runtime.sendMessage({
      type: "websocket_sent",
      data: parsedData,
    });
  }
});
