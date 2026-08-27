import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
} from 'livekit-client';

function buildMediaStream(tracks) {
  const mediaTracks = tracks
    .filter((t) => t && t.mediaStreamTrack)
    .map((t) => t.mediaStreamTrack);
  if (mediaTracks.length === 0) return null;
  return new MediaStream(mediaTracks);
}

function logTag(...args) {
  console.log('[LiveKit]', ...args);
}

const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
};

function subscribeToAllTracks(room, video = false) {
  if (!room) return;
  const participants = room.remoteParticipants;
  if (!participants) return;
  participants.forEach((p) => {
    if (!p.trackPublications) return;
    p.trackPublications.forEach((pub) => {
      if (pub.isSubscribed || pub.track) return;
      const isVideo = pub.source === Track.Source.Camera;
      if (isVideo && !video) return;
      try { p.setTrackSubscription(pub.trackSid, true); } catch {}
    });
  });
}

function setVideoSubscription(room, identity, subscribe) {
  if (!room) return;
  const participant = room.remoteParticipants?.get(identity);
  if (!participant?.trackPublications) return;
  participant.trackPublications.forEach((pub) => {
    if (pub.source !== Track.Source.Camera) return;
    try { participant.setTrackSubscription(pub.trackSid, subscribe); } catch {}
  });
}

