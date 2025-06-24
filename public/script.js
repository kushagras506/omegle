const socket = io();
let peerConnection;
let localStream;

const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const status = document.getElementById('status');

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;
  });

socket.on('waiting', () => {
  status.innerText = 'Waiting for a partner...';
});

socket.on('partner', async (partnerId) => {
  status.innerText = 'Partner found! Connecting...';
  createPeerConnection();

  for (let track of localStream.getTracks()) {
    peerConnection.addTrack(track, localStream);
  }

  if (socket.id < partnerId) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('signal', { desc: peerConnection.localDescription });
  }
});

socket.on('signal', async (data) => {
  if (data.desc) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.desc));
    if (data.desc.type === 'offer') {
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('signal', { desc: peerConnection.localDescription });
    }
  } else if (data.candidate) {
    try {
      await peerConnection.addIceCandidate(data.candidate);
    } catch (e) {
      console.error('Error adding ice candidate', e);
    }
  }
});

socket.on('partner-disconnected', () => {
  status.innerText = 'Partner disconnected.';
  remoteVideo.srcObject = null;
  if (peerConnection) peerConnection.close();
});

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(config);

  peerConnection.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit('signal', { candidate: e.candidate });
    }
  };

  peerConnection.ontrack = (e) => {
    remoteVideo.srcObject = e.streams[0];
  };
}
