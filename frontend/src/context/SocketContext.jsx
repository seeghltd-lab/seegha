import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children, serverUrl, options = {} }) => {
  const url = serverUrl || import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const defaultOptions = {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: maxReconnectAttempts,
    timeout: 20000,
    withCredentials: true,
    ...options,
  };

  const initializeSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(url, defaultOptions);
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      setConnectionError(error.message);
      setIsConnected(false);
    });

    return socket;
  }, [url]);

  const connect = useCallback(() => {
    if (!socketRef.current) {
      initializeSocket();
    } else if (!socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, [initializeSocket]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      setIsConnected(false);
    }
  }, []);

  const emit = useCallback((event, data, callback) => {
    if (socketRef.current?.connected) {
      if (callback) {
        socketRef.current.emit(event, data, callback);
      } else {
        socketRef.current.emit(event, data);
      }
    } else {
      console.warn('Socket not connected. Cannot emit:', event);
    }
  }, []);

  const on = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
      return () => socketRef.current?.off(event, handler);
    }
  }, []);

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  useEffect(() => {
    const socket = initializeSocket();
    return () => {
      socket.disconnect();
    };
  }, [initializeSocket]);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        connectionError,
        reconnectAttempts: reconnectAttemptsRef.current,
        connect,
        disconnect,
        emit,
        on,
        off,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};

export const useSocketEvent = (event, handler, dependencies = []) => {
  const { on, socket } = useSocket();

  useEffect(() => {
    if (!event || !handler) return;
    const cleanup = on(event, handler);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, socket, on, ...dependencies]);
};