export function useLiveKit(socketRef, roomId, user) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [remoteScreenStreams, setRemoteScreenStreams] = useState({});
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [networkQuality, setNetworkQuality] = useState(null);

  const roomRef = useRef(null);
  const connectedRef = useRef(false);
  const screenShareTrackRef = useRef(null);
  const pinnedIdentityRef = useRef(null);

  // Media APIs only exist on secure contexts (HTTPS or localhost).
  // On http://<lan-ip> the whole namespace is missing — the #1 cause of
  // "camera doesn't work when testing on my phone".
  const secureContext =
    typeof window !== 'undefined' && window.isSecureContext === true;
  const hasMediaDevices =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const canScreenShare =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;

  const diagnoseMediaFailure = useCallback((err) => {
    let msg = err?.message || 'Media access failed';
    if (!secureContext) {
      msg = 'Camera/mic require HTTPS. Open the app over https:// or localhost.';
    } else if (!hasMediaDevices) {
      msg = 'This browser does not support camera/mic access.';
    } else if (err?.name === 'NotAllowedError') {
      msg = 'Camera/mic permission denied. Allow access in browser settings.';
    } else if (err?.name === 'NotFoundError') {
      msg = 'No camera/microphone found on this device.';
    } else if (err?.name === 'NotReadableError') {
      msg = 'Camera/mic is already in use by another app.';
    }
    console.warn('[LiveKit] media failure:', err?.name, '-', msg);
    setMediaError(msg);
    return msg;
  }, [secureContext, hasMediaDevices]);

  const rebuildParticipant = useCallback((participant) => {
    const room = roomRef.current;
    if (!room || !participant) return;

    const camTracks = [];
    const scrTracks = [];

    if (participant.trackPublications) {
      participant.trackPublications.forEach((pub) => {
        if (!pub.track) return;
        if (
          pub.source === Track.Source.ScreenShare ||
          pub.source === Track.Source.ScreenShareAudio
        ) {
          scrTracks.push(pub.track);
        } else {
          camTracks.push(pub.track);
        }
      });
    }

    const identity = participant.identity;
    logTag('rebuildParticipant', identity, '| cams:', camTracks.length, 'screens:', scrTracks.length);

    setRemoteStreams((prev) => {
      const next = { ...prev };
      if (camTracks.length > 0) {
        next[identity] = buildMediaStream(camTracks);
      } else {
        delete next[identity];
      }
      return next;
    });
    setRemoteScreenStreams((prev) => {
      const next = { ...prev };
      if (scrTracks.length > 0) {
        next[identity] = buildMediaStream(scrTracks);
      } else {
        delete next[identity];
      }
      return next;
    });
  }, []);

  const rebuild = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;

    const participants = room.remoteParticipants;
    if (!participants) {
      logTag('rebuild: no remoteParticipants');
      return;
    }

    const camStreams = {};
    const screenStreams = {};

    try {
      participants.forEach((p) => {
        const camTracks = [];
        const scrTracks = [];

        if (p.trackPublications) {
          p.trackPublications.forEach((pub) => {
            if (!pub.track) return;
            if (
              pub.source === Track.Source.ScreenShare ||
              pub.source === Track.Source.ScreenShareAudio
            ) {
              scrTracks.push(pub.track);
            } else {
              camTracks.push(pub.track);
            }
          });
        }

        logTag('rebuild', p.identity, '| cams:', camTracks.length, 'screens:', scrTracks.length);

        if (camTracks.length > 0) {
          camStreams[p.identity] = buildMediaStream(camTracks);
        }
        if (scrTracks.length > 0) {
          screenStreams[p.identity] = buildMediaStream(scrTracks);
        }
      });
    } catch (err) {
      console.error('[LiveKit] rebuild error:', err);
    }

    setRemoteStreams({ ...camStreams });
    setRemoteScreenStreams({ ...screenStreams });
  }, []);

  const rebuildLocalStream = useCallback(() => {
    const room = roomRef.current;
    if (!room || !room.localParticipant) return;
    const tracks = [];
    try {
      room.localParticipant.trackPublications?.forEach((pub) => {
        if (pub.track && pub.source === Track.Source.Camera) {
          tracks.push(pub.track);
        }
      });
    } catch {}
    logTag('local cam tracks:', tracks.length);
    setLocalStream(tracks.length > 0 ? buildMediaStream(tracks) : null);
  }, []);

  const rebuildLocalScreen = useCallback(() => {
    const room = roomRef.current;
    if (!room || !room.localParticipant) return;
    const tracks = [];
    try {
      room.localParticipant.trackPublications?.forEach((pub) => {
        if (pub.track && (pub.source === Track.Source.ScreenShare || pub.source === Track.Source.ScreenShareAudio)) {
          tracks.push(pub.track);
        }
      });
    } catch {}
    logTag('local screen tracks:', tracks.length);
    setScreenStream(tracks.length > 0 ? buildMediaStream(tracks) : null);
  }, []);

  const connect = useCallback(async (token, url) => {
    if (roomRef.current) {
      logTag('already connected, skipping');
      return;
    }

    const serverUrl = url || import.meta.env.VITE_LIVEKIT_URL;
    if (!serverUrl) {
      console.error('[LiveKit] VITE_LIVEKIT_URL not set');
      return;
    }
    if (!token) {
      console.error('[LiveKit] no token');
      return;
    }

    logTag('connecting to', serverUrl);

    const isMobile = isMobileDevice();
    logTag('device type:', isMobile ? 'mobile' : 'desktop');

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      videoCaptureDefaults: isMobile
        ? {
            facingMode: 'user',
            resolution: { width: 1280, height: 720 },
            maxFramerate: 30,
          }
        : {
            facingMode: 'user',
            resolution: { width: 1920, height: 1080 },
            maxFramerate: 50,
          },
      publishDefaults: {
        simulcast: true,
        videoCodec: 'vp9',
        degradationPreference: 'maintain-framerate',
        videoSimulcastLayers: [
          VideoPresets.h180,
          VideoPresets.h360,
          VideoPresets.h720,
        ],
        screenShareEncoding: {
          maxBitrate: 18_000_000,
          maxFramerate: 30,
          degradationPreference: 'maintain-framerate',
        },
        screenShareSimulcastLayers: [
          VideoPresets.h360,
          VideoPresets.h720,
          VideoPresets.h1440,
        ],
      },
    });

    room.on(RoomEvent.Connected, () => {
      logTag('CONNECTED');
      connectedRef.current = true;
    });

    room.on(RoomEvent.NetworkQualityChanged, (quality, prevQuality) => {
      logTag('NetworkQuality:', quality, 'prev:', prevQuality);
      setNetworkQuality(quality);
    });

    room.on(RoomEvent.ParticipantConnected, (participant) => {
      logTag('participant joined:', participant.identity);
      setTimeout(() => {
        subscribeToAllTracks(room);
        rebuildParticipant(participant);
      }, 500);
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      logTag('participant left:', participant.identity);
      setRemoteStreams((prev) => { const n = { ...prev }; delete n[participant.identity]; return n; });
      setRemoteScreenStreams((prev) => { const n = { ...prev }; delete n[participant.identity]; return n; });
    });

    room.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
      logTag('TrackSubscribed:', track.kind, 'from', participant.identity, 'source:', pub.source);
      rebuildParticipant(participant);
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, pub, participant) => {
      logTag('TrackUnsubscribed:', track.kind, 'from', participant.identity, 'source:', pub.source);
      rebuildParticipant(participant);
    });

    room.on(RoomEvent.LocalTrackPublished, (pub) => {
      logTag('LocalTrackPublished:', pub.source, 'simulcast layers:', pub.simulcastLayers?.length || 0);
      if (pub.source === Track.Source.Camera || pub.source === Track.Source.ScreenShare || pub.source === Track.Source.ScreenShareAudio) {
        rebuildLocalStream();
        rebuildLocalScreen();
      }
    });

    room.on(RoomEvent.LocalTrackUnpublished, (pub) => {
      logTag('LocalTrackUnpublished:', pub.source);
      if (pub.source === Track.Source.Camera) {
        setLocalStream(null);
      } else if (pub.source === Track.Source.ScreenShare || pub.source === Track.Source.ScreenShareAudio) {
        setScreenStream(null);
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      logTag('disconnected');
      connectedRef.current = false;
      roomRef.current = null;
      setLocalStream(null);
      setRemoteStreams({});
      setRemoteScreenStreams({});
      setMicOn(false);
      setCamOn(false);
      setScreenSharing(false);
      setScreenStream(null);
    });

    roomRef.current = room;

    await room.connect(serverUrl, token, { autoSubscribe: true });
    logTag('room.connect() resolved');

    subscribeToAllTracks(room);
    rebuild();

    const names = [...(room.remoteParticipants?.keys() || [])];
    logTag('existing participants:', names.join(', ') || 'none');
  }, [rebuild, rebuildParticipant, rebuildLocalStream, rebuildLocalScreen]);

  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    connectedRef.current = false;
    setLocalStream(null);
    setRemoteStreams({});
    setRemoteScreenStreams({});
    setMicOn(false);
    setCamOn(false);
    setScreenSharing(false);
    setScreenStream(null);
  }, []);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room || !room.localParticipant) return;
    setMediaError(null);
    const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
    if (pub) {
      const next = pub.isMuted;
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicOn(next);
    } else {
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        const newPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
        setMicOn(!!newPub && !newPub.isMuted);
      } catch (err) {
        diagnoseMediaFailure(err);
      }
    }
  }, [diagnoseMediaFailure]);

  const toggleCam = useCallback(async () => {
    const room = roomRef.current;
    if (!room || !room.localParticipant) return;
    const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
    if (pub) {
      const next = pub.isMuted;
      await room.localParticipant.setCameraEnabled(next);
      setCamOn(next);
    } else {
      const isMobile = isMobileDevice();
      const constraints = isMobile
        ? { resolution: { width: 1280, height: 720 }, maxFramerate: 30 }
        : {
            resolution: { width: 1280, height: 720 },
            maxFramerate: 30,
            degradationPreference: 'maintain-framerate',
          };
      try {
        await room.localParticipant.setCameraEnabled(true, constraints);
      } catch (e) {
        diagnoseMediaFailure(e);
      }
      const newPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      setCamOn(!!newPub && !newPub.isMuted);
    }
  }, [diagnoseMediaFailure]);

  const toggleScreenShare = useCallback(async (shareAudio) => {
    const room = roomRef.current;
    logTag('toggleScreenShare called, shareAudio:', shareAudio, 'screenSharing:', screenSharing, 'room:', !!room, 'localParticipant:', !!room?.localParticipant);
    if (!room || !room.localParticipant) return null;

    if (screenSharing) {
      // shareAudio undefined → stop sharing
      if (shareAudio === undefined) {
        logTag('stopping screen share');
        // Clean up ended event listener
        if (screenShareTrackRef.current) {
          const { track, onEnded } = screenShareTrackRef.current;
          track?.removeEventListener('ended', onEnded);
          screenShareTrackRef.current = null;
        }
        await room.localParticipant.setScreenShareEnabled(false);
        setScreenSharing(false);
        setScreenStream(null);
        socketRef.current?.emit('screen-share-changed', { sharing: false });
        return null;
      }
      // shareAudio true/false → toggle audio mid-share
      logTag('toggling screen share audio to:', shareAudio);
      try {
        await room.localParticipant.setScreenShareEnabled(true, {
          video: {
            resolution: { width: 2560, height: 1440 },
            maxFramerate: 30,
            degradationPreference: 'maintain-resolution',
          },
          audio: shareAudio
            ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
            : false,
        });
        return null;
      } catch (err) {
        console.warn('[LiveKit] Failed to toggle screen share audio:', err);
        return null;
      }
    }

    if (!canScreenShare) {
      const msg = 'Screen sharing is not supported in this browser. It requires a desktop browser (Chrome/Edge/Firefox/Safari on Windows, Mac or Linux).';
      console.warn('[LiveKit]', msg);
      setMediaError(msg);
      return null;
    }

    try {
      logTag('starting screen share, audio:', shareAudio);
      await room.localParticipant.setScreenShareEnabled(true, {
        video: {
          resolution: { width: 2560, height: 1440 },
          maxFramerate: 30,
          degradationPreference: 'maintain-resolution',
        },
        audio: shareAudio
          ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
          : false,
      });
      logTag('screen share started successfully');
      setScreenSharing(true);
      socketRef.current?.emit('screen-share-changed', { sharing: true });

      // Listen for browser's native "Stop sharing" button (Chrome/Edge popup)
      const ssPub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
      const ssTrack = ssPub?.track?.mediaStreamTrack;
      if (ssTrack) {
        const onEnded = () => {
          logTag('Screen share track ended (browser stop sharing)');
          setScreenSharing(false);
          setScreenStream(null);
          socketRef.current?.emit('screen-share-changed', { sharing: false });
        };
        ssTrack.addEventListener('ended', onEnded);
        screenShareTrackRef.current = { track: ssTrack, onEnded };
      }

      return ssPub;
    } catch (err) {
      console.error('[LiveKit] screen share error:', err);
      diagnoseMediaFailure(err);
      setScreenSharing(false);
      return null;
    }
  }, [screenSharing, socketRef, canScreenShare, diagnoseMediaFailure]);

  const stopMedia = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const clearMediaError = useCallback(() => setMediaError(null), []);

  const setPinnedIdentity = useCallback((identity) => {
    const room = roomRef.current;
    const prev = pinnedIdentityRef.current;
    pinnedIdentityRef.current = identity;
    if (!room) return;

    const prevId = prev === 'local' ? null : prev;
    const nextId = identity === 'local' ? null : identity;

    if (prevId === nextId) return;

    logTag('setPinnedIdentity:', prevId, '->', nextId);

    // Unsubscribe video from previous pinned
    if (prevId) setVideoSubscription(room, prevId, false);

    // Subscribe video to new pinned
    if (nextId) setVideoSubscription(room, nextId, true);
  }, []);

  // Ensure screen share video is always subscribed for remote participants
  useEffect(() => {
    const room = roomRef.current;
    if (!room) return;
    const interval = setInterval(() => {
      room.remoteParticipants?.forEach((p) => {
        p.trackPublications?.forEach((pub) => {
          if ((pub.source === Track.Source.ScreenShare || pub.source === Track.Source.ScreenShareAudio)
              && !pub.isSubscribed && !pub.track) {
            try { p.setTrackSubscription(pub.trackSid, true); } catch {}
          }
        });
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return {
    localStream,
    remoteStreams,
    remoteScreenStreams,
    micOn,
    camOn,
    screenSharing,
    screenStream,
    canScreenShare,
    mediaError,
    clearMediaError,
    networkQuality,
    connect,
    disconnect,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    setPinnedIdentity,
    stopMedia,
  };
}
