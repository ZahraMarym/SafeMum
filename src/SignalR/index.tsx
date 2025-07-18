// hooks/useSignalR.js
import { useEffect, useRef, useState } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

const useSignalR = () => {
  const connectionRef = useRef(null);
  const [messages, setMessages] = useState([]);
    const [groups, setGroups] = useState([]); // Store group info
    const [currentGroupId, setCurrentGroupId] = useState(null); // To track active group

  useEffect(() => {
      const connect = async () => {
        try {
          const conn = new HubConnectionBuilder()
            .withUrl('https://safemum-app-5f503b88629c.herokuapp.com/chatHub')
            .withAutomaticReconnect()
            .configureLogging(LogLevel.Information)
            .build();

          // Handle regular chat message
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

          // Handle group messages
          conn.on('ReceiveGroupMessage', (senderId, message, groupId) => {
            if (groupId === currentGroupId) {
              setMessages((prevMessages) => [
                ...prevMessages,
                { senderId, content: message, sendAt: new Date(), groupId },
              ]);
            }
            console.log('💬 Received group message:', message);
          });

          // Start the connection
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
    }, [currentGroupId]); // Reconnect when switching groups


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
 // Send a message to a group
  const sendMessageToGroup = async (senderId, groupId, message) => {
    try {
      await connectionRef.current?.send('SendGroupMessage', senderId, groupId, message);
      console.log('✅ Group message sent:', message);
    } catch (err) {
      console.error('❌ Failed to send group message:', err);
    }
  };

  // Create a new chat group
  const createGroup = async (adminUserId, groupName, memberUserIds) => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_URL}/api/communication/create-chat-group`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          name: groupName,
          adminUserId,
          memberUserIds,
        }),
      });

      const data = await response.json();
      console.log('Group created successfully:', data);
      setGroups((prev) => [...prev, data]);

      // Optionally, join the group after it's created
      setCurrentGroupId(data.groupId);
    } catch (err) {
      console.error('❌ Failed to create group:', err);
    }
  };

  // Add user to a group
  const addUserToGroup = async (userId, groupId) => {
    try {
      await connectionRef.current?.send('JoinGroup', userId, groupId);
      console.log('✅ User added to group');
    } catch (err) {
      console.error('❌ Failed to add user to group:', err);
    }
  };

  // Fetch all groups (or any other relevant data from your backend)
  const fetchGroups = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const response = await axios.get(`${process.env.EXPO_PUBLIC_URL}/api/communication/get-groups`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setGroups(response.data); // Assuming the response returns an array of groups
    } catch (err) {
      console.error('❌ Failed to fetch groups:', err);
    }
  };

  // When the component mounts, fetch the available groups
  useEffect(() => {
    fetchGroups();
  }, []);

  return {
    messages,
    setMessages,
    sendMessage,
    sendMessageToGroup,
    createGroup,
    addUserToGroup,
    groups,
    setCurrentGroupId,
    currentGroupId,
  };
};

export default useSignalR;