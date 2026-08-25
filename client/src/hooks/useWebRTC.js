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

const SCREEN_VIDEO_ENCODING = {
  maxBitrate: 15000000,
  maxFramerate: 60,
  scaleResolutionDownBy: 1,
  networkPriority: 'high',
  priority: 'high',
  adaptivePtime: true,
  degradationPreference: 'maintain-resolution',
};

const AUDIO_ENCODING = {
  maxAverageBitrate: 256000,
  networkPriority: 'high',
  priority: 'high',
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
  const healthIntervalRef = useRef(null);

  const getLocalStream = useCallback(async (audio = true, video = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audio
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
              channelCount: 2,
              sampleSize: 16,
            }
          : false,
        video,
      });
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

  const applyAudioEncoding = useCallback((sender) => {
    if (!sender) return;
    sender.getParameters().then((params) => {
      if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
      params.encodings[0] = { ...params.encodings[0], ...AUDIO_ENCODING };
      sender.setParameters(params).catch(() => {});
    });
  }, []);

  const applyScreenEncoding = useCallback((sender) => {
    if (!sender) return;
    sender.getParameters().then((params) => {
      if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
      params.encodings[0] = { ...params.encodings[0], ...SCREEN_VIDEO_ENCODING };
      sender.setParameters(params).catch(() => {});
    });
  }, []);

  const renegotiate = useCallback(async (remoteId) => {
    const pc = peersRef.current[remoteId];
    if (!pc || pc.connectionState === 'closed') return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (socketRef.current) {
        socketRef.current.emit('webrtc-offer', { target: remoteId, offer });
      }
    } catch (err) {
      console.error('Renegotiation failed for', remoteId, err);
    }
  }, [socketRef]);

  const addTracksToPeer = useCallback((pc, remoteId, stream) => {
    if (!stream || !pc || pc.connectionState === 'closed') return;
    let needsRenego = false;
    stream.getTracks().forEach((track) => {
      const existingSender = pc.getSenders().find((s) => s.track && s.track.kind === track.kind);
      if (existingSender) {
        existingSender.replaceTrack(track).catch(() => {});
        if (track.kind === 'video') applyScreenEncoding(existingSender);
        if (track.kind === 'audio') applyAudioEncoding(existingSender);
      } else {
        try {
          pc.addTrack(track, stream);
          needsRenego = true;
        } catch (err) {
          console.error('addTrack failed:', err);
        }
      }
    });
    if (needsRenego) renegotiate(remoteId);
  }, [renegotiate, applyScreenEncoding, applyAudioEncoding]);

  const createPeer = useCallback((remoteSocketId, stream, _isInitiator) => {
    if (peersRef.current[remoteSocketId]) return peersRef.current[remoteSocketId];

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[remoteSocketId] = pc;

    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, stream);
        } catch (err) {
          console.error('addTrack to new peer failed:', err);
        }
      });
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

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === 'failed') {
        console.warn('ICE failed for', remoteSocketId, '- restarting');
        pc.restartIce().catch(() => {});
        renegotiate(remoteSocketId);
      } else if (state === 'disconnected') {
        console.warn('ICE disconnected for', remoteSocketId);
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
            pc.restartIce().catch(() => {});
            renegotiate(remoteSocketId);
          }
        }, 3000);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'failed' || state === 'closed') {
        delete peersRef.current[remoteSocketId];
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[remoteSocketId];
          return next;
        });
      }
    };

    return pc;
  }, [socketRef, renegotiate]);

  const createOffer = useCallback(async (remoteSocketId, stream) => {
    const pc = createPeer(remoteSocketId, stream, true);
    if (pc.connectionState === 'closed') return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (socketRef.current) {
        socketRef.current.emit('webrtc-offer', { target: remoteSocketId, offer });
      }
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  }, [createPeer, socketRef]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !roomId) return;

    socket.on('webrtc-user-joined', async ({ socketId, userId: _userId }) => {
      if (socketId === socket.id) return;
      const stream = localStreamRef.current;
      const existingPeer = peersRef.current[socketId];
      if (!existingPeer) {
        createPeer(socketId, stream, true);
      } else if (stream) {
        addTracksToPeer(existingPeer, socketId, stream);
      }
      if (stream) {
        createOffer(socketId, stream);
      }
    });

    socket.on('webrtc-offer', async ({ from, offer }) => {
      let pc = peersRef.current[from];
      if (!pc) {
        pc = createPeer(from, localStreamRef.current, false);
      } else if (localStreamRef.current) {
        addTracksToPeer(pc, from, localStreamRef.current);
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
  }, [roomId, socketRef, createOffer, createPeer, addTracksToPeer, renegotiate]);

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

  const emitWebRTCReady = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('webrtc-ready');
    }
  }, [socketRef]);

  const startMedia = useCallback(async (audio = true, video = true) => {
    const stream = await getLocalStream(audio, video);
    if (stream) {
      Object.entries(peersRef.current).forEach(([remoteId, pc]) => {
        addTracksToPeer(pc, remoteId, stream);
      });
      emitWebRTCReady();
    }
    return stream;
  }, [getLocalStream, emitWebRTCReady, addTracksToPeer]);

  const ensureStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await getLocalStream(true, true);
    if (stream) {
      Object.entries(peersRef.current).forEach(([remoteId, pc]) => {
        addTracksToPeer(pc, remoteId, stream);
      });
      emitWebRTCReady();
    }
    return stream;
  }, [getLocalStream, emitWebRTCReady, addTracksToPeer]);

  const sendTrackToAllPeers = useCallback((track, stream) => {
    Object.entries(peersRef.current).forEach(([remoteId, pc]) => {
      if (pc.connectionState === 'closed') return;
      try {
        const existingSender = pc.getSenders().find((s) => s.track && s.track.kind === track.kind);
        if (existingSender) {
          existingSender.replaceTrack(track).catch(() => {});
          if (track.kind === 'video') applyScreenEncoding(existingSender);
          if (track.kind === 'audio') applyAudioEncoding(existingSender);
        } else {
          pc.addTrack(track, stream);
          renegotiate(remoteId);
        }
      } catch (err) {
        console.error('Failed to send track to peer:', err);
        renegotiate(remoteId);
      }
    });
  }, [applyScreenEncoding, applyAudioEncoding, renegotiate]);

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
      sendTrackToAllPeers(audioTrack, stream);
    }
  }, [ensureStream, sendTrackToAllPeers]);

  const toggleCam = useCallback(async () => {
    const stream = localStreamRef.current || (await ensureStream());
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    const enabling = !videoTrack.enabled;
    videoTrack.enabled = enabling;
    setCamOn(enabling);

    if (enabling && !screenSharing) {
      sendTrackToAllPeers(videoTrack, stream);
    }
  }, [ensureStream, sendTrackToAllPeers, screenSharing]);

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

    const localStream = localStreamRef.current;
    if (cam && localStream) {
      sendTrackToAllPeers(cam, localStream);
    } else if (adoptedDisplayRef.current) {
      adoptedDisplayRef.current = false;
      Object.values(peersRef.current).forEach((pc) => {
        if (pc.connectionState === 'closed') return;
        const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(null).catch(() => {});
        }
      });
    }

    const mic = micTrackRef.current;
    if (mic && localStream) {
      sendTrackToAllPeers(mic, localStream);
    }

    setScreenStream(null);
    setScreenSharing(false);
    if (socketRef.current) {
      socketRef.current.emit('screen-share-changed', { sharing: false });
    }
  }, [sendTrackToAllPeers, socketRef]);

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
          frameRate: { ideal: 60, max: 120 },
          width: { ideal: 1920, max: 3840 },
          height: { ideal: 1080, max: 2160 },
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
            if (mic) sendTrackToAllPeers(mic, localStreamRef.current);
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

      const targetStream = localStreamRef.current || disp;
      sendTrackToAllPeers(screenTrack, targetStream);

      if (dispAudioTrack) {
        screenAudioTrackRef.current = dispAudioTrack;
        sendTrackToAllPeers(dispAudioTrack, disp);
      }

      setScreenStream(disp);
      setScreenSharing(true);
      if (socketRef.current) {
        socketRef.current.emit('screen-share-changed', { sharing: true });
      }

      emitWebRTCReady();

      return disp;
    } catch (err) {
      console.warn('Screen share failed:', err.message);
      return null;
    } finally {
      switchingRef.current = false;
    }
  }, [screenSharing, stopScreenShare, sendTrackToAllPeers, emitWebRTCReady, socketRef]);

  const stopMedia = useCallback(() => {
    if (screenTrackRef.current) {
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
    healthIntervalRef.current = setInterval(() => {
      Object.entries(peersRef.current).forEach(([remoteId, pc]) => {
        if (pc.connectionState === 'failed' || pc.iceConnectionState === 'failed') {
          console.warn('Health check: restarting dead peer', remoteId);
          delete peersRef.current[remoteId];
          setRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[remoteId];
            return next;
          });
        }
      });
    }, 10000);
    return () => {
      clearInterval(healthIntervalRef.current);
    };
  }, []);

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
