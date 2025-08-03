import { useEffect, useRef, useState } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

const useSignalR = () => {
  const connectionRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [groupId, setGroupId] = useState(null); // Store groupId if needed

  useEffect(() => {
    const connect = async () => {
      try {
        const conn = new HubConnectionBuilder()
          .withUrl('https://safemum-app-5f503b88629c.herokuapp.com/chatHub')
          .withAutomaticReconnect()
          .configureLogging(LogLevel.Information)
          .build();

        // Listen for individual messages
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

        // Listen for group messages
        conn.on('ReceiveGroupMessage', (senderId, groupId, message) => {
          console.log('💬 Group message from', senderId, 'in group', groupId, message);
          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}`,
              senderId,
              content: message,
              sendAt: new Date(),
              groupId,
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

  // Send message to individual
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
      console.log('✅ Message sent to individual:', content);
    } catch (err) {
      console.error('❌ Failed to send individual message:', err);
    }
  };

  // Send message to group
  const sendMessageToGroup = async (senderId, groupId, content) => {
    try {
      const newMessage = {
        id: `${Date.now()}`,
        senderId,
        content,
        sendAt: new Date(),
        groupId,
      };

      setMessages((prev) => [...prev, newMessage]);

      await connectionRef.current?.send('SendGroupMessage', senderId, groupId, content);
      console.log('✅ Message sent to group:', content);
    } catch (err) {
      console.error('❌ Failed to send group message:', err);
    }
  };

  // Function to join a group (if needed)
  const joinGroup = async (userId, groupId) => {
    try {
      await connectionRef.current?.invoke('JoinGroup', userId, groupId);
      console.log(`✅ Joined group ${groupId}`);
      setGroupId(groupId); // Set groupId after joining
    } catch (err) {
      console.error('❌ Failed to join group:', err);
    }
  };

  return { messages, setMessages, sendMessage, sendMessageToGroup, joinGroup };
};

export default useSignalR;
