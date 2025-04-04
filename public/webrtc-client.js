class WebRTCClient {
  constructor(videoElement, wsUrl, streamName) {
    this.videoElement = videoElement;
    this.wsUrl = wsUrl;
    this.streamName = streamName;
    this.pc = null;
    this.ws = null;
  }

  start() {
    this.ws = new WebSocket(this.wsUrl);
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    this.pc.ontrack = (event) => {
      this.videoElement.srcObject = event.streams[0];
    };

    this.ws.onopen = () => {
      console.log("WebSocket connected");
      this.ws.send(
        JSON.stringify({
          type: "stream",
          name: this.streamName,
        })
      );
    };

    this.ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "offer") {
        await this.pc.setRemoteDescription(new RTCSessionDescription(message));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.ws.send(
          JSON.stringify({
            type: "answer",
            sdp: answer.sdp,
          })
        );
      } else if (message.type === "candidate") {
        await this.pc.addIceCandidate(new RTCIceCandidate(message.candidate));
      }
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.ws.send(
          JSON.stringify({
            type: "candidate",
            candidate: event.candidate,
          })
        );
      }
    };
  }

  stop() {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.videoElement.srcObject = null;
  }
}

export default WebRTCClient;
