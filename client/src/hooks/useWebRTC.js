import { useState, useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC(socketRef, roomId, localUserId) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const peersRef = useRef({});
  const localStreamRef = useRef(null);

  const getLocalStream = useCallback(async (audio = true, video = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio, video });
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = false;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = false;
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Failed to get media:', err);
      return null;
    }
  }, []);

  const createPeer = useCallback((remoteSocketId, stream, isInitiator) => {
    if (peersRef.current[remoteSocketId]) return peersRef.current[remoteSocketId];

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[remoteSocketId] = pc;

    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (remoteStream) {
        setRemoteStreams((prev) => ({ ...prev, [remoteSocketId]: remoteStream }));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc-ice-candidate', {
          target: remoteSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        delete peersRef.current[remoteSocketId];
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[remoteSocketId];
          return next;
        });
      }
    };

    return pc;
  }, [socketRef]);

  const createOffer = useCallback(async (remoteSocketId, stream) => {
    const pc = createPeer(remoteSocketId, stream, true);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (socketRef.current) {
        socketRef.current.emit('webrtc-offer', {
          target: remoteSocketId,
          offer,
        });
      }
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  }, [createPeer, socketRef]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !roomId) return;

    socket.on('webrtc-user-joined', async ({ socketId, userId }) => {
      if (socketId === socket.id) return;
      const stream = localStreamRef.current;
      if (stream) {
        createOffer(socketId, stream);
      }
    });

    socket.on('webrtc-offer', async ({ from, offer }) => {
      let pc = peersRef.current[from];
      if (!pc) {
        pc = createPeer(from, localStreamRef.current, false);
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc-answer', { target: from, answer });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    });

    socket.on('webrtc-answer', async ({ from, answer }) => {
      const pc = peersRef.current[from];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('Error handling answer:', err);
        }
      }
    });

    socket.on('webrtc-ice-candidate', async ({ from, candidate }) => {
      const pc = peersRef.current[from];
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    });

    socket.on('webrtc-user-left', ({ socketId }) => {
      if (peersRef.current[socketId]) {
        peersRef.current[socketId].close();
        delete peersRef.current[socketId];
      }
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    });

    return () => {
      socket.off('webrtc-user-joined');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      socket.off('webrtc-user-left');
    };
  }, [roomId, socketRef, createOffer, createPeer]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !roomId) return;

    const onJoin = () => {
      socket.emit('webrtc-ready');
    };

    socket.on('room-users', () => {
      setTimeout(onJoin, 500);
    });

    return () => {
      socket.off('room-users');
    };
  }, [roomId, socketRef]);

  const startMedia = useCallback(async (audio = true, video = true) => {
    const stream = await getLocalStream(audio, video);
    if (stream && socketRef.current) {
      socketRef.current.emit('webrtc-ready');
    }
    return stream;
  }, [getLocalStream, socketRef]);

  // Lazy-start media on first mic/cam use. Attaches tracks to already-
  // established peers and renegotiates so late-joiners see existing feeds.
  const ensureStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await getLocalStream(true, true);
    if (stream && socketRef.current) {
      Object.entries(peersRef.current).forEach(([remoteId, pc]) => {
        try {
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));
          createOffer(remoteId, stream);
        } catch (err) {
          console.error('Failed to attach tracks to existing peer:', err);
        }
      });
      socketRef.current.emit('webrtc-ready');
    }
    return stream;
  }, [getLocalStream, socketRef, createOffer]);

  const toggleMic = useCallback(async () => {
    const stream = localStreamRef.current || (await ensureStream());
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
      }
    }
  }, [ensureStream]);

  const toggleCam = useCallback(async () => {
    const stream = localStreamRef.current || (await ensureStream());
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCamOn(videoTrack.enabled);
      }
    }
  }, [ensureStream]);

  const stopMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    setRemoteStreams({});
  }, []);

  useEffect(() => {
    return () => stopMedia();
  }, [stopMedia]);

  return {
    localStream,
    remoteStreams,
    micOn,
    camOn,
    startMedia,
    toggleMic,
    toggleCam,
    stopMedia,
  };
}
