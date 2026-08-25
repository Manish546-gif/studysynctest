import { useState, useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

const SCREEN_ENCODING = {
  maxBitrate: 20000000,
  maxFramerate: 120,
  scaleResolutionDownBy: 1,
  networkPriority: 'high',
  priority: 'high',
  adaptivePtime: true,
  degradationPreference: 'maintain-resolution',
};

export function useWebRTC(socketRef, roomId, _localUserId) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const screenTrackRef = useRef(null);
  const screenAudioTrackRef = useRef(null);
  const cameraTrackRef = useRef(null);
  const micTrackRef = useRef(null);
  const adoptedDisplayRef = useRef(false);
  const switchingRef = useRef(false);

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

  const createPeer = useCallback((remoteSocketId, stream, _isInitiator) => {
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

  const renegotiate = useCallback(async (remoteId) => {
    const pc = peersRef.current[remoteId];
    if (!pc) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (socketRef.current) {
        socketRef.current.emit('webrtc-offer', { target: remoteId, offer });
      }
    } catch (err) {
      console.error('Renegotiation offer failed:', err);
    }
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

  const applyScreenEncoding = useCallback((sender) => {
    if (!sender) return;
    sender.getParameters().then((params) => {
      if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
      params.encodings[0] = { ...params.encodings[0], ...SCREEN_ENCODING };
      sender.setParameters(params).catch(() => {});
    });
  }, []);

  const addTrackToAllPeers = useCallback((track, stream) => {
    Object.entries(peersRef.current).forEach(([remoteId, pc]) => {
      try {
        const existingSender = pc.getSenders().find((s) => s.track && s.track.kind === track.kind);
        if (existingSender) {
          existingSender.replaceTrack(track);
          if (track.kind === 'video') applyScreenEncoding(existingSender);
        } else {
          pc.addTrack(track, stream);
          renegotiate(remoteId);
        }
      } catch (err) {
        console.error('Failed to add track to peer:', err);
      }
    });
  }, [renegotiate, applyScreenEncoding]);

  const replaceAudioTrack = useCallback((track) => {
    Object.entries(peersRef.current).forEach(([remoteId, pc]) => {
      try {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
        if (sender) {
          sender.replaceTrack(track);
        } else if (track) {
          const stream = localStreamRef.current || new MediaStream([track]);
          pc.addTrack(track, stream);
          renegotiate(remoteId);
        }
      } catch (err) {
        console.error('Failed to swap outgoing audio track:', err);
      }
    });
  }, [renegotiate]);

  const replaceVideoTrack = useCallback((track) => {
    Object.entries(peersRef.current).forEach(([remoteId, pc]) => {
      try {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(track);
          if (track && track.kind === 'video' && track.label && track.label.includes('screen')) {
            applyScreenEncoding(sender);
          }
        } else if (track) {
          const stream = localStreamRef.current || new MediaStream([track]);
          pc.addTrack(track, stream);
          renegotiate(remoteId);
        }
      } catch (err) {
        console.error('Failed to swap outgoing video track:', err);
      }
    });
  }, [renegotiate, applyScreenEncoding]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !roomId) return;

    socket.on('webrtc-user-joined', async ({ socketId, userId: _userId }) => {
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
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    const enabling = !audioTrack.enabled;
    audioTrack.enabled = enabling;
    setMicOn(enabling);
    micTrackRef.current = enabling ? audioTrack : null;

    if (enabling) {
      replaceAudioTrack(audioTrack);
    }
  }, [ensureStream, replaceAudioTrack]);

  const toggleCam = useCallback(async () => {
    const stream = localStreamRef.current || (await ensureStream());
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    const enabling = !videoTrack.enabled;
    videoTrack.enabled = enabling;
    setCamOn(enabling);

    if (enabling && !screenSharing) {
      replaceVideoTrack(videoTrack);
    }
  }, [ensureStream, replaceVideoTrack, screenSharing]);

  const stopScreenShare = useCallback(() => {
    if (!screenTrackRef.current) return;
    screenTrackRef.current.stop();
    screenTrackRef.current = null;

    if (screenAudioTrackRef.current) {
      screenAudioTrackRef.current.stop();
      screenAudioTrackRef.current = null;
    }

    const cam = cameraTrackRef.current;
    cameraTrackRef.current = null;
    if (cam) {
      replaceVideoTrack(cam);
    } else if (adoptedDisplayRef.current) {
      adoptedDisplayRef.current = false;
      localStreamRef.current = null;
      setLocalStream(null);
      setCamOn(false);
    }

    const mic = micTrackRef.current;
    if (mic) {
      replaceAudioTrack(mic);
    }

    setScreenStream(null);
    setScreenSharing(false);
    if (socketRef.current) {
      socketRef.current.emit('screen-share-changed', { sharing: false });
    }
  }, [replaceVideoTrack, replaceAudioTrack, socketRef]);

  const toggleScreenShare = useCallback(async (shareAudio = false) => {
    if (switchingRef.current) return null;
    if (screenSharing) {
      stopScreenShare();
      return null;
    }
    switchingRef.current = true;
    try {
      const disp = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 120, max: 240 },
          width: { ideal: 2560, max: 3840 },
          height: { ideal: 1440, max: 2160 },
          cursor: 'always',
          displaySurface: 'monitor',
        },
        audio: shareAudio
          ? {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              sampleRate: 48000,
              channelCount: 2,
            }
          : false,
      });

      const screenTrack = disp.getVideoTracks()[0];
      if (!screenTrack) return null;

      const dispAudioTrack = disp.getAudioTracks()[0] || null;

      screenTrack.addEventListener('ended', () => stopScreenShare());
      if (dispAudioTrack) {
        dispAudioTrack.addEventListener('ended', () => {
          if (screenAudioTrackRef.current) {
            screenAudioTrackRef.current = null;
            const mic = micTrackRef.current;
            if (mic) replaceAudioTrack(mic);
          }
        });
      }

      screenTrackRef.current = screenTrack;

      let stream = localStreamRef.current;
      if (!stream) {
        adoptedDisplayRef.current = true;
        localStreamRef.current = disp;
        setLocalStream(disp);
      }
      cameraTrackRef.current = stream ? stream.getVideoTracks()[0] || null : null;
      replaceVideoTrack(screenTrack);

      if (dispAudioTrack) {
        screenAudioTrackRef.current = dispAudioTrack;
        replaceAudioTrack(dispAudioTrack);
      }

      setScreenStream(disp);
      setScreenSharing(true);
      if (socketRef.current) {
        socketRef.current.emit('screen-share-changed', { sharing: true });
      }
      return disp;
    } catch (err) {
      console.warn('Screen share failed:', err.message);
      return null;
    } finally {
      switchingRef.current = false;
    }
  }, [screenSharing, stopScreenShare, replaceVideoTrack, replaceAudioTrack, socketRef]);

  const stopMedia = useCallback(() => {
    const wasSharing = !!screenTrackRef.current;
    if (wasSharing) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
      if (socketRef.current) {
        socketRef.current.emit('screen-share-changed', { sharing: false });
      }
    }
    if (screenAudioTrackRef.current) {
      screenAudioTrackRef.current.stop();
      screenAudioTrackRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    adoptedDisplayRef.current = false;
    cameraTrackRef.current = null;
    micTrackRef.current = null;
    switchingRef.current = false;
    setLocalStream(null);
    setScreenSharing(false);
    setScreenStream(null);
    setMicOn(false);
    setCamOn(false);
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    setRemoteStreams({});
  }, [socketRef]);

  useEffect(() => {
    return () => stopMedia();
  }, [stopMedia]);

  return {
    localStream,
    remoteStreams,
    micOn,
    camOn,
    screenSharing,
    screenStream,
    startMedia,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    stopMedia,
  };
}
