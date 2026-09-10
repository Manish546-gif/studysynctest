import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ActiveCallContext = createContext(null);

export function ActiveCallProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeCall, setActiveCall] = useState(null);

  // References to keep persistent WebRTC / socket instances alive
  const sessionRef = useRef({
    roomId: null,
    roomName: '',
    roomCode: '',
    roomTag: '',
    accentColor: '#53fc18',
    isHost: false,
    liveKitRoom: null,
    socket: null,
    toggleMic: null,
    toggleCam: null,
    disconnect: null,
    micOn: false,
    camOn: false,
  });

  // Flag indicating if the user is currently viewing the workspace of the active room
  const isInRoomWorkspace = activeCall?.roomId
    ? location.pathname === `/workspace/${activeCall.roomId}`
    : false;

  // Called by Workspace when entering a room or updating state
  const registerSession = useCallback((data) => {
    if (!data || !data.roomId) return;

    sessionRef.current = {
      ...sessionRef.current,
      ...data,
    };

    setActiveCall((prev) => {
      return {
        roomId: data.roomId,
        roomName: data.roomName || prev?.roomName || 'Study Room',
        roomCode: data.roomCode || prev?.roomCode || '',
        roomTag: data.roomTag || prev?.roomTag || 'Study',
        accentColor: data.accentColor || prev?.accentColor || '#53fc18',
        micOn: data.micOn !== undefined ? data.micOn : (prev?.micOn ?? false),
        camOn: data.camOn !== undefined ? data.camOn : (prev?.camOn ?? false),
        connected: data.connected !== undefined ? data.connected : true,
        isHost: data.isHost !== undefined ? data.isHost : (prev?.isHost ?? false),
        participantsCount: data.participantsCount ?? prev?.participantsCount ?? 1,
      };
    });
  }, []);

  const updateSession = useCallback((updates) => {
    if (!updates) return;
    setActiveCall((prev) => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
    if (sessionRef.current) {
      if (updates.micOn !== undefined) sessionRef.current.micOn = updates.micOn;
      if (updates.camOn !== undefined) sessionRef.current.camOn = updates.camOn;
      if (updates.roomName !== undefined) sessionRef.current.roomName = updates.roomName;
      if (updates.accentColor !== undefined) sessionRef.current.accentColor = updates.accentColor;
    }
  }, []);

  const toggleMic = useCallback(async () => {
    if (sessionRef.current.toggleMic) {
      await sessionRef.current.toggleMic();
    }
  }, []);

  // Explicit disconnect: stops audio/video tracks, closes LiveKit room and socket, clears session
  const disconnectActiveCall = useCallback(() => {
    console.log('[ActiveCall] Explicitly disconnecting call for room:', sessionRef.current.roomId);
    if (sessionRef.current.disconnect) {
      try {
        sessionRef.current.disconnect();
      } catch (err) {
        console.warn('[ActiveCall] disconnect error:', err);
      }
    }

    // Stop global room audio & YouTube player
    if (typeof window !== 'undefined') {
      if (window.__STUDYSYNC_AUDIO__) {
        try {
          window.__STUDYSYNC_AUDIO__.pause();
          window.__STUDYSYNC_AUDIO__.src = '';
        } catch (e) {}
      }
      if (window.__STUDYSYNC_YT_PLAYER__) {
        try {
          window.__STUDYSYNC_YT_PLAYER__.pauseVideo();
          window.__STUDYSYNC_YT_PLAYER__.stopVideo();
        } catch (e) {}
      }
      const ytHost = document.getElementById('studysync-global-yt-host');
      if (ytHost) {
        ytHost.style.top = '-9999px';
        ytHost.style.left = '-9999px';
        ytHost.style.opacity = '0.01';
        ytHost.style.pointerEvents = 'none';
      }
      window.__STUDYSYNC_MUSIC_STATE__ = null;
    }

    sessionRef.current = {
      roomId: null,
      roomName: '',
      roomCode: '',
      roomTag: '',
      accentColor: '#53fc18',
      isHost: false,
      liveKitRoom: null,
      socket: null,
      toggleMic: null,
      toggleCam: null,
      disconnect: null,
      micOn: false,
      camOn: false,
    };

    setActiveCall(null);
  }, []);

  const returnToCall = useCallback(() => {
    if (activeCall?.roomId) {
      navigate(`/workspace/${activeCall.roomId}`);
    }
  }, [activeCall?.roomId, navigate]);

  return (
    <ActiveCallContext.Provider
      value={{
        activeCall,
        isInRoomWorkspace,
        sessionRef,
        registerSession,
        updateSession,
        toggleMic,
        disconnectActiveCall,
        returnToCall,
      }}
    >
      {children}
    </ActiveCallContext.Provider>
  );
}

export function useActiveCall() {
  const ctx = useContext(ActiveCallContext);
  return ctx || {
    activeCall: null,
    isInRoomWorkspace: false,
    registerSession: () => {},
    updateSession: () => {},
    toggleMic: () => {},
    disconnectActiveCall: () => {},
    returnToCall: () => {},
  };
}
