import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
} from 'livekit-client';

function buildMediaStream(tracks) {
  const mediaTracks = tracks
    .filter((t) => t && t.mediaStreamTrack)
    .map((t) => t.mediaStreamTrack);
  if (mediaTracks.length === 0) return null;
  return new MediaStream(mediaTracks);
}

export function useLiveKit(_socketRef, roomId, user) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const roomRef = useRef(null);
  const connectedRef = useRef(false);
  const remoteStreamsRef = useRef({});

  const rebuildRemoteStreams = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const next = {};
    room.participants.forEach((participant) => {
      const tracks = [];
      participant.trackPublications.forEach((pub) => {
        if (pub.track && pub.source !== Track.Source.ScreenShareAudio) {
          // Include camera, microphone, AND screen share tracks
          tracks.push(pub.track);
        }
      });
      if (tracks.length > 0) {
        next[participant.identity] = buildMediaStream(tracks);
      }
    });
    remoteStreamsRef.current = next;
    setRemoteStreams({ ...next });
  }, []);

  const rebuildScreenStream = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    room.participants.forEach((participant) => {
      const screenTracks = [];
      participant.trackPublications.forEach((pub) => {
        if (pub.track && (pub.source === Track.Source.ScreenShare || pub.source === Track.Source.ScreenShareAudio)) {
          screenTracks.push(pub.track);
        }
      });
      if (screenTracks.length > 0) {
        const stream = buildMediaStream(screenTracks);
        if (stream) {
          setScreenStream(stream);
        }
      }
    });
  }, []);

  const rebuildLocalStream = useCallback(() => {
    const room = roomRef.current;
    if (!room || !room.localParticipant) return;
    const tracks = [];
    room.localParticipant.trackPublications.forEach((pub) => {
      if (pub.track && pub.source === Track.Source.Camera) {
        tracks.push(pub.track);
      }
    });
    if (tracks.length > 0) {
      setLocalStream(buildMediaStream(tracks));
    }
  }, []);

  const rebuildLocalScreenStream = useCallback(() => {
    const room = roomRef.current;
    if (!room || !room.localParticipant) return;
    const screenTracks = [];
    room.localParticipant.trackPublications.forEach((pub) => {
      if (pub.track && (pub.source === Track.Source.ScreenShare || pub.source === Track.Source.ScreenShareAudio)) {
        screenTracks.push(pub.track);
      }
    });
    if (screenTracks.length > 0) {
      setScreenStream(buildMediaStream(screenTracks));
    }
  }, []);

  const handleConnected = useCallback(() => {
    connectedRef.current = true;
  }, []);

  const handleParticipantConnected = useCallback((participant) => {
    participant.on('trackPublished', () => {
      rebuildRemoteStreams();
    });
    rebuildRemoteStreams();
  }, [rebuildRemoteStreams]);

  const handleParticipantDisconnected = useCallback((participant) => {
    rebuildRemoteStreams();
  }, [rebuildRemoteStreams]);

  const handleTrackSubscribed = useCallback((track, publication, participant) => {
    rebuildRemoteStreams();
    rebuildLocalScreenStream();
  }, [rebuildRemoteStreams, rebuildLocalScreenStream]);

  const handleTrackUnsubscribed = useCallback((track) => {
    rebuildRemoteStreams();
  }, [rebuildRemoteStreams]);

  const handleLocalTrackPublished = useCallback((publication) => {
    if (publication.source === Track.Source.Camera) {
      rebuildLocalStream();
    } else if (publication.source === Track.Source.ScreenShare || publication.source === Track.Source.ScreenShareAudio) {
      rebuildLocalScreenStream();
    }
  }, [rebuildLocalStream, rebuildLocalScreenStream]);

  const handleLocalTrackUnpublished = useCallback((publication) => {
    if (publication.source === Track.Source.Camera) {
      rebuildLocalStream();
    } else if (publication.source === Track.Source.ScreenShare || publication.source === Track.Source.ScreenShareAudio) {
      setScreenStream(null);
    }
  }, [rebuildLocalStream]);

  const connect = useCallback(async (token, url) => {
    if (connectedRef.current && roomRef.current) return;

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      videoCaptureDefaults: {
        facingMode: 'user',
        resolution: { width: 1280, height: 720 },
      },
      reconnectPolicy: (retryCount) => {
        if (retryCount > 10) return -1;
        return Math.min(retryCount * 500, 5000);
      },
    });

    room.on(RoomEvent.Connected, handleConnected);

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
    room.on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);

    room.on(RoomEvent.Disconnected, () => {
      connectedRef.current = false;
      setLocalStream(null);
      setRemoteStreams({});
      setMicOn(false);
      setCamOn(false);
      setScreenSharing(false);
      setScreenStream(null);
    });

    roomRef.current = room;

    const serverUrl = url || import.meta.env.VITE_LIVEKIT_URL;
    if (!serverUrl) {
      console.error('LiveKit URL not configured. Set VITE_LIVEKIT_URL env var.');
      return;
    }

    await room.connect(serverUrl, token);
  }, [handleConnected, handleParticipantConnected, handleParticipantDisconnected,
    handleTrackSubscribed, handleTrackUnsubscribed, handleLocalTrackPublished,
    handleLocalTrackUnpublished]);

  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    connectedRef.current = false;
    setLocalStream(null);
    setRemoteStreams({});
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
      const enabled = !pub.isMuted;
      await room.localParticipant.setMicrophoneEnabled(!enabled);
      setMicOn(!enabled);
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
      const enabled = !pub.isMuted;
      await room.localParticipant.setCameraEnabled(!enabled);
      setCamOn(!enabled);
    } else {
      await room.localParticipant.setCameraEnabled(true);
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
      return null;
    }

    try {
      await room.localParticipant.setScreenShareEnabled(true, {
        audio: shareAudio
          ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
          : false,
      });
      setScreenSharing(true);
      return room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    } catch (err) {
      console.warn('Screen share failed:', err.message);
      setScreenSharing(false);
      return null;
    }
  }, [screenSharing]);

  const stopMedia = useCallback(() => {
    disconnect();
  }, [disconnect]);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return {
    localStream,
    remoteStreams,
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
