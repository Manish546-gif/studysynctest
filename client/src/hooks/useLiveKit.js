import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  Track,
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

function subscribeToAllTracks(room) {
  if (!room) return;
  const participants = room.remoteParticipants;
  if (!participants) return;
  participants.forEach((p) => {
    if (!p.trackPublications) return;
    p.trackPublications.forEach((pub) => {
      if (!pub.isSubscribed && !pub.track) {
        try { p.setTrackSubscription(pub.trackSid, true); } catch {}
      }
    });
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

  const roomRef = useRef(null);
  const connectedRef = useRef(false);

  const rebuild = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;

    const camStreams = {};
    const screenStreams = {};

    try {
      const participants = room.remoteParticipants;
      if (!participants) {
        logTag('rebuild: no remoteParticipants');
        return;
      }

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

    const room = new Room({
      adaptiveStream: false,
      dynacast: false,
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      videoCaptureDefaults: {
        facingMode: 'user',
        resolution: { width: 1920, height: 1080 },
        maxFramerate: 60,
      },
    });

    room.on(RoomEvent.Connected, () => {
      logTag('CONNECTED');
      connectedRef.current = true;
    });

    room.on(RoomEvent.ParticipantConnected, (participant) => {
      logTag('participant joined:', participant.identity);
      setTimeout(() => {
        subscribeToAllTracks(room);
        rebuild();
      }, 500);
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      logTag('participant left:', participant.identity);
      rebuild();
    });

    room.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
      logTag('TrackSubscribed:', track.kind, 'from', participant.identity, 'source:', pub.source);
      rebuild();
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, pub, participant) => {
      logTag('TrackUnsubscribed:', track.kind, 'from', participant.identity, 'source:', pub.source);
      rebuild();
    });

    room.on(RoomEvent.LocalTrackPublished, (pub) => {
      logTag('LocalTrackPublished:', pub.source);
      if (pub.source === Track.Source.Camera) {
        try {
          pub.setVideoQuality?.(7);
          pub.setVideoEncoding?.({
            maxBitrate: 8_000_000,
            maxFramerate: 60,
          });
        } catch {}
        rebuildLocalStream();
      } else if (pub.source === Track.Source.ScreenShare || pub.source === Track.Source.ScreenShareAudio) {
        try {
          pub.setVideoQuality?.(7);
          pub.setVideoEncoding?.({
            maxBitrate: 12_000_000,
            maxFramerate: 60,
          });
        } catch {}
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
  }, [rebuild, rebuildLocalStream, rebuildLocalScreen]);

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
    const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
    if (pub) {
      const next = pub.isMuted;
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicOn(next);
    } else {
      await room.localParticipant.setMicrophoneEnabled(true);
      const newPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      setMicOn(!!newPub && !newPub.isMuted);
    }
  }, []);

  const toggleCam = useCallback(async () => {
    const room = roomRef.current;
    if (!room || !room.localParticipant) return;
    const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
    if (pub) {
      const next = pub.isMuted;
      await room.localParticipant.setCameraEnabled(next);
      setCamOn(next);
    } else {
      await room.localParticipant.setCameraEnabled(true, {
        resolution: { width: 1920, height: 1080 },
        maxFramerate: 60,
        degradationPreference: 'maintain-resolution',
      });
      const newPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      setCamOn(!!newPub && !newPub.isMuted);
    }
  }, []);

  const toggleScreenShare = useCallback(async (shareAudio = false) => {
    const room = roomRef.current;
    if (!room || !room.localParticipant) return null;

    if (screenSharing) {
      await room.localParticipant.setScreenShareEnabled(false);
      setScreenSharing(false);
      setScreenStream(null);
      socketRef.current?.emit('screen-share-changed', { sharing: false });
      return null;
    }

    try {
      await room.localParticipant.setScreenShareEnabled(true, {
        video: {
          resolution: { width: 1920, height: 1080 },
          maxFramerate: 60,
          degradationPreference: 'maintain-resolution',
        },
        audio: shareAudio
          ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
          : false,
      });
      setScreenSharing(true);
      socketRef.current?.emit('screen-share-changed', { sharing: true });
      return room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    } catch (err) {
      console.warn('[LiveKit] screen share failed:', err);
      setScreenSharing(false);
      return null;
    }
  }, [screenSharing, socketRef]);

  const stopMedia = useCallback(() => {
    disconnect();
  }, [disconnect]);

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
    connect,
    disconnect,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    stopMedia,
  };
}
