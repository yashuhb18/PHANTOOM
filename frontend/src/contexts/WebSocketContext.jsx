import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { safeJson } from '../utils/api';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const [liveEvents, setLiveEvents] = useState([]);
  const [narratorMessages, setNarratorMessages] = useState([]);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isNarratorConnected, setIsNarratorConnected] = useState(false);

  const liveWsRef = useRef(null);
  const narratorWsRef = useRef(null);

  // Load initial alerts from database so historical forensic narrations show on load
  useEffect(() => {
    fetch(`http://${window.location.hostname}:8001/api/alerts`)
      .then((res) => safeJson(res, []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const initialNarrations = data.slice(0, 30).map((alert) => ({
            session_id: alert.session_id,
            narration: alert.description ? `${alert.title} — ${alert.description}` : alert.title,
            text: alert.description ? `${alert.title} — ${alert.description}` : alert.title,
            timestamp: alert.created_at,
            severity: alert.severity,
            mitre: alert.mitre_technique
          }));
          setNarratorMessages((prev) => (prev.length === 0 ? initialNarrations : prev));
        }
      })
      .catch((e) => console.debug("Initial alerts load error:", e));
  }, []);

  const connectSockets = () => {
    // 1. Live Telemetry WebSocket
    const liveUrl = `ws://${window.location.hostname}:8001/ws/live`;
    try {
      const wsLive = new WebSocket(liveUrl);
      liveWsRef.current = wsLive;

      wsLive.onopen = () => setIsLiveConnected(true);
      wsLive.onclose = () => {
        setIsLiveConnected(false);
        setTimeout(connectSockets, 3000);
      };
      wsLive.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLiveEvents((prev) => [data, ...prev.slice(0, 99)]);
        } catch (err) {
          console.error("Live WS parse error:", err);
        }
      };
    } catch (e) {
      console.error("Live WS connection error:", e);
    }

    // 2. AI Threat Narrator WebSocket
    const narratorUrl = `ws://${window.location.hostname}:8001/ws/narrator`;
    try {
      const wsNarrator = new WebSocket(narratorUrl);
      narratorWsRef.current = wsNarrator;

      wsNarrator.onopen = () => setIsNarratorConnected(true);
      wsNarrator.onclose = () => {
        setIsNarratorConnected(false);
      };
      wsNarrator.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const rawText = data.narration || data.text || data.message || '';
          data.narration = rawText;
          data.text = rawText;
          setNarratorMessages((prev) => [data, ...prev.slice(0, 49)]);
        } catch (err) {
          console.error("Narrator WS parse error:", err);
        }
      };
    } catch (e) {
      console.error("Narrator WS connection error:", e);
    }
  };

  useEffect(() => {
    connectSockets();
    return () => {
      if (liveWsRef.current) liveWsRef.current.close();
      if (narratorWsRef.current) narratorWsRef.current.close();
    };
  }, []);

  const clearEvents = () => setLiveEvents([]);
  const clearNarrator = () => setNarratorMessages([]);

  return (
    <WebSocketContext.Provider
      value={{
        liveEvents,
        narratorMessages,
        isLiveConnected,
        isNarratorConnected,
        clearEvents,
        clearNarrator
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  return useContext(WebSocketContext);
}
