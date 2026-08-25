import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export function useSocket(roomId) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [roomUsers, setRoomUsers] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [remoteActions, setRemoteActions] = useState([]);
  const [livePaths, setLivePaths] = useState({});
  const [messages, setMessages] = useState([]);
  const [roomFiles, setRoomFiles] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [screenSharers, setScreenSharers] = useState({});
  const [tabVisibility, setTabVisibility] = useState({});
  const [speakerLevels, setSpeakerLevels] = useState({});
  const [activityLog, setActivityLog] = useState([]);
  const [screenCursors, setScreenCursors] = useState({});

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !roomId) return;

    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-room', roomId);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      setTypingUsers([]);
    });

    socket.on('room-users', (users) => setRoomUsers(users));

    socket.on('chat-history', (history) => setMessages(Array.isArray(history) ? history : []));

    socket.on('chat-message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('user-typing', (data) => {
      setTypingUsers((prev) => {
        if (prev.some((u) => u.userId === data.userId)) return prev;
        return [...prev, { userId: data.userId, name: data.name }];
      });
    });

    socket.on('user-stopped-typing', (data) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    });

    socket.on('whiteboard-state', (actions) => setRemoteActions(actions));

    socket.on('draw-action', (data) => {
      setRemoteActions((prev) => [...prev, data]);
    });

    socket.on('move-action', (data) => {
      setRemoteActions((prev) =>
        prev.map((a) => {
          if (a._id === data.actionId) {
            return { ...a, x: data.x, y: data.y };
          }
          return a;
        })
      );
    });

    socket.on('cursor-move', (data) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [data.socketId]: { x: data.x, y: data.y, name: data.userName },
      }));
    });

    socket.on('clear-whiteboard', () => setRemoteActions([]));

    socket.on('undo-action', (data) => {
      if (data.actionId) {
        setRemoteActions((prev) => prev.filter((a) => a._id !== data.actionId));
      }
    });

    socket.on('live-path', (data) => {
      if (data.socketId === socket.id) return;
      setLivePaths((prev) => ({
        ...prev,
        [data.socketId]: {
          type: data.type,
          points: data.points,
          color: data.color,
          strokeWidth: data.strokeWidth,
          socketId: data.socketId,
        },
      }));
    });

    socket.on('live-path-end', (data) => {
      setLivePaths((prev) => {
        const next = { ...prev };
        delete next[data.socketId];
        return next;
      });
    });

    socket.on('new-file', (file) => {
      setRoomFiles((prev) => {
        if (prev.some((f) => f._id === file._id)) return prev;
        return [...prev, file];
      });
    });

    socket.on('file-removed', (data) => {
      setRoomFiles((prev) => prev.filter((f) => f._id !== data.fileId));
    });

    socket.on('screen-share-changed', (data) => {
      setScreenSharers((prev) => {
        const next = { ...prev };
        if (data.sharing) next[data.socketId] = data.userName || true;
        else delete next[data.socketId];
        return next;
      });
    });

    // Snapshot of already-active sharers, sent to late joiners.
    socket.on('screen-sharers', (sharers) => {
      if (!Array.isArray(sharers)) return;
      setScreenSharers(() => {
        const next = {};
        sharers.forEach(({ socketId, userName }) => {
          if (socketId) next[socketId] = userName || true;
        });
        return next;
      });
    });

    socket.on('tab-visibility', (data) => {
      setTabVisibility((prev) => ({ ...prev, [data.socketId]: { visible: data.visible, userName: data.userName } }));
    });

    socket.on('speaker-level', (data) => {
      setSpeakerLevels((prev) => ({ ...prev, [data.socketId]: data.level }));
    });

    socket.on('activity-log', (data) => {
      setActivityLog((prev) => [...prev.slice(-50), data]);
    });

    socket.on('cursor-position', (data) => {
      setScreenCursors((prev) => ({ ...prev, [data.socketId]: { x: data.x, y: data.y } }));
    });

    return () => {
      socket.emit('leave-room', roomId);
      socket.disconnect();
      setConnected(false);
      setRoomUsers([]);
      setRemoteCursors({});
      setRemoteActions([]);
      setLivePaths({});
      setMessages([]);
      setRoomFiles([]);
      setTypingUsers([]);
      setScreenSharers({});
      setTabVisibility({});
      setSpeakerLevels({});
      setActivityLog([]);
      setScreenCursors({});
    };
  }, [roomId]);

  const emitDraw = useCallback((action) => {
    socketRef.current?.emit('draw-action', action);
  }, []);

  const emitMove = useCallback((actionId, x, y) => {
    socketRef.current?.emit('move-action', { actionId, x, y });
  }, []);

  const emitCursor = useCallback((x, y) => {
    socketRef.current?.emit('cursor-move', { x, y });
  }, []);

  const emitClear = useCallback(() => {
    socketRef.current?.emit('clear-whiteboard');
  }, []);

  const emitUndo = useCallback((actionId) => {
    socketRef.current?.emit('undo-action', { actionId });
  }, []);

  const emitLivePath = useCallback((data) => {
    socketRef.current?.emit('live-path', data);
  }, []);

  const emitLivePathEnd = useCallback(() => {
    socketRef.current?.emit('live-path-end');
  }, []);

  const emitMessage = useCallback((text) => {
    socketRef.current?.emit('send-message', { text });
  }, []);

  const emitFileUploaded = useCallback((fileData) => {
    socketRef.current?.emit('file-uploaded', fileData);
  }, []);

  const emitFileDeleted = useCallback((fileId) => {
    socketRef.current?.emit('file-deleted', { fileId });
  }, []);

  const emitTypingStart = useCallback(() => {
    socketRef.current?.emit('typing-start');
  }, []);

  const emitTypingStop = useCallback(() => {
    socketRef.current?.emit('typing-stop');
  }, []);

  const emitTabVisibility = useCallback((visible) => {
    socketRef.current?.emit('tab-visibility', { visible });
  }, []);

  const emitCursorPosition = useCallback((x, y) => {
    socketRef.current?.emit('cursor-position', { x, y });
  }, []);

  const emitSpeakerLevel = useCallback((level) => {
    socketRef.current?.emit('speaker-level', { level });
  }, []);

  const emitActivityLog = useCallback((message) => {
    socketRef.current?.emit('activity-log', { message });
  }, []);

  return {
    socket: socketRef,
    connected,
    roomUsers,
    remoteCursors,
    remoteActions,
    setRemoteActions,
    livePaths: Object.values(livePaths),
    messages,
    roomFiles,
    setRoomFiles,
    typingUsers,
    screenSharers,
    tabVisibility,
    speakerLevels,
    activityLog,
    screenCursors,
    emitDraw,
    emitMove,
    emitCursor,
    emitClear,
    emitUndo,
    emitLivePath,
    emitLivePathEnd,
    emitMessage,
    emitFileUploaded,
    emitFileDeleted,
    emitTypingStart,
    emitTypingStop,
    emitTabVisibility,
    emitCursorPosition,
    emitSpeakerLevel,
    emitActivityLog,
  };
}
