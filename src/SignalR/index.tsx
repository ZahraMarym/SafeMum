// hooks/useSignalR.js
import { useEffect, useRef, useState } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

const useSignalR = () => {
  const connectionRef = useRef(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const connect = async () => {
      try {
        const conn = new HubConnectionBuilder()
          .withUrl('https://safemum-app-5f503b88629c.herokuapp.com/chatHub')
          .withAutomaticReconnect()
          .configureLogging(LogLevel.Information)
          .build();

        conn.on('ReceiveMessage', (userId, message) => {
          console.log('💬 Received from:', userId, message);
          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}`,
              senderId: userId,
              content: message,
              sendAt: new Date(),
              receiverId: null,
            },
          ]);
        });

        await conn.start();
        console.log('✅ SignalR connected');
        connectionRef.current = conn;
      } catch (err) {
        console.error('❌ SignalR connection error:', err);
      }
    };

    connect();

    return () => {
      connectionRef.current?.stop();
    };
  }, []);


const sendMessage = async (senderId, receiverId, content) => {
  try {
    const newMessage = {
      id: `${Date.now()}`,
      senderId,
      receiverId,
      content,
      sendAt: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);

    await connectionRef.current?.send('SendMessage', senderId, receiverId, content);
    console.log('✅ Message sent via SignalR:', content);
  } catch (err) {
    console.error('❌ Failed to send message:', err);
  }
};


  return { messages, setMessages, sendMessage };
};

export default useSignalR;
