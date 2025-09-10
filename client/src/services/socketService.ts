// src/services/socketService.ts

let socket: WebSocket | null = null;
const listeners: { [key: string]: Array<(data: any) => void> } = {};

const socketService = {
  connect: () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket is already connected.');
      return;
    }

    socket = new WebSocket('ws://localhost:8081');

    socket.onopen = () => {
      console.log('WebSocket connected!');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (listeners[message.event]) {
          listeners[message.event].forEach(callback => callback(message));
        }
      } catch (error) {
        console.error('Error parsing socket message:', error);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected.');
      socket = null;
    };
    
    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
  },

  on: (eventName: string, callback: (data: any) => void) => {
    if (!listeners[eventName]) {
      listeners[eventName] = [];
    }
    listeners[eventName].push(callback);
  },

  disconnect: () => {
    if (socket) {
      socket.close();
    }
  },
};

export default socketService;